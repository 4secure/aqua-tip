# Requirements: AQUA TIP v6.1

**Defined:** 2026-04-17
**Milestone:** Threat Map Buffer & Threat Actor Depth
**Core Value:** Real threat intelligence from OpenCTI — searchable across all observable types through a secure, credit-gated platform with subscription plan tiers.

## v6.1 Requirements

Requirements for Threat Map Buffer & Threat Actor Depth milestone.

### Map Persistent Buffer (MAPBUF)

- [x] **MAPBUF-01**: All buffered IP attack events render as static markers on the threat map (replacing the current pulse-and-fade-only behavior — markers persist after the pulse animation ends) — satisfied Phase 61-02 (2026-04-20, hook-level state machine; user-visible wiring lands in Plan 61-03)
- [x] **MAPBUF-02**: A newly-arriving IP marker displays a pulse ring for ~2 seconds, then settles into a static dot — satisfied Phase 61-02 (2026-04-20, hook transitions arriving→settled after 1800ms; CSS from Plan 61-01 drives the visual)
- [x] **MAPBUF-03**: When the buffer is full, the oldest IP marker fades out quietly (no jarring removal) as new arrivals push it out — satisfied Phase 61-02 (2026-04-20, FIFO eviction with 600ms evicting state before removal)
- [x] **MAPBUF-04**: Marker lifecycle survives SSE reconnects within a session — buffer state is not lost on transient network blips — satisfied Phase 61-02 (2026-04-20, firstHydrationRef stays false after initial hydration; reconnect snapshots diff against existing markers, no re-pulse)
- [x] **MAPBUF-05**: React buffer state and Leaflet marker DOM stay in sync — no orphan Leaflet markers accumulate when events are evicted from the React buffer (`markerInstancesRef` diff-reconciliation) — satisfied Phase 61-03 (2026-04-20, ThreatMapPage.jsx wired: useEffect([markers]) performs ADD + setIcon UPDATE + map.removeLayer REMOVE against `markerInstancesRef = useRef(new Map<id, L.Marker>())`; unmount effect clears all layers; buildIcon composes CSS classes; Vite build clean in 9.17–9.21s)
- [ ] **MAPBUF-06**: Country-counter aggregation respects the active buffer size (counts include all settled markers, not just the last-100 snapshot)

### Map Buffer Size Selector (MAPCFG)

- [ ] **MAPCFG-01**: User can select buffer size from a dropdown in the threat map overlay panel with presets: 100, 500, 1000, 2000
- [ ] **MAPCFG-02**: Selected buffer size persists to localStorage (`aqua-tip:threat-map-buffer-size`) and restores on next page load
- [ ] **MAPCFG-03**: Changing the buffer size mid-session does NOT trigger an SSE reconnect — buffer cap updates live via `useRef` synced from state
- [ ] **MAPCFG-04**: Invalid or missing localStorage value falls back to default (100) without throwing

### Map Marker Clustering (MAPCLU)

- [ ] **MAPCLU-01**: When buffer size is greater than 500, marker clustering is automatically enabled via `leaflet.markercluster`
- [ ] **MAPCLU-02**: Cluster icons are styled to match the dark glassmorphism theme (custom `iconCreateFunction` with design-system colors)
- [ ] **MAPCLU-03**: Clicking a cluster zooms the map to its bounds and expands child markers
- [ ] **MAPCLU-04**: Crossing the threshold (e.g., 500 → 1000 or 500 → 100) cleanly swaps the marker layer without double-rendering markers
- [ ] **MAPCLU-05**: Clustering uses `chunkedLoading: true` so initial paint at 1000+ markers does not block the UI thread

### Threat Actor Victimology Tab (VICTM)

- [ ] **VICTM-01**: The "Campaigns" tab in the Threat Actor detail modal is removed
- [ ] **VICTM-02**: A new "Victimology" tab is added to the Threat Actor detail modal in its place
- [ ] **VICTM-03**: The Victimology tab displays targeted **countries** with flag icons and counts (sourced from OpenCTI `targets` relationships)
- [ ] **VICTM-04**: The Victimology tab displays targeted **regions** (continents/geographic regions)
- [ ] **VICTM-05**: The Victimology tab displays targeted **sectors** (industries)
- [ ] **VICTM-06**: The Victimology tab displays targeted **organizations** (named victim entities)
- [ ] **VICTM-07**: Victimology data is lazy-fetched only when the user opens the Victimology tab (not eagerly on modal open)
- [ ] **VICTM-08**: When a target type returns no data (e.g., empty Region list), the section renders a friendly empty state — no crash, no broken UI
- [ ] **VICTM-09**: Backend extends the existing actor enrichment GraphQL query with 4 new `stixCoreRelationships` blocks (Country/Region/Sector/Identity-filtered-to-Organization), normalized into a `victimology` response key

