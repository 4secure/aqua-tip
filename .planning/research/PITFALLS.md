# Domain Pitfalls — v6.1 Threat Map Buffer & Threat Actor Depth

**Domain:** Adding persistent marker buffer, markercluster, victimology tab, and Campaigns page to an existing React 19 + vanilla Leaflet + Laravel SSE + OpenCTI stack
**Researched:** 2026-04-17
**Confidence:** HIGH (derived from direct codebase inspection + stack-specific analysis)

---

## Critical Pitfalls

### PITFALL-01 [Buffer] — Stale Closure in SSE onmessage Captures MAX_EVENTS at Mount Time

**Feature area:** Buffer / Lifecycle
**What goes wrong:** `useThreatStream.js` currently hardcodes `MAX_EVENTS = 100` at module level. When the buffer-size dropdown changes (100 → 500 → 2000), the new limit must reach the `onmessage` closure. The current pattern sets state with `setEvents((prev) => [newEvent, ...prev].slice(0, MAX_EVENTS))` — if `MAX_EVENTS` becomes a `useRef` or state value, and the closure is defined inside the `useEffect` that only runs on `snapshotLoaded`, the closure captures the initial ref value. Updating the ref later does not re-run the effect, so the old slice limit persists until the SSE reconnects.

**Why it happens:** The SSE `useEffect` depends only on `[snapshotLoaded]`. Adding `bufferSize` to the dependency array would close and re-open the SSE connection every time the dropdown changes — that is the wrong fix. Passing the limit via a `useRef` (not state) avoids re-opening, but only works if the closure reads `bufferRef.current` rather than a captured value.

**Consequences:** Buffer size dropdown appears to work (localStorage saves correctly) but actual truncation still happens at 100 events until page reload.

**Prevention:**
- Store buffer size in a `useRef` — `const bufferLimitRef = useRef(bufferSize)` — and keep it synced with an effect: `useEffect(() => { bufferLimitRef.current = bufferSize; }, [bufferSize])`.
- In `onmessage`, read `bufferLimitRef.current` for the slice: `[newEvent, ...prev].slice(0, bufferLimitRef.current)`.
- Do NOT add `bufferSize` to the SSE effect dependency array.

**Detection:** After changing dropdown, check `events.length` in React DevTools. If it never exceeds 100 regardless of new setting, the closure is stale.

**Phase:** Buffer dropdown implementation phase (whichever phase adds the `bufferSize` state and the localStorage persist).

---

### PITFALL-02 [Buffer] — Persistent Markers Accumulate Without Leaflet Layer Cleanup

**Feature area:** Buffer / Memory Leak
**What goes wrong:** The current design adds `addPulseMarker` temporary markers that self-remove via `setTimeout`. For the new persistent buffer, each of the 100–2000 events must map to a persistent Leaflet marker tracked in a `Map<id, L.Marker>`. Without an explicit eviction path, removing the oldest marker when the buffer overflows is missed: the `events` state array is trimmed but the corresponding Leaflet layer is not removed from the map.

**Why it happens:** React state (the events array) and Leaflet layer state are two independent systems. Reconciling them requires a side-by-side map of `event.id → marker`. If the sync logic only adds on new events without removing on eviction, the Leaflet DOM accumulates orphan marker nodes. At 2000 markers, each being a `L.divIcon` with DOM, this is ~2000 extra DOM elements permanently in the tile pane.

**Consequences:** Memory grows monotonically. At 2000 markers, scrolling/panning slows visibly. Eventually the browser tab may crash on low-RAM devices. z-index conflicts with overlay panels at high marker density.

**Prevention:**
- Maintain a `markerRegistryRef: Map<string, L.Marker>` keyed by `event.id`.
- On each `events` update (via `useEffect([events])` in `ThreatMapPage`):
  1. Compute evicted IDs: IDs in `markerRegistryRef` but not in current `events`.
  2. Call `map.removeLayer(marker)` for each evicted ID, then delete from registry.
  3. Add marker only if ID not already in registry (avoid double-add on re-render).
- This is a full diff-based reconciliation, not a clear-and-redraw loop.

**Detection:** Open Chrome DevTools → Memory → Heap snapshot. After 10 minutes of live stream, search for `L.Marker` count. Should stay at or below buffer limit.

**Phase:** Persistent marker implementation phase.

---

