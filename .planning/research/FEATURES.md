# Feature Landscape — v6.1 Threat Map Buffer & Threat Actor Depth

**Domain:** Live cyber threat intelligence platform (threat map + threat actor profiles)
**Researched:** 2026-04-17
**Milestone:** v6.1

---

## Section 1: Persistent Live Threat Map Buffer

### What Production Threat Maps Do

Kaspersky Cybermap, Check Point ThreatCloud, Fortinet FortiGuard Threat Map, and Radware Live Threat Map all follow a consistent pattern:

- **Markers persist** — attacks do not disappear after their animation; a "current snapshot" of recent activity stays on the globe/map as static dots
- **New arrivals animate distinctively** — a pulse ring, arc line, or ripple highlights the newest event, then the marker settles into a resting static state
- **No explicit eviction countdown** — production maps do not show users that old markers are being removed; eviction is silent and imperceptible
- **Buffer size is hidden** — production maps never surface a "buffer size" control to users; they manage this server-side based on time windows or fixed counts
- **Count labels** — most show a live counter ("X attacks in last 24h" or "X attacks today") not a buffer-size indicator

### Table Stakes for v6.1 Buffer Feature

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| All buffered events render as static markers on map at all times | Core persistence behavior users see in Kaspersky/Check Point | Medium | Requires structural change from current "pulse-only" model. Currently `addPulseMarker` removes itself after 1600ms; a new "settled marker" layer must persist. |
| New arrivals pulse-ring then settle into static dot | Differentiates newest event from the background; universal pattern | Low | Existing `addPulseMarker` handles the pulse. After pulse completes, add the static marker. |
| Oldest markers fade out quietly when buffer is full | Prevents visual clutter; silent so user does not notice | Medium | Eviction must animate (opacity fade over ~800ms) not disappear abruptly. Use a Leaflet divIcon with CSS transition. |
| Buffer label updates in overlay panel ("500 Latest Attacks") | User understands what they are seeing | Low | Update the hardcoded "100 Latest Attacks" string to reflect selected buffer size. |
| `useThreatStream.js` buffer cap driven by localStorage setting | All downstream consumers see correct slice | Low | `MAX_EVENTS` constant (currently hardcoded to 100) must become reactive state read from localStorage. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Configurable buffer size dropdown (100/500/1000/2000) | Power users can tune density vs performance; no other open TIP offers this as a visible control | Low | `<select>` in LeftOverlayPanel "Counters" section or as a small dropdown under the label. Persist via localStorage key `aqua-tip:map-buffer-size`. |
| Smooth settle animation distinct from pulse | Visual polish — pulse ring grows outward, then a small solid dot fades in underneath | Low | CSS keyframes: after pulse completes (~1600ms), render a permanent `L.circleMarker` or styled divIcon with a `fadeIn` animation. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Showing eviction countdown timers per marker | Distracts from threat data; no production map does this | Silent CSS opacity transition on eviction |
| Removing ALL markers on buffer-size change | Jarring reset; loses continuity | Re-slice existing buffer array — evict excess oldest events silently |
| Animating arcs / attack lines (source → target) | Requires source geolocation data not available in SSE stream; high complexity for questionable value | Stick to single-location pulse-and-settle dot |
| Per-marker hover tooltips showing event details | Overlaps with click-to-pan feed; adds Leaflet popup complexity | The left panel feed already handles event details on click |

### Implementation Dependencies

- **Depends on existing:** `useThreatStream.js` (buffer state), `addPulseMarker` in `ThreatMapPage.jsx`, `LeftOverlayPanel` (houses the dropdown), localStorage key pattern (`aqua-tip:*`)
- **New map layer needed:** A separate Leaflet layer group for settled static markers (distinct from pulse-only markers). Current architecture adds pulse markers directly to `map` without a group reference, making bulk eviction hard. A `L.layerGroup` keyed by event ID solves this.
- **No backend changes needed** for buffer management — this is entirely frontend state. The SSE stream provides events; the frontend decides how many to render.

---

## Section 2: Marker Clustering at Scale

### Standard UX (Leaflet.markercluster defaults)

`leaflet.markercluster` is the industry-standard plugin. Behavior users expect:

- **Cluster circles** with count badge show where markers are dense
- **Color encodes size:** default thresholds at 10 and 100 markers change icon from small/green to medium/yellow to large/red. These thresholds are customizable via `iconCreateFunction`.
- **Zoom to cluster:** clicking a cluster zooms the map until the cluster splits or spiderfies at max zoom
- **Spiderfy at max zoom:** if markers share the same coordinates at max zoom, they fan out in a spiral so each is individually clickable
- **Hover shows coverage boundary:** a polygon overlay shows which geographic area the cluster covers
- **Smooth animate:** zoom transitions smoothly split/merge cluster groups
- **Performance:** handles 2000 markers with no frame drops; 10,000+ possible in Chrome

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Auto-enable clustering when buffer > 500 | At 500+ markers the map becomes unreadable without clustering; users expect this on any large-dataset map | Medium | Conditional: if `bufferSize <= 500`, render `L.circleMarker` directly on map; if `bufferSize > 500`, route all markers through a `L.markerClusterGroup`. |
| Cluster count badge visible | Core orientation signal — users need to know "80 attacks in this region" | Low | Default Leaflet.markercluster behavior; no custom work needed unless overriding `iconCreateFunction` for dark theme. |
| Click cluster to zoom into it | Universal map UX; users expect this from any clustered map | Low | Default `zoomToBoundsOnClick: true` behavior. |
| Spiderfy at max zoom | Prevents "stuck cluster" confusion when multiple attacks share one city | Low | Default `spiderfyOnMaxZoom: true`. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Custom cluster icon matching dark glassmorphism theme | Visual consistency; default yellow/green clusters look out of place on dark map | Low | Override `iconCreateFunction` using the existing violet/cyan/red/amber palette. Size tiers: `<10` cyan, `10-99` amber, `100+` red — matches the existing threat-severity color logic. |
| Disable clustering below zoom level 6 | At city/region zoom, individual markers are more useful than clusters | Low | `disableClusteringAtZoom: 6` option. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Enabling clustering when buffer <= 500 | At 100–500 markers, individual markers are readable; clustering hides attack origin detail | Conditional logic: threshold at 500 |
| Custom cluster expand animation (canvas/WebGL) | Significant complexity for marginal UX gain; Leaflet.markercluster's built-in CSS animation is sufficient | Use built-in `animate: true` default |
| Heatmap layer as alternative to clustering | Heatmaps require a separate plugin (Leaflet.heat), lose per-event identity, and conflict with click-to-pan UX | Cluster groups preserve individual event identity |

### Implementation Dependencies

- **New dependency:** `leaflet.markercluster` npm package (v1.5.x). Must be imported carefully — the plugin attaches itself to `L` as a side effect; use `import 'leaflet.markercluster'` after Leaflet.
- **CSS:** `leaflet.markercluster/dist/MarkerCluster.css` and `MarkerCluster.Default.css` must be imported. These can be overridden via Tailwind's arbitrary values or a CSS override file.
- **Depends on existing:** `useLeaflet.js` hook creates the map instance; the `L.markerClusterGroup` must be added to that map, or the hook must expose `map` more directly. Currently `ThreatMapPage.jsx` receives `map` via `handleMapReady` callback — this is sufficient.
- **Dynamic switching:** when user changes buffer from 500→100 or 100→500, all markers must be cleared and re-added to the appropriate layer (clustered vs unclustered). Use `clearLayers()` + `addLayers()` for bulk perf.

---

## Section 3: Victimology Tab (Threat Actor Modal)

### What OpenCTI Victimology Actually Contains

OpenCTI's Knowledge tab for Intrusion Sets and Campaigns includes a "victimology" thematic view within its Diamond model display. From the OpenCTI documentation and GitHub issues:

**Victimology is driven by `targets` STIX relationships.** An Intrusion Set node with `targets` edges pointing to Identity objects (Country, Region, Sector, Organization) populates this view. The `located-at` relationship connects Organizations to Countries/Regions.

**Entities in the victimology quadrant:**
- **Countries** — STIX `Location` with `x_opencti_location_type: Country`; identified by ISO alpha-2/3 code and name
- **Regions** — STIX `Location` with `x_opencti_location_type: Region` (e.g., "Northern Europe", "East Asia")
- **Sectors** — STIX `Identity` with `identity_class: class` (OpenCTI custom; e.g., "Finance", "Healthcare", "Government")
- **Organizations** — STIX `Identity` with `identity_class: organization`; may be linked to countries via `located-at`

**Visual hierarchy in OpenCTI:** Countries appear as flags/chips, Sectors as labeled chips, Organizations as a list with optional country flag. No complex visualization — it is a flat list grouped by type.

**What the existing modal already has (in Overview tab):** `targeted_countries` and `targeted_sectors` arrays from the card API response. These are already displayed as chips. The Victimology tab is an **expansion** of this data with regions and organizations added, not a replacement of something unrelated.

