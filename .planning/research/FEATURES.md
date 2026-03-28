# Feature Research: App Layout Page Tweaks (v3.2)

**Domain:** Threat Intelligence Platform — page enhancements, date-based browsing, enriched profiles, auto-refresh, functional settings
**Researched:** 2026-03-28
**Confidence:** HIGH (features grounded in existing codebase + OpenCTI data model)

## Existing System Inventory

Before defining new features, here is what already exists and what the new features build on:

| Component | Current State | Relevant Detail |
|-----------|--------------|-----------------|
| Dashboard | 4 stat cards (IP, Domain, Hostname, Certificate), map, indicators table, attack chart, credits, recent searches | 5-min auto-refresh already on dashboard. Missing 3 observable types. "Live" dot on stat cards. |
| Threat Map | SSE streaming, pulse markers, real-time counters, live feed, country/type donuts | No IP cap — all events rendered. Label says "Active Threats". |
| Threat News | Row layout, cursor pagination, label-based category filter dropdown, search, detail modal | No auto-refresh. No date-based browsing. No category distribution chart. Pagination is cursor-based (after/before). |
| Threat Actors | 4-col dense card grid, detail modal with description/aliases/countries/sectors/goals/refs, pagination | No auto-refresh. Modal lacks TTPs, tools, malware, campaigns. |
| Threat Search | Universal search, 9 observable types, D3 relation graph, auto-detect | 3 bugs: graph node overlap, no search loader, search bar z-index when logged out. |
| Settings | 4 tabs (API Keys, Webhooks, Usage, Account) — ALL mock data from `mock-data.js` | Hardcoded "Acme Corp", fabricated API keys, fake usage chart. No backend endpoints for any of it. |
| Backend caching | News: 5-min, Actors: 15-min, Map snapshot: 15-min, Dashboard: 5-min | Auto-refresh intervals should match cache TTLs. |
| ThreatActorService | GraphQL fetches: description, aliases, motivation, resource_level, goals, targeted countries/sectors, external refs | Uses `stixCoreRelationships(relationship_type: "targets")`. Missing `uses` relationships for TTPs/tools. |
| ThreatNewsService | GraphQL fetches: name, description, published, confidence, report_types, labels, external refs | Filters by label and confidence. No date range filter. `published` field available for filtering. |
| Auth/Profile | `GET /api/user` returns UserResource with plan, trial, timezone | No `PUT /api/user/profile` endpoint. Onboarding fields (timezone, org, role) collected but not editable after onboarding. |

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| Functional settings/profile page | Current page is 100% mock data (API_KEYS, hardcoded "Acme Corp"); users see a broken page after onboarding | MEDIUM | `GET /api/user` exists, AuthContext has user data; needs `PUT /api/user/profile` endpoint | Replace 4 tabs (API Keys, Webhooks, Usage, Account) with 2 meaningful tabs: Profile + Account. API Keys/Webhooks are premature features. |
| Dashboard "Threat Database" heading + 7 stat cards | 4 cards exist (IP, Domain, Hostname, Certificate); Email, Crypto Wallet, URL are missing observable types that OpenCTI tracks | LOW | `GET /api/dashboard/counts` already works; add 3 entity types to STAT_CARD_CONFIG | Purely frontend change — backend counts endpoint already aggregates by entity_type dynamically |
| Threat Map 100-IP cap with updated label | Current map shows all IPs with "Active Threats" label; unbounded data creates performance issues on dense maps | LOW | `GET /api/threat-map/snapshot` backend; Leaflet map rendering | Backend slicing to 100 most recent + label text change |
| Threat Search bug fixes (graph nodes, loader, z-index) | Broken UX in current shipped feature; graph nodes overlap, no loading indicator, search bar hidden behind content when logged out | MEDIUM | ThreatSearchPage.jsx D3 force graph, existing search flow | Three distinct bugs: (1) D3 force layout node positioning, (2) missing loading state during search, (3) CSS z-index stacking context |
| Threat News 5-min auto-refresh | News page shows stale data unless user manually navigates away and back; inconsistent with dashboard which already auto-refreshes | LOW | ThreatNewsPage.jsx loadData callback exists | setInterval pattern already proven in DashboardPage.jsx (lines 431-444) |
| Threat Actors 5-min auto-refresh | Same staleness problem as Threat News | LOW | ThreatActorsPage.jsx loadData callback exists | Same setInterval pattern as dashboard |

### Differentiators (Competitive Advantage)

