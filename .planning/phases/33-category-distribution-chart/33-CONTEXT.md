# Phase 33: Category Distribution Chart - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Users see a stacked area chart on the Threat News page showing the hourly distribution of report categories for the currently selected date. The chart is computed client-side from the already-loaded report data (no new API endpoint). Clicking a category area in the chart filters the report list below. The chart hides when there is no categorized data for the selected date.

</domain>

<decisions>
## Implementation Decisions

### Chart Type & Rendering
- **D-01:** Stacked area chart using Chart.js via the existing `useChartJs` hook. X-axis is hours (0h–23h), Y-axis is report count. Each category is a filled area stacked on top of others.
- **D-02:** Data is computed entirely client-side by bucketing the already-loaded `items` array by hour (from `published` timestamp) and category (from `labels`). No new backend endpoint or API call needed.
- **D-03:** Reports with multiple labels count toward each label's bucket (a report tagged "Malware" and "APT" adds +1 to both).

### Colors
- **D-04:** Reuse the existing `CATEGORY_COLORS` array and `categoryColor()` hash function to map category names to fill colors. Consistent with the category chips on report rows.

### Placement & Layout
- **D-05:** Chart sits in a glassmorphism card (bg-surface/60 border border-border backdrop-blur-sm rounded-xl) between the toolbar and the report list. Always visible when data exists (~180px height).

### Chart Interactions
- **D-06:** Clicking a category area in the chart sets the `?label=` query param, same behavior as clicking a category chip on a report row. The existing category filter banner appears with the X to clear.
- **D-07:** Chart.js built-in smooth transitions handle animation when date changes — no custom animation code needed.

### Empty & Edge States
- **D-08:** Chart is hidden entirely when no reports exist for the date, or when all reports lack categories. The existing empty state messaging handles the "no reports" case.

### Claude's Discretion
- How to extract hourly buckets from report timestamps (date parsing approach)
- Chart.js config details (tension, fill opacity, point radius, grid styling for dark theme)
- Whether the legend uses Chart.js native legend or a custom HTML legend
- How to map the `categoryColor()` output (Tailwind classes) to Chart.js hex/rgba values
- Tooltip formatting (count, percentage, or both)
- Whether to extract the chart as a separate component or keep inline in ThreatNewsPage

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Threat News — NEWS-04 (category distribution chart filtered by selected date)

### Target Page
- `frontend/src/pages/ThreatNewsPage.jsx` — Current implementation with date selector, category dropdown, search, auto-refresh, report list. Contains `CATEGORY_COLORS`, `categoryColor()`, `CalendarDropdown`, `CategoryDropdown`.

### Chart Infrastructure
- `frontend/src/hooks/useChartJs.js` — Chart.js wrapper hook (canvas ref + config pattern)
- `frontend/src/pages/DashboardPage.jsx` lines 79-132 — `AttackChart` component as reference for Chart.js usage in this codebase (vertical bar chart with click filtering)

### Data Layer
- `frontend/src/api/threat-news.js` — `fetchThreatNews` already returns reports with labels and published timestamps. No changes needed.

### Prior Phase Context
- `.planning/phases/32-date-based-news-browsing/32-CONTEXT.md` — D-01 (glassmorphism calendar), D-08 (UTC boundary computation), D-10 (?date= query param), D-07 (category dropdown stays active)

### Design System
- `frontend/tailwind.config.js` — Color tokens (violet, cyan, amber, red, surface, border)
- `frontend/src/styles/glassmorphism.css` — Glass effect utilities

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useChartJs` hook: Wraps Chart.js/auto with canvas ref and config-based lifecycle. Used by DashboardPage's AttackChart.
- `CATEGORY_COLORS` array + `categoryColor()` function: Already in ThreatNewsPage (lines 21-36). Maps label names to 5 color slots (violet, cyan, amber, red, muted).
- `CategoryDropdown` component: Glassmorphism dropdown pattern to follow for card styling consistency.
- `CalendarDropdown` component: Established click-outside and dropdown positioning patterns.

### Established Patterns
- Chart.js config object passed to `useChartJs` hook — returns a canvas ref to render into
- `DashboardPage.AttackChart` uses `onClick` handler on chart to trigger filtering — same pattern needed here
- `useSearchParams` for URL state (`?label=` param) — chart click should use the same `updateParam('label', catId)` mechanism
- Glassmorphism cards: `bg-surface/60 border border-border backdrop-blur-sm rounded-xl`

### Integration Points
- Chart renders between toolbar `<div>` and report list `<div>` in ThreatNewsPage JSX
- Chart reads from `items` state (already populated by `loadData`/`silentRefresh`)
- Chart click handler calls existing `updateParam('label', catId)` to set filter
- Chart re-renders when `items` changes (date change, search, category filter)
- `categories` state (from `fetchThreatNewsLabels`) provides the id-to-value mapping needed for chart click → label filter

</code_context>

<specifics>
## Specific Ideas

- Stacked area chart — hourly resolution (0h–23h) showing volume per category
- Colors must match the existing category chips in the report rows (CATEGORY_COLORS hash)
- Chart card should feel like a natural part of the page — same glassmorphism treatment as other elements
- Click-to-filter behavior should be identical to clicking a category chip (sets ?label= and shows the filter banner)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 33-category-distribution-chart*
*Context gathered: 2026-03-29*
