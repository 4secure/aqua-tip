# Project Research Summary

**Project:** Aqua TIP v3.2 -- App Layout Page Tweaks
**Domain:** Threat Intelligence Platform -- page enhancements across dashboard, news, actors, map, search, and settings
**Researched:** 2026-03-28
**Confidence:** HIGH

## Executive Summary

AQUA TIP v3.2 is a refinement milestone that enhances existing app layout pages rather than adding new ones. The research confirms that every feature maps to the existing stack (React 19, Chart.js 4, D3 7, Laravel 12, OpenCTI GraphQL) with zero new dependencies required. This is a strong signal: the codebase is mature enough that incremental improvements require no new tooling. The work spans 8 distinct feature areas across 5 pages, with a clear split between frontend-only quick wins (dashboard stat cards, map label, search bug fixes) and backend-dependent features (date filtering, enriched actor modals, functional settings, category chart).

The recommended approach is to ship frontend-only changes first for immediate visible progress, then build a reusable `useAutoRefresh` hook before tackling the backend-dependent features. The critical architectural decision is fetch-on-open for enriched actor modals (not batch-in-list), which avoids hammering OpenCTI with 24 parallel relationship queries. Date-based news filtering requires timezone-aware UTC conversion on the backend -- the most subtle technical requirement in the milestone.

The top risks are: (1) stale closure bugs in auto-refresh intervals when combined with date filters, (2) Chart.js flickering from destroy/recreate on data changes, (3) timezone mismatches between user-local dates and OpenCTI UTC timestamps, and (4) AuthContext not syncing after settings saves. All four have straightforward prevention strategies documented in PITFALLS.md, but each must be addressed during initial implementation -- not patched after.

## Key Findings

### Recommended Stack

No new packages. Every v3.2 feature maps to existing dependencies or browser-native APIs. This was validated against six common alternatives (react-datepicker, date-fns, chartjs-adapter-date-fns, TanStack Query, react-hook-form, toast libraries) -- all rejected with clear rationale. See [STACK.md](./STACK.md) for the full analysis.

**Core technologies (unchanged):**
- **React 19 + Vite 7:** Sufficient for all features; no framework-level changes needed
- **Chart.js 4.5.1:** Category axis with string labels handles time-series without a date adapter (backend pre-aggregates)
- **D3 7.9.0:** Force simulation parameter tuning fixes the node positioning bug
- **Native `<input type="date">`:** With `[color-scheme:dark]` CSS, matches the dark theme without a third-party date picker
- **`setInterval` + `document.visibilityState`:** Standard auto-refresh pattern; only 2 pages need it, making TanStack Query overkill
- **Laravel 12 + Sanctum 4:** 4 new endpoints needed (profile, password, actor detail, news chart), all following existing patterns

### Expected Features

See [FEATURES.md](./FEATURES.md) for complete feature landscape, dependency graph, and competitor analysis.

**Must have (table stakes):**
- Functional settings/profile page -- current page is 100% mock data, visibly broken
- Dashboard stat card expansion to 7 types -- 3 observable types missing from OpenCTI data
- Threat Map 100-IP cap with updated label -- prevents performance issues on dense maps
- Threat Search bug fixes (D3 nodes, loader, z-index) -- broken UX in shipped feature
- Auto-refresh on Threat News and Threat Actors -- inconsistent with dashboard which already refreshes

**Should have (differentiators):**
- Date-based threat news browsing -- replaces cursor pagination with chronological browsing
- Enriched threat actor modal (TTPs, tools, campaigns) -- core intelligence analysts need
- Category distribution time-series chart -- visual trend analysis embedded in browse context
- Profile editing (name, org, timezone, phone) -- fields collected at onboarding but not editable after

**Defer (v2+):**
- API key management -- no public API exists
- Webhook configuration -- no dispatch system exists
- Usage analytics chart -- no tracking infrastructure exists
- Full MITRE ATT&CK Navigator -- too heavy for modal context
- Real-time WebSocket for news/actors -- SSE already used for map; 5-min polling is sufficient

### Architecture Approach

All features follow the existing Controller -> Service -> OpenCTI GraphQL -> Cache pipeline. The key new patterns are: (1) a reusable `useAutoRefresh` hook extracting the DashboardPage interval pattern, (2) fetch-on-open for enriched actor modals via a new `GET /api/threat-actors/{id}` endpoint with single aliased GraphQL query, (3) server-side time-series aggregation for the category chart, and (4) a Settings page rewrite from mock data to real AuthContext + new profile endpoints. See [ARCHITECTURE.md](./ARCHITECTURE.md) for full system diagram, data flows, and build order.

**Major components:**
1. **`useAutoRefresh` hook** -- reusable 5-min interval with visibility pause and ref-based callback (prevents stale closures)
2. **`DateRangeSelector` component** -- native date inputs wired to backend `published_after`/`published_before` filters
3. **`ProfileController` + `PasswordController`** -- new Laravel endpoints for settings page
4. **`ThreatActorService::getDetail()`** -- single aliased GraphQL query for TTPs, tools, campaigns (fetch-on-open)
5. **`ThreatNewsService::categoryTimeSeries()`** -- server-side aggregation for Chart.js line chart

