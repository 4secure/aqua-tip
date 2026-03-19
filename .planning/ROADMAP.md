# Roadmap: AQUA TIP

## Milestones

- ✅ **v1.0 Authentication System** — Phases 1-5 (shipped 2026-03-14)
- ✅ **v1.1 PostgreSQL Migration & Railway Deployment** — Phases 6-7 (shipped 2026-03-14)
- ✅ **v2.0 OpenCTI Integration** — Phases 8-11 (shipped 2026-03-16)
- ✅ **v2.1 Threat Search & UI Refresh** — Phases 12-17 (shipped 2026-03-18)
- 🚧 **v2.2 Live Dashboard & Search History** — Phases 18-21 (in progress)

## Phases

<details>
<summary>✅ v1.0 Authentication System (Phases 1-5) — SHIPPED 2026-03-14</summary>

- [x] Phase 1: Laravel Foundation + Core Auth (2/2 plans) — completed 2026-03-12
- [x] Phase 2: OAuth + Email Verification (2/2 plans) — completed 2026-03-13
- [x] Phase 3: Rate Limiting Backend (2/2 plans) — completed 2026-03-13
- [x] Phase 4: Frontend Auth Integration (3/3 plans) — completed 2026-03-13
- [x] Phase 4.1: Layout Redesign (2/2 plans) — completed 2026-03-13 (INSERTED)
- [x] Phase 5: Dark Web Search Backend + Frontend (2/2 plans) — completed 2026-03-13

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 PostgreSQL Migration & Railway Deployment (Phases 6-7) — SHIPPED 2026-03-14</summary>

- [x] Phase 6: PostgreSQL Migration (2/2 plans) — completed 2026-03-13
- [x] Phase 7: Railway Production Deployment (2/2 plans) — completed 2026-03-14

Full details: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v2.0 OpenCTI Integration (Phases 8-11) — SHIPPED 2026-03-16</summary>

- [x] Phase 8: Foundation & OpenCTI Service (2/2 plans) — completed 2026-03-14
- [x] Phase 9: IP Search Integration (3/3 plans) — completed 2026-03-15
- [x] Phase 10: Threat Actors & Threat News (2/2 plans) — completed 2026-03-15
- [x] Phase 11: Threat Map (2/2 plans) — completed 2026-03-15

Full details: `.planning/milestones/v2.0-ROADMAP.md`

</details>

<details>
<summary>✅ v2.1 Threat Search & UI Refresh (Phases 12-17) — SHIPPED 2026-03-18</summary>

- [x] Phase 12: Threat Actors UI Refresh (1/1 plans) — completed 2026-03-17
- [x] Phase 13: Threat News UI Refresh (1/1 plans) — completed 2026-03-17
- [x] Phase 14: Backend Search Generalization (2/2 plans) — completed 2026-03-18
- [x] Phase 15: Frontend Threat Search + Route Migration (1/1 plans) — completed 2026-03-18
- [x] Phase 16: Threat Actors UX Polish (1/1 plans) — completed 2026-03-18
- [x] Phase 17: Threat News UX Polish (2/2 plans) — completed 2026-03-18

Full details: `.planning/milestones/v2.1-ROADMAP.md`

</details>

### 🚧 v2.2 Live Dashboard & Search History (In Progress)

**Milestone Goal:** Replace all dashboard mock data with live OpenCTI data, add search history tracking, and show recent searches on the Threat Search page.

- [x] **Phase 18: Dashboard Stats Backend** - DashboardService aggregating OpenCTI stats into a single cached endpoint (completed 2026-03-18)
- [x] **Phase 19: Search History Backend** - Auth-only endpoint exposing existing search_logs for recent queries (completed 2026-03-18)
- [ ] **Phase 20: Dashboard Page Rewrite** - Replace all mock data with live API calls, add credit and search widgets
- [ ] **Phase 21: Threat Search History** - Recent searches empty state on Threat Search page with click-to-rerun

## Phase Details

### Phase 18: Dashboard Stats Backend
**Goal**: Users get live threat statistics from the dashboard API instead of hardcoded numbers
**Depends on**: Phase 17 (existing OpenCtiService infrastructure)
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-06
**Success Criteria** (what must be TRUE):
  1. GET /api/dashboard/stats returns real observable counts, recent indicators, and attack category distribution from OpenCTI
  2. Response is cached (5-min TTL) with stale-cache fallback when OpenCTI is unreachable
  3. Dashboard map widget data is available via existing snapshot endpoint (no new SSE connection)
  4. Stats auto-refresh capability is supported by the endpoint (frontend can poll every 5 minutes)
**Plans**: 2 plans

