# ROADMAP — v6.1 Threat Map Buffer & Threat Actor Depth

**Milestone:** v6.1
**Defined:** 2026-04-17
**Granularity:** Standard (5-8 phases)
**Requirements:** 32 v6.1 requirements (MAPBUF-01..06, MAPCFG-01..04, MAPCLU-01..05, VICTM-01..09, CAMP-01..08)
**Phase range:** 59–66 (continuing from v6.0 which ended at phase 58)

---

## Phases

- [x] **Phase 59: Backend Snapshot Resize + Victimology Endpoint** — Extend the snapshot endpoint to accept a configurable `?limit` param and enrich the actor enrichment endpoint with 4 new victimology sub-queries (completed 2026-04-17)
- [ ] **Phase 60: Backend Campaigns Service & Endpoint** — New standalone `ThreatCampaignService` + `GET /api/threat-campaigns` endpoint with 15-min cache; feature-gated
- [ ] **Phase 61: Frontend Threat Map Buffer Refactor** — Extract `useThreatMapBuffer` hook, implement persistent marker lifecycle (pulse → settle → evict), diff-reconcile Leaflet layer via `markerInstancesRef`
- [ ] **Phase 62: Frontend Buffer-Size Dropdown** — `BufferSizeControl` component in left overlay panel, localStorage persistence, live cap update via `useRef` (no SSE reconnect)
- [ ] **Phase 63: Frontend Marker Clustering** — Install `leaflet.markercluster@1.5.3`, conditional enable when `bufferSize > 500`, dark-theme `iconCreateFunction`, clean layer-swap on threshold crossing
- [ ] **Phase 64: Frontend Victimology Tab** — Replace Campaigns tab with Victimology tab in Threat Actor modal; 4-section layout (countries/regions/sectors/organizations) driven by enrichment response
- [ ] **Phase 65: Frontend Campaigns Toggle** — Pill toggle on Threat Actors page, `?view=campaigns` URL state, `CampaignCard` grid, `CampaignDetailModal`, `threat-campaigns.js` API client
- [ ] **Phase 66: Integration Validation & Polish** — E2E smoke test at all buffer sizes, cluster boundary verification, victimology edge cases, CSS audit

---

## Phase Details

### Phase 59: Backend Snapshot Resize + Victimology Endpoint
**Goal**: The backend serves configurable-size snapshots and enriches threat actors with victimology data
**Depends on**: Nothing (backend only, no frontend dependency)
**Requirements**: MAPBUF-06, VICTM-09
**Success Criteria** (what must be TRUE):
  1. `GET /api/threat-map/snapshot?limit=500` returns up to 500 events and `GET /api/threat-map/snapshot?limit=100` returns up to 100 — different cache keys, no cross-contamination
  2. Calling `GET /api/threat-actors/{id}/enrichment` on an actor with known targets returns a `victimology` key containing at least one non-empty sub-array (countries, regions, sectors, or organizations)
  3. An actor with no known targets returns `victimology: { countries: [], regions: [], sectors: [], organizations: [] }` without a 500 error
  4. An invalid or missing `?limit` param on the snapshot endpoint defaults to 100 (safe fallback, no error)
  5. OpenCTI Organization `toTypes` query verified against live GraphiQL at 192.168.251.20 — correct filter documented in code comment
**Plans**: TBD

### Phase 60: Backend Campaigns Service & Endpoint
**Goal**: The backend exposes a paginated Campaigns endpoint backed by a standalone OpenCTI service
**Depends on**: Nothing (backend only, parallel-eligible with Phase 59)
**Requirements**: CAMP-07, CAMP-08
**Success Criteria** (what must be TRUE):
  1. `GET /api/threat-campaigns` returns a paginated list of OpenCTI Campaign entities with fields: `id`, `name`, `description`, `first_seen`, `last_seen`, `objective`, `attributed_to` (linked Intrusion Set name)
  2. Calling the endpoint twice within 15 minutes returns the second response from cache (verified via response time drop and `Cache::has()` in tests)
  3. A free-plan user receives 403 (feature-gated) — confirmed via `php artisan route:list | grep threat-campaigns` showing the `feature-gate` middleware
  4. Campaign fields never bleed IntrusionSet-only fields (no `primary_motivation`, no `resource_level`) — GraphQL query uses `CampaignsOrdering` enum, not `IntrusionSetsOrdering`
