# Phase 52: Rename Dashboard to Threat Map, Fix Top Icon Routing — Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Rename the "Dashboard" nav item, route, and breadcrumb to "Threat Map" across the app. Fix the sidebar logo to route to /threat-map when inside the app layout instead of the landing page.

</domain>

<decisions>
## Implementation Decisions

### Route & Redirect Strategy
- **D-01:** Make `/threat-map` the primary route rendering `ThreatMapPage`. Flip the current setup so `/dashboard` redirects to `/threat-map` (currently it's the opposite).

### Sidebar Label & Icon
- **D-02:** Change sidebar nav item label from "Dashboard" to "Threat Map".
- **D-03:** Change sidebar nav item icon from `dashboard` to a map-related icon (e.g., Lucide `Map` or `MapPin`).
- **D-04:** Update `href` from `/dashboard` to `/threat-map` in `NAV_CATEGORIES`.

### Top Icon / Logo Routing
- **D-05:** When inside the app layout (user is on an authenticated/app route), the sidebar logo should link to `/threat-map` instead of `/` (landing page). The sidebar only renders inside `AppLayout`, so this is scoped to in-app navigation.

### Topbar Breadcrumb
- **D-06:** Update `PAGE_NAMES` in Topbar to map `/threat-map` to `'Threat Map'` instead of `/dashboard` to `'Dashboard'`.

### Claude's Discretion
- Choice of specific Lucide map icon (`Map`, `MapPin`, `Globe`, etc.) — pick whatever looks best with the existing icon set.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above.

### Key Files
- `frontend/src/App.jsx` — Route definitions (lines 70-71)
- `frontend/src/data/mock-data.js` — `NAV_CATEGORIES` definition (line 135-156)
- `frontend/src/components/layout/Topbar.jsx` — `PAGE_NAMES` map (lines 7-14)
- `frontend/src/components/layout/Sidebar.jsx` — Logo link (line 74)
- `frontend/src/data/icons.jsx` — Icon component mappings

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Icon` component (`data/icons.jsx`) — renders icons by name string, need to check if 'map' icon exists or add it
- `NAV_CATEGORIES` in `mock-data.js` — frozen object, single source of truth for sidebar nav

### Established Patterns
- Routes defined in `App.jsx` with React Router `<Route>` and `<Navigate>` for redirects
- `PAGE_NAMES` object in Topbar for breadcrumb display
- Sidebar renders nav from `NAV_CATEGORIES` data — label/icon/href driven

### Integration Points
- `App.jsx` route definitions — swap primary/redirect routes
- `mock-data.js` NAV_CATEGORIES — update label, icon, href
- `Topbar.jsx` PAGE_NAMES — update route-to-label mapping
- `Sidebar.jsx` Logo Link — change `to="/"` to `to="/threat-map"`
- `icons.jsx` — may need new map icon mapping

</code_context>

<specifics>
## Specific Ideas

No specific requirements — straightforward rename and route flip with logo routing fix.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 52-rename-dashboard-to-threat-map-fix-top-icon-routing-to-threat-map-inside-app*
*Context gathered: 2026-04-11*
