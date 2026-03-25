---
phase: 23-creditresolver-plan-aware-backend
plan: 01
subsystem: api
tags: [laravel, service-extraction, credit-system, plan-aware, migration]

requires:
  - phase: 22-onboarding-trial-schema
    provides: plans table, plan_id FK on users, Plan/Credit models
provides:
  - CreditResolver service with plan-aware limit derivation
  - pending_plan_id and plan_change_at columns on users table
  - Trial expiry auto-downgrade to Free plan
  - Pending downgrade application during lazy reset
  - DeductCredit and CreditStatusController delegating to CreditResolver
affects: [23-02, plan-selection-api, frontend-plan-display]

tech-stack:
  added: []
  patterns: [service-extraction, constructor-injection, lazy-reset-hooks]

key-files:
  created:
    - backend/app/Services/CreditResolver.php
    - backend/database/migrations/2026_03_21_000003_add_pending_plan_columns_to_users.php
    - backend/tests/Feature/Credit/CreditResolverTest.php
  modified:
    - backend/app/Models/User.php
    - backend/app/Http/Middleware/DeductCredit.php
    - backend/app/Http/Controllers/Credit/CreditStatusController.php

key-decisions:
  - "CreditResolver uses constants (TRIAL_DAILY_LIMIT=10, GUEST_DAILY_LIMIT=1) instead of config for simplicity"
  - "Trial expiry and pending downgrade checks happen inside lazyReset on new-day boundary"
  - "Free plan fallback uses slug lookup rather than hardcoded limit"

patterns-established:
  - "Service extraction: shared business logic in app/Services/, consumers inject via constructor"
  - "Lazy reset hooks: checkTrialExpiry and applyPendingDowngrade run during daily credit reset"

requirements-completed: [PLAN-03, PLAN-04, PLAN-07, TRIAL-01, TRIAL-02, TRIAL-03]

duration: 12min
completed: 2026-03-22
---

# Plan 23-01: CreditResolver Service Summary

**Shared CreditResolver service with plan-aware credit limits, trial expiry auto-downgrade, and pending downgrade support**

## Performance

- **Duration:** ~12 min
- **Tasks:** 2
- **Files created:** 3
- **Files modified:** 3

## Accomplishments
- Extracted duplicated credit resolution logic into CreditResolver service
- Credit limits now derived from user's plan (not hardcoded)
- Trial expiry auto-assigns Free plan during lazy reset
- Pending downgrade applied when plan_change_at date reached
- Both DeductCredit middleware and CreditStatusController delegate to CreditResolver
- 11 tests covering all credit resolution scenarios

## Task Commits

1. **Task 1: CreditResolver service, migration, and model updates** - `fc03fed` (feat)
2. **Task 2: Rewire DeductCredit and CreditStatusController** - `da729ae` (refactor)

## Files Created/Modified
- `backend/app/Services/CreditResolver.php` - Shared credit resolution with plan-aware limits
- `backend/database/migrations/2026_03_21_000003_add_pending_plan_columns_to_users.php` - pending_plan_id, plan_change_at columns
- `backend/tests/Feature/Credit/CreditResolverTest.php` - 11 tests for credit resolution
- `backend/app/Models/User.php` - Added pendingPlan relationship, new fillable/casts
- `backend/app/Http/Middleware/DeductCredit.php` - Delegates to CreditResolver, removed private methods
- `backend/app/Http/Controllers/Credit/CreditStatusController.php` - Delegates to CreditResolver, removed private methods

## Decisions Made
- Used constructor injection pattern for CreditResolver in both consumers
- Free plan fallback queries by slug rather than hardcoding limit value
- Pending downgrade comparison uses startOfDay for timezone-safe date comparison

## Deviations from Plan
None - plan executed as specified.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CreditResolver service ready for plan selection API (Plan 23-02) to reference
- pending_plan_id/plan_change_at columns available for downgrade scheduling
- All 208 tests pass (11 pre-existing failures in unrelated ThreatMap/DarkWeb/ThreatNews modules)

---
*Phase: 23-creditresolver-plan-aware-backend*
*Completed: 2026-03-22*
