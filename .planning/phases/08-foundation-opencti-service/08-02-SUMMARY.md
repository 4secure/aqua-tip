---
phase: 08-foundation-opencti-service
plan: 02
subsystem: api
tags: [opencti, graphql, laravel-http, health-check, artisan]

requires:
  - phase: 08-foundation-opencti-service
    provides: IP search rename (Plan 01) established controller/route patterns
provides:
  - OpenCtiService with generic GraphQL query executor
  - Typed exceptions for connection and query errors
  - Health check endpoint and CLI command
  - OpenCTI config via env vars
affects: [09-opencti-browse-pages, 10-opencti-detail-pages, 11-cti-search]

tech-stack:
  added: []
  patterns: [OpenCTI GraphQL proxy via Laravel Http facade, typed exception hierarchy]

key-files:
  created:
    - backend/app/Services/OpenCtiService.php
    - backend/app/Exceptions/OpenCtiConnectionException.php
    - backend/app/Exceptions/OpenCtiQueryException.php
    - backend/app/Http/Controllers/OpenCti/HealthController.php
    - backend/app/Console/Commands/OpenCtiHealthCommand.php
    - backend/tests/Feature/OpenCti/OpenCtiServiceTest.php
    - backend/tests/Feature/OpenCti/OpenCtiHealthTest.php
  modified:
    - backend/config/services.php
    - backend/routes/api.php
    - backend/.env.example

key-decisions:
  - "Mirrored DarkWebProviderService pattern for consistency across service layer"
  - "15s timeout with 2x retry on ConnectionException only -- prevents retry on auth/query errors"

patterns-established:
  - "OpenCTI service pattern: config -> validate credentials -> POST /graphql with Bearer -> check errors -> return data"
  - "Typed exception hierarchy: OpenCtiConnectionException (infra) vs OpenCtiQueryException (GraphQL)"

requirements-completed: [FOUND-02, FOUND-03]

duration: 3min
completed: 2026-03-14
---

# Phase 8 Plan 02: OpenCTI Service Summary

**OpenCTI GraphQL service layer with Bearer auth, 15s timeout, 2x retry, typed exceptions, health check endpoint, and artisan CLI command**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-14T16:12:59Z
- **Completed:** 2026-03-14T16:16:09Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- OpenCtiService executes authenticated GraphQL queries against OpenCTI with timeout and retry
- Typed exceptions distinguish between connection/config errors and GraphQL query errors
- Health check endpoint (GET /api/opencti/health) returns version info behind Sanctum auth
- Artisan command (opencti:health) enables CLI connectivity verification
- 13 tests covering all service behaviors, endpoint auth, and command output

## Task Commits

Each task was committed atomically:

1. **Task 1: Create OpenCTI config, exceptions, and service class** - `00c8b92` (feat)
2. **Task 2: Create health check endpoint and artisan command** - `9d39efb` (feat)

## Files Created/Modified
- `backend/app/Services/OpenCtiService.php` - GraphQL query executor with auth, timeout, retry
- `backend/app/Exceptions/OpenCtiConnectionException.php` - Network/config error exception
- `backend/app/Exceptions/OpenCtiQueryException.php` - GraphQL-level error exception
- `backend/app/Http/Controllers/OpenCti/HealthController.php` - Health check endpoint (200/503)
- `backend/app/Console/Commands/OpenCtiHealthCommand.php` - CLI health check command
- `backend/config/services.php` - Added opencti config entry
- `backend/routes/api.php` - Added /api/opencti/health route under auth:sanctum
- `backend/.env.example` - Added OPENCTI_URL and OPENCTI_TOKEN vars
- `backend/tests/Feature/OpenCti/OpenCtiServiceTest.php` - 8 service behavior tests
- `backend/tests/Feature/OpenCti/OpenCtiHealthTest.php` - 5 endpoint and command tests

## Decisions Made
- Mirrored DarkWebProviderService pattern for consistency across the service layer
- 15-second timeout with 2x retry on ConnectionException only -- prevents retrying auth or query errors
- Used invokable HealthController aliased as OpenCtiHealthController to avoid namespace conflicts

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Health tests needed RefreshDatabase trait for User::factory() -- added during GREEN phase, standard Laravel testing requirement.

## User Setup Required

None - OPENCTI_URL and OPENCTI_TOKEN env vars are empty by default. Service fails gracefully at usage time, not at app boot.

## Next Phase Readiness
- OpenCtiService ready for Phase 9 (browse pages) to call query() with specific GraphQL queries
- Health check endpoint can verify OpenCTI connectivity before starting Phase 9
- All 106 existing tests still pass -- no regressions

---
*Phase: 08-foundation-opencti-service*
*Completed: 2026-03-14*
