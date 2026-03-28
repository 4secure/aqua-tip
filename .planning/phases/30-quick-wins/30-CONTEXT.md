# Phase 30: Quick Wins - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Dashboard stat card expansion (4→7), "Threat Database" heading, removal of "Live" labels, threat map label corrections, and search bug fixes (graph positioning, loading indicator, search bar overlap). All frontend-only changes.

</domain>

<decisions>
## Implementation Decisions

### Stat Card Layout
- **D-01:** Use a 4+3 centered grid layout. First row: 4 cards (IP Address, Domain, Hostname, Certificate). Second row: 3 cards (Email, Crypto Wallet, URL) centered with equal spacing on both sides.
- **D-02:** Second row cards must be the same width as first row cards — no stretching to fill the row.

### Stat Card Colors
- **D-03:** Reuse existing design system colors for new card types: Email=amber, Crypto Wallet=green, URL=violet. Some colors shared across cards — visually distinct via labels.
- **D-04:** Existing cards keep their colors: IP Address=red, Domain=violet, Hostname=cyan, Certificate=amber.

### Search Loading Indicator
- **D-05:** Replace the spinning Search icon with pulsing skeleton cards below the search bar while loading. Matches the existing `animate-pulse` skeleton pattern used throughout DashboardPage.

### Map Label
- **D-06:** On the dashboard mini-map: replace "Global Threat Map" heading with "100 Latest Attacks".
- **D-07:** On the full ThreatMapPage: replace "Active Threats" counter label in ThreatMapCounters with "100 Latest Attacks". Keep "Live Feed" label on ThreatMapFeed unchanged.

### Dashboard Heading
- **D-08:** Add "Threat Database" heading above the stat cards section on DashboardPage (per DASH-01).

### Live Label Removal
- **D-09:** Remove the green pulsating dot and "Live" text from every stat card on the dashboard (per DASH-03). The StatCard component's bottom section with `animate-pulse` dot and "Live" span gets removed entirely.

### Claude's Discretion
- "Threat Database" heading style (font size, weight, spacing) — match existing section title patterns
- D3 graph node positioning fix approach — investigate why nodes cluster top-left and apply appropriate fix
- Search bar z-index/positioning fix for logged-out topbar overlap — determine correct offset or z-index

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Dashboard
- `frontend/src/pages/DashboardPage.jsx` — StatCard component (line 57), STAT_CARD_CONFIG (line 12), STAT_COLOR_MAP (line 19), stat card grid (line 494)
- `.planning/REQUIREMENTS.md` §Dashboard — DASH-01, DASH-02, DASH-03

### Threat Map
- `frontend/src/components/threat-map/ThreatMapCounters.jsx` — "Active Threats" label (line 21), "Global Threats" heading (line 10)
- `frontend/src/pages/ThreatMapPage.jsx` — Full map page layout
- `frontend/src/pages/DashboardPage.jsx` — Dashboard mini-map section (line 469-491)
- `.planning/REQUIREMENTS.md` §Threat Map — MAP-01, MAP-02

### Threat Search
- `frontend/src/pages/ThreatSearchPage.jsx` — D3Graph component (line 59), search loading (line 661), sticky header (line 609)
- `frontend/src/components/layout/Topbar.jsx` — Fixed topbar h-[60px] z-30 (line 50)
- `.planning/REQUIREMENTS.md` §Threat Search — SEARCH-01, SEARCH-02, SEARCH-03

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StatCard` component in DashboardPage — already handles loading/error states, just needs config expansion
- `STAT_COLOR_MAP` and `STAT_CARD_CONFIG` — extend with 3 new entries
- `animate-pulse` skeleton pattern — used extensively in DashboardPage for loading states, reuse for search skeleton
- `glass-card` CSS class — standard card styling across all pages
- `section-title` CSS class — existing heading pattern for "Threat Database" heading

### Established Patterns
- Dashboard uses `glass-card p-5` for all card containers
- Loading states use `bg-surface-2 rounded animate-pulse` skeleton divs
- Color tokens: red, violet, cyan, amber, green — all available in Tailwind config
- D3 is dynamically imported in ThreatSearchPage (`import('d3')`)

### Integration Points
- `STAT_CARD_CONFIG` array at top of DashboardPage controls which cards render
- Stat card grid class `grid grid-cols-4` needs changing to support 7 cards
- `ThreatMapCounters` receives `counters` from `useThreatStream` hook — counter.threats maps to "Active Threats" label
- Topbar is `fixed` with `z-30` — ThreatSearchPage sticky header uses `z-10`, may need `top-[60px]` offset

</code_context>

<specifics>
## Specific Ideas

- Second row of stat cards must be visually centered under the first row, not left-aligned or stretched
- Skeleton loading for search should mimic the result card layout (score ring area + summary area)
- "100 Latest Attacks" replaces two different labels: "Global Threat Map" on dashboard and "Active Threats" in ThreatMapCounters

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 30-quick-wins*
*Context gathered: 2026-03-28*
