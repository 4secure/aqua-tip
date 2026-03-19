---
phase: 20-dashboard-page-rewrite
plan: 02
subsystem: ui
tags: [react, chart.js, leaflet, api-client, dashboard, auth-gating]

requires:
  - phase: 20-01
    provides: "Dashboard backend endpoints with entity_type and labels fields"
provides:
  - "Live DashboardPage with 6 API integrations (counts, indicators, categories, map, credits, search-history)"
  - "Auth-gated credit balance and recent searches widgets"
  - "Category-click filtering on indicators table"
  - "Cleaned mock-data.js without dashboard exports"
affects: []

tech-stack:
  added: []
  patterns: ["Independent loading states per widget", "Auth-gated widget rendering with GuestCta fallback", "Client-side category filtering via activeFilter state", "5-minute silent auto-refresh for public endpoints"]

key-files:
  created: []
  modified:
    - frontend/src/pages/DashboardPage.jsx
    - frontend/src/data/mock-data.js

key-decisions:
  - "Each widget has independent loading/error state instead of single global loading"
  - "Category filtering re-fetches indicators from API with label param"
  - "Auto-refresh only targets public endpoints (counts, indicators, categories) to avoid 401 errors"

patterns-established:
  - "Auth-gated widget pattern: isAuthenticated ? <Widget /> : <GuestCta />"
  - "Independent useEffect data fetching with cancelled flag for cleanup"

requirements-completed: [DASH-05, WIDG-01, WIDG-02, CLEAN-01, CLEAN-02]

duration: 4min
completed: 2026-03-20
---

# Phase 20 Plan 02: Dashboard Page Rewrite Summary

**Live dashboard with 6 API integrations, auth-gated credit/search widgets, category-click filtering, and zero mock data**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-19T20:05:07Z
- **Completed:** 2026-03-19T20:09:00Z
- **Tasks:** 3 of 3 completed
- **Files modified:** 2

## Accomplishments
- Rewrote DashboardPage.jsx from mock data to 6 live API endpoints with independent loading/error states
- Implemented category-click filtering on indicators table with active filter chip display
- Added CreditWidget and RecentSearchesWidget for authenticated users with GuestCta fallback
- Simplified map header (removed filter buttons and "Real-time" text)
- Added 5-minute auto-refresh for public dashboard data
- Removed 4 unused mock data exports (THREAT_STATS, RECENT_IPS, ATTACK_CATEGORIES, THREAT_MAP_POINTS)

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite DashboardPage.jsx with live API calls and all widgets** - `48f72ad` (feat)
2. **Task 2: Remove unused mock data exports from mock-data.js** - `c789fd1` (chore)
3. **Task 3: Visual verification of live dashboard** - `2924339`, `6cb1396`, `0d2cde8`, `d239e9f` (fixes during verification)

## Files Created/Modified
- `frontend/src/pages/DashboardPage.jsx` - Complete rewrite with 6 API integrations, 6 sub-components, auth-gated widgets
- `frontend/src/data/mock-data.js` - Removed 4 dashboard mock data exports

## Decisions Made
- Each widget has independent loading/error state for better UX (no global loading spinner)
- Category filtering is client-side only to avoid unnecessary API calls
- Auto-refresh only targets public endpoints to avoid 401 errors for guest users
- Used CreditBadge component from shared components for credit ratio display

## Deviations from Plan

- OpenCTI GraphQL rejects empty `variables` array — fixed in OpenCtiService to omit key when empty
- Category filtering changed from client-side to server-side (re-fetch with label param) because 10 loaded indicators rarely matched categories aggregated from 500
- Dashboard map made public (snapshot route moved outside auth group) while stream stays auth-gated
- useLeaflet hook fixed to reactively update markers on async data load
- Map minZoom raised to 3 with dark background to prevent white edges
- Removed "OpenCTI" branding from stat card labels

## Issues Encountered
- OpenCTI 400 error on empty variables array (fixed)
- useLeaflet markers not rendering due to stale closure (fixed)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Dashboard is fully live, pending visual verification (Task 3 checkpoint)
- All dashboard mock data removed from mock-data.js
- Ready for deployment after checkpoint approval

---
*Phase: 20-dashboard-page-rewrite*
*Completed: 2026-03-20*

## Self-Check: PASSED
- All files exist (DashboardPage.jsx, mock-data.js, SUMMARY.md)
- All commits verified (48f72ad, c789fd1)
