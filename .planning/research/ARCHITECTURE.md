# Architecture Research

**Domain:** Threat Intelligence Platform — v6.1 Feature Integration
**Researched:** 2026-04-17
**Confidence:** HIGH (all findings derived from direct codebase inspection)

## Integration Analysis: v6.1 Features into Existing Architecture

This document answers the specific architectural questions for v6.1: Threat Map Buffer &
Threat Actor Depth. All integration points reference exact files. Confidence is HIGH because
analysis is based entirely on reading the live codebase, not documentation or assumptions.

---

## 1. Threat Map Buffer Refactor

### Where Buffer State Lives

The buffer belongs in a new `useThreatMapBuffer` hook, extracted from the current
`useThreatStream.js`. Here is why:

`useThreatStream.js` currently owns two distinct concerns: SSE connection lifecycle and the
`events` array (which is both the "buffer" and the "feed"). These must be separated.

**New hook: `frontend/src/hooks/useThreatMapBuffer.js`**

This hook accepts a `maxSize` parameter (from the dropdown) and receives raw events piped in
from `useThreatStream`. It owns:

- `markers` — the array of settled marker objects rendered on the map
- `arrivingId` — the ID of the most recently arrived event (drives pulse animation)
- `evictingId` — the ID of the oldest marker being rotated out (drives fade animation)

`ThreatMapPage.jsx` wires them together:
```
useThreatStream() → { events, connected, ... }
useThreatMapBuffer(events, maxSize) → { markers, arrivingId }
```

`useThreatStream.js` stays largely unchanged: it keeps the SSE connection, snapshot load,
reconnect logic, and the raw event ring. Its `MAX_EVENTS` constant (currently hardcoded to 100)
must be replaced with a dynamic value driven by the buffer size dropdown.

### Marker State Shape

Three lifecycle states per marker, all in one flat array in `useThreatMapBuffer`:

```js
{
  id: string,           // STIX ID — stable identity, used as Leaflet key
  lat: number,
  lng: number,
  color: string,        // 'red' | 'amber' | 'violet' | 'cyan'
  type: string,
  ip: string,
  timestamp: string,
  state: 'arriving' | 'settled' | 'evicting',
  arrivedAt: number,    // Date.now() — used to sort for eviction
}
```

The `state` field drives CSS class selection on the DivIcon HTML. `useThreatMapBuffer`
transitions `arriving → settled` after a fixed timeout (e.g., 1800ms, matching the pulse
animation duration). Eviction: when a new event would push the buffer past `maxSize`,
the oldest entry is marked `evicting` and removed after a short fade timeout (~600ms).

### Interaction with SSE Handler

`useThreatStream.js` currently prepends new events to the `events` array:
```js
setEvents((prev) => [newEvent, ...prev].slice(0, MAX_EVENTS));
```

For v6.1, `MAX_EVENTS` must be driven by the buffer size. Two options:

- **Option A (preferred):** Pass `bufferSize` into `useThreatStream` as a parameter, so the
  in-memory ring and the map buffer are both capped at the same value. This prevents the ring
  growing unbounded if the hook is created before the user sets a size.
- **Option B:** Keep `useThreatStream` at a fixed large cap (e.g., 2000) and let
  `useThreatMapBuffer` independently enforce the configured cap. Simpler but wastes memory.

Option A is preferred for v6.1. `useThreatStream` signature becomes:
`useThreatStream(bufferSize = 100)`.

### `ThreatMapPage.jsx` Changes

- Read `bufferSize` from localStorage on mount (new `BUFFER_SIZE_KEY` constant)
- Pass `bufferSize` to `useThreatStream(bufferSize)`
- Pass `events` to `useThreatMapBuffer(events, bufferSize)` to get `markers`
- Remove the existing `addPulseMarker` / `prevEventIdRef` effect (replaced by buffer hook)
- Add `addSettledMarkers(markers)` call to sync the Leaflet layer when `markers` changes

Estimated LOC change: ~80 lines removed, ~40 lines added in `ThreatMapPage.jsx`.
New hook `useThreatMapBuffer.js`: ~120 LOC.

---

## 2. Marker Lifecycle on Map