### Critical Pitfalls

See [PITFALLS.md](./PITFALLS.md) for the full list with detection strategies, phase warnings, and a "looks done but isn't" checklist.

1. **Stale closure in auto-refresh** -- `setInterval` captures old filter state. Use `useRef` for current values inside the callback. Build the `useAutoRefresh` hook on the first page, reuse everywhere.
2. **Chart.js destroy/recreate flickering** -- existing `useChartJs` hook triggers full chart rebuild on any config change. Use `chart.data = newData; chart.update('none')` for data-only updates on the time-series chart.
3. **Timezone mismatch in date filtering** -- HTML date inputs produce bare strings; backend must convert using user's IANA timezone to UTC before querying OpenCTI. Default to UTC for unauthenticated users.
4. **N+1 OpenCTI queries for actor enrichment** -- use single aliased GraphQL query with `first: N` limits per relationship type, not separate queries per entity type.
5. **AuthContext not syncing after profile save** -- add `refreshUser()` method to AuthContext; call after successful save; do not use optimistic updates for timezone-sensitive fields.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Quick Wins (frontend-only)
**Rationale:** Zero backend changes, zero risk. Ships visible improvements immediately and builds momentum.
**Delivers:** Dashboard with 7 stat cards + "Threat Database" heading, map label update, search bug fixes (D3 nodes, loader, z-index)
**Addresses:** Dashboard stat expansion, Threat Map cap label, Threat Search bugs (3 fixes)
**Avoids:** No pitfalls -- pure UI/config changes. Verify 7-card responsive layout at multiple breakpoints.