**The current Campaigns tab in the modal shows:** campaign name + first_seen/last_seen date range. This is thin data. Replacing it with Victimology provides substantially more intelligence value.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Targeted Countries list with flag emoji or ISO code | Countries are the most prominent victimology signal; analysts scan for these first | Low | Flag emoji via country code (e.g., `countryCode.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397))`). No extra dependency needed. |
| Targeted Sectors list (chip style) | Sectors tell "what industries are at risk"; universally expected in threat actor profiles | Low | Reuse existing amber chip style from Overview tab. |
| Targeted Regions list | Rounds out geographic picture; OpenCTI exposes regions as a Location type | Low | Cyan chip style to distinguish from countries. |
| Targeted Organizations list (if available) | High-value intel — specific org names tell analysts if their employer is directly targeted | Medium | OpenCTI returns organizations via `targets` relationships on Intrusion Set. Needs a backend enrichment query addition. |
| Empty state per sub-section | Not all actors target all entity types; empty state prevents confusion | Low | Show muted "No [countries/sectors/regions/organizations] data available" per sub-section rather than hiding the section. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Country flag + name layout (not just name string) | Matches OpenCTI and Mandiant style; more scannable than text-only | Low | Flag emoji + country name in same chip; no SVG library needed for modal |
| Sector chip color-coding | Different chip colors for Countries vs Sectors vs Regions vs Organizations creates instant visual hierarchy | Low | Countries: cyan, Sectors: amber, Regions: violet/muted, Organizations: green — consistent with existing design tokens |
| Organization count badge | "3 organizations targeted" when list is long prevents truncation confusion | Low | Same "+N more" pattern used elsewhere in the app |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Interactive world map inside the modal showing targeted countries as highlighted regions | Very high complexity (Leaflet or D3 choropleth inside a modal), slow to render, marginal value vs chip list | Chip list with flag emoji is faster, more readable, and consistent with the existing modal style |
| Full OpenCTI Diamond model visualization (4-quadrant diagram) | Requires custom D3 layout, high complexity, would dwarf the modal | The existing tab structure already organizes knowledge into logical quadrants without the visual overhead |
| Replacing the entire Overview tab | Overview has description, goals, motivation, resource_level, external references — all still valuable | Add Victimology as a replacement for the Campaigns tab only |

### Implementation Dependencies

- **Backend enrichment query must add:** `regions` and `organizations` fields to the existing `fetchThreatActorEnrichment` endpoint response. Currently the endpoint returns `ttps`, `tools`, `malware`, `campaigns`, `relationships`. Add `victimology: { countries, regions, sectors, organizations }` as a new field, and either reuse or replace the top-level `targeted_countries`/`targeted_sectors` fields.
- **GraphQL query extension:** The Laravel `ThreatActorsController@enrichment` must add a `targets` relationship query filtered by `Location` and `Identity` entity types.
- **Tab change:** In `ThreatActorModal`, replace `{ key: 'campaigns', label: 'Campaigns', icon: Flag }` with `{ key: 'victimology', label: 'Victimology', icon: Globe }` (Globe icon is already imported).
- **Data format contract:** `enrichment.victimology.countries[]` = `{ name, code }`, `.regions[]` = `{ name }`, `.sectors[]` = `{ name }`, `.organizations[]` = `{ name, country_name? }`.

---

## Section 4: Campaigns View (Threat Actors Page Toggle)

### How Campaigns Differ from Intrusion Sets in OpenCTI

**Intrusion Set** = the persistent APT group (e.g., "APT28", "Lazarus Group"). Long-lived, persistent, represents the "who + how" over years.

**Campaign** = a specific, time-bounded operation attributed to one or more intrusion sets (e.g., "Operation Aurora", "SolarWinds Campaign"). Short-lived in scope, has a start/end, represents "what they did this time."

**STIX 2 Campaign metadata fields:**
- `name` — campaign name
- `description` — narrative summary
- `aliases` — alternative names
- `first_seen` — ISO timestamp of first observed activity
- `last_seen` — ISO timestamp of last observed activity (or absent if ongoing)
- `objective` — plain-text goal statement

**OpenCTI-specific additions:**
- Attribution relationship: `Campaign --attributed-to--> Intrusion-Set`
- Knowledge sub-graph with victimology, TTPs, tools per campaign