Features that elevate AQUA TIP above a basic data viewer. Not required, but create meaningful analyst value.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Date-based threat news browsing with date selector | Analysts browse reports by date, not arbitrary pagination pages. "What happened on March 15?" is a natural CTI workflow. Replaces cursor-based pagination with chronological browsing. | MEDIUM | OpenCTI `reports` GraphQL supports `filters` with `published` date range (gte/lte operators). Backend ThreatNewsService needs date filter params. Frontend needs date picker UI. | Replace pagination toolbar with a date selector control. Load reports for selected date. Category filter remains. Search remains. |
| Category distribution time-series chart on Threat News | Visual trend of report categories over time lets analysts spot surges (e.g., ransomware reports spiking). Most TIP dashboards show aggregate charts but few embed them in the browse context. | HIGH | New backend endpoint needed to aggregate label counts by time bucket. Chart.js already available. Frontend needs new chart component above report list. | OpenCTI GraphQL can aggregate reports by published date with label grouping, but requires a dedicated aggregation query — not just reusing the list endpoint. |
| Enriched threat actor modal (TTPs, tools, sectors, campaigns) | Current modal shows description, aliases, countries, sectors, goals, external refs. Missing ATT&CK TTPs, associated tools/malware, and campaigns — the core intelligence analysts need. | HIGH | OpenCTI GraphQL `intrusionSets` supports `stixCoreRelationships` for `uses` (tools, attack-patterns) and `campaigns`. Backend ThreatActorService.php GraphQL query needs expansion. | Add 3 new relationship queries to the GraphQL: (1) `uses` -> Attack-Pattern for TTPs, (2) `uses` -> Tool/Malware for tools, (3) related Campaigns. Display in tabbed or sectioned modal layout. |
| Profile editing (name, organization, timezone, phone) | Users collected these during onboarding but cannot change them. Profile editing is expected in any SaaS product. | MEDIUM | Backend needs `PUT /api/user/profile` endpoint; OnboardingController validation logic can be reused. Frontend needs form with AuthContext refresh. | Reuse existing SearchableDropdown for timezone, PhoneNumberInput for phone. Validate same rules as onboarding. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems in the current project context.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| API key management in Settings | Power users expect API access | No public API exists; building key management UI for a non-existent API wastes effort and creates security surface area. API_KEYS mock data in current settings is misleading. | Remove API Keys tab entirely. Add it back when a public API milestone is planned. |
| Webhook configuration in Settings | Integration-minded users want alerts | No webhook dispatch system exists in the backend. UI without backend is a broken promise. | Remove Webhooks tab. Defer to a dedicated notifications/integrations milestone. |
| Real-time WebSocket for auto-refresh | "Why poll every 5 min when you could push?" | SSE is already used for threat map streaming. Adding WebSocket for news/actors introduces a second real-time protocol. 5-min polling on cached endpoints is cheap and simple. The data sources (OpenCTI caches) update on similar intervals anyway. | Keep 5-min setInterval polling. Backend caches already expire at 5-min (news) and 15-min (actors) intervals, so more frequent refresh yields no new data. |
| Usage analytics chart in Settings | Current mock shows API usage chart | No usage tracking infrastructure exists. Chart would be fabricated data. | Remove Usage tab. Show credit balance (already on dashboard) and plan info in Account tab instead. |
| Full MITRE ATT&CK Navigator integration in actor modal | "Map all TTPs visually" | ATT&CK Navigator is a complex SVG-based tool. Embedding it adds significant bundle size and complexity for a feature most users won't use in a browse context. | Display TTPs as a simple grouped list (Tactic -> Techniques) with links to attack.mitre.org. Let users open the Navigator externally if needed. |
| Infinite scroll replacing pagination/date browsing | "Modern UX should be infinite scroll" | OpenCTI uses cursor-based pagination. Infinite scroll with date-based browsing creates conflicting mental models. Accumulating hundreds of DOM nodes degrades performance. | Date selector for browsing + "Load more" button within a single date's results if needed. |

## Feature Dependencies

```
[Dashboard stat card expansion]
    (no dependencies, purely frontend config change)

[Threat Map 100-IP cap]
    (no dependencies, backend slice + frontend label)

[Threat News auto-refresh]
    (no dependencies, frontend setInterval)

[Threat Actors auto-refresh]
    (no dependencies, frontend setInterval)

[Threat Search bug fixes]
    (no dependencies, isolated frontend fixes)

[Date-based news browsing]
    └──requires──> [Backend date filter support in ThreatNewsService]
    └──enhances──> [Threat News auto-refresh] (auto-refresh reloads current date)

[Category distribution chart]
    └──requires──> [Backend aggregation endpoint for labels-by-time]
    └──requires──> [Date-based news browsing] (chart should reflect selected date range context)

[Enriched actor modal]
    └──requires──> [Backend GraphQL query expansion in ThreatActorService]

[Functional settings page]
    └──requires──> [Backend PUT /api/user/profile endpoint]
    └──depends on──> [AuthContext] (already exists, needs refresh after update)

[Profile editing]
    └──requires──> [Functional settings page] (settings page is the container)
```

