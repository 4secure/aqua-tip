# Phase 53: Threat News Bar Chart with Categories and Side Labels - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a horizontal bar chart widget ("Top Attack Categories") to the Threat Map page's right overlay panel, displaying attack category distribution data from the existing `/api/dashboard/categories` endpoint. This restores the chart that was previously on the old Dashboard page (removed in Phase 40) and places it in the Threat Map right panel.

</domain>

<decisions>
## Implementation Decisions

### Chart Type & Layout
- **D-01:** Horizontal bar chart (Chart.js, `indexAxis: 'y'`). Category names on the Y-axis (left side), bar length represents count.
- **D-02:** Chart goes in the **right overlay panel** (`RightOverlayPanel.jsx`) as a new section, alongside existing "Recent Indicators" and "Threat Database" widgets.

### Data Source
- **D-03:** Data comes from the existing `GET /api/dashboard/categories` backend endpoint (already built — `CategoriesController.php`). This is the same data source the old Dashboard `AttackChart` used.
- **D-04:** No new API endpoints needed — reuse existing backend.

### Category Labels Style
- **D-05:** Plain text, full category names on the Y-axis. Truncate with ellipsis if too long. Standard `#9AA0AD` label color (matches existing Chart.js styling in the codebase).

### Interaction
- **D-06:** No click interaction — pure display only. No filtering behavior on click (unlike the old dashboard which filtered the indicators table).

### Chart Title
- **D-07:** Title: "Top Attack Categories" — same as the old dashboard.

### Claude's Discretion
- Bar colors — use the existing `CATEGORY_COLORS` array from `dashboard-config.js` or the theme colors
- Bar thickness, border radius, chart height — pick values that fit well in the 380px-wide right panel
- Loading/error states — match the existing skeleton/shimmer patterns used in the right panel
- Position within right panel (above or below existing widgets)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Old Dashboard Implementation (git history reference)
- `git show 1c52433:frontend/src/pages/DashboardPage.jsx` — Contains the original `AttackChart` component (horizontal bar chart with Chart.js) that should be adapted for the right panel

### Current Threat Map Page
- `frontend/src/pages/ThreatMapPage.jsx` — Main page component, wires overlay panels
- `frontend/src/components/threat-map/RightOverlayPanel.jsx` — Target panel for the new chart widget
- `frontend/src/components/threat-map/LeftOverlayPanel.jsx` — Reference for panel widget patterns

### Chart Infrastructure
- `frontend/src/hooks/useChartJs.js` — Existing Chart.js hook (used by CategoryDistributionChart and ThreatMapDonut)
- `frontend/src/data/dashboard-config.js` — `STAT_CARD_CONFIG`, `TYPE_BADGE_COLORS`, `formatRelativeTime`

### Backend
- `backend/app/Http/Controllers/Dashboard/CategoriesController.php` — Existing endpoint returning attack categories
- `backend/routes/api.php` — Route registration

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useChartJs` hook — already handles Chart.js lifecycle (create/destroy). Used by ThreatMapDonut and CategoryDistributionChart.
- `CATEGORY_COLORS` array in old DashboardPage — `['#FF3B5C', '#7A44E4', '#00E5FF', '#FFB020', '#00C48C', '#9B6BF7']`
- `apiClient` — already imported in RightOverlayPanel for indicators and counts fetches
- Old `AttackChart` component code in git history — can be adapted directly

### Established Patterns
- Right panel widgets use `glass-card-static` class for containers
- Loading states use skeleton divs with `animate-pulse`
- Panel width is 380px, uses `space-y-4` between widgets
- Chart.js tooltip styling is consistent: `bg: #161822`, `border: #2A2D3E`, Outfit font

### Integration Points
- `RightOverlayPanel.jsx` — add new chart section to `panelContent` (alongside indicators and threat database)
- `apiClient.get('/api/dashboard/categories')` — fetch call (same pattern as indicators and counts)
- No changes needed to ThreatMapPage.jsx props — RightOverlayPanel fetches its own data

</code_context>

<specifics>
## Specific Ideas

- Restore the same horizontal bar chart from the old Dashboard page, adapted for the compact right panel widget
- The old AttackChart had: `barThickness: 28`, `borderRadius: 6`, Outfit font for Y-axis labels — adjust as needed for 380px panel width

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 53-threat-news-bar-chart-with-categories-and-side-labels*
*Context gathered: 2026-04-13*