**Plans**: 4 plans
- [x] 60-01-PLAN.md — Wave 0: Scaffold test directory + IndexTest.php helpers (fakeCampaignsResponse, mockOpenCtiForCampaigns, createPlan) — completed 2026-04-18 (commit d205bf2)
- [x] 60-02-PLAN.md — Wave 0: D-12 GraphiQL verification session — completed 2026-04-18 (commit c9ac6f9, live verification, no fallback)
- [ ] 60-03-PLAN.md — Wave 1: Standalone ThreatCampaignService + service-level tests (SC1 shape, SC2 cache, SC4 enum + no-bleed, attribution dedup)
- [ ] 60-04-PLAN.md — Wave 2: IndexController + route registration + HTTP tests (200 trial, 401 unauth, 403 free, 200 basic, 502 conn-fail) + full-suite regression

### Phase 61: Frontend Threat Map Buffer Refactor
**Goal**: The threat map renders a persistent pool of markers that pulse on arrival, settle as static dots, and fade out quietly when evicted — surviving SSE reconnects without orphan Leaflet layers
**Depends on**: Nothing (frontend, foundational — MUST be standalone, do not bundle with Phase 62 or 63)
**Requirements**: MAPBUF-01, MAPBUF-02, MAPBUF-03, MAPBUF-04, MAPBUF-05
**Success Criteria** (what must be TRUE):
  1. After 30 seconds of live stream, the map shows at least 50 persistent static dot markers that do not disappear between SSE events
  2. A newly arriving marker shows a visible pulse ring for approximately 2 seconds, then settles into a small static dot — the dot remains on the map indefinitely until evicted
  3. Simulating an SSE reconnect (disable/re-enable network) does not wipe existing markers — buffered markers remain on the map after reconnection
  4. At buffer capacity (default 100), each new arrival causes exactly one old marker to quietly fade out — no sudden bulk removals, no marker count growing unbounded beyond the cap
  5. After 5 minutes of active streaming, a Chrome DevTools Memory snapshot shows Leaflet `L.Marker` instance count at or below the configured buffer cap (no orphan accumulation)
**Plans**: TBD
**UI hint**: yes

### Phase 62: Frontend Buffer-Size Dropdown
**Goal**: Users can configure the map buffer size from a dropdown that persists across sessions and updates the live cap without interrupting the SSE stream
**Depends on**: Phase 61 (buffer refactor must exist before the dropdown can wire into it)
**Requirements**: MAPCFG-01, MAPCFG-02, MAPCFG-03, MAPCFG-04
**Success Criteria** (what must be TRUE):
  1. The left overlay panel displays a "Buffer Size" dropdown with four options: 100, 500, 1000, 2000
  2. Selecting 500 and reloading the page restores the dropdown to 500 (localStorage persisted under `aqua-tip:threat-map-buffer-size`)
  3. Changing the dropdown from 100 to 1000 while the SSE stream is active does not cause the live feed to disconnect and reconnect — events keep arriving uninterrupted
  4. Manually deleting the localStorage key and reloading defaults the dropdown to 100 with no JS error or empty map
**Plans**: TBD
**UI hint**: yes