Plans:
- [ ] 18-01-PLAN.md — DashboardService + 3 controllers + public routes
- [ ] 18-02-PLAN.md — Feature and unit tests for all dashboard endpoints

### Phase 19: Search History Backend
**Goal**: Authenticated users can retrieve their recent search history through a dedicated API endpoint
**Depends on**: Nothing (independent of Phase 18; uses existing search_logs table)
**Requirements**: HIST-01, HIST-02
**Success Criteria** (what must be TRUE):
  1. GET /api/search-history returns the authenticated user's recent searches (query, type, module, timestamp)
  2. Endpoint requires auth:sanctum -- guests receive 401, not IP-based history
  3. Results are ordered by most recent first with a reasonable limit
**Plans**: 1 plan

Plans:
- [ ] 19-01-PLAN.md — TDD: feature tests + SearchHistory controller + route

### Phase 20: Dashboard Page Rewrite
**Goal**: Users see a fully live dashboard with real threat data, their credit balance, and recent searches -- zero mock data
**Depends on**: Phase 18, Phase 19
**Requirements**: DASH-05, WIDG-01, WIDG-02, CLEAN-01, CLEAN-02
**Success Criteria** (what must be TRUE):
  1. Dashboard stat cards display real observable counts from OpenCTI (no fake deltas or sparklines)
  2. Recent indicators table shows real observables and clicking an attack category filters the table
  3. Attack categories bar chart renders real label distribution from OpenCTI
  4. Dashboard shows user's remaining daily credit balance and their recent searches
  5. Zero mock data imports remain in DashboardPage and unused dashboard exports are removed from mock-data.js
**Plans**: 2 plans

Plans:
- [ ] 20-01-PLAN.md — Backend fixes: update entity types (Hostname, X509-Certificate) and add labels to indicators
- [ ] 20-02-PLAN.md — Frontend DashboardPage rewrite with live API calls + mock data cleanup

### Phase 21: Threat Search History
**Goal**: Users see their recent searches on the Threat Search page when no search is active, with one-click re-run
**Depends on**: Phase 19 (search history endpoint), Phase 20 (shared RecentSearches component)
**Requirements**: HIST-03, HIST-04, HIST-05
**Success Criteria** (what must be TRUE):
  1. Threat Search page displays recent searches when no search result is active
  2. Each history entry shows a search type badge (IP, Domain, Hash, etc.) next to the query
  3. Clicking a recent search entry re-runs that query and displays results
**Plans**: TBD

Plans:
- [ ] 21-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 18 → 19 → 20 → 21
(Phases 18 and 19 are independent and could execute in parallel)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Laravel Foundation + Core Auth | v1.0 | 2/2 | Complete | 2026-03-12 |
| 2. OAuth + Email Verification | v1.0 | 2/2 | Complete | 2026-03-13 |
| 3. Rate Limiting Backend | v1.0 | 2/2 | Complete | 2026-03-13 |
| 4. Frontend Auth Integration | v1.0 | 3/3 | Complete | 2026-03-13 |
| 4.1. Layout Redesign | v1.0 | 2/2 | Complete | 2026-03-13 |
| 5. Dark Web Search | v1.0 | 2/2 | Complete | 2026-03-13 |
| 6. PostgreSQL Migration | v1.1 | 2/2 | Complete | 2026-03-13 |
| 7. Railway Production Deployment | v1.1 | 2/2 | Complete | 2026-03-14 |
| 8. Foundation & OpenCTI Service | v2.0 | 2/2 | Complete | 2026-03-14 |
| 9. IP Search Integration | v2.0 | 3/3 | Complete | 2026-03-15 |
| 10. Threat Actors & Threat News | v2.0 | 2/2 | Complete | 2026-03-15 |
| 11. Threat Map | v2.0 | 2/2 | Complete | 2026-03-15 |
| 12. Threat Actors UI Refresh | v2.1 | 1/1 | Complete | 2026-03-17 |
| 13. Threat News UI Refresh | v2.1 | 1/1 | Complete | 2026-03-17 |
| 14. Backend Search Generalization | v2.1 | 2/2 | Complete | 2026-03-18 |
| 15. Frontend Threat Search + Route Migration | v2.1 | 1/1 | Complete | 2026-03-18 |
| 16. Threat Actors UX Polish | v2.1 | 1/1 | Complete | 2026-03-18 |
| 17. Threat News UX Polish | v2.1 | 2/2 | Complete | 2026-03-18 |
| 18. Dashboard Stats Backend | 2/2 | Complete    | 2026-03-18 | - |
| 19. Search History Backend | 1/1 | Complete    | 2026-03-18 | - |
| 20. Dashboard Page Rewrite | 1/2 | In Progress|  | - |
| 21. Threat Search History | v2.2 | 0/? | Not started | - |
