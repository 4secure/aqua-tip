# Project Research Summary

**Project:** AQUA TIP - Threat Intelligence Platform (OpenCTI Integration)
**Domain:** OpenCTI GraphQL API integration into existing Laravel 12 + React 19 TIP
**Researched:** 2026-03-14
**Confidence:** HIGH

## Executive Summary

AQUA TIP v2.0 replaces mock threat intelligence data with real data from an internal OpenCTI instance via its GraphQL API. The integration covers four features: IP Search (credit-gated observable lookup), Threat Actors (intrusion set browsing), Threat News (report listing), and Threat Map (geographic threat visualization). The recommended approach requires zero new dependencies -- Laravel's built-in HTTP client handles all GraphQL communication through a single `OpenCtiService` class that mirrors the existing `DarkWebProviderService` pattern. The React frontend continues to call Laravel API endpoints only; it never talks to OpenCTI directly.

The architecture is a strict backend proxy: Laravel holds the OpenCTI Bearer token, executes four fixed GraphQL queries, flattens Relay-style edge/node responses into clean arrays, and serves them through standard REST endpoints. IP Search reuses the existing credit-gating middleware with a refund-on-failure pattern. Threat Actors, Threat News, and Threat Map are auth-only browse pages with server-side caching (5-15 minute TTLs). This proxy pattern enforces credit gating, keeps the OpenCTI token server-side, handles the private network topology (OpenCTI at `192.168.251.20` is unreachable from browsers), and decouples the frontend from OpenCTI's STIX-heavy schema.

The primary risks are operational, not architectural. The OpenCTI instance may have sparse or no data if connectors are not configured -- every page needs graceful empty states. The IOC-to-IP-Search rename touches 16+ files across backend and frontend and should be done as an isolated commit before integration work begins. Network topology is a deployment constraint: the private OpenCTI address works from Laragon locally but not from cloud hosting. GraphQL over-fetching can cause response bloat and timeouts if queries are not carefully scoped. All of these have straightforward mitigations documented in the research.

## Key Findings

### Recommended Stack

No new Composer or npm packages are needed. The entire integration is built with Laravel's existing HTTP client (`Http::withToken()->post()`) and the React frontend's existing Axios setup. Four fixed GraphQL queries (observables, intrusion sets, reports, locations) do not justify a GraphQL client library. The existing `DarkWebProviderService` establishes the exact pattern to follow: config-driven credentials in `services.php`, single service class, timeout/retry configuration, response normalization.

**Core technologies:**
- **Laravel HTTP Client** (built-in): GraphQL transport via `Http::withToken()->post()` -- zero new dependencies
- **Raw GraphQL query strings**: Four fixed queries; simpler and more maintainable than a query-builder abstraction
- **Laravel Cache** (built-in): Server-side response caching for browse pages (threat actors 15 min, threat map 15 min, threat news 5 min)
- **OpenCTI GraphQL API** (v5.x/6.x): Relay-style cursor pagination, FilterGroup input types, Bearer token auth

### Expected Features

**Must have (table stakes):**
- IP search with threat score display (`x_opencti_score`), related indicators, and related reports
- Credit gating on IP search (reuse existing `DeductCredit` middleware with refund on failure)
- Searchable/filterable threat actor listing with name, description, aliases, country attribution
- Report listing with title, date, author, keyword search, date filtering
- Threat map with real geographic markers from OpenCTI Location entities and threat counts
- Loading states, error states, and empty states for all four pages
- Rate limit CTAs (RATE-04 guest upgrade, RATE-05 daily limit) -- frontend JSX already exists

**Should have (differentiators):**
- Unified search detecting IP/domain/hash and routing to correct query type
- D3 relationship graph populated with real STIX relationship data
- Threat actor profile cards with country flags and TTP badges
- Credit-gated access model (unique vs raw OpenCTI access)

**Defer (v2.x+):**
- Report detail page with full STIX content
- Threat actor detail page with arsenal and victimology
- Domain and hash search (extend IP search to other observable types)
- Multi-source enrichment (VirusTotal, AbuseIPDB, Shodan)
- Animated threat map arcs (high frontend complexity, needs attack flow data)
- STIX bundle import/export (rebuilds OpenCTI ingestion -- out of scope)

### Architecture Approach

All OpenCTI communication goes through a single `OpenCtiService` class with four public methods (`searchObservable`, `listIntrusionSets`, `listReports`, `getGeographicalThreats`) and a private `execute()` method handling auth, timeout, retry, and error checking. Each feature gets its own invokable controller following the existing single-action pattern. IP Search is credit-gated; the other three endpoints require auth only. The frontend adds one new API module (`opencti.js`) and wires four existing pages to real endpoints.