### PITFALL-03 [Buffer] — Race Condition: Dropdown Change During Active SSE Burst

**Feature area:** Buffer / Race
**What goes wrong:** The user changes the dropdown from 2000 → 100 while a burst of events is arriving via SSE. Two things happen concurrently: (a) the state setter for `bufferSize` queues a React batch, (b) `onmessage` fires multiple times queuing `setEvents` batches. If React batches these updates, the `bufferLimitRef` may not reflect the new value before several `setEvents` calls run with the old slice value. The array briefly exceeds the new intended limit.

**Consequences:** Minor — the next `setEvents` call corrects it. But if the "pulse-then-settle" animation triggers on every new event arrival during this window, 2000+ markers could briefly attempt to animate simultaneously, causing a frame drop.

**Prevention:** After updating `bufferLimitRef.current`, also trim the current events state immediately: `setEvents(prev => prev.slice(0, newLimit))`. This single explicit trim prevents any animation burst.

**Phase:** Buffer dropdown implementation phase.

---

### PITFALL-04 [Buffer] — Pulse Animation on Evicted Markers Colliding With New Arrivals

**Feature area:** Buffer / Animation
**What goes wrong:** Two events share the same lat/lng (e.g., both are from the same IP or country centroid). One is evicted (marker removed), the other arrives milliseconds later (new marker added). If the eviction triggers a CSS fade-out transition and the add triggers a pulse-ring animation simultaneously at identical coordinates, both DOM elements exist at the same pixel position during the transition. Depending on z-index and pointer-events settings, the fade-out marker can absorb click events intended for the incoming pulse.

**Consequences:** Click-to-fly-to interaction on ThreatMapFeed broken for same-coord events during eviction window.

**Prevention:**
- When evicting a marker, use a 300ms CSS fade-out (add a class, then removeLayer in a setTimeout). During those 300ms, skip adding a new marker at the same coordinate if one is already in the eviction queue.
- Track eviction-pending coordinates in a `Set<string>` keyed by `${lat.toFixed(3)},${lng.toFixed(3)}`. Check before adding a new marker.

**Phase:** Pulse-then-settle-then-evict lifecycle phase.

---

### PITFALL-05 [Cluster] — MarkerClusterGroup Breaks Custom divIcon Pulse CSS

**Feature area:** Cluster
**What goes wrong:** `leaflet.markercluster` wraps markers in a `MarkerClusterGroup` layer. When the cluster is active, Leaflet injects its own CSS classes (`leaflet-cluster-anim`, `leaflet-markercluster-icon`) onto the cluster icons. These use absolute positioning and `transform` animations that can interfere with the existing `map-event-pulse` and `map-event-pulse--cyan/red/violet/amber` CSS animations defined in `animations.css`. Specifically, MarkerCluster applies a `transition: transform 0.3s ease-out` to spiderfy/unspiderfy; if the pulse ring also uses `transform: scale()`, both transitions compete on the same element.

**Consequences:** Pulse rings appear at wrong scale during cluster expansion. In the worst case, the pulse rings freeze if the cluster transition interrupts `animation: pulse-ring 1.6s ease-out`.

**Prevention:**
- Existing pulse markers (`addPulseMarker`) are temporary (setTimeout removes them in 1600ms). They should NOT be added to the `MarkerClusterGroup` — add them directly to the map as today. Only persistent buffer markers belong in the cluster group.
- The cluster icon styling must be explicitly overridden for the dark theme. Add a custom `iconCreateFunction` to `MarkerClusterGroup` that returns a `L.divIcon` with the project's glassmorphism classes, not the default MarkerCluster CSS.
- Scope MarkerCluster CSS overrides to `.leaflet-cluster-icon` to avoid bleed into pulse ring classes.

**Phase:** MarkerCluster integration phase.

---

### PITFALL-06 [Cluster] — Toggling Cluster On/Off Mid-Session Leaks the Old Layer

**Feature area:** Cluster
**What goes wrong:** When buffer size crosses the 500 threshold, the plan is to auto-enable clustering. The naive implementation is: "create a new `MarkerClusterGroup`, move markers into it, add to map." But the old `L.layerGroup` or previous `MarkerClusterGroup` must be explicitly removed. If the toggle logic creates a new cluster group without calling `map.removeLayer(oldGroup)`, both groups exist on the map simultaneously. The old group's markers render without clustering; the new group renders with it — double-render.

