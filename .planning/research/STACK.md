# Technology Stack — v6.1 Threat Map Buffer & Threat Actor Depth

**Project:** AQUA TIP
**Milestone:** v6.1
**Researched:** 2026-04-17
**Scope:** Additive-only. Documents stack changes and integration points for NEW v6.1 features only.

---

## Decision Summary

| Area | Decision | Confidence |
|------|----------|------------|
| Marker clustering | `leaflet.markercluster@1.5.3` — single viable option | HIGH |
| Dark theme clustering | Custom `iconCreateFunction` + inline `L.divIcon` — skip default CSS | HIGH |
| Lazy-load clustering | Dynamic `import()` inside existing `useLeaflet` hook | HIGH |
| Buffer state | React `useState` + `useRef` — no new state library | HIGH |
| localStorage pattern | Existing `try/catch` inline pattern — extend, not abstract | HIGH |
| OpenCTI Campaigns page | Separate `campaigns` query (not enrichment subfield) | HIGH |
| OpenCTI victimology | Extend existing `stixCoreRelationships` fragment pattern in enrichment query | HIGH |
| Backend buffer scaling | No backend change needed — buffer is frontend-only | HIGH |
| Snapshot query limit | Needs `first:` param increase from 100 to 2000 when buffer grows | MEDIUM |

---

## 1. Marker Clustering — `leaflet.markercluster@1.5.3`

### Why This Library

The project uses vanilla Leaflet 1.9.4 loaded via a custom `useLeaflet` hook (no react-leaflet). The only production-stable clustering plugin for vanilla Leaflet is `leaflet.markercluster`. It has 4.1M weekly npm downloads, is the official Leaflet organization plugin, and was purpose-built for this use case.

`leaflet.markercluster@1.5.3` is the latest stable release (unchanged since 2021 but the underlying Leaflet API it targets has not changed). It is confirmed compatible with Leaflet 1.9.x. No fork or alternative is needed.

Do NOT use `react-leaflet-markercluster` — that requires react-leaflet, which is not in this project and would be a heavyweight dependency conflict.

### Installation

```bash
cd frontend
npm install leaflet.markercluster@1.5.3
```

No additional `@types` package is needed (project has no TypeScript).

### CSS Strategy — Skip Default Stylesheets

The default `MarkerCluster.Default.css` renders circular cluster badges in a light-blue/green/yellow color progression. These clash with the dark theme and cannot be overridden without specificity fights.

**The correct approach:** Do NOT import `MarkerCluster.Default.css`. Import only `MarkerCluster.css` (which provides the spiderfy animation geometry), then render all cluster icons via a custom `iconCreateFunction` that returns an `L.divIcon` with Tailwind-compatible inline styles matching the design system.

```css
/* Import ONLY the geometry CSS, not the color CSS */
import 'leaflet.markercluster/dist/MarkerCluster.css';
/* Do NOT import: leaflet.markercluster/dist/MarkerCluster.Default.css */
```

Example cluster icon using design system colors:

```js
iconCreateFunction: (cluster) => {
  const count = cluster.getChildCount();
  const color = count > 100 ? '#FF3B5C' : count > 20 ? '#FFB020' : '#00E5FF';
  return L.divIcon({
    html: `<div style="
      background:${color}20;
      border:1.5px solid ${color};
      border-radius:50%;
      width:36px;height:36px;
      display:flex;align-items:center;justify-content:center;
      font-family:'JetBrains Mono',monospace;
      font-size:11px;color:${color};
    ">${count}</div>`,
    className: '',
    iconSize: [36, 36],
  });
}
```

Color thresholds match the existing `map-event-pulse` color system (red = high density, amber = medium, cyan = low).

### Lazy-Load Integration Point

The cluster group must be created AFTER `leaflet.markercluster` loads and the Leaflet map is initialized. The existing `useLeaflet` hook already handles lazy Leaflet init via `useEffect`. The markercluster import can be deferred inside the same hook, or inside `ThreatMapPage.jsx` as a separate dynamic import gated on `bufferSize > 500`.

The `markerLayerRef` in `useLeaflet.js` currently holds an `L.layerGroup()`. When clustering is active, this should be replaced with an `L.markerClusterGroup(options)`. The hook's `onReady(map)` callback already exposes the map instance to `ThreatMapPage.jsx`, so cluster group management can live in the page component (via `leafletMapRef`) rather than requiring a hook rewrite.

Recommended pattern:

```js
// In ThreatMapPage.jsx — gated on buffer size
useEffect(() => {
  if (!leafletMapRef.current) return;
  import('leaflet.markercluster').then(() => {
    // L.markerClusterGroup is now available on global L
    clusterGroupRef.current = L.markerClusterGroup({ iconCreateFunction, ... });
    leafletMapRef.current.addLayer(clusterGroupRef.current);
  });
}, [bufferSize]);
```

---

## 2. Frontend Buffer State Management

### No New State Library Needed

The current `useThreatStream` hook uses `useState` + `useRef` for a 100-event buffer. Scaling to 2000 events requires no architectural change. React state handles arrays up to several thousand objects without performance problems as long as renders are not unnecessarily triggered.

The critical performance constraint is NOT state management — it is Leaflet marker DOM insertion. With 2000 markers all rendered as individual DOM nodes, frame rates degrade. This is precisely why marker clustering is required at `bufferSize > 500`: the cluster group batches DOM updates.

### Buffer Sizing Pattern

The `MAX_EVENTS` constant in `useThreatStream.js` (currently `const MAX_EVENTS = 100`) must become a parameter passed into the hook, driven by a localStorage-persisted value in `ThreatMapPage.jsx`.

```js
// useThreatStream.js signature change
export function useThreatStream({ maxEvents = 100 } = {}) { ... }
```

```js
// ThreatMapPage.jsx — buffer size from localStorage
const [bufferSize, setBufferSize] = useState(() => {
  try {
    const stored = localStorage.getItem('aqua-tip:threat-map-buffer-size');
    const parsed = parseInt(stored, 10);
    return [100, 500, 1000, 2000].includes(parsed) ? parsed : 100;
  } catch {
    return 100;
  }
});
```

No `useRef` tricks are needed to hold the eviction ring buffer. The existing `[newEvent, ...prev].slice(0, maxEvents)` pattern in `useThreatStream.js` is O(n) on every event but acceptable at 2000 events (array spread + slice of 2000 items is ~microseconds). If profiling shows contention, upgrade to a `useRef`-backed circular buffer, but start with the simple approach.

### Static Marker Layer for Persistent Buffer

The current implementation adds transient pulse markers (auto-removed after 1600ms) but does NOT maintain a persistent marker layer for buffered events. The new `bufferMarkers` layer (or cluster group) will be a separate Leaflet layer from the pulse ring layer. This separation is already supported by the architecture — `addPulseMarker` and `addHighlightPulse` add directly to the map, while the persistent layer is a distinct `LayerGroup` / `MarkerClusterGroup`.

Fade-out animation for evicted markers: implement via CSS `opacity` transition on the `L.divIcon` element. Store a `Map<eventId, L.Marker>` in a `useRef` to look up the marker for a specific event when it is evicted from the buffer.

---

## 3. localStorage Pattern for Buffer Size

### Existing Pattern (from codebase audit)

Three patterns currently exist:

**Pattern A — Inline in component** (used in `ThreatMapPage.jsx` for `panelsCollapsed`):
```js
const STORAGE_KEY = 'aqua-tip:panels-collapsed';

const [panelsCollapsed, setPanelsCollapsed] = useState(() => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
});

useEffect(() => {
  try {
    localStorage.setItem(STORAGE_KEY, String(panelsCollapsed));
  } catch {
    // localStorage unavailable — degrade silently
  }
}, [panelsCollapsed]);
```

**Pattern B — Extracted hook** (used in `useSidebarCollapse.js`):
Separate read/write helpers, exported as a hook with `toggle()`.

**Pattern C — JSON value** (used in `DarkWebPage.jsx`):
`JSON.stringify`/`JSON.parse` for structured objects.

### Recommendation for Buffer Size

Use Pattern A (inline) in `ThreatMapPage.jsx` since the buffer size state already lives there alongside `panelsCollapsed`. This keeps related localStorage keys co-located and avoids creating a new hook for a single integer.

```js
const BUFFER_SIZE_KEY = 'aqua-tip:threat-map-buffer-size';

const [bufferSize, setBufferSize] = useState(() => {
  try {
    const stored = localStorage.getItem(BUFFER_SIZE_KEY);
    const parsed = parseInt(stored, 10);
    return [100, 500, 1000, 2000].includes(parsed) ? parsed : 100;
  } catch {
    return 100;
  }
});