### Phase 2: Auto-Refresh Infrastructure
**Rationale:** Creates the reusable `useAutoRefresh` hook before any page needs it. Prevents the stale-closure and memory-leak pitfalls by solving them once.
**Delivers:** `useAutoRefresh` hook with ref-based callback and visibility pause, auto-refresh on Threat News + Threat Actors, DashboardPage refactored to use hook
**Addresses:** News auto-refresh, Actors auto-refresh, code consistency across 3 pages
**Avoids:** Stale closure pitfall (#1), memory leak pitfall (#7), background tab waste

### Phase 3: Date-Based News Browsing
**Rationale:** Backend date filter support is a prerequisite for the category chart (Phase 4). This phase establishes the server-side filtering pattern and the timezone conversion logic.
**Delivers:** Date selector UI on Threat News replacing cursor pagination, backend `published_after`/`published_before` support with timezone-aware UTC conversion, URL-persisted date state via `useSearchParams`
**Addresses:** Date-based news browsing feature
**Avoids:** Timezone mismatch pitfall (#6) -- must implement UTC conversion from the start

### Phase 4: Category Distribution Chart
**Rationale:** Depends on Phase 3's backend date filtering pattern. Requires new aggregation endpoint and careful Chart.js hook handling.
**Delivers:** Time-series line chart above Threat News report list, new `/api/threat-news/chart` endpoint with server-side aggregation
**Addresses:** Category distribution chart feature
**Avoids:** Chart flickering pitfall (#2) -- build with in-place update pattern, not destroy/recreate. Fill zero-count dates explicitly.

### Phase 5: Enriched Threat Actor Modal
**Rationale:** Independent of Phases 3-4. High intelligence value. Backend is a single expanded GraphQL query with aliased relationship fields.
**Delivers:** TTPs (with MITRE IDs), tools/malware, campaigns in actor modal with fetch-on-open loading skeleton
**Addresses:** Enriched actor modal feature
**Avoids:** N+1 query pitfall (#4) -- single aliased query from the start. Limit each alias with `first: N`.

### Phase 6: Functional Settings Page
**Rationale:** Independent of all other phases. Requires AuthContext modification (`refreshUser`), which should happen here to avoid unnecessary changes earlier.
**Delivers:** Real profile editing (name, phone, timezone, org, role), password change for non-OAuth users, plan/account info display. Removes all mock data imports.
**Addresses:** Functional settings, profile editing
**Avoids:** AuthContext sync pitfall (#5) -- add `refreshUser` before building the form. Whitelist-only field updates to prevent privilege escalation.

### Phase Ordering Rationale

- **Phase 1 first** because it has zero dependencies, zero risk, and builds visible progress
- **Phase 2 before Phases 3-6** because the `useAutoRefresh` hook is needed by Phase 3 (auto-refresh interacts with date filters) and provides the modal-pause pattern used in Phase 5
- **Phases 3 then 4 are sequential** -- the chart depends on the date filtering backend pattern and should reflect the same time window
- **Phases 5 and 6 are independent** of each other and of Phases 3-4 -- they can be parallelized or reordered based on priority
- Bug fixes grouped in Phase 1 keeps the quick-wins phase coherent and ships immediately

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Date-Based News Browsing):** OpenCTI FilterGroup date operators (`gt`/`lt` on `published` field) need validation against the specific GraphQL schema version in production. Timezone conversion logic should be tested with edge-case timezones (UTC+14, UTC-12).
- **Phase 4 (Category Chart):** OpenCTI aggregation capabilities (`stixCoreObjectsDistribution` or manual bucketing via report fetch + PHP aggregation) need verification. Chart.js in-place update pattern requires a modified or new hook -- decide whether to extend `useChartJs` or create `useTimeSeriesChart`.
- **Phase 5 (Enriched Actor Modal):** GraphQL relationship direction (`from` vs `to`) for "attributed-to" campaigns must be verified against live data. Some actors may have zero relationships, requiring empty-state handling in the modal.

Phases with standard patterns (skip `/gsd:research-phase`):
- **Phase 1 (Quick Wins):** Pure config changes and CSS fixes. Well-understood patterns.
- **Phase 2 (Auto-Refresh):** Standard `setInterval` + `useRef` + `visibilityState` pattern. DashboardPage already proves it works.
- **Phase 6 (Settings Page):** Standard CRUD form with Laravel validation. Reuses onboarding components (SearchableDropdown, PhoneNumberInput).

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Every recommendation verified against existing codebase. Zero new deps is validated against 6 alternatives. |
| Features | HIGH | Features grounded in existing codebase inventory + OpenCTI data model. Anti-features well-justified with clear rationale. |
| Architecture | HIGH | All patterns derived from direct codebase analysis of services, controllers, hooks, and context. Fetch-on-open, aliased queries, hook extraction are proven approaches. |
| Pitfalls | HIGH | All 7 pitfalls traced to specific code lines with file names and line numbers. Prevention strategies are concrete with code examples. |

**Overall confidence:** HIGH

### Gaps to Address

- **OpenCTI aggregation query support:** The time-series chart assumes server-side bucketing is feasible via GraphQL. If `stixCoreObjectsDistribution` does not support date bucketing, the backend must fetch raw reports and aggregate in PHP -- still viable but slower. Validate during Phase 4 planning.
- **Chart.js hook modification scope:** Modifying `useChartJs` to support in-place updates may affect existing static charts (Dashboard AttackChart, Settings UsageChart). A separate `useTimeSeriesChart` hook may be safer. Decide during Phase 4 planning.
- **OAuth user password change:** The password endpoint should be hidden for OAuth users (Google/GitHub). AuthContext already knows the auth provider, but the Settings UI must conditionally render the password form. Handle in Phase 6.
- **Dashboard 7-card responsive layout:** Going from 4 to 7 stat cards changes the grid math. Needs visual testing at 1024px, 1280px, and 1920px breakpoints. Handle in Phase 1.
- **DashboardService sequential queries:** Expanding from 4 to 7 GraphQL count queries means 7 sequential round trips. Consider batching into a single aliased query for performance. Handle in Phase 1.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of all affected backend services: DashboardService, ThreatNewsService, ThreatActorService, ThreatMapService, OpenCtiService
- Direct codebase analysis of all affected frontend pages: DashboardPage, ThreatNewsPage, ThreatActorsPage, ThreatMapPage, ThreatSearchPage, SettingsPage
- Direct codebase analysis of hooks: useChartJs, useThreatStream, auto-refresh pattern in DashboardPage
- Direct codebase analysis of AuthContext shape, UserResource, and user data model
- Direct codebase analysis of routes/api.php, existing controller patterns, cache strategies

### Secondary (MEDIUM confidence)
- [Chart.js Time Series Axis docs](https://www.chartjs.org/docs/latest/axes/cartesian/timeseries.html) -- time scale vs category axis tradeoffs
- [chartjs-adapter-date-fns on npm](https://www.npmjs.com/package/chartjs-adapter-date-fns) -- v3.0.0 compatibility (considered and deferred)
- [ThreatConnect Dashboard Best Practices](https://threatconnect.com/blog/threatconnect-dashboards-best-practices/)
- [EclecticIQ MITRE ATT&CK Mapping](https://www.eclecticiq.com/take-action-with-cti/how-to-use-mitre-attck-to-map-and-track-adversary-ttps)
- [DarkOwl Threat Actor Profiling](https://www.darkowl.com/threat-actor-profiling/)
- [Filigran/OpenCTI Dashboard Management](https://filigran.io/building-dashboards-manage-feed-deluge/)

### Tertiary (LOW confidence)
- OpenCTI `stixCoreObjectsDistribution` aggregation capability -- inferred from schema patterns, not directly tested against production instance
- date-fns v4.1.0 and chartjs-adapter-date-fns v3.0.0 latest versions -- NPM metadata checked but packages not installed or tested

---
*Research completed: 2026-03-28*
*Ready for roadmap: yes*
