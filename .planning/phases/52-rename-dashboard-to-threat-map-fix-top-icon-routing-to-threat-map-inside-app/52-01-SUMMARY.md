---
phase: 52-rename-dashboard-to-threat-map-fix-top-icon-routing-to-threat-map-inside-app
plan: 01
subsystem: ui
tags: [react-router, navigation, sidebar, topbar, icons]

requires:
  - phase: 40-threat-map-dashboard
    provides: ThreatMapPage at /dashboard route with /threat-map redirect
provides:
  - /threat-map as canonical route rendering ThreatMapPage
  - /dashboard redirects to /threat-map
  - Sidebar nav shows Threat Map label with map icon
  - Sidebar logo links to /threat-map inside app layout
  - Topbar breadcrumb maps /threat-map to Threat Map
affects: []

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - frontend/src/App.jsx
    - frontend/src/data/mock-data.js
    - frontend/src/data/icons.jsx
    - frontend/src/components/layout/Sidebar.jsx
    - frontend/src/components/layout/Topbar.jsx

key-decisions:
  - "Kept dashboard icon key intact for backward compatibility"

patterns-established: []

requirements-completed: [DASH-01, DASH-04]

duration: 2min
completed: 2026-04-11
---

# Phase 52 Plan 01: Rename Dashboard to Threat Map Summary

**Route swap from /dashboard to /threat-map as canonical URL with updated sidebar nav, map icon, logo link, and topbar breadcrumb**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-11T17:07:14Z
- **Completed:** 2026-04-11T17:09:34Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- /threat-map is now the primary route rendering ThreatMapPage, /dashboard redirects to it
- NAV_CATEGORIES updated with "Threat Map" label, "map" icon, and "/threat-map" href
- New Lucide-style map SVG icon added to ICONS object (dashboard icon preserved)
- Sidebar logo navigates to /threat-map instead of / for in-app users
- Topbar breadcrumb shows "Threat Map" on /threat-map route with matching fallback

## Task Commits

Each task was committed atomically:

1. **Task 1: Update routes, nav data, and add map icon** - `e9b6191` (feat)
2. **Task 2: Update sidebar logo link and topbar breadcrumb** - `6d9ca77` (feat)

## Files Created/Modified

- `frontend/src/App.jsx` - Route swap: /threat-map renders ThreatMapPage, /dashboard redirects
- `frontend/src/data/mock-data.js` - NAV_CATEGORIES entry updated to Threat Map with map icon
- `frontend/src/data/icons.jsx` - Added map icon SVG (kept dashboard icon intact)
- `frontend/src/components/layout/Sidebar.jsx` - Logo Link target changed from / to /threat-map
- `frontend/src/components/layout/Topbar.jsx` - PAGE_NAMES updated, fallback changed to Threat Map

## Decisions Made

- Kept existing `dashboard` icon key in ICONS object for backward compatibility -- other components may reference it

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All "Dashboard" references removed from navigation-related code
- /threat-map is the canonical route for the threat map view
- Ready for any subsequent phases that reference the threat map route

---
*Phase: 52-rename-dashboard-to-threat-map-fix-top-icon-routing-to-threat-map-inside-app*
*Completed: 2026-04-11*