### Phase 63: Frontend Marker Clustering
**Goal**: When buffer size exceeds 500, overlapping markers automatically cluster with count badges styled to the dark theme; crossing back under 500 reverts to individual markers cleanly
**Depends on**: Phase 61 (buffer refactor), Phase 62 (buffer-size dropdown drives the threshold)
**Requirements**: MAPCLU-01, MAPCLU-02, MAPCLU-03, MAPCLU-04, MAPCLU-05
**Success Criteria** (what must be TRUE):
  1. With buffer set to 1000 and 200+ markers on screen, nearby markers merge into cluster bubbles showing a count (e.g., "47") styled in the project's dark glassmorphism theme — no white default cluster icons visible
  2. Clicking a cluster zooms the map to show all child markers and expands them (Leaflet `clusterclick` → `zoomToBounds`)
  3. Changing the dropdown from 1000 back to 100 removes the cluster layer and reverts to individual markers — no marker is rendered twice, no blank map
  4. Loading 1000+ markers does not freeze the browser tab — chunked loading distributes computation across frames (UI remains responsive during initial paint)
  5. Cluster bubbles appear below the glassmorphism overlay panels in z-index (panels always readable, never obscured by cluster count labels)
**Plans**: TBD
**UI hint**: yes

### Phase 64: Frontend Victimology Tab
**Goal**: The Threat Actor modal replaces the thin Campaigns tab with a Victimology tab showing countries, regions, sectors, and organizations targeted by the actor
**Depends on**: Phase 59 (victimology data must exist in the enrichment response before the frontend can render it)
**Requirements**: VICTM-01, VICTM-02, VICTM-03, VICTM-04, VICTM-05, VICTM-06, VICTM-07, VICTM-08
**Success Criteria** (what must be TRUE):
  1. Opening a Threat Actor modal shows a "Victimology" tab and no "Campaigns" tab — the tab bar has exactly 5 tabs: Overview, Relationships, TTPs, Tools, Victimology
  2. Clicking the Victimology tab on an actor with known targets renders four sections: Targeted Countries (with flag icons), Targeted Regions, Targeted Sectors, and Targeted Organizations — at least one section is non-empty for any major actor (e.g., APT28)
  3. A target type with zero results (e.g., no Regions data) renders an empty-state message like "No regions data available" — no JS error, no blank section, no layout breakage
  4. Switching between Overview and Victimology tabs multiple times does not trigger additional network requests — enrichment is fetched once on modal open and cached in component state
**Plans**: TBD
**UI hint**: yes

### Phase 65: Frontend Campaigns Toggle
**Goal**: The Threat Actors page has a pill toggle to switch between the Threat Actors and Campaigns views; Campaigns view shows a paginated grid of OpenCTI Campaign entities with attribution chips
**Depends on**: Phase 60 (Campaigns backend endpoint must exist before the frontend calls it)
**Requirements**: CAMP-01, CAMP-02, CAMP-03, CAMP-04, CAMP-05, CAMP-06
**Success Criteria** (what must be TRUE):
  1. The Threat Actors page toolbar shows a pill toggle with "Threat Actors" and "Campaigns" buttons; clicking "Campaigns" switches the page content to a campaign card grid
  2. Each campaign card displays: name, first_seen/last_seen date range, objective text (if available), and an attributed-to chip showing the linked Intrusion Set name
  3. Refreshing the page at `/threat-actors?view=campaigns` restores the Campaigns view — the URL param drives the active view on mount
  4. Clicking a Campaign card opens a detail modal with full campaign metadata (name, description, dates, objective, attribution)
  5. Switching from a filtered Actors view back to Campaigns resets search and pagination — no stale Intrusion Set cursor is sent to the Campaigns API
**Plans**: TBD
**UI hint**: yes

