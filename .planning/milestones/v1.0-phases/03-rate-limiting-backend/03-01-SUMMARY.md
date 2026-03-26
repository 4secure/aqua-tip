---
phase: 03-rate-limiting-backend
plan: 01
subsystem: api
tags: [rate-limiting, credits, middleware, laravel, eloquent, ioc]

requires:
  - phase: 01-laravel-foundation-core-auth
    provides: User model, Sanctum auth, Laravel app scaffold
provides:
  - Credit-based rate limiting middleware (DeductCredit)
  - IOC search endpoint with mock threat data (POST /api/ioc/search)
  - Credit status endpoint (GET /api/credits)
  - Credits and search_logs database tables
  - IocDetectorService for indicator classification
  - MockThreatDataService for threat intel mock data
  - PurgeGuestCredits artisan command
affects: [frontend-ioc-integration, dashboard, future-api-modules]

tech-stack:
  added: []
  patterns: [credit-gated-middleware, lazy-midnight-reset, race-safe-atomic-update, firstOrCreate-with-race-guard]

key-files:
  created:
    - backend/app/Http/Middleware/DeductCredit.php
    - backend/app/Models/Credit.php
    - backend/app/Models/SearchLog.php
    - backend/app/Http/Controllers/Ioc/SearchController.php
    - backend/app/Http/Controllers/Credit/CreditStatusController.php
    - backend/app/Services/IocDetectorService.php
    - backend/app/Services/MockThreatDataService.php
    - backend/app/Http/Requests/IocSearchRequest.php
    - backend/app/Console/Commands/PurgeGuestCredits.php
    - backend/database/migrations/2026_03_13_000001_create_credits_table.php
    - backend/database/migrations/2026_03_13_000002_create_search_logs_table.php
    - backend/database/migrations/2026_03_13_000003_add_trial_ends_at_to_users_table.php
  modified:
    - backend/app/Models/User.php
    - backend/bootstrap/app.php
    - backend/routes/api.php
    - backend/routes/console.php

key-decisions:
  - "Race-safe credit deduction via atomic UPDATE WHERE remaining > 0 instead of read-check-write"
  - "Lazy midnight-UTC reset on access instead of scheduled reset command for all rows"
  - "Guest credits keyed by IP with user_id=null; auth credits keyed by user_id with unique constraint"

patterns-established:
  - "Credit middleware pattern: resolve -> lazy-reset -> atomic-deduct -> 429-or-pass"
  - "IOC type detection via regex cascade in IocDetectorService"
  - "Mock data generation per IOC type via MockThreatDataService"

requirements-completed: [RATE-01, RATE-02, RATE-03]

duration: 7min
completed: 2026-03-13
---

# Phase 3 Plan 1: Rate Limiting Backend Summary

**Credit-based rate limiting with DeductCredit middleware enforcing 1/day guest and 10/day auth limits on IOC search, lazy midnight-UTC reset, and mock threat data responses**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-13T08:55:50Z
- **Completed:** 2026-03-13T09:02:50Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments
- Credits table with dual guest (IP) / authenticated (user_id) tracking and lazy midnight-UTC reset
- DeductCredit middleware with race-safe atomic deduction and 429 responses including is_guest, remaining, limit, resets_at
- POST /api/ioc/search endpoint with auto-detection of IOC type (IP, domain, hash, URL) and mock threat data
- GET /api/credits read-only status endpoint for both guests and authenticated users
- PurgeGuestCredits artisan command to clean stale guest credit rows on daily schedule

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migrations, Eloquent models, and trial_ends_at column** - `2772944` (feat)
2. **Task 2: DeductCredit middleware, controllers, services, routes, and guest cleanup command** - `bad2e00` (feat)

## Files Created/Modified
- `backend/database/migrations/2026_03_13_000001_create_credits_table.php` - Credits table with user_id/ip_address dual key
- `backend/database/migrations/2026_03_13_000002_create_search_logs_table.php` - Search audit log table
- `backend/database/migrations/2026_03_13_000003_add_trial_ends_at_to_users_table.php` - Trial period column on users
- `backend/app/Models/Credit.php` - Eloquent model with User relationship
- `backend/app/Models/SearchLog.php` - Eloquent model with created_at only
- `backend/app/Models/User.php` - Added trial_ends_at, credit, searchLogs relationships
- `backend/app/Http/Middleware/DeductCredit.php` - Credit-gated middleware with lazy reset
- `backend/app/Http/Requests/IocSearchRequest.php` - Form request validation for IOC query
- `backend/app/Services/IocDetectorService.php` - Regex-based IOC type detection
- `backend/app/Services/MockThreatDataService.php` - Mock threat intel data per IOC type
- `backend/app/Http/Controllers/Ioc/SearchController.php` - IOC search endpoint
- `backend/app/Http/Controllers/Credit/CreditStatusController.php` - Credit status endpoint
- `backend/app/Console/Commands/PurgeGuestCredits.php` - Guest credit cleanup command
- `backend/bootstrap/app.php` - Registered deduct-credit middleware alias
- `backend/routes/api.php` - Added IOC search and credit status routes
- `backend/routes/console.php` - Scheduled daily guest credit purge

## Decisions Made
- Race-safe credit deduction via atomic UPDATE WHERE remaining > 0 instead of read-check-write
- Lazy midnight-UTC reset on access instead of scheduled reset command for all rows
- Guest credits keyed by IP with user_id=null; auth credits keyed by user_id with unique constraint
- firstOrCreate wrapped in try/catch for QueryException to handle race conditions on duplicate keys

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Rate limiting backend complete, ready for frontend IOC search integration
- All endpoints testable via curl/Postman
- Credit system reusable for future modules by applying deduct-credit middleware to any route

---
*Phase: 03-rate-limiting-backend*
*Completed: 2026-03-13*
