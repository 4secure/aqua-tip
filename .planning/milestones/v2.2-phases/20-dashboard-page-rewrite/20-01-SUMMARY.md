---
phase: 20-dashboard-page-rewrite
plan: 01
subsystem: api
tags: [opencti, graphql, dashboard, labels, entity-types]

requires:
  - phase: 18-dashboard-backend
    provides: DashboardService with getCounts/getIndicators/getCategories
provides:
  - Updated entity types (Hostname, X509-Certificate) in counts endpoint
  - Labels array on each indicator for frontend category filtering
affects: [20-02, dashboard-frontend]

tech-stack:
  added: []
  patterns: [objectLabel inclusion in OpenCTI GraphQL queries]

key-files:
  created: []
  modified:
    - backend/app/Services/DashboardService.php
    - backend/tests/Feature/Dashboard/CountsTest.php
    - backend/tests/Feature/Dashboard/IndicatorsTest.php
    - backend/tests/Unit/Services/DashboardServiceTest.php

key-decisions:
  - "No new decisions - followed plan entity type choices (Hostname + X509-Certificate)"

patterns-established:
  - "objectLabel pattern: include objectLabel { value } in GraphQL queries and flatten to string array in response mapping"

requirements-completed: [DASH-05]

duration: 3min
completed: 2026-03-20
---

# Phase 20 Plan 01: Dashboard Service Entity Types & Labels Summary

**Updated DashboardService to use Hostname/X509-Certificate entity types and added objectLabel to indicators query for frontend category filtering**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-19T19:59:37Z
- **Completed:** 2026-03-19T20:02:47Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Replaced Url/Email-Addr with Hostname/X509-Certificate in fetchCounts() entity type map
- Added objectLabel to fetchIndicators() GraphQL query and mapped labels array into response
- Updated all feature and unit tests to match new entity types and labels field
- Added new test asserting labels array presence on each indicator

## Task Commits

Each task was committed atomically:

1. **Task 1: Update entity types and add labels to DashboardService** - `b4dd602` (feat)
2. **Task 2: Update existing tests for new entity types and labels field** - `449b603` (test)

## Files Created/Modified
- `backend/app/Services/DashboardService.php` - Updated entity types map and added objectLabel to indicators query
- `backend/tests/Feature/Dashboard/CountsTest.php` - Updated fake data and assertions for Hostname/X509-Certificate
- `backend/tests/Feature/Dashboard/IndicatorsTest.php` - Added labels to fake data, structure assertions, and new labels test
- `backend/tests/Unit/Services/DashboardServiceTest.php` - Updated mock data and expectations for new types and labels

## Decisions Made
None - followed plan as specified.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated unit test expectations for new entity types and labels**
- **Found during:** Task 2 (test updates)
- **Issue:** Unit tests in DashboardServiceTest.php also referenced old entity types (Url, Email-Addr) and did not include labels in indicator expectations
- **Fix:** Updated entity type assertions and added objectLabel mock data + labels expectation in unit test
- **Files modified:** backend/tests/Unit/Services/DashboardServiceTest.php
- **Verification:** All 20 dashboard tests pass
- **Committed in:** 449b603 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Unit test file was not listed in plan but needed updating for consistency. No scope creep.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend now returns correct entity types and labels for frontend dashboard rewrite
- Plan 20-02 (frontend dashboard page) can consume labels for category filtering

---
*Phase: 20-dashboard-page-rewrite*
*Completed: 2026-03-20*