### Dependency Notes

- **Date-based news browsing requires backend date filter:** OpenCTI `reports` supports `published` field filtering via FilterGroup, but ThreatNewsService.php currently only filters by label and confidence. Need to add `startDate`/`endDate` params.
- **Category distribution chart requires aggregation endpoint:** The existing `/api/dashboard/categories` aggregates all-time counts. A time-series chart needs bucketed counts (e.g., per-day or per-week) which requires a new GraphQL aggregation query or a new endpoint.
- **Category chart enhances date-based browsing:** The chart should reflect the same time window the user is browsing, creating a unified "reports for this period" experience.
- **Enriched actor modal requires expanded GraphQL:** Current query fetches `targets` relationships (countries, sectors). Need to add `uses` relationships (Attack-Pattern, Tool, Malware) and Campaign associations. This is purely a backend query expansion — frontend modal just renders new data fields.
- **Functional settings conflicts with mock data:** Current SettingsPage.jsx imports `API_KEYS` from mock-data.js and displays hardcoded values. The entire page needs restructuring, not patching.

## Implementation Phases (Recommended Order)

### Phase 1: Quick Wins (no backend changes)

Low-risk, frontend-only changes that ship visible improvements fast.

- [ ] Dashboard: Add "Threat Database" heading, expand to 7 stat cards, remove Live label/dot
- [ ] Threat Map: Cap to 100 IPs (backend slice), update "100 Latest Attacks" label
- [ ] Threat News: Add 5-min auto-refresh
- [ ] Threat Actors: Add 5-min auto-refresh
- [ ] Threat Search: Fix graph node positioning, add search loader, fix z-index

### Phase 2: Date-Based News Browsing (backend + frontend)

Medium complexity, changes the Threat News browsing paradigm.

- [ ] Backend: Add startDate/endDate filter params to ThreatNewsService
- [ ] Frontend: Replace pagination with date selector UI
- [ ] Frontend: Wire date selection to API calls
- [ ] Auto-refresh reloads reports for selected date

### Phase 3: Enriched Threat Actor Modal (backend + frontend)

High complexity, deepens the intelligence value.

- [ ] Backend: Expand ThreatActorService GraphQL to fetch TTPs, tools/malware, campaigns
- [ ] Frontend: Add TTP section to modal (grouped by tactic, linked to MITRE)
- [ ] Frontend: Add tools/malware section with type badges
- [ ] Frontend: Add campaigns section with timeline

### Phase 4: Category Distribution Chart (backend + frontend)

Highest complexity, requires new aggregation logic.

- [ ] Backend: New endpoint or expanded logic for label-count-by-time-bucket
- [ ] Frontend: Chart.js time-series chart component
- [ ] Frontend: Integrate chart above report list, synced with date selection

### Phase 5: Functional Settings Page (backend + frontend)

Medium complexity, replaces mock data with real user data.

- [ ] Backend: PUT /api/user/profile endpoint with validation
- [ ] Frontend: Restructure SettingsPage tabs (Profile + Account, remove API Keys/Webhooks/Usage)
- [ ] Frontend: Profile form with editable fields (name, org, timezone, phone)
- [ ] Frontend: Account section showing plan, email, auth provider (read-only)
- [ ] Frontend: AuthContext refresh after profile update

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Phase |
|---------|------------|---------------------|----------|-------|
| Dashboard stat card expansion | MEDIUM | LOW | P1 | 1 |
| Threat Map 100-IP cap | MEDIUM | LOW | P1 | 1 |
| Threat News auto-refresh | MEDIUM | LOW | P1 | 1 |
| Threat Actors auto-refresh | MEDIUM | LOW | P1 | 1 |
| Threat Search bug fixes | HIGH | MEDIUM | P1 | 1 |
| Date-based news browsing | HIGH | MEDIUM | P1 | 2 |
| Enriched actor modal (TTPs/tools/campaigns) | HIGH | HIGH | P1 | 3 |
| Category distribution chart | MEDIUM | HIGH | P2 | 4 |
| Functional settings page | HIGH | MEDIUM | P1 | 5 |