**What belongs on a Campaigns card (dense grid, same pattern as Threat Actors):**
- Campaign name (large, bold)
- `first_seen` — `last_seen` date range (mono font, clock icon)
- `objective` text if present (truncated to 2 lines)
- Attributed intrusion set name as a violet chip (the "parent" actor)
- Modified date (secondary)

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Pill toggle "Threat Actors / Campaigns" in toolbar | Single-page view switching is standard for related-entity lists; tabs and toggles are the canonical pattern | Low | `view` URL param: `?view=campaigns` vs `?view=actors`. Pill toggle in the toolbar row, left-aligned. |
| Campaigns dense card grid (same 4-col pattern) | Visual consistency with Threat Actors; avoids layout whiplash on toggle | Low | Reuse `ThreatActorCard` layout as template; substitute campaign-specific fields. |
| Campaign detail modal (same portal pattern) | Campaigns have enough data (description, TTPs, targets, tools) to warrant a modal | Medium | New `CampaignModal` component following `ThreatActorModal` structure. Tabs: Overview, TTPs, Tools. Victimology is optional at v6.1 scope. |
| URL state preserved on refresh (`?view=campaigns` persists) | Users expect the back button and refresh to maintain context | Low | `useSearchParams` already used in the page; add a `view` param alongside `search` and `after`. |
| Pagination applies to Campaigns view independently | Campaigns may have different page counts than Actors | Medium | Separate pagination state per view, or reset cursor on view toggle. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Attributed intrusion set chip on Campaign card | Immediately shows "this campaign belongs to APT28" — primary context users want | Low | Backend returns `attributed_to` array; show first attribution as a violet chip on the card |
| Active/Inactive badge based on `last_seen` | Campaigns with no `last_seen` or `last_seen` within 30 days are "active"; older are "inactive" | Low | Green dot + "Active" vs muted dot + "Inactive" in card corner |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Separate `/campaigns` route | Creates two sidebar nav entries, splits bookmark/share surface unnecessarily | Pill toggle within `/threat-actors` route; `?view=campaigns` differentiates |
| Combined view showing both Actors and Campaigns in one list | Mixing entity types causes confusion; actors and campaigns are fundamentally different | Strict separation via toggle |
| Nested Campaigns under Threat Actor cards (accordion expand) | The accordion pattern works poorly with the dense 4-col grid; creates inconsistent row heights | Modal already handles the actor→campaign relationship; toggle view handles list |

### Implementation Dependencies

- **New backend endpoint:** `GET /api/threat-actors/campaigns` with same cursor-based pagination as `GET /api/threat-actors`. Returns Campaign STIX objects from OpenCTI.
- **New Laravel service method:** `ThreatActorsService::getCampaigns()` — GraphQL query against OpenCTI Campaign type with `name, description, first_seen, last_seen, objective, aliases, modified` fields plus `attributed-to` relationship edge traversal.
- **Frontend:** `ThreatActorsPage.jsx` grows a `view` state (`'actors'` or `'campaigns'`), driven by `searchParams.get('view')`. Pill toggle updates `view` param and resets `after`/`search` params. Two separate data-fetch paths: existing `fetchThreatActors` and new `fetchCampaigns`.
- **Pagination isolation:** `cursorHistory` must reset on view toggle. Simplest approach: treat `view` change as equivalent to `search` change (clears cursor history).

---

## Section 5: Pill Toggle vs Tabs vs Sub-routes for View Switching

### Pattern Analysis

**Three options exist:**

1. **URL query param + pill toggle** (`?view=campaigns`) — used in this app already for `search` and `after` params; `useSearchParams` handles it. Toggle is a button group in the toolbar row. Back button works, refresh preserves state, no route changes needed. **Recommended.**

2. **Sub-routes** (`/threat-actors` vs `/threat-actors/campaigns`) — cleanest URL semantics but requires adding a route in `App.jsx`, wrapping in a parent route, and potentially duplicating layout. Overkill for a single toggle.

3. **Tabs component** (CSS-only, no URL) — simplest to build but breaks refresh behavior and makes URLs non-shareable. The research is clear: URL state is expected for this type of content-switching.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Pill toggle style (not full tab bar) | The page already has a search bar + pagination in the toolbar; adding a full tab bar would crowd it. A compact 2-option pill toggle fits in the toolbar row. | Low | Two-button group: `[Threat Actors] [Campaigns]`. Active button: `bg-violet text-white`. Inactive: `bg-surface border border-border text-text-muted`. |
| Toggle in toolbar row left of search bar | Contextually clear — toggle controls what you are searching | Low | `<div className="flex items-center gap-3">` already in toolbar; prepend the toggle before the search input |
| View state drives search scope | Searching while in "Campaigns" view should search campaigns, not actors | Low | Pass `view` to fetch functions as a param; backend supports separate endpoints |
| URL change on toggle (no full page reload) | Standard SPA behavior; `useSearchParams` handles this naturally | Low | `updateParam('view', 'campaigns')` — same pattern as existing `updateParam('search', ...)` |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Page title changes on toggle ("Threat Actors" / "Campaigns") | Users oriented immediately; `<h1>` updates reactively | Low | Conditional: `view === 'campaigns' ? 'Campaigns' : 'Threat Actors'` |
| Subtitle changes on toggle | "Browse known threat actor profiles" → "Browse attributed campaign operations" | Low | Same conditional pattern |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Hash-based routing (`#campaigns`) | React Router DOM 7 discourages hash routing; doesn't integrate with `useSearchParams` | Query param approach |
| Remembering view in localStorage | View is contextual to current session; URL param is better because it is shareable and already encodes intent | URL param only; no localStorage |

