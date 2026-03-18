# Roadmap: AQUA TIP

## Milestones

- ✅ **v1.0 Authentication System** — Phases 1-5 (shipped 2026-03-14)
- ✅ **v1.1 PostgreSQL Migration & Railway Deployment** — Phases 6-7 (shipped 2026-03-14)
- ✅ **v2.0 OpenCTI Integration** — Phases 8-11 (shipped 2026-03-16)
- 🚧 **v2.1 Threat Search & UI Refresh** — Phases 12-15 (in progress)

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

### 🚧 v2.1 Threat Search & UI Refresh (In Progress)

**Milestone Goal:** Expand IP Search into a universal Threat Search for all OpenCTI observable types, and refresh the Threat Actors and Threat News page UIs.

- [x] **Phase 12: Threat Actors UI Refresh** - 4-col grid layout, remove descriptions and clean subheading (completed 2026-03-17)
- [x] **Phase 13: Threat News UI Refresh** - Row-based layout with tags, top pagination, no confidence (completed 2026-03-17)
- [x] **Phase 14: Backend Search Generalization** - New ThreatSearch endpoint accepting all 9 observable types (completed 2026-03-18)
- [x] **Phase 15: Frontend Threat Search + Route Migration** - Rename IpSearchPage to ThreatSearchPage, add detected-type badge, migrate all routes (completed 2026-03-18)

## Phase Details

### Phase 12: Threat Actors UI Refresh
**Goal**: Threat Actors page displays a clean, dense card grid without visual clutter
**Depends on**: Nothing (independent UI work)
**Requirements**: TA-01, TA-02, TA-03
**Success Criteria** (what must be TRUE):
  1. Threat Actors page displays cards in a 4-column grid on desktop viewports
  2. Card faces show actor name, aliases, and metadata but no description text
  3. Page subheading reads without the word "OpenCTI" appearing in it
**Plans:** 1/1 plans complete
Plans:
- [ ] 12-01-PLAN.md — Grid layout, card cleanup, and overflow caps

### Phase 13: Threat News UI Refresh
**Goal**: Threat News page uses a scannable row-based layout with tags and streamlined navigation
**Depends on**: Nothing (independent UI work)
**Requirements**: TN-01, TN-02, TN-03, TN-04
**Success Criteria** (what must be TRUE):
  1. Threat News page renders reports as horizontal rows instead of card grid
  2. Each row and the detail modal display entity tags for the report
  3. No confidence level badge or indicator appears anywhere on the page
  4. Pagination controls and result count appear above the report list (replacing the filter bar)
**Plans:** 1/1 plans complete
Plans:
- [ ] 13-01-PLAN.md — Row layout, confidence removal, inline toolbar pagination

### Phase 14: Backend Search Generalization
**Goal**: Backend accepts and processes searches for any of 9 observable types with auto-detection
**Depends on**: Nothing (backend-only, old frontend keeps working)
**Requirements**: SRCH-01, SRCH-02, SRCH-05, SRCH-06, SRCH-07, SRCH-08, ROUTE-03
**Success Criteria** (what must be TRUE):
  1. POST /api/threat-search accepts IPv4, IPv6, Domain, URL, Email, MD5, SHA-1, SHA-256, and Hostname queries and returns OpenCTI observable data
  2. Backend auto-detects the input type via regex/validation and includes the detected type in the response
  3. Geo enrichment data (ASN, country, city, ISP) is returned only for IP-type searches and omitted for all other types
  4. Relationship graph data, Indicators, Sightings, and Notes are returned for all observable types
  5. Backend controllers and services use ThreatSearch naming (IpSearch naming retired from backend)
**Plans:** 2/2 plans complete
Plans:
- [ ] 14-01-PLAN.md — ThreatSearchService, migration, and SearchLog model update
- [ ] 14-02-PLAN.md — ThreatSearch controller, request validation, and route registration

### Phase 15: Frontend Threat Search + Route Migration
**Goal**: Users search any observable type from a unified Threat Search page at the new /threat-search route
**Depends on**: Phase 14 (backend endpoint must exist)
**Requirements**: SRCH-03, SRCH-04, ROUTE-01, ROUTE-02
**Success Criteria** (what must be TRUE):
  1. SRCH-03 dropped per user decision -- no type selector dropdown needed
  2. Search results display a badge showing the detected observable type in the result header
  3. /threat-search is the active route and /ip-search redirects to it (no dead links)
  4. All sidebar links, landing page CTAs, and navigation references point to /threat-search
**Plans:** 1/1 plans complete
Plans:
- [ ] 15-01-PLAN.md — Rename files, generalize search page, add type badge, migrate all routes

## Progress

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
| 13. Threat News UI Refresh | 1/1 | Complete    | 2026-03-17 | - |
| 14. Backend Search Generalization | 2/2 | Complete    | 2026-03-18 | - |
| 15. Frontend Threat Search + Route Migration | 1/1 | Complete   | 2026-03-18 | - |