**Priority key:**
- P1: Must have for this milestone
- P2: Should have, valuable but most complex

## Competitor Feature Analysis

| Feature | OpenCTI Web UI | Recorded Future | AQUA TIP Approach |
|---------|---------------|-----------------|-------------------|
| Date-based report browsing | Calendar widget + date range filter on reports list | Date range picker with preset ranges (7d, 30d, 90d, custom) | Date selector replacing pagination; load all reports for selected date. Keep simple — single date, not range, since OpenCTI report volumes are manageable. |
| Category/label distribution | Dashboard widgets with bar/pie charts aggregated by label | Trend lines over time per category | Time-series chart (line or stacked area) showing label counts per day/week. Placed above report list for context. |
| Threat actor TTPs | Full ATT&CK matrix heatmap | ATT&CK matrix + technique details | Grouped list by tactic with technique names and MITRE links. Simple, scannable, no heavy visualization. |
| Auto-refresh | Real-time via streaming | Configurable refresh intervals | 5-min setInterval matching existing dashboard pattern. Non-disruptive — silent refresh, no loading spinner on auto-refresh (only on manual load). |
| Profile/settings | Full admin panel with user management | Enterprise SSO + profile management | Minimal profile editing (name, org, timezone, phone) + read-only account info (plan, email). No API keys, webhooks, or usage charts. |

## Technical Notes

### Auto-Refresh Pattern (shared across News + Actors)

Use the same pattern already proven in DashboardPage.jsx:
```javascript
useEffect(() => {
  const interval = setInterval(() => {
    // Silent refresh — no setLoading(true), no spinner
    fetchData().then(setData).catch(() => {});
  }, 5 * 60 * 1000);
  return () => clearInterval(interval);
}, [dependencies]);
```

Key: Auto-refresh must NOT trigger loading states. Only manual user actions (search, filter, navigate) should show spinners.

### Date-Based Browsing vs Cursor Pagination

Current ThreatNewsPage uses cursor-based pagination (after/before cursors from OpenCTI pageInfo). Date-based browsing replaces this with:
- A date selector (native `<input type="date">` styled to match dark theme, or a custom date picker)
- Backend filters on `published >= startOfDay` and `published < startOfNextDay`
- OpenCTI FilterGroup supports `published` with `gte` and `lt` operators
- If a single day returns more than 20 reports, retain a "Load more" button (keep cursor pagination as secondary, not primary navigation)

### Enriched Actor Modal Data Sources

OpenCTI `intrusionSets` GraphQL supports these relationship types needed for enrichment:
- `stixCoreRelationships(relationship_type: "uses", toTypes: ["Attack-Pattern"])` — TTPs
- `stixCoreRelationships(relationship_type: "uses", toTypes: ["Tool", "Malware"])` — Tools
- Related campaigns via `stixCoreRelationships(relationship_type: "attributed-to", fromTypes: ["Campaign"])`

All queryable in a single expanded GraphQL query. No new endpoints needed — just expanding the existing ThreatActorService query.

### Settings Page Restructuring

Current tabs to remove: API Keys, Webhooks, Usage (all mock data, no backend)
New tab structure:
1. **Profile** — Editable: display name, organization, timezone, phone. Uses existing SearchableDropdown (timezone) and PhoneNumberInput components from onboarding.
2. **Account** — Read-only: email, auth provider (email/Google/GitHub), plan name + upgrade CTA, credit balance, member since date.

## Sources

- [ThreatConnect Dashboard Best Practices](https://threatconnect.com/blog/threatconnect-dashboards-best-practices/)
- [Filigran/OpenCTI Dashboard Management](https://filigran.io/building-dashboards-manage-feed-deluge/)
- [DarkOwl Threat Actor Profiling](https://www.darkowl.com/threat-actor-profiling/)
- [EclecticIQ MITRE ATT&CK Mapping](https://www.eclecticiq.com/take-action-with-cti/how-to-use-mitre-attck-to-map-and-track-adversary-ttps)
- [MITRE ATT&CK](https://attack.mitre.org/)
- [Splunk Threat Intelligence Dashboards](https://help.splunk.com/en/splunk-enterprise-security-8/user-guide/8.2/analytics/threat-intelligence-dashboards)
- Existing codebase: ThreatActorService.php, ThreatNewsService.php, DashboardPage.jsx, ThreatNewsPage.jsx, ThreatActorsPage.jsx, SettingsPage.jsx, api.php routes

---
*Feature research for: AQUA TIP v3.2 App Layout Page Tweaks*
*Researched: 2026-03-28*
