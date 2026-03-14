# Requirements: AQUA TIP

**Defined:** 2026-03-14
**Core Value:** Users can securely sign up, log in, and access the platform — with rate-limited IP search for guests (1/day) and authenticated users (10/day).

## v2.0 Requirements

Requirements for OpenCTI integration milestone. Each maps to roadmap phases.

### Foundation

- [x] **FOUND-01**: Rename "IOC Search" to "IP Search" across all backend and frontend files
- [x] **FOUND-02**: Add OpenCTI API configuration (base URL, Bearer token) to Laravel .env and config
- [x] **FOUND-03**: Create OpenCtiService class that executes GraphQL queries with auth, error handling, and timeout

### IP Search

- [x] **IPSRC-01**: User can search an IP address and get real threat data from OpenCTI observables
- [x] **IPSRC-02**: IP Search results display threat score, classifications, and intelligence sources
- [x] **IPSRC-03**: IP Search shows ASN, geolocation (country/city), and ISP/organization for the IP
- [x] **IPSRC-04**: IP Search relations tab shows real relationships from OpenCTI
- [x] **IPSRC-05**: IP Search consumes credits (existing credit gating via deduct-credit middleware)
- [x] **IPSRC-06**: Credit refund on OpenCTI API failure (follow DarkWeb refund pattern)

### Rate Limiting

- [x] **RATE-04**: Guest sees "Sign in for more lookups" CTA when credits exhausted on IP Search
- [x] **RATE-05**: Authenticated user sees "Daily limit reached" message when credits exhausted on IP Search

### Threat Actors

- [ ] **TACT-01**: User can view list of threat actors (intrusion sets) from OpenCTI
- [ ] **TACT-02**: Each threat actor card shows name, description, aliases, and external references
- [ ] **TACT-03**: Each threat actor shows primary motivation, resource level, sophistication, and goals
- [ ] **TACT-04**: Threat actors list supports pagination

### Threat News

- [ ] **TNEWS-01**: User can view list of threat intelligence reports from OpenCTI
- [ ] **TNEWS-02**: Each report card shows title, published date, description, and confidence level
- [ ] **TNEWS-03**: Each report shows related entities (linked indicators, malware, actors)
- [ ] **TNEWS-04**: Threat news list supports pagination

### Threat Map

- [ ] **TMAP-01**: Laravel consumes OpenCTI SSE /stream endpoint for real-time STIX events
- [ ] **TMAP-02**: Threat map displays animated arc lines between attacker and target countries
- [ ] **TMAP-03**: Map markers pulse and show threat counts per country/location
- [ ] **TMAP-04**: Live feed sidebar shows individual threat events as they arrive (type, source, timestamp)
- [ ] **TMAP-05**: Real-time counters for active threats, countries affected, and attack types

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### User Settings

- **SETS-01**: User can select timezone preference
- **SETS-02**: Credits reset at midnight in user's selected timezone (per-user reset)
- **SETS-03**: User sees when credits will refuel based on their timezone

### Enrichment

- **ENRICH-01**: IP Search shows data from multiple sources (VirusTotal, AbuseIPDB, Shodan)
- **ENRICH-02**: Threat actor detail page with full TTP matrix

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full GraphQL proxy to OpenCTI | Security risk — expose only curated endpoints |
| STIX import/export | Not needed for read-only TIP display |
| Multi-source enrichment (v2.0) | OpenCTI is single source for now; enrichment deferred |
| Real-time WebSocket push to frontend | SSE polling from Laravel is sufficient; WebSockets add complexity |
| OpenCTI admin/connector management | Out of scope — manage via OpenCTI UI directly |
| Mobile app | Web-first approach |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 8 | Complete |
| FOUND-02 | Phase 8 | Complete |
| FOUND-03 | Phase 8 | Complete |
| IPSRC-01 | Phase 9 | Complete |
| IPSRC-02 | Phase 9 | Complete |
| IPSRC-03 | Phase 9 | Complete |
| IPSRC-04 | Phase 9 | Complete |
| IPSRC-05 | Phase 9 | Complete |
| IPSRC-06 | Phase 9 | Complete |
| RATE-04 | Phase 9 | Complete |
| RATE-05 | Phase 9 | Complete |
| TACT-01 | Phase 10 | Pending |
| TACT-02 | Phase 10 | Pending |
| TACT-03 | Phase 10 | Pending |
| TACT-04 | Phase 10 | Pending |
| TNEWS-01 | Phase 10 | Pending |
| TNEWS-02 | Phase 10 | Pending |
| TNEWS-03 | Phase 10 | Pending |
| TNEWS-04 | Phase 10 | Pending |
| TMAP-01 | Phase 11 | Pending |
| TMAP-02 | Phase 11 | Pending |
| TMAP-03 | Phase 11 | Pending |
| TMAP-04 | Phase 11 | Pending |
| TMAP-05 | Phase 11 | Pending |

**Coverage:**
- v2.0 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0

---
*Requirements defined: 2026-03-14*
*Last updated: 2026-03-14 after roadmap creation*