**Major components:**
1. **`OpenCtiService`** -- Sends GraphQL queries to OpenCTI, flattens edge/node responses, handles errors and retries
2. **`IpSearch\SearchController`** -- Credit-gated IP lookup with refund on OpenCTI failure (replaces mock service)
3. **`ThreatActors\IndexController`** / **`ThreatNews\IndexController`** / **`ThreatMap\IndexController`** -- Auth-only browse endpoints with server-side caching
4. **Frontend API module + page rewiring** -- `opencti.js` API client; four pages switch from mock data to real API responses

### Critical Pitfalls

1. **OpenCTI token exposure** -- Never use `VITE_` prefix for OpenCTI credentials. Token stays in Laravel `.env`, all queries proxied through backend. This is the foundational architectural constraint.
2. **Empty OpenCTI instance** -- A fresh instance has no data. Verify data availability before building pages. At minimum, configure MITRE ATT&CK connector (free) and one feed connector. Design all pages with explicit empty states.
3. **Credit lost on API failure** -- `DeductCredit` middleware runs before the controller. Implement refund in the controller's catch block (pattern already exists in `DarkWeb\SearchController`).
4. **GraphQL over-fetching** -- Select only displayed fields, always specify `first: N`, limit nesting to 2 levels, set 15-second timeout. Measure response sizes during development.
5. **IOC-to-IP rename breakage** -- Touches 16+ files across routes, controllers, requests, tests, frontend. Do as isolated commit before integration. Run full test suite after.
6. **Network topology** -- OpenCTI at `192.168.251.20` is unreachable from cloud hosting. Acceptable for local development; document the constraint explicitly.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation and Preparation
**Rationale:** Two prerequisite tasks must complete before any OpenCTI code: (1) verify OpenCTI instance has data, and (2) complete the IOC-to-IP rename cleanly. Both are low-risk but block everything downstream.
**Delivers:** Renamed codebase (IOC -> IP Search across all layers), verified OpenCTI data availability, `config/services.php` with OpenCTI credentials, environment variables, health check endpoint (`GET /api/health/opencti`).
**Addresses features:** Rename IOC to IP Search.
**Avoids pitfalls:** #5 (rename breakage), #3 (empty instance), #6 (network connectivity -- verified here).

### Phase 2: OpenCTI Service + IP Search Integration
**Rationale:** IP Search is the highest-value, highest-risk feature. It validates the entire OpenCTI integration pattern (service class, GraphQL query execution, error handling, credit refund) and replaces the existing mock with real data. Building this first proves the architecture works.
**Delivers:** `OpenCtiService` with `execute()` and `searchObservable()` methods, `IpSearch\SearchController` wired to OpenCTI, credit refund on failure, D3 graph populated with real STIX relationships, loading/error/empty states on IP search page.
**Addresses features:** IP search with threat score, related indicators, related reports, credit gating with refund, raw STIX view.
**Avoids pitfalls:** #1 (token exposure -- proxy pattern established), #4 (credit refund), #2 (over-fetching -- first query validated).

### Phase 3: Threat Actors + Threat News
**Rationale:** Both are list/browse pages with the same pattern (paginated GraphQL query, cursor pagination, server-side caching, no credit gating). They can be built in parallel or sequentially using the service class proven in Phase 2.
**Delivers:** `listIntrusionSets()` and `listReports()` service methods, two new controllers, two fully implemented frontend pages replacing placeholders, search/filter/pagination on both pages, 15-minute and 5-minute server-side caching.
**Addresses features:** Threat actor listing with name/description/aliases/labels, threat news listing with title/date/author/search.
**Avoids pitfalls:** #2 (over-fetching -- use "list" queries with minimal fields).

### Phase 4: Threat Map with Real Geographic Data
**Rationale:** The threat map is last because it has the most complex data transformation (Location entities with relationship counts for marker sizing) and the highest risk of empty data (geographic data depends on specific OpenCTI connectors). The existing mock map provides a functional fallback.
**Delivers:** `getGeographicalThreats()` service method, `ThreatMap\IndexController`, Leaflet map populated with real country markers and threat density, attack type breakdown from real data, 15-minute server-side caching.
**Addresses features:** Geographic markers from real data, country-level threat counts, attack type breakdown.
**Avoids pitfalls:** #3 (empty data -- fall back to mock with "demo data" badge if no Location entities exist).

### Phase Ordering Rationale