**Consequences:** Each marker appears twice on the map. Event click handlers fire twice. Memory doubles.

**Prevention:**
- Store the active marker container in a single `markerGroupRef`. Whether it's a `L.layerGroup` or `L.markerClusterGroup`, always call `map.removeLayer(markerGroupRef.current)` before replacing. Then reassign `markerGroupRef.current` and call `map.addLayer(newGroup)`.
- Transfer existing markers from old group to new group by iterating `markerRegistryRef` and calling `newGroup.addLayer(marker)` for each. Do not re-create marker DOM.

**Phase:** MarkerCluster integration phase.

---

### PITFALL-07 [Cluster] — Z-Index Conflict Between Cluster Popups and Overlay Panels

**Feature area:** Cluster / Overlay Panels
**What goes wrong:** The overlay panels in `LeftOverlayPanel.jsx` and `RightOverlayPanel.jsx` use `z-[1000]`. Leaflet's default `z-index` for `.leaflet-pane` is 400, and for popups it is 700. However, `leaflet.markercluster` renders spiderfy legs and cluster label overlays in `.leaflet-marker-pane` (z-index 600) and popup pane (700). The overlay panels at z-1000 correctly sit above these. The problem is the other direction: `AnimatePresence` from Framer Motion on the panels creates a new `transform` stacking context. Any child with a high z-index inside a `transform` stacking context is clipped to that context — meaning the MarkerCluster popup can render "above" the Framer Motion transform context on some browsers if `z-index` on the Framer wrapper is not explicitly set.

**Consequences:** Cluster popups appear to float above the left panel on click, making the panel feel broken.

**Prevention:**
- The existing `motion.div` wrappers already handle this correctly via absolute positioning at `z-[1000]`. Verify that any new `MarkerClusterGroup` popup uses Leaflet's standard popup pane (z-700), which stays below the panel.
- Explicitly set `zIndexOffset` on the `MarkerClusterGroup` options: `{ zIndexOffset: -100 }` to ensure cluster markers sit below panels.

**Phase:** MarkerCluster integration phase.

---

### PITFALL-08 [Cluster] — Click Propagation: Cluster Click Fires Map Click Handler

**Feature area:** Cluster
**What goes wrong:** The existing `ThreatMapPage` has `handleEventClick` which calls `map.flyTo` when an event in the feed panel is clicked. The `addHighlightPulse` function is triggered. When MarkerCluster is active, clicking a cluster icon fires a Leaflet map click event in addition to the cluster-specific `clusterclick` event. Without `e.originalEvent.stopPropagation()` in the cluster click handler, this can trigger unintended map interactions (e.g., a `flyTo` from a ghost coordinate).

**Prevention:**
- In the `MarkerClusterGroup` setup, add: `clusterGroup.on('clusterclick', (e) => { e.originalEvent.stopPropagation(); })`.
- For individual marker clicks within the cluster, use `marker.on('click', (e) => { L.DomEvent.stopPropagation(e); })`.

**Phase:** MarkerCluster integration phase.

---

## Moderate Pitfalls

### PITFALL-09 [Campaigns] — Campaign Entity Has Different Fields Than IntrusionSet in OpenCTI

**Feature area:** Campaigns (Backend)
**What goes wrong:** The Campaigns page will list `Campaign` STIX entities from OpenCTI. The existing `ThreatActorService` queries `intrusionSets(...)` with fields like `aliases`, `primary_motivation`, `resource_level`, `goals`. The `Campaign` type does NOT have `aliases` or `primary_motivation`. It has `first_seen`, `last_seen`, `objective` (not `goals`), and a `description`. Querying `campaigns { aliases }` will return a GraphQL error or a null field, but if the backend silently swallows it (the current `OpenCtiService` throws on `$body['errors']`), it becomes a 500.

**Consequences:** CampaignService crashes on first query if any Campaign-specific field is assumed to match IntrusionSet.

**Prevention:**
- Write a dedicated `CampaignService` (do not extend or reuse `ThreatActorService`).
- Campaign GraphQL query fields: `id, name, description, first_seen, last_seen, objective, aliases, modified`. Verify each field exists on `Campaign` type in the OpenCTI GraphQL schema before use.
- The ordering enum for campaigns is `CampaignsOrdering`, not `IntrusionSetsOrdering`. Using the wrong enum causes a GraphQL type error.