---

## Feature Dependencies Map

```
Buffer Size Dropdown (LeftOverlayPanel)
  → useThreatStream.js MAX_EVENTS reactive state
  → addPulseMarker → settled marker layer (new L.layerGroup)
  → Buffer label update in LeftOverlayPanel header

Marker Clustering
  → Buffer Size state (only enables when > 500)
  → leaflet.markercluster npm dep (new)
  → Settled marker layer (replaces direct map.addLayer)
  → Custom iconCreateFunction for dark theme

Victimology Tab (Modal)
  → fetchThreatActorEnrichment API response (new `victimology` field)
  → Laravel enrichment endpoint GraphQL extension
  → Tab key change in ThreatActorModal TABS array (campaigns → victimology)

Campaigns View (Page Toggle)
  → New backend endpoint GET /api/threat-actors/campaigns
  → New fetchCampaigns frontend API function
  → ThreatActorsPage view state + URL param
  → New CampaignCard and CampaignModal components
  → Cursor history reset on view toggle
```

---

## MVP Recommendation

**Ship all four feature areas in v6.1.** They are independent enough to phase but small enough to ship together.

Prioritize in this order within the milestone:

1. **Buffer + clustering** — one cohesive change to `useThreatStream.js` + `ThreatMapPage.jsx` + new `leaflet.markercluster` dep. Highest visual impact.
2. **Victimology tab** — surgical change: backend adds `victimology` to enrichment response, frontend swaps one tab. Low risk.
3. **Campaigns toggle** — new backend endpoint + new frontend components. Most work but isolated to `ThreatActorsPage.jsx` and new API layer.

**Defer:**
- Campaign detail modal TTPs/Tools tabs (show Overview only in v6.1; enrich in v6.2)
- Victimology within Campaign modal (v6.2; build pattern first on Intrusion Set modal)
- Heatmap layer as alternative to clustering (out of scope)

---

## Sources

- [OpenCTI Threats Documentation](https://docs.opencti.io/latest/usage/exploring-threats/) — Knowledge tab structure, victimology thematic view
- [STIX 2 Defining Campaigns vs Threat Actors vs Intrusion Sets](https://oasis-open.github.io/cti-documentation/examples/defining-campaign-ta-is.html) — Campaign fields, relationship types, metadata schema
- [Filigran Blog: Threat Actors vs Intrusion Sets](https://filigran.io/cti-concepts-threat-actors-vs-intrusion-sets/) — OpenCTI modeling conventions
- [Leaflet.markercluster GitHub](https://github.com/Leaflet/Leaflet.markercluster) — Default cluster behavior, configuration options, color thresholds
- [Leaflet.markercluster npm](https://www.npmjs.com/package/leaflet.markercluster) — Version and install info
- [Rendering Leaflet clusters dynamically (DEV.to)](https://dev.to/agakadela/rendering-leaflet-clusters-fast-and-dynamically-let-s-compare-3-methods-291p) — clearLayers + addLayers performance pattern
- [Check Point Live Threat Map](https://threatmap.checkpoint.com/) — Production threat map UX reference
- [Kaspersky Cybermap](https://cybermap.kaspersky.com/) — Persistent marker + new-arrival highlight reference
- [FortiGuard Threat Map](https://fortiguard.fortinet.com/threat-map) — Buffer/stats panel layout reference
- [React Router URL-based tab state (Pluralsight)](https://www.pluralsight.com/resources/blog/guides/handling-tabs-using-page-urls-and-react-router-doms) — URL param vs local state for view switching
- [OpenCTI GitHub Issue #649 — Inferences: threat actors / intrusion sets](https://github.com/OpenCTI-Platform/opencti/issues/649) — Victimology relationship inference behavior
- [OpenCTI GitHub Issue #12438 — Intrusion Set targeted countries flags](https://github.com/OpenCTI-Platform/opencti/issues/12438) — Country flag display pattern in OpenCTI