// Persist on change (guard against invalid values)
useEffect(() => {
  try {
    localStorage.setItem(BUFFER_SIZE_KEY, String(bufferSize));
  } catch {
    // localStorage unavailable — degrade silently
  }
}, [bufferSize]);
```

The `parseInt` + whitelist validation guards against corrupted storage values. The `try/catch` is the project-wide convention for localStorage access. The key follows the `aqua-tip:` namespace already established.

---

## 4. OpenCTI Backend — Campaigns Page Query

### Campaigns as a Separate Entity Type

The current `ThreatActorService::enrichment()` fetches campaigns as a sub-relationship of an `intrusionSet` (Campaign --attributed-to--> IntrusionSet). This is the correct approach for the modal enrichment tab.

For the new standalone Campaigns view on the Threat Actors PAGE (the toolbar toggle), campaigns must be queried as top-level `Campaign` entities, not as intrusion set subfields. OpenCTI exposes a `campaigns` root query with the same cursor-pagination pattern as `intrusionSets`.

**New GraphQL query structure for `CampaignService::list()`:**

```graphql
query (
  $first: Int!,
  $after: ID,
  $search: String,
  $orderBy: CampaignsOrdering,
  $orderMode: OrderingMode
) {
  campaigns(
    first: $first
    after: $after
    search: $search
    orderBy: $orderBy
    orderMode: $orderMode
  ) {
    edges {
      node {
        id
        name
        description
        aliases
        first_seen
        last_seen
        modified
        objectLabel {
          value
        }
        createdBy {
          ... on Identity {
            id
            name
          }
        }
      }
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
      globalCount
    }
  }
}
```

`CampaignsOrdering` enum values in OpenCTI include `name`, `modified`, `created`, `first_seen`, `last_seen`. Use `modified` + `desc` as default (consistent with threat actors).

### Implementation: New Service, Not Extension

Create `App\Services\CampaignService` following the exact same structure as `ThreatActorService`: constructor injects `OpenCtiService`, `list()` method with cache key, `executeQuery()` private method, `normalizeResponse()`. The 15-minute cache TTL is appropriate.

Do NOT fold campaigns into `ThreatActorService` — they are different entity types with different fields.

Add a corresponding `App\Http\Controllers\Campaign\IndexController` and route `GET /api/campaigns`. Apply the existing `FeatureGate` middleware (campaigns are a gated feature).

---

## 5. OpenCTI Backend — Victimology Tab in Threat Actor Modal

### What "Victimology" Means in OpenCTI Schema

Victimology relationships flow FROM an IntrusionSet TO target entities. The target entity types are:
- `Country` — geographic targeting
- `Region` — regional targeting  
- `Sector` — industry/sector targeting
- `Organization` — specific org targeting (via `Identity` with subtype)

All four use the `targets` relationship type. The existing enrichment query in `executeEnrichmentQuery()` already fetches `targetedCountries` and `targetedSectors` in the LIST query (for card display), but the ENRICHMENT query (for the modal) does NOT include them — and the modal's Overview tab pulls these from the list-level `actor` prop, not from `enrichment`.

### GraphQL Fragment to Add to Enrichment Query

Add a `victimology` sub-query block inside the existing `intrusionSet($id)` enrichment query:

```graphql
victimologyCountries: stixCoreRelationships(
  relationship_type: "targets"
  toTypes: ["Country"]
  first: 50
) {
  edges {
    node {
      to {
        ... on Country {
          id
          name
          x_opencti_aliases
        }
      }
    }
  }
}
victimologyRegions: stixCoreRelationships(
  relationship_type: "targets"
  toTypes: ["Region"]
  first: 50
) {
  edges {
    node {
      to {
        ... on Region {
          id
          name
        }
      }
    }
  }
}
victimologySectors: stixCoreRelationships(
  relationship_type: "targets"
  toTypes: ["Sector"]
  first: 50
) {
  edges {
    node {
      to {
        ... on Sector {
          id
          name
        }
      }
    }
  }
}
victimologyOrgs: stixCoreRelationships(
  relationship_type: "targets"
  toTypes: ["Organization"]
  first: 50
) {
  edges {
    node {
      to {
        ... on Organization {
          id
          name
        }
      }
    }
  }
}
```

The existing `... on Country`, `... on Sector` inline fragment pattern is already validated and working in the `list()` query. Reusing the same fragment syntax in the enrichment query is safe.

### Normalized Output Shape

Add to `normalizeEnrichmentResponse()`:

```php
'victimology' => [
    'countries' => $this->flattenRelationshipTargets(
        $intrusionSet['victimologyCountries']['edges'] ?? []
    ),
    'regions' => $this->flattenRelationshipTargets(
        $intrusionSet['victimologyRegions']['edges'] ?? []
    ),
    'sectors' => $this->flattenRelationshipTargets(
        $intrusionSet['victimologySectors']['edges'] ?? []
    ),
    'organizations' => $this->flattenRelationshipTargets(
        $intrusionSet['victimologyOrgs']['edges'] ?? []
    ),
],
```

The existing `flattenRelationshipTargets()` method already handles this shape (extracts `node.to.name`). No new normalization code needed.

### Tab Replacement

The modal currently has 5 tabs: Overview, Relationships, TTPs, Tools, Campaigns. The plan replaces `Campaigns` with `Victimology`. The `enrichment.campaigns` data still exists in the API response (used for nothing in the new tab arrangement). The `campaigns` subfield of the enrichment can remain in the backend response without harm — the frontend simply ignores it in the new Victimology tab.

---

## 6. SSE Backend Buffer — Does It Need Scaling?

### Finding: No Backend Config Change Needed

The term "MAP_EVENT_BUFFER" does not exist anywhere in the codebase. There is no env variable controlling the SSE relay's buffer size. The StreamController streams events one-at-a-time as they arrive from OpenCTI — it does not buffer events server-side.

The configurable buffer (100/500/1000/2000) is a FRONTEND concept: how many events `useThreatStream` retains in React state. The backend SSE stream is stateless per connection.

The only backend component with a fixed size is the snapshot query in `ThreatMapService::fetchSnapshot()`, which hardcodes `first: 100`. If the user selects a larger buffer (e.g., 2000), the initial snapshot will only provide 100 events for hydration — the rest accumulate via live SSE after page load.

**Options:**

Option A (recommended): Accept this behavior. The snapshot hydrates with up to 100 historical events; live SSE fills the remaining buffer slots in real-time. The buffer fills to the selected size over time. This is functionally correct and requires zero backend changes.

Option B: Add a `?limit=` query param to `GET /api/threat-map/snapshot` and pass the user's buffer size. `SnapshotController` passes it to `ThreatMapService::getSnapshot($limit)` which adjusts `first:` in the GraphQL query. This gives an accurate initial fill but requires OpenCTI to return 2000 observables in a single GraphQL call (OpenCTI supports `first: 2000` but response time increases proportionally with geo enrichment).

**Recommendation:** Ship with Option A (no backend change). The 15-minute snapshot cache means a 2000-item query would lock the cache for all users. Option B can be a follow-on optimization if users find the slow fill-up experience poor.

---

## 7. What NOT to Add

| Rejected Addition | Reason |
|-------------------|--------|
| `react-leaflet` | Project uses vanilla Leaflet via `useLeaflet` hook — adding react-leaflet creates parallel map instances and class conflicts |
| `zustand` / `jotai` / Redux | React `useState` + `useRef` is sufficient for 2000-item buffer. No cross-component state sharing that would justify a store |
| `leaflet-realtime` | SSE connection is already handled by `useThreatStream`. Adding leaflet-realtime would duplicate the SSE layer |
| `d3-geo` for clustering | D3 is already a dependency but cluster geometry belongs to leaflet.markercluster |
| `worker_threads` / Web Workers | Not needed at 2000 events — geo aggregation in React state is fast enough on the main thread |
| New PHP packages for Campaign query | OpenCtiService handles raw GraphQL — no new Composer packages needed |

---

## Installation Summary

### Frontend — One New Package

```bash
cd frontend
npm install leaflet.markercluster@1.5.3
```

### Backend — No New Packages

All backend changes are query additions to `ThreatActorService` and a new `CampaignService` that reuses the existing `OpenCtiService` injection pattern. No new Composer dependencies.

---

## Sources

- [leaflet.markercluster on npm](https://www.npmjs.com/package/leaflet.markercluster) — version 1.5.3, confirmed latest stable
- [Leaflet.markercluster GitHub](https://github.com/Leaflet/Leaflet.markercluster) — `iconCreateFunction` API, CSS file breakdown
- [OpenCTI GraphQL API docs](https://docs.opencti.io/latest/reference/api/) — campaigns root query, stixCoreRelationships filter patterns
- Codebase audit: `frontend/src/hooks/useThreatStream.js`, `frontend/src/hooks/useLeaflet.js`, `frontend/src/pages/ThreatMapPage.jsx`, `backend/app/Services/ThreatActorService.php`, `backend/app/Http/Controllers/ThreatMap/StreamController.php`