**Phase:** Campaigns backend service phase.

---

### PITFALL-10 [Campaigns] — Cache Key Collision With Existing threat_actors Cache

**Feature area:** Campaigns (Backend)
**What goes wrong:** `ThreatActorService::list()` generates cache keys as `'threat_actors:' . md5(json_encode(func_get_args()))`. If a `CampaignService::list()` uses a similar `'threat_actors:' . md5(...)` pattern by copy-paste, the cache keys can collide when argument sets hash to the same MD5 (extremely unlikely, but the prefix collision is a naming bug that makes cache inspection confusing and risks namespace collision with future services).

**Prevention:**
- Use a distinct prefix: `'campaigns:'` for `CampaignService`. Never share cache key prefixes across different STIX entity types.
- Add a cache tag or version suffix if Laravel cache tagging is available: `Cache::tags(['campaigns'])->remember(...)`.

**Phase:** Campaigns backend service phase.

---

### PITFALL-11 [Campaigns] — Credit Gating Misalignment for Campaigns Endpoint

**Feature area:** Campaigns (Backend) / Auth
**What goes wrong:** Looking at `api.php`, `GET /threat-actors` is inside the `feature-gate` middleware group. A new `GET /campaigns` route must also be placed inside `feature-gate`. If it's accidentally placed outside (e.g., adjacent to the `/threat-actors` routes but not inside the `Route::middleware('feature-gate')->group(...)` closure), free-plan users can access it without the upgrade wall.

**Consequences:** Free plan users bypass feature gating on Campaigns. Revenue impact if campaigns is a paid differentiator.

**Prevention:**
- During route registration, explicitly verify the route is nested inside the `feature-gate` group by running `php artisan route:list | grep campaigns` and confirming the middleware column shows `feature-gate`.
- Add a Pest test: unauthenticated / free-plan user hitting `GET /api/campaigns` should receive 403.

**Phase:** Campaigns backend route registration phase.

---

### PITFALL-12 [Victimology] — STIX `targets` vs `uses` Relationship Direction Confusion

**Feature area:** Victimology (Backend)
**What goes wrong:** OpenCTI uses directed relationships. `IntrusionSet --targets--> Country/Region/Sector` is the correct STIX direction. The existing code already uses this correctly in `ThreatActorService` for `targetedCountries` and `targetedSectors` on the list endpoint. However, when building the Victimology tab enrichment query (which needs `Organization` in addition to `Country`, `Region`, `Sector`), the risk is adding `Organization` with the wrong relationship filter. An `IntrusionSet` targeting an organization uses `relationship_type: "targets"` and `toTypes: ["Organization"]`. But `Organization` in OpenCTI is under the `Identity` abstract type — the concrete type name in `toTypes` must be `"Identity"` (or the specific subtype if the OpenCTI version supports it), not `"Organization"`. Using `"Organization"` as a `toType` may return zero results silently if OpenCTI resolves types differently.

**Consequences:** Victimology tab shows countries and sectors but zero organizations, incorrectly appearing as though no organizations are targeted.

**Prevention:**
- Test the GraphQL query in OpenCTI's built-in GraphQL explorer first. Query: `intrusionSet(id: $id) { stixCoreRelationships(relationship_type: "targets", toTypes: ["Organization"], first: 20) { edges { node { to { ... on Organization { id name } } } } } }`.
- If zero results, try `toTypes: ["Identity"]` and filter by `entity_type === 'Organization'` in the normalization step.
- Use the same `... on Organization { id name }` concrete type fragment pattern already used for `... on Country` and `... on Sector` in the existing code.

**Phase:** Victimology backend enrichment query phase.

---

### PITFALL-13 [Victimology] — N+1 Queries From Polymorphic Relationship Expansion

**Feature area:** Victimology (Backend)
**What goes wrong:** The enrichment query in `executeEnrichmentQuery` already fetches `allRelationships: stixCoreRelationships(first: 100)` plus separate sub-queries for attackPatterns, tools, malware, campaigns — all in a single GraphQL request. Adding victimology (countries, regions, sectors, organizations as separate sub-queries) expands this single request further. OpenCTI GraphQL resolves each sub-query independently against its data store. A single enrichment call with 6+ sub-queries (each with `first: 20-100`) can take 5-15 seconds on a busy OpenCTI instance, hitting the `OpenCtiService` 15-second timeout.

