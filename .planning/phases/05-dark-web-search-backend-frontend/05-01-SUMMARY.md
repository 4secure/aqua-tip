---
phase: 05-dark-web-search-backend-frontend
plan: 01
subsystem: api
tags: [laravel, dark-web, breach-search, leakcheck, http-client, pest]

# Dependency graph
requires:
  - phase: 01-laravel-foundation-core-auth
    provides: Sanctum auth, User model, base controller
  - phase: 03
    provides: Credit system with DeductCredit middleware, SearchLog model
provides:
  - POST /api/dark-web/search endpoint with auth + credit gating
  - DarkWebProviderService for external breach API proxy
  - DarkWebSearchRequest with conditional email/domain validation
  - Password masking in breach results
affects: [05-dark-web-search-backend-frontend]

# Tech tracking
tech-stack:
  added: []
  patterns: [external-api-proxy-with-credit-refund, conditional-format-validation]

key-files:
  created:
    - backend/app/Services/DarkWebProviderService.php
    - backend/app/Http/Requests/DarkWebSearchRequest.php
    - backend/app/Http/Controllers/DarkWeb/SearchController.php
    - backend/tests/Feature/DarkWeb/DarkWebSearchTest.php
  modified:
    - backend/config/services.php
    - backend/routes/api.php

key-decisions:
  - "Credit refund via DB increment on provider failure (not middleware reversal)"
  - "Password masking shows first 3 chars max with asterisks for remainder"
  - "Dark web search requires auth:sanctum (no guest access unlike IOC search)"

patterns-established:
  - "External API proxy pattern: service class with timeout, retry, response normalization"
  - "Credit refund on failure: try/catch in controller with DB::increment"
  - "Conditional validation: withValidator after-hook for type-dependent format rules"

requirements-completed: [DARKWEB-01, DARKWEB-02, DARKWEB-05, DARKWEB-06]

# Metrics
duration: 4min
completed: 2026-03-13
---

# Phase 05 Plan 01: Dark Web Search Backend Summary

**Dark web breach search API with external provider proxy, credit-gated auth, password masking, and automatic credit refund on provider failure**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-13T17:28:22Z
- **Completed:** 2026-03-13T17:32:02Z
- **Tasks:** 1
- **Files modified:** 6

## Accomplishments
- POST /api/dark-web/search endpoint with auth:sanctum + deduct-credit middleware
- DarkWebProviderService proxying external breach API with timeout, retry, response normalization
- Automatic credit refund (DB increment) when provider API fails, returning 502
- Password masking in breach results (first 3 chars visible, rest asterisked)
- Conditional format validation (email via filter_var, domain via regex)
- 11 Pest tests covering auth, validation, success, empty results, provider error, credit exhaustion, search logging, password masking

## Task Commits

Each task was committed atomically:

1. **Task 1: Dark Web provider service, form request, and controller**
   - `c3ed65a` (test: add failing tests for dark web search endpoint)
   - `f668c54` (feat: implement dark web search endpoint with provider service)

## Files Created/Modified
- `backend/app/Services/DarkWebProviderService.php` - External API proxy with timeout, retry, normalization, password masking
- `backend/app/Http/Requests/DarkWebSearchRequest.php` - Form request with conditional email/domain validation
- `backend/app/Http/Controllers/DarkWeb/SearchController.php` - Invokable controller with try/catch credit refund
- `backend/tests/Feature/DarkWeb/DarkWebSearchTest.php` - 11 Pest tests with Http::fake()
- `backend/config/services.php` - Added dark_web config block
- `backend/routes/api.php` - Added dark-web/search route in auth:sanctum group

## Decisions Made
- Credit refund via DB increment on provider failure (not middleware reversal) -- simpler, atomic
- Password masking shows first 3 chars max with asterisks for remainder -- balances usability with security
- Dark web search requires auth:sanctum (no guest access unlike IOC search) -- sensitive data requires authentication
- Route placed inside existing auth:sanctum group (not standalone like IOC search)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

External services require manual configuration:
- `DARK_WEB_API_KEY` - API key from dark web data provider dashboard (e.g., LeakCheck, Snusbase)
- `DARK_WEB_API_URL` - Provider API base URL (defaults to https://leakcheck.io/api/v2 if not set)

## Next Phase Readiness
- Backend API complete, ready for frontend integration (Plan 02)
- All tests green (92/92 including existing suite)

---
*Phase: 05-dark-web-search-backend-frontend*
*Completed: 2026-03-13*