### Phase 66: Integration Validation & Polish
**Goal**: All v6.1 features are verified end-to-end at their boundary conditions; visual regressions resolved and the milestone is shippable
**Depends on**: Phases 59–65 (all features complete)
**Requirements**: (no standalone requirements — validates coverage of all 32 requirements)
**Success Criteria** (what must be TRUE):
  1. Setting buffer to 2000 and leaving the map running for 5 minutes produces no browser console errors, no orphan markers, and no noticeable UI jank (cluster chunkedLoading distributing work)
  2. Switching buffer size across the 500 threshold (e.g., 100 → 1000 → 500 → 100) multiple times always leaves exactly the expected marker layer active — no double-render, no blank map
  3. Opening a Threat Actor modal, switching to Victimology tab, and closing/reopening the same actor modal does not produce duplicate network requests for enrichment
  4. The Campaigns view loads, paginates, and opens a campaign detail modal without any `primary_motivation` or `resource_level` field errors from the backend
  5. All four marker states (arriving pulse, settled dot, evicting fade, cluster bubble) are visually distinct and consistent with the dark glassmorphism design system
**Plans**: TBD

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 59. Backend Snapshot Resize + Victimology | 2/2 | Complete   | 2026-04-17 |
| 60. Backend Campaigns Service & Endpoint | 2/4 | In progress | - |
| 61. Frontend Threat Map Buffer Refactor | 0/? | Not started | - |
| 62. Frontend Buffer-Size Dropdown | 0/? | Not started | - |
| 63. Frontend Marker Clustering | 0/? | Not started | - |
| 64. Frontend Victimology Tab | 0/? | Not started | - |
| 65. Frontend Campaigns Toggle | 0/? | Not started | - |
| 66. Integration Validation & Polish | 0/? | Not started | - |

---

## Requirement Coverage

| Category | Requirements | Phase |
|----------|-------------|-------|
| MAPBUF | MAPBUF-01, MAPBUF-02, MAPBUF-03, MAPBUF-04, MAPBUF-05 | Phase 61 |
| MAPBUF | MAPBUF-06 | Phase 59 |
| MAPCFG | MAPCFG-01, MAPCFG-02, MAPCFG-03, MAPCFG-04 | Phase 62 |
| MAPCLU | MAPCLU-01, MAPCLU-02, MAPCLU-03, MAPCLU-04, MAPCLU-05 | Phase 63 |
| VICTM | VICTM-01, VICTM-02, VICTM-03, VICTM-04, VICTM-05, VICTM-06, VICTM-07, VICTM-08 | Phase 64 |
| VICTM | VICTM-09 | Phase 59 |
| CAMP | CAMP-07, CAMP-08 | Phase 60 |
| CAMP | CAMP-01, CAMP-02, CAMP-03, CAMP-04, CAMP-05, CAMP-06 | Phase 65 |

**Total mapped: 32/32** (100% coverage — Phase 66 is integration validation, no orphaned requirements)

---

## Key Architectural Notes

- **PITFALL-01**: Buffer size must reach SSE closure via `useRef` synced by separate effect — never add `bufferSize` to SSE effect deps (would cause reconnect storm)
- **PITFALL-02**: `markerInstancesRef` (Map keyed by event ID) must diff-reconcile on every buffer change — React array eviction does NOT auto-remove Leaflet layers
- **PITFALL-06**: Cluster layer swap: always `map.removeLayer(oldGroup)` before creating new cluster group — single `markerGroupRef` pattern
- **PITFALL-09**: `ThreatCampaignService` MUST be standalone, NOT a subclass/copy of `ThreatActorService` — Campaign STIX fields differ (`first_seen/last_seen/objective`, not `aliases/primary_motivation`)
- **PITFALL-12**: OpenCTI Organization lives under `Identity` abstract type — use `toTypes: ["Identity"]` + filter by `entity_type` in PHP normalization; verify in live GraphiQL at 192.168.251.20 before coding
- **PITFALL-13**: Victimology sub-queries risk N+1 enrichment timeout — consolidate into single `toTypes: ["Country","Region","Sector","Identity"]` call, split by `entity_type` in normalizer
- **New dep**: `leaflet.markercluster@1.5.3` installed in Phase 63 only — import `MarkerCluster.css` only, skip `MarkerCluster.Default.css`