- **Phase 1 before all else** because the rename creates a clean baseline and data verification prevents building on an empty foundation.
- **Phase 2 first feature** because IP Search is the primary CTA, validates the entire integration pattern, and has the most complexity (credit gating + refund). If this works, Phases 3-4 are mechanical.
- **Phases 3 and 4 are independent** of each other -- they only depend on the `OpenCtiService` from Phase 2. They could theoretically be built in parallel.
- **Phase 4 last** because geographic data is the most likely to be sparse in OpenCTI and the existing mock map is an acceptable fallback.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (IP Search):** The GraphQL query for `stixCyberObservables` with relationship expansion needs validation against the actual OpenCTI playground. Field names (`x_opencti_score`, `stixCoreRelationships` inline) should be verified before implementation.
- **Phase 4 (Threat Map):** Geographic data structure in OpenCTI varies by instance configuration. The relationship count approach for threat density needs playground validation. May need to adjust the query strategy based on available data.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Pure renaming and config work. No unknowns.
- **Phase 3 (Threat Actors + News):** Straightforward list/pagination pattern. Identical to Phase 2 service methods but simpler (no credit gating).

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new dependencies. All tools already in use. OpenCTI API docs are comprehensive. GraphQL queries verified against pycti source and official schema. |
| Features | HIGH | Feature set clearly scoped to 4 pages. Table stakes identified from competitor analysis (OpenCTI native, MISP, VirusTotal). Dependency tree is simple and linear. |
| Architecture | HIGH | Proxy pattern already proven with DarkWebProviderService. All patterns (credit refund, response normalization, invokable controllers) exist in the codebase. |
| Pitfalls | HIGH | All critical pitfalls sourced from OpenCTI official docs, GitHub issues, and existing codebase inspection. No speculative issues. |

**Overall confidence:** HIGH

### Gaps to Address

- **OpenCTI data availability:** The instance at `192.168.251.20:8080` has not been verified for data content. Run test queries in the GraphQL playground before Phase 2 begins. If empty, configure MITRE ATT&CK + AlienVault OTX connectors (both free) and wait for initial import (1-2 hours).
- **Exact GraphQL field names:** Queries are based on pycti source code and OpenCTI docs, but the exact schema depends on the OpenCTI version running on the instance. Verify via the GraphQL playground introspection before hardcoding queries.
- **Deployment topology:** The private network address works locally but blocks cloud deployment. This is documented but not resolved -- the project should explicitly decide whether production is local-only or requires a tunnel/public OpenCTI instance.
- **Observable metadata richness:** ASN, geolocation, and enrichment data for IP observables depends on which connectors are active. The UI should handle sparse metadata gracefully rather than assuming all fields are populated.
- **Credit cost for empty results:** Should a search that returns zero OpenCTI results still cost a credit? This is a product decision that needs to be made before Phase 2 implementation.

## Sources

### Primary (HIGH confidence)
- [OpenCTI GraphQL API Documentation](https://docs.opencti.io/latest/reference/api/)
- [OpenCTI Filter Reference](https://docs.opencti.io/latest/reference/filters/)
- [OpenCTI Data Model (STIX)](https://docs.opencti.io/latest/usage/data-model/)
- [OpenCTI GraphQL Schema (GitHub)](https://github.com/OpenCTI-Platform/opencti/blob/master/opencti-platform/opencti-graphql/config/schema/opencti.graphql)
- [OpenCTI pycti source code](https://github.com/OpenCTI-Platform/client-python) -- query structure reference for observables, intrusion sets, reports
- [Laravel 12.x HTTP Client Documentation](https://laravel.com/docs/12.x/http-client)
- Existing AQUA TIP codebase -- `DarkWebProviderService`, `DeductCredit` middleware, `SearchController` patterns

### Secondary (MEDIUM confidence)
- [OpenCTI Practical API Usage Guide](https://www.mickaelwalter.fr/opencti-use-the-api/)
- [OpenCTI Pagination Cursor Bug (Issue #1879)](https://github.com/OpenCTI-Platform/opencti/issues/1879)
- [OpenCTI Introspection Config (Issue #8598)](https://github.com/OpenCTI-Platform/opencti/issues/8598)
- [Top TIP Features 2026 - Stellar Cyber](https://stellarcyber.ai/learn/top-threat-intelligence-platforms/)
- [Global Threat Map open-source project](https://www.helpnetsecurity.com/2026/02/04/global-threat-map-open-source-osint/)

---
*Research completed: 2026-03-14*
*Ready for roadmap: yes*
