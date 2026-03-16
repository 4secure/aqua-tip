# Project Research Summary

**Project:** AQUA TIP v2.1 -- Threat Search & UI Refresh
**Domain:** Threat Intelligence Platform (expanding observable search + UI polish)
**Researched:** 2026-03-17
**Confidence:** HIGH

## Executive Summary

AQUA TIP v2.1 is a focused expansion of the existing IP-only search into a universal observable search covering IPs, domains, URLs, emails, and file hashes, plus a UI refresh of the Threat Actors and Threat News pages. The critical finding across all research is that this milestone requires zero new dependencies. The existing stack (React 19, Tailwind CSS 3, Laravel 12, OpenCTI GraphQL) already handles every capability needed. The OpenCTI `stixCyberObservables` GraphQL query accepts any `entity_type` filter, so the backend change is fundamentally a parameter expansion, not an architecture change.

The recommended approach is a clean-break strategy: create a new `ThreatSearchService` and `ThreatSearchPage` rather than modifying the existing IP search in-place. The current `IpSearchPage.jsx` is a 697-line monolith with IP-specific assumptions baked into props, labels, and data keys. Attempting incremental modification risks subtle breakage across geo enrichment, D3 graph rendering, and response schema expectations. A fresh composition from extracted components is safer and produces better code structure.

