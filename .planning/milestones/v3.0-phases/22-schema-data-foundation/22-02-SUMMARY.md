---
phase: 22-schema-data-foundation
plan: 02
subsystem: database
tags: [laravel, migration, data-migration, credits, trial, onboarding, pest]

# Dependency graph
requires:
  - phase: 22-schema-data-foundation/01
    provides: "plans table, trial_ends_at column, onboarding_completed_at column, credits table"
provides:
  - "All existing users reset to 30-day trial via data migration"
  - "All existing users guaranteed to have a credit row (remaining=10, limit=10)"
  - "UserResource onboarding_completed uses reliable timestamp check"
affects: [23-credit-system, onboarding, trial]

# Tech tracking
tech-stack:
  added: []
  patterns: ["one-way data migration with no-op down()", "query builder for cross-DB compatibility"]

key-files:
  created:
    - backend/database/migrations/2026_03_21_000003_reset_trials_and_precreate_credits.php
    - backend/tests/Feature/Auth/TrialResetTest.php
  modified:
    - backend/app/Http/Resources/UserResource.php

key-decisions:
  - "Used Laravel query builder instead of raw SQL for SQLite test compatibility"
  - "Down() is no-op since original trial_ends_at values are overwritten and unrecoverable"

patterns-established:
  - "One-way data migration: empty down() with explanatory comment"

requirements-completed: [TRIAL-04, ONBD-06]

# Metrics
duration: 3min
completed: 2026-03-21
---

# Phase 22 Plan 02: Data Migration & UserResource Fix Summary

**Data migration resets all users to 30-day trial and pre-creates credit rows; UserResource onboarding check switched from name/phone heuristic to onboarding_completed_at timestamp**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-20T20:32:12Z
- **Completed:** 2026-03-20T20:35:30Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Data migration resets all existing users' trial_ends_at to 30 days from migration run time
- Data migration pre-creates credit rows (remaining=10, limit=10) for users without one, preventing null errors in Phase 23's CreditResolver
- UserResource onboarding_completed now uses onboarding_completed_at timestamp instead of fragile name/phone heuristic
- 3 new Pest tests for trial reset and credit pre-creation, all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Create data migration for trial reset and credit pre-creation** - `1b6b53f` (feat)
2. **Task 2: Fix UserResource onboarding heuristic to use onboarding_completed_at timestamp** - `ca737bb` (fix)

## Files Created/Modified
- `backend/database/migrations/2026_03_21_000003_reset_trials_and_precreate_credits.php` - Data migration: bulk update trial_ends_at, insert credit rows for users without one
- `backend/tests/Feature/Auth/TrialResetTest.php` - 3 Pest tests covering trial reset and credit pre-creation logic
- `backend/app/Http/Resources/UserResource.php` - Replaced onboarding_completed heuristic with timestamp check

## Decisions Made
- Used Laravel query builder (DB::table) instead of raw SQL to ensure cross-database compatibility (SQLite in tests, PostgreSQL in production)
- Down() method is intentionally empty -- original trial_ends_at values are overwritten and cannot be restored; credit rows are harmless to leave

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed diffInDays sign in TrialResetTest**
- **Found during:** Task 1 (test verification)
- **Issue:** Carbon diffInDays returns negative value when comparing future date to now, causing assertion failure
- **Fix:** Wrapped diffInDays result in abs() and cast to int
- **Files modified:** backend/tests/Feature/Auth/TrialResetTest.php
- **Verification:** All 3 TrialResetTest tests pass
- **Committed in:** 1b6b53f (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor test assertion fix. No scope creep.

## Issues Encountered
- 10 pre-existing test failures in ThreatMapServiceTest, ThreatNewsIndexTest (unrelated to this plan's changes) -- not addressed per scope boundary rules

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All existing users will have trial_ends_at and credit rows after migration runs
- Phase 23 CreditResolver can safely assume every user has a credit row
- UserResource onboarding check is reliable for frontend consumption

## Self-Check: PASSED

All 3 created/modified files verified on disk. Both task commits (1b6b53f, ca737bb) verified in git log.

---
*Phase: 22-schema-data-foundation*
*Completed: 2026-03-21*