### Marker Type Decision

Use **`L.divIcon`** for all markers — both arriving (pulsing) and settled (static dot).

Rationale: The existing `addPulseMarker` already uses `L.divIcon`. CircleMarker does not
support CSS animation without hacky SVG tricks. DivIcon gives full CSS control and is already
in the codebase. The settled state just removes the pulse CSS class.

### Pulse-then-Settle Without DOM Leaks

The current `addPulseMarker` leaks: it adds a `L.marker` to the map and removes it after a
`setTimeout`. When the buffer is persistent (not transient), this pattern breaks — markers must
stay on the map after pulsing, not disappear.

**New pattern for settled markers:**

Maintain a `markerInstancesRef` (`useRef`) in `ThreatMapPage.jsx` — a `Map<id, L.Marker>`.
When `markers` changes (from `useThreatMapBuffer`):

1. For each marker in `state: 'arriving'`: if no instance exists yet, create `L.marker` with
   pulse DivIcon, add to map, store in `markerInstancesRef`.
2. For each marker transitioning to `state: 'settled'`: update the DivIcon HTML on the existing
   Leaflet marker instance (remove pulse class, add settled dot class). Do NOT remove/re-add.
3. For each marker in `state: 'evicting'`: add evicting CSS class (fade), then after 600ms
   call `map.removeLayer(instance)` and delete from `markerInstancesRef`.
4. For markers not in the new `markers` array at all: remove from map (handles hard resets).

Updating DivIcon HTML on an existing Leaflet marker: `marker.setIcon(newIcon)`. This is
idempotent and does not cause a DOM leak.

**No marker layer group for settled markers** — each marker is managed individually via
`markerInstancesRef`. The existing `markerLayerRef` (a `L.layerGroup`) in `useLeaflet.js` is
used only for snapshot markers loaded at init; the persistent buffer manages its own refs.

### `useLeaflet.js` Changes

The `markers` prop and the `useEffect` that calls `markerLayerRef.current.clearLayers()` are
currently used for the initial snapshot render. For v6.1, initial snapshot markers are loaded
into the buffer (not the layerGroup), so the `markers` prop and its effect can be removed.
The hook becomes purely a map initializer + `onReady` callback provider.

Estimated LOC change in `useLeaflet.js`: ~20 lines removed (markers effect).

### Eviction Strategy with Clustering

When leaflet.markercluster wraps markers, removing a clustered marker may cause a brief
cluster recalculation. This is acceptable: leaflet.markercluster handles `removeLayer` cleanly
on its `MarkerClusterGroup`. The eviction approach (remove from cluster group after fade) works
unchanged. The 600ms fade before removal prevents visible "pop" during cluster recompute.

---

## 3. Cluster Integration

### Conditional Enable

`leaflet.markercluster` is conditionally enabled based on `bufferSize > 500`. The toggle
is handled by the `markerLayerRef` in `ThreatMapPage.jsx` (or a dedicated `clusterGroupRef`).

**Layer swap strategy — re-init, not live-toggle:**

When the user changes the dropdown from ≤500 to >500 (or vice versa), the cleanest approach
is:
1. Remove all current markers from the map (iterate `markerInstancesRef`, call `removeLayer`)
2. If clustering: create a `L.markerClusterGroup(clusterOptions)` and add it to the map
3. Re-add all `markers` from `useThreatMapBuffer` state into the new layer
4. Update `activeLayerRef` to point to the cluster group (or null for direct map)

This is a one-time re-init triggered only when `bufferSize` crosses the 500 threshold. It does
not happen on every render. A `useEffect` in `ThreatMapPage.jsx` watches `bufferSize`, checks
the threshold, and triggers the swap.

Live-toggle (keeping markers and swapping layer container) is theoretically possible but
fragile: Leaflet's internal state gets confused when you move markers between layer groups.
Re-init from current buffer state is safer and the buffer rarely exceeds 2000 items.

### Cluster Styling

leaflet.markercluster's default cluster icons do not match the dark theme. Override with the
`iconCreateFunction` option:

```js
L.markerClusterGroup({
  iconCreateFunction: (cluster) => L.divIcon({
    className: '',
    html: `<div class="map-cluster-icon">${cluster.getChildCount()}</div>`,
    iconSize: [32, 32],
  }),
  showCoverageOnHover: false,
  chunkedLoading: true,
  chunkProgress: null, // disable default progress callback
});
```

CSS for `.map-cluster-icon` lives in `frontend/src/styles/components.css` alongside the
existing `.map-event-pulse` and `.map-marker` classes.

### New Dependency

`leaflet.markercluster` must be added to `frontend/package.json`:
```bash
npm install leaflet.markercluster
```
It imports CSS that must be added to `useLeaflet.js` or `main.css`:
```js
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
```
The default CSS is then overridden by the custom `iconCreateFunction`.

---

## 4. Buffer Size Dropdown

### Placement

The dropdown belongs in the **Left Overlay Panel** (`LeftOverlayPanel.jsx`), as a new section
below the counters widget and above the countries list. The left panel is narrower (340px) and
holds map-specific controls (counters, countries, feed). The right panel holds intelligence
data (indicators, attack categories, threat database counts) — these are independent of the
map buffer.

A new `BufferSizeControl` sub-component inside `LeftOverlayPanel.jsx` or as a separate
`frontend/src/components/threat-map/BufferSizeControl.jsx` file.

The component:
- Renders a `<select>` (or pill group) with options: 100, 500, 1000, 2000
- Reads initial value from `localStorage` (`aqua-tip:map-buffer-size`)
- On change: writes to localStorage, calls an `onBufferSizeChange` prop passed down from
  `ThreatMapPage.jsx`

`ThreatMapPage.jsx` lifts the buffer size state:
```js
const [bufferSize, setBufferSize] = useState(() => {
  try { return Number(localStorage.getItem('aqua-tip:map-buffer-size')) || 100; }
  catch { return 100; }
});
```

### Backend Snapshot Resize

The backend snapshot endpoint (`GET /api/threat-map/snapshot`) currently hardcodes `first: 100`
in `ThreatMapService::fetchSnapshot()`. For v6.1, the snapshot fetch in `useThreatStream.js`
should pass the configured buffer size as a query param:
```
GET /api/threat-map/snapshot?limit=500
```

The `SnapshotController` reads `$request->query('limit', 100)` and passes it to
`ThreatMapService::getSnapshot(int $limit = 100)`. The service cache key must include the
limit value: `'threat_map:snapshot:' . $limit`.

The SSE stream does NOT need a "resize buffer" message. The SSE relay is stateless per-event.
Only the snapshot (initial load) is affected by the configured limit. Resizing the buffer in
the frontend while the SSE is running simply changes how the `useThreatMapBuffer` hook caps
its internal array going forward.

**Backend change:** `ThreatMapService::fetchSnapshot()` GraphQL query changes `first: 100` to
`first: $limit` (with a hard cap of 2000 to prevent abuse). `SnapshotController` reads the
`limit` param and validates it against `[100, 500, 1000, 2000]` (or clamps to max 2000).

---

## 5. Backend Campaigns Endpoint

### Route and Controller

New route: `GET /api/threat-campaigns` under the `feature-gate` middleware group.

Use a **separate controller**: `ThreatCampaign/IndexController.php`. The existing
`ThreatActor/IndexController.php` is thin and delegates entirely to `ThreatActorService`.
A new `ThreatCampaignService.php` follows the same pattern. Do not add a `type` param to
the existing endpoint — campaigns have a different entity type (`Campaign` vs `IntrusionSet`)
and the GraphQL query is structurally different.

**New files:**
- `backend/app/Http/Controllers/ThreatCampaign/IndexController.php` (~30 LOC, thin)
- `backend/app/Services/ThreatCampaignService.php` (~180 LOC)

### GraphQL Query

Campaigns in OpenCTI are first-class STIX objects (`Campaign`). The query pattern mirrors
`intrusionSets`:

```graphql
query ($first: Int!, $after: ID, $search: String) {
  campaigns(first: $first, after: $after, search: $search, orderBy: modified, orderMode: desc) {
    edges {
      node {
        id
        name
        description
        first_seen
        last_seen
        modified
        objective
        aliases
        attributedTo: stixCoreRelationships(
          relationship_type: "attributed-to"
          toTypes: ["Intrusion-Set"]
          first: 10
        ) {
          edges {
            node {
              to {
                ... on IntrusionSet { id name }
              }
            }
          }
        }
      }
    }
    pageInfo { hasNextPage hasPreviousPage startCursor endCursor globalCount }
  }
}
```

### Caching

Same pattern as `ThreatActorService::list()`: `Cache::remember()` with 15-minute TTL.
Cache key: `'threat_campaigns:' . md5(json_encode(func_get_args()))`.

### `api.php` Addition

```php
Route::get('/threat-campaigns', ThreatCampaignIndexController::class);
```
Inside the existing `feature-gate` middleware group. No new middleware needed.

---

## 6. Backend Victimology Endpoint

### Endpoint Decision

**Extend `GET /api/threat-actors/{id}/enrichment`** rather than adding a sub-endpoint.

Rationale: The enrichment endpoint already fetches TTPs, tools, malware, campaigns, and
relationships in a single GraphQL call. Adding victimology to the same call avoids a second
HTTP round-trip when the modal opens. The enrichment response already returns a structured
object — adding `victimology` as a new top-level key is additive and non-breaking.

**No new route needed.** Change is entirely in `ThreatActorService::executeEnrichmentQuery()`
and `normalizeEnrichmentResponse()`.

### GraphQL Addition

Add to the existing `intrusionSet(id: $id)` query body:

```graphql
targetedCountries: stixCoreRelationships(
  relationship_type: "targets"
  toTypes: ["Country"]
  first: 50
) {
  edges { node { to { ... on Country { id name } } } }
}
targetedRegions: stixCoreRelationships(
  relationship_type: "targets"
  toTypes: ["Region"]
  first: 20
) {
  edges { node { to { ... on Region { id name } } } }
}
targetedSectors: stixCoreRelationships(
  relationship_type: "targets"
  toTypes: ["Sector"]
  first: 50
) {
  edges { node { to { ... on Sector { id name } } } }
}
targetedOrganizations: stixCoreRelationships(
  relationship_type: "targets"
  toTypes: ["Identity"]
  first: 30
) {
  edges { node { to { ... on Identity { id name identity_class } } } }
}
```

### Performance Impact

The existing enrichment query already makes 5 `stixCoreRelationships` sub-queries plus one
`allRelationships` sub-query within a single GraphQL call. Adding 4 more targeted sub-queries
increases the query complexity but remains a single HTTP round-trip to OpenCTI. OpenCTI
resolves these in parallel on its end. The 15-minute cache means the cost is paid once per
actor per cache window. Expected increase in query time: +200-500ms on cache miss. Acceptable
given the cache TTL.

The `targeted_countries` and `targeted_sectors` fields already exist on the list endpoint
(fetched in the index query). The enrichment endpoint adding deeper/larger versions is
intentional — the list query caps at 20 items, the enrichment query can fetch up to 50.

### Normalizer Addition

In `normalizeEnrichmentResponse()`:

```php
return [
    'ttps'         => ...,
    'tools'        => ...,
    'malware'      => ...,
    'campaigns'    => ...,
    'relationships'=> ...,
    'victimology'  => $this->normalizeVictimology($intrusionSet),  // new
];
```

New private method `normalizeVictimology(array $intrusionSet): array` returns:
```php
[
    'countries'     => [...],  // [['id' => ..., 'name' => ...], ...]
    'regions'       => [...],
    'sectors'       => [...],
    'organizations' => [...],  // only identity_class !== 'sector'
]
```

---

## 7. Frontend Modal Tab System

### Current TABS Array (ThreatActorsPage.jsx, line 550-556)

```js
const TABS = [
  { key: 'overview',       label: 'Overview',       icon: Info },
  { key: 'relationships',  label: 'Relationships',  icon: GitBranch },
  { key: 'ttps',           label: 'TTPs',           icon: Swords },
  { key: 'tools',          label: 'Tools',          icon: Bug },
  { key: 'campaigns',      label: 'Campaigns',      icon: Flag },
];
```