The primary risks are all execution risks, not technology risks. The route rename from `/ip-search` to `/threat-search` touches 13+ files across frontend and backend. The hardcoded `ip` validation rule will silently reject 100% of non-IP searches if not replaced. Geo enrichment will fire wastefully for non-IP types if not guarded. And the public access pattern for the search route (the landing page's primary CTA) must be preserved during migration. All of these are preventable with disciplined sequencing: backend first, component extraction second, new page third, UI refreshes last.

## Key Findings

### Recommended Stack

No new packages or infrastructure. Every v2.1 capability is built with existing tools. The research explicitly evaluated and rejected `ioc-extractor` (over-engineered for single-input detection), shadcn/UI (inconsistent with existing custom Tailwind), Zod (overkill for one search input), TanStack Table (not needed for styled row layout), and Apollo/urql (backend already proxies GraphQL). See `.planning/research/STACK.md` for full rationale.

**Core technologies (all existing):**
- **React 19 + Vite 7**: Frontend, no changes to build or framework
- **Tailwind CSS 3**: All UI refresh work uses utility classes only
- **Laravel 12 + built-in HTTP Client**: Backend search service, validation, caching
- **OpenCTI GraphQL API**: `stixCyberObservables` query with `entity_type` filter -- works for all observable types
- **D3.js**: Relationship graph generalized from IP-centric to type-agnostic
- **Framer Motion**: Already used for modals and transitions, reused as-is

### Expected Features

See `.planning/research/FEATURES.md` for complete tables.

**Must have (table stakes):**
- Multi-type observable auto-detection (IP, domain, URL, email, file hash)
- Observable type badge on results
- Score/severity display (reuse existing)
- Labels/tags display (reuse existing)
- Relationships tab with D3 graph (generalize existing)
- Credit deduction per search (reuse existing middleware)
- Search state in URL params for sharing
- Threat Actors 4-col grid without description text
- Threat News row-based layout without confidence badge

**Should have (differentiators):**
- Auto-detect with manual override dropdown
- Conditional geo enrichment (IP types only)
- Sightings timeline generalized to all types
- Top pagination on Threat News

**Defer (v2+):**
- Bulk/batch observable search (needs queue infrastructure)
- Multi-source enrichment (VirusTotal, Shodan -- explicitly out of scope)
- STIX export/download
- Priority 2/3 observable types (MAC, crypto wallet, user account)
- Real-time observable monitoring

### Architecture Approach

Single unified `POST /api/threat-search` endpoint replacing `POST /api/ip-search`. The backend uses a type registry pattern where `ThreatSearchService::OBSERVABLE_TYPES` maps friendly type keys to OpenCTI `entity_type` values. Auto-detection uses PHP's `filter_var()` for IPs/URLs/emails and regex for hash lengths. The frontend uses a polymorphic result page -- one `ThreatSearchPage.jsx` with conditional geo section for IPs only. All existing tab components (D3Graph, Indicators, Sightings, Notes, External Refs) work for any observable type since they consume normalized data structures. See `.planning/research/ARCHITECTURE.md` for data flow diagrams and component boundaries.

**Major components:**
1. **ThreatSearchService (NEW)** -- Replaces IpSearchService; type detection, OpenCTI query, conditional geo enrichment
2. **ThreatSearchRequest (NEW)** -- Type-aware Laravel validation replacing strict IP rule
3. **ThreatSearchController (NEW)** -- HTTP handler with credit gating and search logging
4. **ThreatSearchPage.jsx (NEW)** -- Composed from extracted components + new SearchHeader with type dropdown
5. **ThreatActorsPage.jsx (MODIFIED)** -- Layout-only: 4-col grid, remove descriptions
6. **ThreatNewsPage.jsx (MODIFIED)** -- Layout-only: row-based, remove confidence badge, top pagination

### Critical Pitfalls

See `.planning/research/PITFALLS.md` for all 16 pitfalls with detailed prevention strategies.

1. **Hardcoded IP validation blocks all non-IP searches** -- Replace Laravel `ip` rule with permissive string validation before anything else. One forgotten rule = 100% failure for the new feature.
2. **Route rename touches 13+ files** -- Grep for all variations (`ip-search`, `ip_search`, `IpSearch`, `ipSearch`, `IP Search`). Rename in dependency order. Run full test suite after.
3. **Public access pattern broken during migration** -- The threat search route MUST remain outside `<ProtectedRoute>` in App.jsx. It is the landing page's primary CTA target.
4. **Geo enrichment fires for non-IP types** -- Guard with `filter_var($query, FILTER_VALIDATE_IP)` before calling ip-api.com. Otherwise wastes 45 req/min rate limit.
5. **D3 graph has IP-specific assumptions** -- Props named `centerIp`, hardcoded entity colors for IPv4 only, canonical ID check assumes IP type. Must generalize props and color map.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Backend Search Generalization

**Rationale:** Frontend depends on backend endpoint. Old frontend keeps working on old endpoint during development.
**Delivers:** `POST /api/threat-search` accepting any observable type with auto-detection
**Addresses:** Multi-type observable search (table stakes), conditional geo enrichment, credit gating
**Avoids:** Pitfall 1 (validation), Pitfall 2 (entity_type cascade), Pitfall 5 (cache keys), Pitfall 6 (geo rate limit)
**Scope:** ThreatSearchService, ThreatSearchRequest, ThreatSearchController, route registration, backward-compat redirect for `/api/ip-search`

### Phase 2: Frontend Component Extraction

**Rationale:** De-risks Phase 3 by extracting reusable components from the 697-line IpSearchPage monolith before building the new page. If extraction breaks something, old page is the canary.
**Delivers:** Shared components in `components/threat-search/` (D3Graph, tabs, score display, geo section)
**Addresses:** Architecture pattern of composable components over monolith
**Avoids:** Pitfall 12 (D3 graph IP assumptions -- fix during extraction)

### Phase 3: Universal Threat Search Page + Route Migration

**Rationale:** Depends on Phase 1 (backend) and Phase 2 (extracted components). This is where the user-facing feature ships.
**Delivers:** ThreatSearchPage.jsx with type selector, route `/threat-search`, redirects, nav updates, landing page CTA updates
**Addresses:** Unified search input, type badge, search state in URL, auto-detect with manual override
**Avoids:** Pitfall 3 (route rename across 13+ files), Pitfall 4 (public access pattern), Pitfall 14 (sidebar label width)

### Phase 4: Threat Actors UI Refresh

**Rationale:** Independent of search work. Frontend-only, no backend changes. Can run in parallel with Phase 5.
**Delivers:** 4-col grid layout, descriptions removed from cards, clean subheading
**Addresses:** Threat Actors clean card grid (table stakes)
**Avoids:** Pitfall 8 (grid overflow), Pitfall 16 (skeleton mismatch), Pitfall 13 (subheading terminology)

### Phase 5: Threat News UI Refresh

**Rationale:** Independent of search work and Threat Actors. Frontend-only. Can run in parallel with Phase 4.
**Delivers:** Row-based layout, confidence badge removed, pagination at top and bottom
**Addresses:** Threat News row layout (table stakes), top pagination (differentiator)
**Avoids:** Pitfall 9 (click propagation), Pitfall 10 (confidence scope confusion), Pitfall 11 (pagination scroll UX)

### Phase 6: Cleanup and Testing

**Rationale:** Remove deprecated code only after new code is verified working. Add test coverage for new observable types.
**Delivers:** Removed old IpSearch files, updated search logs, test coverage for domain/hash/URL/email searches
**Addresses:** Pitfall 15 (test coverage gap)

### Phase Ordering Rationale

- Backend before frontend: the new API must exist before the UI can call it. Old UI continues working during backend development.
- Component extraction before new page: isolates refactoring risk. If extraction breaks the old page, you catch it before building on top.
- Search feature before UI refreshes: Threat Actors and News refreshes are independent and lower risk. They can be done last or in parallel.
- Cleanup last: removing old code before new code is verified is how you break production. Keep backward compatibility until the new flow is proven.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Backend):** File hash GraphQL filter syntax (`hashes.MD5` vs `hashes_MD5`) has MEDIUM confidence. Must verify against live OpenCTI GraphQL playground before implementing hash search. The exact key format varies between OpenCTI versions.
- **Phase 1 (Backend):** Exact-match vs fuzzy search behavior (Pitfall 7). The `operator: 'search'` parameter needs testing to determine if it provides useful fuzzy matching without returning too many irrelevant results.

