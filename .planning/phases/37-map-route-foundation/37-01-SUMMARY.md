---
phase: 37-map-route-foundation
plan: 01
subsystem: ui
tags: [react-router, routing, navigation, threat-map]

# Dependency graph
requires:
  - phase: 36-verification-documentation-sync
    provides: stable app layout and sidebar navigation
provides:
  - "/dashboard route renders ThreatMapPage (full-viewport threat map)"
  - "/threat-map redirects to /dashboard via Navigate replace"
  - "Sidebar nav has no separate Threat Map entry"
affects: [38-overlay-panel-components, 40-cleanup-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Route redirect pattern using Navigate with replace prop"

key-files:
  created: []
  modified:
    - frontend/src/App.jsx
    - frontend/src/data/mock-data.js

key-decisions:
  - "Keep DashboardPage.jsx on disk for Phase 40 cleanup"
  - "Reuse existing Navigate import for redirect pattern"

patterns-established:
  - "Route swap: change element prop without deleting old page component"

requirements-completed: [LAYOUT-01, LAYOUT-02, LAYOUT-03]

# Metrics
duration: 8min
completed: 2026-04-05
---

# Phase 37 Plan 01: Map Route Foundation Summary

**Route swap: /dashboard now renders ThreatMapPage with full-viewport threat map, /threat-map redirects to /dashboard, sidebar Threat Map entry removed**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-05T09:10:00Z
- **Completed:** 2026-04-05T09:18:00Z
- **Tasks:** 3 (2 auto + 1 checkpoint)
- **Files modified:** 2

## Accomplishments
- /dashboard route swapped from DashboardPage to ThreatMapPage with all 5 widgets intact
- /threat-map route converted to Navigate redirect pointing to /dashboard
- Threat Map entry removed from sidebar NAV_CATEGORIES (Monitoring category retains Dark Web only)
- DashboardPage.jsx preserved on disk for Phase 40 cleanup

## Task Commits

Each task was committed atomically:

1. **Task 1: Route swap and redirect in App.jsx** - `1b77b87` (feat)
2. **Task 2: Remove Threat Map from sidebar navigation** - `edbe28b` (feat)
3. **Task 3: Verify route swap and redirect in browser** - checkpoint (human-verify, approved)

## Files Created/Modified
- `frontend/src/App.jsx` - Removed DashboardPage import, swapped /dashboard element to ThreatMapPage, converted /threat-map to redirect
- `frontend/src/data/mock-data.js` - Removed Threat Map entry from NAV_CATEGORIES Monitoring category

## Decisions Made
- Kept DashboardPage.jsx on disk (Phase 40 handles deletion) to avoid premature cleanup
- Reused existing Navigate import from react-router-dom for the redirect pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- /dashboard renders full-viewport threat map, ready for Phase 38 overlay panel components
- ThreatMapPage handles its own edge-to-edge layout with -m-6 and calc(100vh - 60px)
- No blockers for Phase 38

## Self-Check: PASSED

All files and commits verified.

---
*Phase: 37-map-route-foundation*
*Completed: 2026-04-05*