### v6.1 Change: Replace Campaigns with Victimology

```js
import { MapPin } from 'lucide-react'; // or Globe — already imported

const TABS = [
  { key: 'overview',       label: 'Overview',       icon: Info },
  { key: 'relationships',  label: 'Relationships',  icon: GitBranch },
  { key: 'ttps',           label: 'TTPs',           icon: Swords },
  { key: 'tools',          label: 'Tools',          icon: Bug },
  { key: 'victimology',    label: 'Victimology',    icon: Globe },  // replaces campaigns
];
```

Remove the `{activeTab === 'campaigns' && ...}` block (~35 lines, lines 829-863).
Add a new `{activeTab === 'victimology' && ...}` block.

### Victimology Tab Content Structure

The enrichment data arrives as `enrichment.victimology` (new field from extended endpoint).
The tab renders four sub-sections:

1. **Targeted Countries** — cyan pills, same pattern as Overview tab's countries section
2. **Targeted Regions** — text list, muted color
3. **Targeted Sectors** — amber pills, same pattern as Overview tab's sectors section
4. **Targeted Organizations** — small cards with organization name

Reuse the exact pill/tag markup patterns already in the Overview tab (lines 677-714). No new
shared components needed — copy the pattern inline for the tab content since it is structurally
identical and short (~60 LOC).

### Loading/Empty State Reuse

The Victimology tab uses the same `enrichLoading` / `enrichError` guards as TTPs and Tools
tabs. The enrichment fetch is a single call on modal open — victimology data arrives with the
rest of the enrichment payload. No additional loading state needed.

### Import Cleanup

The `Flag` import from `lucide-react` (used only for the Campaigns tab) can be removed.
`Globe` is already imported (used in Overview tab).

**Total change in `ThreatActorsPage.jsx`:** Remove ~35 lines (campaigns tab block + TABS
entry), add ~75 lines (victimology tab block + TABS entry). Net: +40 LOC.

---

## 8. Frontend Page-Level Toggle (Threat Actors ↔ Campaigns)

### URL State Strategy: Query Param

Use `?view=campaigns` via `useSearchParams`. Do NOT use a sub-route (`/threat-actors/campaigns`).

Rationale:
- The existing `ThreatActorsPage.jsx` already uses `useSearchParams` for `after` and `search`
  params. Adding `view` is consistent with the established pattern.
- A sub-route would require adding a new route entry in `App.jsx` and either a nested route
  or a wrapper component. More structural change for no UX benefit.
- The `view` param is preserved when the user navigates back (browser history), which is
  the correct behavior.

### Toolbar Toggle Pill

The existing toolbar (lines 144-190 in `ThreatActorsPage.jsx`) has a search input and
pagination. Add a pill toggle group between the page header and the toolbar — or replace the
header subtitle with the toggle if space is tight.

```jsx
// New: ViewToggle component inline in ThreatActorsPage
function ViewToggle({ view, onSwitch }) {
  return (
    <div className="flex items-center gap-1 p-1 bg-surface-2 rounded-lg">
      <button
        onClick={() => onSwitch('actors')}
        className={`px-3 py-1.5 rounded text-xs font-sans transition-colors ${
          view === 'actors' ? 'bg-violet text-white' : 'text-text-muted hover:text-text-primary'
        }`}
      >
        Threat Actors
      </button>
      <button
        onClick={() => onSwitch('campaigns')}
        className={`px-3 py-1.5 rounded text-xs font-sans transition-colors ${
          view === 'campaigns' ? 'bg-violet text-white' : 'text-text-muted hover:text-text-primary'
        }`}
      >
        Campaigns
      </button>
    </div>
  );
}
```

### View Switching Logic

`ThreatActorsPage.jsx` reads `view` from `useSearchParams`:
```js
const view = searchParams.get('view') || 'actors';
```

When `view === 'campaigns'`, the page calls `fetchCampaigns(params)` from a new
`frontend/src/api/threat-campaigns.js` (mirrors `threat-actors.js`). The card grid,
pagination, search, and empty states are shared/reused — the data shape returned by
`/api/threat-campaigns` must match the existing shape fields that `ThreatActorCard` uses
(`name`, `modified`, `aliases`) plus campaign-specific fields (`first_seen`, `last_seen`,
`objective`, `attributed_to`).

