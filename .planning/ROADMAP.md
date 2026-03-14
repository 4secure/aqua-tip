# Roadmap: AQUA TIP

## Milestones

- ✅ **v1.0 Authentication System** — Phases 1-5 (shipped 2026-03-14)
- ✅ **v1.1 PostgreSQL Migration & Railway Deployment** — Phases 6-7 (shipped 2026-03-14)
- 🚧 **v2.0 OpenCTI Integration** — Phases 8-11 (in progress)

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

### 🚧 v2.0 OpenCTI Integration (In Progress)

**Milestone Goal:** Connect the platform to a real OpenCTI instance for IP search, threat actors, threat map, and threat news — replacing mock data with live threat intelligence.

- [x] **Phase 8: Foundation & OpenCTI Service** - Rename IOC to IP Search, configure OpenCTI API credentials, create base service class (completed 2026-03-14)
- [ ] **Phase 9: IP Search Integration** - Wire IP Search to real OpenCTI data with credit gating, refund on failure, and rate limit CTAs
- [ ] **Phase 10: Threat Actors & Threat News** - Paginated list pages for intrusion sets and reports from OpenCTI
- [ ] **Phase 11: Threat Map** - Live threat map with SSE streaming, animated arcs, and real-time counters

## Phase Details

### Phase 8: Foundation & OpenCTI Service
**Goal**: Codebase is renamed from IOC to IP Search and the OpenCTI service layer is ready for feature work
**Depends on**: Phase 7
**Requirements**: FOUND-01, FOUND-02, FOUND-03
**Success Criteria** (what must be TRUE):
  1. All references to "IOC Search" read "IP Search" across routes, navigation, page titles, and code
  2. OpenCTI API credentials are configured in Laravel environment and a health-check query succeeds against the live instance
  3. OpenCtiService class can execute an arbitrary GraphQL query with auth, error handling, and timeout — verified by a passing test
**Plans**: 2 plans

Plans:
- [x] 08-01-PLAN.md — Rename IOC Search to IP Search across backend and frontend
- [x] 08-02-PLAN.md — Create OpenCTI service layer with config, service class, and health check

### Phase 9: IP Search Integration
**Goal**: Users can search an IP address and get real threat intelligence from OpenCTI, with proper credit gating and rate limit feedback
**Depends on**: Phase 8
**Requirements**: IPSRC-01, IPSRC-02, IPSRC-03, IPSRC-04, IPSRC-05, IPSRC-06, RATE-04, RATE-05
**Success Criteria** (what must be TRUE):
  1. User searches an IP address on the IP Search page and sees real threat data (score, classifications, sources) from OpenCTI
  2. IP Search results include ASN, geolocation (country/city), and ISP/organization metadata
  3. IP Search relations tab displays real STIX relationships from OpenCTI (linked indicators, malware, actors)
  4. Each search consumes a credit; if OpenCTI API fails, the credit is refunded and the user sees an error message
  5. Guest with exhausted credits sees a "Sign in for more lookups" CTA; authenticated user sees "Daily limit reached" message
**Plans**: 2 plans

Plans:
- [ ] 09-01-PLAN.md — IpSearchService with OpenCTI queries, ip-api.com geo fallback, caching, and credit refund
- [ ] 09-02-PLAN.md — Frontend IP Search page with live API data, dynamic tabs, and rate limit CTAs

### Phase 10: Threat Actors & Threat News
**Goal**: Users can browse paginated lists of real threat actors and threat intelligence reports from OpenCTI
**Depends on**: Phase 8
**Requirements**: TACT-01, TACT-02, TACT-03, TACT-04, TNEWS-01, TNEWS-02, TNEWS-03, TNEWS-04
**Success Criteria** (what must be TRUE):
  1. User can view a paginated list of threat actors showing name, description, aliases, and external references per card
  2. Each threat actor card shows motivation, resource level, sophistication, and goals when available
  3. User can view a paginated list of threat reports showing title, published date, description, and confidence level per card
  4. Each report shows related entities (linked indicators, malware, actors) when available
  5. Both lists support forward/backward pagination with cursor-based navigation
**Plans**: TBD

Plans:
- [ ] 10-01: TBD
- [ ] 10-02: TBD

### Phase 11: Threat Map
**Goal**: Users see a live geographic threat map with real-time streaming data from OpenCTI
**Depends on**: Phase 8
**Requirements**: TMAP-01, TMAP-02, TMAP-03, TMAP-04, TMAP-05
**Success Criteria** (what must be TRUE):
  1. Laravel backend consumes OpenCTI SSE /stream endpoint and serves processed threat events to the frontend
  2. Map displays animated arc lines between attacker and target countries as threat events arrive
  3. Map markers pulse at threat locations and show threat counts per country
  4. Live feed sidebar shows individual threat events (type, source, target, timestamp) updating in real time
  5. Real-time counters display active threats, countries affected, and attack type breakdown
**Plans**: TBD

Plans:
- [ ] 11-01: TBD
- [ ] 11-02: TBD

## Progress

**Execution Order:**
Phases 8 first (foundation), then 9-11. Phases 10 and 11 are independent of each other (both depend on Phase 8 only). Phase 9 depends on Phase 8.

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
| 9. IP Search Integration | v2.0 | 0/2 | Not started | - |
| 10. Threat Actors & Threat News | v2.0 | 0/? | Not started | - |
| 11. Threat Map | v2.0 | 0/? | Not started | - |