**Consequences:** Enrichment endpoint times out, returning 502. The modal shows "Failed to load enrichment data" on the Victimology tab even though the actor exists.

**Prevention:**
- Consolidate victimology fields into one sub-query using `toTypes: ["Country", "Region", "Sector", "Identity"]` on a single `stixCoreRelationships` call, then split by `entity_type` in PHP normalization. This is one sub-query instead of four.
- Increase the timeout for enrichment queries specifically (not globally): add a second method in `OpenCtiService` like `queryLong(string $graphql, array $variables, int $timeout = 30)`.
- Cache enrichment at 15 minutes (already done for TTP enrichment). Verify the new victimology data is included in the same cache key so the combined enrichment is cached together.

**Phase:** Victimology backend enrichment query phase.

---

### PITFALL-14 [Victimology] — Modal Fetches Enrichment on Open, Tab Switch Causes Double Fetch

**Feature area:** Victimology (Frontend)
**What goes wrong:** The current `ThreatActorModal` fetches enrichment on modal open via `useEffect([actor.id])`, eagerly loading TTPs, tools, malware, campaigns, and relationships before the user clicks any tab. The new Victimology tab adds more data to this payload. This is fine for performance (one fetch vs lazy per-tab). The pitfall is adding a *second* lazy fetch specifically for victimology — if someone splits victimology into a separate `/enrichment/victimology` endpoint and calls it on tab switch, the user clicking Overview → Victimology → Overview → Victimology fires the fetch 2+ times. Without a `cancelled` guard and caching the result in state, this causes multiple in-flight requests.

**Prevention:**
- Keep the single-fetch-on-open pattern. Include victimology in the existing enrichment response. Do not add a separate lazy fetch just for the Victimology tab.
- If the payload becomes too large (>5s load), split into two phases: fetch Overview/TTPs/Tools/Malware on open, fetch Relationships/Victimology/Campaigns lazily on first tab click. Store each phase result in separate state keys with their own `loaded` booleans. Never re-fetch if `loaded === true`.

**Phase:** Victimology tab frontend implementation phase.

---

### PITFALL-15 [Modal Tab Refactor] — Removing Campaigns Tab Without Cleaning activeTab State

**Feature area:** Modal Tab Refactor (Frontend)
**What goes wrong:** `ThreatActorModal` currently has `TABS` array with `key: 'campaigns'`. When the Victimology tab replaces it, the `activeTab` state default is `'overview'`. But if any deep-link, sessionStorage, or URL param preserved `activeTab: 'campaigns'` from a previous session, and the Campaigns tab key no longer exists in `TABS`, the tab bar renders with no active tab highlighted and no tab content rendered — a blank modal body.

**In this codebase** there is no URL-based tab state for the modal (the modal is triggered by `setSelectedActor(actor)` with no query param). So the risk is low but not zero — the `setActiveTab('overview')` is called in the `useEffect([actor.id])` on modal open, which resets it correctly every time. This is already safe.

**Prevention:**
- Confirm the `setActiveTab('overview')` reset in the actor.id effect is present (it is — line 546 in current code). Keep it.
- When renaming the `campaigns` tab key to `victimology`, do a grep for `'campaigns'` in the modal component to catch any other references (empty state icons, error messages that reference the tab name by key).

**Detection:** `grep -r "activeTab.*campaigns\|campaigns.*activeTab" frontend/src/` should return zero results after the refactor.

**Phase:** Campaigns-to-Victimology tab rename phase.

---

### PITFALL-16 [Page Toggle] — Browser Back Button Breaks When Toggle Uses State Instead of URL

**Feature area:** Page Toggle (Frontend)
**What goes wrong:** The toggle between Threat Actors and Campaigns on the `ThreatActorsPage` will be implemented as a toolbar pill. If the toggle state is kept in React `useState`, navigating away and back restores the default view (Threat Actors), not the user's last selected view. Worse, if the toggle is implemented as a URL query param (`?view=campaigns`), the browser back button will cycle through view states — user clicks back to exit the page but instead just toggles back to Threat Actors view. This is the same problem as the existing `after`/`search` cursor params: back button walks through pagination history.

