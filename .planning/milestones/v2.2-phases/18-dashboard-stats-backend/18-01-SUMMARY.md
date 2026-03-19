---
phase: 18-dashboard-stats-backend
plan: 01
subsystem: api
tags: [laravel, opencti, graphql, caching, dashboard]

requires:
  - phase: 14-opencti-integration
    provides: OpenCtiService with query method and exception types
provides:
  - DashboardService with getCounts, getIndicators, getCategories methods
  - 3 public API endpoints for dashboard data aggregation
  - Stale-cache fallback pattern for dashboard data
affects: [19-dashboard-frontend-wiring, dashboard-ui]

tech-stack:
  added: []
  patterns: [manual Cache::get/put stale-cache fallback, invokable dashboard controllers]

key-files:
  created:
    - backend/app/Services/DashboardService.php
    - backend/app/Http/Controllers/Dashboard/CountsController.php
    - backend/app/Http/Controllers/Dashboard/IndicatorsController.php
    - backend/app/Http/Controllers/Dashboard/CategoriesController.php
  modified:
    - backend/routes/api.php

key-decisions:
  - "Used manual Cache::get/put instead of Cache::remember for stale-cache fallback on OpenCTI failure"
  - "Dashboard routes are public (no auth) to support unauthenticated dashboard views"

patterns-established:
  - "Stale-cache: Cache::get before try, Cache::put on success, return stale on catch"
  - "Dashboard controllers: invokable, resolve service via app(), catch OpenCtiConnectionException -> 502"

requirements-completed: [DASH-01, DASH-02, DASH-03, DASH-04, DASH-06]

duration: 3min
completed: 2026-03-19
---

# Phase 18 Plan 01: Dashboard Stats Backend Summary

**DashboardService with 3 public endpoints aggregating OpenCTI observable counts, recent indicators, and label distribution with 5-min stale-cache fallback**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-18T22:58:24Z
- **Completed:** 2026-03-18T23:01:35Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- DashboardService with getCounts (4 entity types), getIndicators (10 recent), getCategories (top 6 labels)
- 3 invokable controllers following SnapshotController pattern with 502 error handling
- 3 public GET routes registered outside auth middleware in api.php
- Manual Cache::get/put pattern ensures stale data is served when OpenCTI is unreachable

## Task Commits

Each task was committed atomically:

1. **Task 1: Create DashboardService with three aggregation methods** - `da77247` (feat)
2. **Task 2: Create 3 invokable controllers and register public routes** - `ebbeb34` (feat)

## Files Created/Modified
- `backend/app/Services/DashboardService.php` - Service with 3 public methods and stale-cache pattern
- `backend/app/Http/Controllers/Dashboard/CountsController.php` - Invokable controller for /api/dashboard/counts
- `backend/app/Http/Controllers/Dashboard/IndicatorsController.php` - Invokable controller for /api/dashboard/indicators
- `backend/app/Http/Controllers/Dashboard/CategoriesController.php` - Invokable controller for /api/dashboard/categories
- `backend/routes/api.php` - Added 3 public dashboard routes + use statements

## Decisions Made
- Used manual Cache::get/put instead of Cache::remember to preserve stale cache entries for fallback when OpenCTI is unreachable
- Dashboard routes are public (no auth middleware) to support unauthenticated dashboard views

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 3 API endpoints ready for frontend wiring in Phase 19
- Existing /api/threat-map/snapshot serves threat map widget (no new endpoint needed per DASH-04)
- OpenCTI query syntax should be validated with live instance

## Self-Check: PASSED

All 4 created files verified on disk. Both task commits (da77247, ebbeb34) verified in git log.

---
*Phase: 18-dashboard-stats-backend*
*Completed: 2026-03-19*
