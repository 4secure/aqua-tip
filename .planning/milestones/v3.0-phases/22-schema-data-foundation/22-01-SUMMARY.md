---
phase: 22-schema-data-foundation
plan: 01
subsystem: database
tags: [laravel, eloquent, migrations, seeders, plans, pest]

requires:
  - phase: none
    provides: n/a
provides:
  - Plans table with 4 seeded tiers (Free/Basic/Pro/Enterprise)
  - Plan Eloquent model with JSON features cast and users() HasMany
  - User plan_id FK with nullOnDelete, timezone, organization, role columns
  - User plan() BelongsTo relationship
affects: [23-credit-resolver, 24-onboarding-trial, 25-plan-gate]

tech-stack:
  added: []
  patterns: [updateOrCreate idempotent seeding, nullable FK with nullOnDelete]

key-files:
  created:
    - backend/database/migrations/2026_03_21_000001_create_plans_table.php
    - backend/database/migrations/2026_03_21_000002_add_plan_columns_to_users.php
    - backend/app/Models/Plan.php
    - backend/database/seeders/PlanSeeder.php
    - backend/tests/Feature/Plan/PlanSeederTest.php
    - backend/tests/Feature/Plan/UserPlanRelationshipTest.php
  modified:
    - backend/database/seeders/DatabaseSeeder.php
    - backend/app/Models/User.php

key-decisions:
  - "nullOnDelete FK so deleting a plan nullifies user association instead of cascading"
  - "updateOrCreate seeder pattern for safe re-runs in production"

patterns-established:
  - "Idempotent seeders: use updateOrCreate with slug as unique key"
  - "Profile columns nullable by default for gradual population"

requirements-completed: [PLAN-01, PLAN-02]

duration: 5min
completed: 2026-03-21
---

# Phase 22 Plan 01: Schema & Data Foundation Summary

**Plans table with 4 subscription tiers (Free/Basic/Pro/Enterprise) and User model plan FK + profile columns**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-20T20:25:16Z
- **Completed:** 2026-03-20T20:30:22Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Plans table with all required columns (slug, name, daily_credit_limit, price_cents, features JSON, is_popular, sort_order, is_active)
- Plan model with JSON features cast, boolean casts, and users() HasMany relationship
- PlanSeeder creates 4 idempotent tiers with correct credit limits: Free(3), Basic(15), Pro(50), Enterprise(200)
- Users table gains plan_id FK with nullOnDelete, plus timezone, organization, role columns
- User model has plan() BelongsTo relationship and 4 new fillable fields
- 9 Pest tests (4 seeder + 5 relationship) all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Plans table migration, Plan model, PlanSeeder, and register in DatabaseSeeder** - `8e8c768` (feat)
2. **Task 2: Add plan_id FK and profile columns to users table, update User model with plan relationship** - `c7df4b9` (feat)

## Files Created/Modified
- `backend/database/migrations/2026_03_21_000001_create_plans_table.php` - Plans table schema with all tier columns
- `backend/database/migrations/2026_03_21_000002_add_plan_columns_to_users.php` - User plan_id FK + profile columns
- `backend/app/Models/Plan.php` - Plan Eloquent model with JSON cast and users() relationship
- `backend/database/seeders/PlanSeeder.php` - 4-tier idempotent seeder using updateOrCreate
- `backend/database/seeders/DatabaseSeeder.php` - Registers PlanSeeder before user creation
- `backend/app/Models/User.php` - Added plan() BelongsTo, new fillable fields
- `backend/tests/Feature/Plan/PlanSeederTest.php` - 4 tests for seeder correctness and idempotency
- `backend/tests/Feature/Plan/UserPlanRelationshipTest.php` - 5 tests for user-plan relationship

## Decisions Made
- Used nullOnDelete FK so deleting a plan sets user plan_id to null instead of cascade-deleting users
- Used updateOrCreate with slug as unique key for idempotent seeding (safe for production re-runs)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing ThreatMapServiceTest failures (2 tests) unrelated to this plan -- HTTP client mocking issue in ip-api.com geo resolution tests. Not caused by our changes, not fixed (out of scope).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plans table and User FK ready for Phase 23 CreditResolver extraction
- Plan model provides the foundation for plan-based credit limits
- User profile columns (timezone, organization, role) ready for onboarding flow in Phase 24

---
*Phase: 22-schema-data-foundation*
*Completed: 2026-03-21*