**Why it's specific to this stack:** `ThreatActorsPage` already uses `useSearchParams` heavily. Adding a `view` param to the same URL means it interacts with the `after` cursor: switching from Campaigns back to Actors should reset `after` to page 1, but the back button would restore the old `after` cursor from history, causing a stale cursor for the wrong entity type.

**Prevention:**
- Use a URL query param `?view=actors|campaigns` for shareability and refresh persistence.
- When toggling view, explicitly reset `after` and `search` params: `setSearchParams({ view: newView })` — do NOT spread existing params. This prevents stale Actors pagination cursors bleeding into Campaigns and vice versa.
- Accept that the back button walks through view states — this is standard SPA behavior. Document it as intentional.

**Phase:** Page toggle implementation phase.

---

### PITFALL-17 [Page Toggle] — Filter State Leaking Between Actors and Campaigns Views

**Feature area:** Page Toggle (Frontend)
**What goes wrong:** If the search input and pagination cursor are shared in URL params, switching from a filtered Actors view (`?search=apt28&after=XYZ`) to Campaigns preserves the search term. The `?search=apt28` is then sent to the Campaigns API, which may have different search fields. More critically, the `?after=XYZ` cursor is an OpenCTI intrusion-set cursor — it is NOT valid for campaigns pagination. Sending an actors cursor to the campaigns endpoint causes an OpenCTI error (invalid cursor type), which surfaces as a 500 or empty page.

**Prevention:**
- When switching views, clear ALL pagination/filter params and keep only `view`. Implementation: `setSearchParams({ view: newView })` — always start a fresh param object.
- On the backend, validate that the `after` cursor format is valid for the entity type being queried. OpenCTI cursors are base64-encoded — at minimum check they decode to a valid JSON structure with the right type marker.

**Phase:** Page toggle + Campaigns backend pagination phase.

---

### PITFALL-18 [localStorage] — Buffer Size Reverts to 100 After Storage Clear

**Feature area:** localStorage / Buffer
**What goes wrong:** The buffer size is persisted to localStorage (e.g., `aqua-tip:threat-map-buffer-size`). If a user clears browser storage mid-session (via DevTools or browser settings), the localStorage read returns `null`. The existing pattern (from `panels-collapsed`) uses `try/catch` with a boolean default. For buffer size, the fallback must be a valid integer (100), not `null` or `undefined`. If the fallback is not applied correctly, `parseInt(null)` returns `NaN`, and `NaN` passed to the `.slice(0, NaN)` call returns an empty array — the entire event buffer empties instantly.

**Consequences:** All 2000 buffered markers disappear from the map. User sees empty map with no indication of why.

**Prevention:**
- In the localStorage read: `const stored = localStorage.getItem('aqua-tip:threat-map-buffer-size'); const parsed = parseInt(stored, 10); return [100, 500, 1000, 2000].includes(parsed) ? parsed : 100;`
- Whitelist valid values rather than trusting any stored integer. This also handles corrupted storage (e.g., user manually set it to `99999`).

**Phase:** Buffer dropdown + localStorage persist phase.

---

### PITFALL-19 [SSE Buffer Scaling] — Backend MAP_EVENT_BUFFER at 2000 Causes Snapshot Timeout

**Feature area:** SSE / Backend
**What goes wrong:** The current `fetchSnapshot()` in `ThreatMapService` calls `stixCyberObservables(first: 100, ...)` — a single GraphQL query returning 100 items. Scaling to 2000 means either (a) one query with `first: 2000` or (b) multiple paginated queries. Option (a): OpenCTI has a default `first` limit (often 500 or 1000 depending on version). Requesting `first: 2000` may silently cap at 500 or raise a GraphQL error. Option (b): paginating 4 pages of 500 inside `fetchSnapshot()` multiplies the already slow geo-enrichment loop — 2000 IPs × geo lookup = potentially 2000 cache reads (fast) or HTTP calls (2s × 2000 = 4000s).

**Consequences:** Snapshot endpoint times out at 15 seconds (the `OpenCtiService` timeout). Users see the threat map load with 0 initial markers then populate slowly via SSE.