Two options for the card grid:

- **Option A (preferred):** Render `CampaignCard` (new inline component, ~50 LOC) when
  `view === 'campaigns'`. Campaigns have different fields (date range instead of motivation,
  attributed actors instead of sectors). A separate card avoids prop-drilling conditional logic.
- **Option B:** Reuse `ThreatActorCard` with optional fields. Works if field overlap is high
  enough, but campaigns don't have `aliases` or `motivation` — empty state renders oddly.

Option A is the clean choice.

### `onViewSwitch` Handler

```js
const handleViewSwitch = useCallback((newView) => {
  setSearchParams((prev) => {
    const next = new URLSearchParams(prev);
    next.set('view', newView);
    next.delete('after');         // reset pagination on view switch
    next.delete('search');        // reset search on view switch
    return next;
  });
  setCursorHistory([]);
}, [setSearchParams]);
```

**Estimated LOC change in `ThreatActorsPage.jsx`:** +120 LOC (ViewToggle component, CampaignCard
component, conditional data fetch logic, `view` param handling).
**New file `frontend/src/api/threat-campaigns.js`:** ~15 LOC.

---

## 9. Suggested Build Order

The dependency graph drives the order. Backend before the frontend that consumes it. Map buffer
refactor is internally self-contained and can be a standalone phase.

### Phase Sequence

**Phase 1 — Backend Snapshot Resize (backend only)**
- `ThreatMapService::fetchSnapshot()` — add `$limit` param, parameterize GraphQL `first`
- `SnapshotController` — read and validate `?limit` query param
- Cache key includes limit
- No frontend change yet; existing frontend still works with default 100

**Phase 2 — Backend Victimology (backend only)**
- Extend `ThreatActorService::executeEnrichmentQuery()` with 4 new targeted sub-queries
- Add `normalizeVictimology()` method
- `normalizeEnrichmentResponse()` adds `victimology` key
- Frontend still works — new key is additive, existing tab renders unchanged

**Phase 3 — Backend Campaigns Endpoint (backend only)**
- New `ThreatCampaignService.php`
- New `ThreatCampaign/IndexController.php`
- Route added to `api.php`
- No frontend change yet

**Phase 4 — Threat Map Buffer Refactor (frontend only, self-contained)**
- New `useThreatMapBuffer.js` hook
- `useThreatStream.js` — add `bufferSize` param
- `useLeaflet.js` — remove `markers` prop and its effect
- `ThreatMapPage.jsx` — wire buffer hook, replace pulse/fade helpers with lifecycle sync
- `BufferSizeControl.jsx` — dropdown component
- `LeftOverlayPanel.jsx` — add BufferSizeControl section, pass `onBufferSizeChange` down
- CSS additions in `components.css` for settled dot and cluster icon
- localStorage key `aqua-tip:map-buffer-size`

**Phase 5 — Marker Clustering (frontend only, depends on Phase 4)**
- `npm install leaflet.markercluster`
- CSS imports
- `ThreatMapPage.jsx` — `clusterGroupRef`, threshold check, layer swap logic on bufferSize change
- Test cluster styling against dark theme

**Phase 6 — Victimology Tab (frontend only, depends on Phase 2)**
- `ThreatActorsPage.jsx` — replace Campaigns TABS entry with Victimology
- Remove campaigns tab JSX block
- Add victimology tab JSX block
- Update enrichment response type expectations

**Phase 7 — Campaigns View Toggle (frontend only, depends on Phase 3)**
- `ThreatActorsPage.jsx` — add ViewToggle component, CampaignCard component, view param logic
- `frontend/src/api/threat-campaigns.js` — new API client function

**Phase 8 — Polish + Integration Test**
- End-to-end smoke test: snapshot at 500/1000, clustering at 1000, victimology tab, campaigns view
- CSS audit: settled markers, cluster bubbles, panel layout at all buffer sizes

---

## Component Boundaries

### New Components