Phases with standard patterns (skip research-phase):
- **Phase 2 (Component Extraction):** Standard React refactoring. Extract components, update imports, verify.
- **Phase 3 (New Page + Routes):** Well-documented React Router patterns. The grep list for route rename is already compiled in PITFALLS.md.
- **Phase 4 and 5 (UI Refreshes):** Pure Tailwind CSS layout changes. Specs are detailed in FEATURES.md and ARCHITECTURE.md.
- **Phase 6 (Cleanup):** Mechanical deletion and test writing.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new dependencies; all capabilities verified against existing codebase |
| Features | HIGH | Feature set derived from OpenCTI docs, existing codebase analysis, and TIP industry patterns |
| Architecture | HIGH | Architecture is an expansion of proven existing patterns, not greenfield design |
| Pitfalls | HIGH | All pitfalls identified through direct codebase grep and tracing actual data flows |

**Overall confidence:** HIGH

### Gaps to Address

- **File hash GraphQL filter syntax:** The exact filter key for querying by MD5/SHA-1/SHA-256 in OpenCTI (`hashes.MD5` vs `hashes_MD5` vs plain `value` filter) needs live validation. Mitigation: test against the GraphQL playground early in Phase 1. If hash-specific filters fail, fall back to searching by `observable_value` which stores the hash string directly.
- **Fuzzy search behavior:** OpenCTI's `search` parameter behavior for partial domain matches is undocumented for the `stixCyberObservables` endpoint. Mitigation: implement exact match first, add fuzzy fallback as a stretch goal if exact match proves insufficient during testing.
- **OpenCTI version compatibility:** The platform's OpenCTI instance version was not confirmed. Filter syntax can vary between major versions. Mitigation: check `GET /api/settings` on the OpenCTI instance to confirm version during Phase 1.

## Sources

### Primary (HIGH confidence)
- [OpenCTI Data Model](https://docs.opencti.io/latest/usage/data-model/) -- entity type taxonomy, observable types
- [OpenCTI Observations](https://docs.opencti.io/latest/usage/exploring-observations/) -- observable vs indicator distinction
- [OpenCTI GraphQL API](https://docs.opencti.io/latest/reference/api/) -- query structure, filter syntax
- [OpenCTI Filters Reference](https://docs.opencti.io/latest/reference/filters/) -- filter operators and modes
- [STIX 2.1 Cyber Observable Objects](https://docs.oasis-open.org/cti/stix/v2.1/cs01/stix-v2.1-cs01.html) -- SCO specification
- Existing codebase: `IpSearchService.php`, `OpenCtiService.php`, `IpSearchPage.jsx`, `ThreatActorsPage.jsx`, `ThreatNewsPage.jsx`, `App.jsx`

### Secondary (MEDIUM confidence)
- [Elastic OpenCTI Integration](https://docs.elastic.co/integrations/ti_opencti) -- full enumeration of observable types
- [OpenCTI Python Client](https://github.com/OpenCTI-Platform/client-python) -- entity_type mapping reference
- [OpenCTI entity_type filter discussion (GitHub #7637)](https://github.com/OpenCTI-Platform/opencti/issues/7637) -- filter behavior

### Tertiary (LOW confidence)
- [ANY.RUN TI Lookup](https://any.run/threat-intelligence-lookup/) -- UI pattern reference for universal search
- [Pulsedive](https://pulsedive.com/) -- multi-type observable search patterns
- [AufaitUX Cybersecurity Dashboard Design](https://www.aufaitux.com/blog/cybersecurity-dashboard-ui-ux-design/) -- card grid and dark theme patterns

---
*Research completed: 2026-03-17*
*Ready for roadmap: yes*