**Prevention:**
- For buffer > 500, do NOT attempt to pre-populate the full buffer from the snapshot. Load the snapshot with a fixed cap of 200-300 events (fast). The rest of the buffer fills naturally via SSE stream within seconds.
- Document this as a design decision: the snapshot provides the initial paint; the buffer fills to its configured size over time via SSE.
- If full pre-population is required, run geo enrichment only for IPs not already in the `ip_geo` table (warm cache path is microseconds). Skip geo lookup entirely for IPs that resolve to null (already flagged in cache as non-geo). This limits cold-path HTTP calls.

**Phase:** Backend snapshot scaling phase.

---

### PITFALL-20 [SSE Buffer Scaling] — Frontend Reconnect Storm After Large Snapshot + SSE Failure

**Feature area:** SSE / Frontend
**What goes wrong:** `useThreatStream` opens the SSE connection only after `snapshotLoaded = true`. At buffer=2000, the snapshot may contain 2000 events. If multiple users navigate to the threat map simultaneously (or the tab is hidden and shown again many times), and the SSE connection fails right after the large snapshot, the `onerror` handler fires `MAX_RETRIES = 10` retries with exponential backoff. All users reconnect at similar times (they all loaded the page around the same time), causing a reconnect storm against the Laravel SSE endpoint.

**Consequences:** Laravel spawns N concurrent streaming PHP workers (N = simultaneous reconnect attempts). Each worker holds a connection open to OpenCTI for up to 300 seconds. If Railway has connection limits, this exhausts them.

**Prevention:**
- Add jitter to the reconnect backoff: `const delay = Math.min(1000 * Math.pow(2, retryCount), 30000) + Math.random() * 1000;` (already missing jitter in the current code).
- The `visibilitychange` handler in `useThreatStream` already disconnects on tab hide and reconnects on tab show. This is correct behavior. Ensure the `retryCountRef.current = 0` reset on tab-show re-entry doesn't bypass the jitter.

**Phase:** SSE reconnect hardening phase (or as part of buffer scaling phase).

---

## Minor Pitfalls

### PITFALL-21 [Cluster] — Dark Theme Regression From Default MarkerCluster CSS

**Feature area:** Cluster
**What goes wrong:** `leaflet.markercluster` ships with `MarkerCluster.css` and `MarkerCluster.Default.css`. These inject light-theme cluster icons (white background, gray count badges). Importing them without overrides causes visible white circles on the dark map.

**Prevention:**
- Import `MarkerCluster.css` only (not `MarkerCluster.Default.css`).
- Provide a custom `iconCreateFunction` that returns a `L.divIcon` using the project's design tokens (bg-surface/80, border-border, text-cyan for count).
- Add the CSS override to `animations.css` or `components.css`, not inline JS.

**Phase:** MarkerCluster integration phase.

---

### PITFALL-22 [Victimology] — Region Entity Has No `name` Field in Some OpenCTI Versions

**Feature area:** Victimology (Backend)
**What goes wrong:** The existing `flattenRelationshipTargets` method extracts `$edge['node']['to']['name']`. For `Country` and `Sector`, this is correct. For `Region`, the STIX Location type uses `name` as well, but some older OpenCTI versions expose it as `x_opencti_location_type` for disambiguation. If the OpenCTI instance is on an older minor version, `... on Region { name }` may return null for some regions.

**Prevention:**
- In the victimology GraphQL fragment for Region: `... on Region { id name x_opencti_location_type }`. Use `name` with a null fallback to `x_opencti_location_type` in normalization.
- Test against the actual OpenCTI instance at `192.168.251.20:8080` before writing the normalized format.

**Phase:** Victimology backend enrichment query phase.

---

### PITFALL-23 [Buffer] — Framer Motion + Leaflet Event Clash on Panel Hover During Burst

**Feature area:** Buffer / Animation
**What goes wrong:** The `LeftOverlayPanel` uses `motion.div` with `SPRING_TRANSITION` for slide-in animation. When a burst of 50+ new events arrives simultaneously (e.g., on SSE reconnect delivering the backlog), React batches state updates and triggers re-renders. Each re-render of `ThreatMapPage` causes the overlay panels to check their `events` prop. If Framer Motion's `AnimatePresence` is animating at the same moment (e.g., the user triggered a peek-hover), both Framer's `requestAnimationFrame` loop and the Leaflet marker add/remove loop compete for the main thread.

**Consequences:** Visible jank during reconnect bursts. The panel slide animation stutters.