| Component | File | Purpose | LOC estimate |
|-----------|------|---------|--------------|
| `useThreatMapBuffer` | `frontend/src/hooks/useThreatMapBuffer.js` | Buffer lifecycle state management | ~120 |
| `BufferSizeControl` | `frontend/src/components/threat-map/BufferSizeControl.jsx` | Dropdown + localStorage persistence | ~50 |
| `CampaignCard` | inline in `ThreatActorsPage.jsx` | Campaign entity card for grid view | ~60 |
| `ViewToggle` | inline in `ThreatActorsPage.jsx` | Pill toggle Threat Actors / Campaigns | ~30 |
| `ThreatCampaignService` | `backend/app/Services/ThreatCampaignService.php` | OpenCTI Campaigns GraphQL + normalize | ~180 |
| `ThreatCampaign/IndexController` | `backend/app/Http/Controllers/ThreatCampaign/IndexController.php` | Thin HTTP controller | ~30 |

### Modified Files

| File | Changes | Scope |
|------|---------|-------|
| `frontend/src/hooks/useThreatStream.js` | Add `bufferSize` param, replace `MAX_EVENTS` constant | Small (~15 LOC) |
| `frontend/src/hooks/useLeaflet.js` | Remove `markers` prop and update-markers effect | Small (~20 LOC removed) |
| `frontend/src/pages/ThreatMapPage.jsx` | Wire `useThreatMapBuffer`, add `bufferSize` state, replace pulse helpers, add marker sync effect | Medium (~80 LOC changed) |
| `frontend/src/components/threat-map/LeftOverlayPanel.jsx` | Add `BufferSizeControl` section, pass `onBufferSizeChange` prop | Small (~20 LOC) |
| `frontend/src/pages/ThreatActorsPage.jsx` | Replace Campaigns tab with Victimology, add ViewToggle + CampaignCard, view param logic | Medium (~160 LOC net change) |
| `frontend/src/api/threat-actors.js` | No change needed — enrichment endpoint unchanged |  |
| `frontend/src/styles/components.css` | Add `.map-settled-marker`, `.map-evicting-marker`, `.map-cluster-icon` | Small (~25 LOC) |
| `backend/app/Services/ThreatActorService.php` | Add 4 victimology sub-queries to enrichment query, add `normalizeVictimology()`, update `normalizeEnrichmentResponse()` | Medium (~80 LOC added) |
| `backend/app/Services/ThreatMapService.php` | Add `$limit` param to `getSnapshot()` / `fetchSnapshot()`, parameterize GraphQL `first` | Small (~15 LOC) |
| `backend/app/Http/Controllers/ThreatMap/SnapshotController.php` | Read and validate `?limit` param, pass to service | Small (~10 LOC) |
| `backend/routes/api.php` | Add `GET /threat-campaigns` route | Trivial |

### New API Files

| File | Purpose |
|------|---------|
| `frontend/src/api/threat-campaigns.js` | `fetchCampaigns()` function, mirrors `threat-actors.js` |

---

## Data Flow

### Threat Map Buffer Flow (v6.1)

```
Snapshot load (GET /api/threat-map/snapshot?limit=N)
    |
    v
useThreatStream(bufferSize)
    |
    +-- events[] (raw ring, capped at bufferSize)
    |
    v
useThreatMapBuffer(events, bufferSize)
    |
    +-- markers[] with state: arriving | settled | evicting
    |
    v
ThreatMapPage (useEffect watches markers)
    |
    +-- arriving:  create L.marker with pulse DivIcon, add to map + markerInstancesRef
    +-- settled:   marker.setIcon(settledIcon) on existing instance
    +-- evicting:  marker.setIcon(evictingIcon), setTimeout 600ms → removeLayer + delete ref
    |
    v
Leaflet map DOM
```

### Campaigns View Flow (v6.1)

```
User clicks "Campaigns" pill toggle
    |
    v
setSearchParams({ view: 'campaigns', after: null, search: null })
    |
    v
ThreatActorsPage re-renders, reads view='campaigns'
    |
    v
fetchCampaigns(params) → GET /api/threat-campaigns
    |
    v
ThreatCampaignService::list() → OpenCTI GraphQL → campaigns(...)
    |
    v
Cached response (15min) → normalize → JSON
    |
    v
CampaignCard grid renders
```

