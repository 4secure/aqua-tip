# Phase 37: Map Route Foundation - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace /dashboard with the threat map as the main dashboard view. The existing ThreatMapPage component (with all 5 map widgets: counters, countries, donut, feed, status) becomes what users see at /dashboard. The old /threat-map route is redirected. No new widgets or overlays in this phase.

</domain>

<decisions>
## Implementation Decisions

### Route Swap Strategy
- **D-01:** Reuse the existing `ThreatMapPage` component directly for `/dashboard` — no code duplication, no new file. The route in `App.jsx` points `/dashboard` to `ThreatMapPage`.

### Redirect Approach
- **D-02:** Use `<Navigate to="/dashboard" replace />` for the `/threat-map` route. This matches the existing `/ip-search` → `/threat-search` redirect pattern already in `App.jsx`.

### Map Viewport Sizing
- **D-03:** Edge-to-edge map filling the entire content area, using the existing `-m-6` negative margin pattern from `ThreatMapPage` to negate `AppLayout` padding. Maximizes map real estate for Phase 38 overlay panels.

### DashboardPage Widgets
- **D-04:** Old DashboardPage widgets (stat cards, indicators table, attack chart, credits, recent searches, quick actions) are NOT carried into this phase. Phase 37 shows only the threat map with its existing 5 widgets. Phase 38 re-introduces stat cards + indicators as overlay panels. Phase 40 deletes `DashboardPage.jsx`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — LAYOUT-01, LAYOUT-02, LAYOUT-03 define this phase's scope

### Roadmap
- `.planning/ROADMAP.md` §Phase 37-40 — full milestone context including Phase 38 overlay panels and Phase 40 cleanup

### Key Source Files
- `frontend/src/pages/ThreatMapPage.jsx` — Component to reuse at /dashboard (91 lines, 5 widget overlays, SSE via useThreatStream)
- `frontend/src/pages/DashboardPage.jsx` — Current dashboard to be replaced (581 lines, NOT deleted until Phase 40)
- `frontend/src/App.jsx` — Router config with existing redirect pattern at line 65
- `frontend/src/data/mock-data.js` §NAV_CATEGORIES (line 135) — Sidebar nav items to update

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ThreatMapPage` component: Complete, self-contained map page with Leaflet, SSE, pulse markers, and 5 overlay widgets — reuse as-is
- `<Navigate replace />` pattern: Already used for `/ip-search` → `/threat-search` redirect in App.jsx line 65
- `useThreatStream` hook: Provides SSE events, counters, countryCounts, typeCounts, connected status
- `useLeaflet` hook: Lazy-loads Leaflet with configurable center/zoom/onReady

### Established Patterns
- Edge-to-edge map: ThreatMapPage uses `className="relative -m-6"` with `style={{ height: 'calc(100vh - 60px)' }}` to fill viewport
- Protected routes: Both /dashboard and /threat-map are inside `<ProtectedRoute />` wrapper
- Sidebar nav: `NAV_CATEGORIES` in mock-data.js defines grouped navigation items with icon, href, public flag

### Integration Points
- `App.jsx` routes: Change `/dashboard` element from `DashboardPage` to `ThreatMapPage`, add redirect for `/threat-map`
- `NAV_CATEGORIES`: Remove separate "Threat Map" entry from Monitoring category, keep "Dashboard" in Overview
- `DashboardPage` import: Remove from App.jsx (but don't delete the file — Phase 40 handles that)

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

*Phase: 37-map-route-foundation*
*Context gathered: 2026-04-05*