### Threat Actors Page Campaigns Toggle (CAMP)

- [ ] **CAMP-01**: The Threat Actors page toolbar shows a pill toggle with two options: "Threat Actors" and "Campaigns"
- [ ] **CAMP-02**: Selecting "Campaigns" switches the page content to a paginated list of OpenCTI Campaign entities (distinct from Intrusion Sets)
- [ ] **CAMP-03**: Active view is reflected in the URL via `?view=campaigns` query param (default `?view=actors` or no param)
- [ ] **CAMP-04**: Refreshing the page restores the active view from the URL
- [ ] **CAMP-05**: Each Campaign card displays: name, first_seen / last_seen date range, objective (if available), and an `attributed_to` chip linking back to the Intrusion Set name
- [ ] **CAMP-06**: Clicking a Campaign card opens a detail modal with full campaign metadata
- [x] **CAMP-07**: Backend exposes a paginated `GET /api/threat-campaigns` endpoint backed by a standalone `ThreatCampaignService` (NOT a refactor of `ThreatActorService` — Campaign STIX fields differ) — satisfied Phase 60 (2026-04-19)
- [x] **CAMP-08**: Campaigns endpoint uses the same 15-min server-side cache pattern as Threat Actors — satisfied Phase 60 (2026-04-19)

## Future Requirements

Deferred to future milestones. Tracked but not in current roadmap.

- **MAP-INTERACT**: Interactive victimology world map (heatmap view) — list view sufficient for v6.1
- **CAMP-GRAPH**: Campaign-to-Actor navigation graph from the attribution chip — chip is informational for v6.1
- **MAP-SYNC**: Multi-tab buffer sync via BroadcastChannel — per-tab state acceptable for v6.1
- **MAP-EXPORT**: Export buffered events to CSV/JSON — out of scope for v6.1

## Out of Scope

| Feature | Reason |
|---------|--------|
| Backend SSE buffer scaling (`MAP_EVENT_BUFFER` env) | Backend is stateless per SSE connection; snapshot stays at OpenCTI's `first: 100`; larger buffers fill incrementally via live SSE — confirmed acceptable UX |
| react-leaflet adoption | Project standard is vanilla Leaflet via `useLeaflet` lazy-load; no migration value |
| New state library (Zustand / Redux / Jotai) | Existing React `useState` + `useRef` patterns scale cleanly to 2000-marker buffer |
| Spider-leg expansion at max-zoom clusters | Default `markercluster` zoom-to-bounds is sufficient |
| Campaign-level filtering inside cluster | No validated demand; cluster click + map filter sufficient |
| Cross-view filter sharing on Threat Actors page | Filter state isolated per view (Actors filters do not apply to Campaigns and vice versa) |
| Victimology relationship export | List view sufficient for v6.1 |
| OpenCTI admin / connector UI | Manage via OpenCTI directly (still out from PROJECT.md) |
| Real payment processing | Still out of scope from prior milestones |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MAPBUF-01 | Phase 61 | Satisfied (2026-04-20) |
| MAPBUF-02 | Phase 61 | Satisfied (2026-04-20) |
| MAPBUF-03 | Phase 61 | Satisfied (2026-04-20) |
| MAPBUF-04 | Phase 61 | Satisfied (2026-04-20) |
| MAPBUF-05 | Phase 61 | Satisfied (2026-04-20) |
| MAPBUF-06 | Phase 59 | Pending |
| MAPCFG-01 | Phase 62 | Pending |
| MAPCFG-02 | Phase 62 | Pending |
| MAPCFG-03 | Phase 62 | Pending |
| MAPCFG-04 | Phase 62 | Pending |
| MAPCLU-01 | Phase 63 | Pending |
| MAPCLU-02 | Phase 63 | Pending |
| MAPCLU-03 | Phase 63 | Pending |
| MAPCLU-04 | Phase 63 | Pending |
| MAPCLU-05 | Phase 63 | Pending |
| VICTM-01 | Phase 64 | Pending |
| VICTM-02 | Phase 64 | Pending |
| VICTM-03 | Phase 64 | Pending |
| VICTM-04 | Phase 64 | Pending |
| VICTM-05 | Phase 64 | Pending |
| VICTM-06 | Phase 64 | Pending |
| VICTM-07 | Phase 64 | Pending |
| VICTM-08 | Phase 64 | Pending |
| VICTM-09 | Phase 59 | Pending |
| CAMP-01 | Phase 65 | Pending |
| CAMP-02 | Phase 65 | Pending |
| CAMP-03 | Phase 65 | Pending |
| CAMP-04 | Phase 65 | Pending |
| CAMP-05 | Phase 65 | Pending |
| CAMP-06 | Phase 65 | Pending |
| CAMP-07 | Phase 60 | Satisfied (2026-04-19) |
| CAMP-08 | Phase 60 | Satisfied (2026-04-19) |