### Victimology Modal Flow (v6.1)

```
User clicks Threat Actor card → modal opens
    |
    v
fetchThreatActorEnrichment(id) → GET /api/threat-actors/{id}/enrichment
    |
    v
ThreatActorService::enrichment() → single OpenCTI GraphQL call
    (now includes targetedCountries/Regions/Sectors/Organizations sub-queries)
    |
    v
normalizeEnrichmentResponse() returns { ttps, tools, malware, campaigns*, relationships, victimology }
    *campaigns key remains in response for backward compatibility even after frontend tab removal
    |
    v
Victimology tab renders enrichment.victimology.{countries, regions, sectors, organizations}
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Per-Render Leaflet Marker Recreation

**What people do:** On every `markers` state change, call `map.clearLayers()` then re-add all
markers from scratch.

**Why it's wrong:** Causes all markers to disappear and re-appear on every SSE event. At 1000
markers, this is a full DOM churn 1-5 times per second during active streams.

**Do this instead:** Maintain `markerInstancesRef` (Map keyed by event ID). Diff the new markers
array against existing instances. Only create/update/remove changed entries.

### Anti-Pattern 2: Putting Buffer Logic in useThreatStream

**What people do:** Expand `useThreatStream` to own the buffer size, marker states, animation
timers, and cluster logic — one giant hook.

**Why it's wrong:** SSE connection lifecycle and marker visualization are independent concerns.
Testing and debugging become impossible. The hook grows to 300+ LOC.

**Do this instead:** `useThreatStream` owns SSE + event ring. `useThreatMapBuffer` owns marker
lifecycle and animation timers. `ThreatMapPage` owns Leaflet instance management.

### Anti-Pattern 3: GraphQL Sub-Query Fan-Out for Victimology in List Query

**What people do:** Add targetedOrganizations + targetedRegions to the list endpoint (the
`intrusionSets` query) to prepopulate cards.

**Why it's wrong:** Every page load (24 actors × 4 sub-queries = 96 additional OpenCTI calls)
amplified by pagination. The list query already has 2 sub-queries per actor; adding 4 more
will time out on large datasets or hit OpenCTI rate limits.

**Do this instead:** Victimology only in the enrichment (single-actor) endpoint, loaded on
modal open. The list query's existing `targeted_countries` and `targeted_sectors` (≤20 items
each) are sufficient for the card preview.

### Anti-Pattern 4: Sub-Route for Campaigns View

**What people do:** Add `/threat-actors/campaigns` as a new route in React Router.

**Why it's wrong:** Requires changes to `App.jsx`, either a nested route or code-splitting the
page component. The existing `?view=` query param pattern is already established on this page
(`?after=`, `?search=`). Splitting into a route adds navigation complexity (sidebar active
state, breadcrumbs, back button behavior) with no UX gain.

**Do this instead:** `?view=campaigns` query param handled inside the existing `ThreatActorsPage`.

---

## Sources

- Codebase inspection: all findings are HIGH confidence, derived from reading the live source
- `frontend/src/pages/ThreatMapPage.jsx` — current buffer/pulse architecture
- `frontend/src/hooks/useThreatStream.js` — SSE + event ring implementation
- `frontend/src/hooks/useLeaflet.js` — map init + marker layer pattern
- `frontend/src/pages/ThreatActorsPage.jsx` — modal tab system, TABS array, enrichment fetch
- `frontend/src/components/threat-map/LeftOverlayPanel.jsx` — panel layout, prop interface
- `frontend/src/components/threat-map/RightOverlayPanel.jsx` — right panel structure
- `backend/app/Services/ThreatActorService.php` — enrichment GraphQL, normalization methods
- `backend/app/Services/ThreatMapService.php` — snapshot fetch, geo resolution
- `backend/app/Http/Controllers/ThreatMap/SnapshotController.php` — snapshot response shape
- `backend/routes/api.php` — existing route structure, middleware groups

---

*Architecture research for: AQUA TIP v6.1 Threat Map Buffer & Threat Actor Depth*
*Researched: 2026-04-17*