**Prevention:**
- The marker reconciliation (`useEffect([events])`) should use `requestAnimationFrame` to defer Leaflet DOM operations out of the React commit phase: `requestAnimationFrame(() => { /* add/remove markers */ })`.
- This is a micro-optimization — only implement if jank is observed in testing.

**Phase:** Persistent marker implementation phase (flagged for monitoring, not mandatory upfront).

---

### PITFALL-24 [Toggle] — `?view=campaigns` Conflicts With FeatureGate Redirect URL

**Feature area:** Page Toggle / Auth
**What goes wrong:** The `FeatureGatedRoute` wraps `ThreatActorsPage`. If a free-plan user receives the UpgradeCTA, the current URL is preserved for redirect after upgrade. With query params (`?view=campaigns&search=apt28`), the redirect URL can become long and may be passed through multiple redirects (login → verify → onboard → pricing → gated page). If any step in the redirect chain strips query params, the user lands on the Actors default view, not their intended Campaigns view.

**Consequences:** Minor UX confusion — user upgrades and is dropped on Threat Actors instead of Campaigns.

**Prevention:** This is low severity for v6.1. Accept the behavior. Document that view restoration after auth redirect is not guaranteed.

**Phase:** Not a blocker. Monitor.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Buffer dropdown + localStorage | PITFALL-01 (stale closure), PITFALL-18 (NaN fallback) | useRef for buffer limit, whitelist valid values |
| Persistent marker reconciliation | PITFALL-02 (orphan layers), PITFALL-23 (frame jank) | markerRegistryRef diff, defer via rAF |
| Pulse-then-settle-then-evict | PITFALL-04 (same-coord collision) | Eviction-pending coordinate Set |
| MarkerCluster integration | PITFALL-05 (CSS conflict), PITFALL-06 (layer leak), PITFALL-07 (z-index), PITFALL-08 (click propagation) | Custom iconCreateFunction, single markerGroupRef, zIndexOffset |
| MarkerCluster dark theme | PITFALL-21 (CSS regression) | Override MarkerCluster.Default.css entirely |
| Campaigns backend service | PITFALL-09 (wrong fields), PITFALL-10 (cache key collision), PITFALL-11 (feature gate miss) | Dedicated CampaignService, verify middleware, Pest test |
| Campaigns pagination | PITFALL-17 (stale cursor bleed) | setSearchParams({ view: newView }) clears all params |
| Victimology backend enrichment | PITFALL-12 (targets vs uses), PITFALL-13 (N+1), PITFALL-22 (Region name) | Single toTypes query, increase timeout for enrichment |
| Victimology frontend tab | PITFALL-14 (double fetch), PITFALL-15 (stale activeTab key) | Single fetch on open, grep for 'campaigns' key references |
| Page toggle (URL param) | PITFALL-16 (back button), PITFALL-17 (filter leak) | Accept back-walks-views, reset all params on toggle |
| SSE buffer at 2000 | PITFALL-19 (snapshot timeout), PITFALL-20 (reconnect storm) | Cap snapshot at 200-300, add jitter to retry backoff |
| Race condition on dropdown change | PITFALL-03 (burst during dropdown change) | Immediate trim: setEvents(prev => prev.slice(0, newLimit)) |

## Sources

All findings derived from direct inspection of:
- `frontend/src/hooks/useThreatStream.js` — SSE connection, buffer management, closure behavior
- `frontend/src/pages/ThreatMapPage.jsx` — marker lifecycle, Framer Motion + Leaflet interaction
- `frontend/src/pages/ThreatActorsPage.jsx` — tab state, modal enrichment fetch pattern
- `frontend/src/hooks/useLeaflet.js` — Leaflet initialization, markerLayerRef pattern
- `frontend/src/components/threat-map/LeftOverlayPanel.jsx` — z-index, Framer Motion stacking context
- `backend/app/Services/ThreatActorService.php` — GraphQL queries, cache key patterns, enrichment structure
- `backend/app/Services/ThreatMapService.php` — snapshot size, geo enrichment loop, SSE parsing
- `backend/app/Http/Controllers/ThreatMap/StreamController.php` — SSE relay, seenIds management
- `backend/app/Http/Controllers/ThreatMap/SnapshotController.php` — snapshot response shape
- `backend/routes/api.php` — feature-gate middleware placement, route structure
- `.planning/PROJECT.md` — architectural decisions log, prior pitfalls already avoided
