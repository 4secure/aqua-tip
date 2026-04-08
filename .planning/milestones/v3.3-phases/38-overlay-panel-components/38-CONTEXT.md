# Phase 38: Overlay Panel Components - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Build two overlay panels floating over the threat map at `/dashboard`: a left panel with 7 threat database stat cards + existing map widgets (Counters, Countries, Donut), and a right panel combining recent indicators table + live feed. A single toggle button at bottom-center collapses both panels simultaneously. Event propagation blocked so panel interactions don't affect the map.

</domain>

<decisions>
## Implementation Decisions

### Panel Positioning & Coexistence
- **D-01:** Left panel contains 7 stat cards stacked on top, with existing map widgets (ThreatMapCounters, ThreatMapCountries, ThreatMapDonut) below them in the same panel. Not replacing existing widgets — combining into one scrollable left overlay.
- **D-02:** Left panel is scrollable with max-height matching viewport, independent scroll from the map.
- **D-03:** Right panel combines the indicators table and the existing ThreatMapFeed into one unified overlay panel. Both collapse together via the toggle.

### Stat Card Visual Style
- **D-04:** Compact row style for stat cards — each card is a single row with color dot + label on left, count on right. Approximately 40px per card height. Not reusing the tall DashboardPage StatCard component.
- **D-05:** "Threat Database" heading at the top of the stat cards section, consistent with the old dashboard naming.

### Indicators Table Format
- **D-06:** Simplified 2-column layout for the overlay context — type badge + value on left, relative time on right. Labels column dropped to fit narrower overlay width.
- **D-07:** All available indicators shown in a scrollable list, no fixed row cap. Panel scrolls to accommodate.

### Toggle Button
- **D-08:** Single toggle button placed at bottom-center of the map. Collapses/expands both left and right panels simultaneously.
- **D-09:** Icon-only glassmorphism pill style — small, minimal footprint. Chevron or sidebar icon that reflects current state (expanded/collapsed).

### Claude's Discretion
- Panel widths (left and right) — pick appropriate widths based on content
- Glassmorphism styling specifics — use existing `glass-card` / `bg-surface/60 backdrop-blur-sm border-border` patterns
- Animation approach for collapse/expand — Framer Motion is available
- Event propagation blocking technique (stopPropagation on panel containers)
- Whether stat cards and indicators fetch data independently or share a parent fetch

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — PANEL-01, PANEL-02, PANEL-03, TOGGLE-01 define this phase's scope

### Roadmap
- `.planning/ROADMAP.md` §Phase 38-40 — full milestone context including Phase 39 peek-on-hover and Phase 40 cleanup

### Prior Phase Context
- `.planning/phases/37-map-route-foundation/37-CONTEXT.md` — Route swap decisions, map viewport sizing, DashboardPage widget deferral

### Key Source Files
- `frontend/src/pages/ThreatMapPage.jsx` — Target page for overlay panels (92 lines, current left/right widget layout at lines 79-88)
- `frontend/src/pages/DashboardPage.jsx` — Source of StatCard, IndicatorsTable, STAT_CARD_CONFIG, STAT_COLOR_MAP, TYPE_BADGE_COLORS, formatRelativeTime (reusable data/logic)
- `frontend/src/components/threat-map/ThreatMapCounters.jsx` — Existing left widget to include below stat cards
- `frontend/src/components/threat-map/ThreatMapCountries.jsx` — Existing left widget to include below stat cards
- `frontend/src/components/threat-map/ThreatMapDonut.jsx` — Existing left widget to include below stat cards
- `frontend/src/components/threat-map/ThreatMapFeed.jsx` — Existing right widget to merge into right panel
- `frontend/src/styles/glassmorphism.css` — Glass effect utilities for panel styling

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `STAT_CARD_CONFIG` (DashboardPage.jsx:12-20): 7-item array with entity_type, label, color — reuse for stat card data
- `STAT_COLOR_MAP` (DashboardPage.jsx:22-28): Color mapping for stat cards — reuse for compact row dots
- `TYPE_BADGE_COLORS` (DashboardPage.jsx:30-39): Badge color mapping for indicator types — reuse in simplified table
- `formatRelativeTime` (DashboardPage.jsx:45-57): Time formatting function — reuse for indicator dates
- `ThreatMapCounters`, `ThreatMapCountries`, `ThreatMapDonut`: Existing left-side map widgets to embed in left panel
- `ThreatMapFeed`: Existing right-side feed widget to embed in right panel
- `glass-card` CSS class: Glassmorphism styling pattern available in stylesheets

### Established Patterns
- Map overlays use `absolute` positioning with `z-[1000]` (ThreatMapPage.jsx:79, 86)
- Edge-to-edge map container: `relative -m-6` with `calc(100vh - 60px)` height
- Dashboard data fetching: `apiClient.get('/api/dashboard/stats')` and `/api/dashboard/indicators` endpoints exist
- Independent widget loading: Each widget manages its own loading/error state

### Integration Points
- `ThreatMapPage.jsx` lines 78-88: Current left/right widget layout to be restructured into panel containers
- Dashboard API endpoints: `/api/dashboard/stats` (stat counts) and `/api/dashboard/indicators` (recent indicators) — already built
- `useThreatStream` hook: Provides events, counters, countryCounts, typeCounts for existing widgets

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 38-overlay-panel-components*
*Context gathered: 2026-04-05*
