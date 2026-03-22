---
phase: 23-creditresolver-plan-aware-backend
plan: 02
subsystem: api
tags: [laravel, plan-selection, user-resource, upgrade-downgrade, credit-boost]

requires:
  - phase: 23-creditresolver-plan-aware-backend
    provides: CreditResolver service, pending_plan_id/plan_change_at columns, Plan model
provides:
  - GET /api/plans public endpoint listing all active plans
  - POST /api/plan authenticated endpoint for upgrade/downgrade/enterprise block
  - Expanded UserResource with plan, trial, pending, timezone, organization, role fields
affects: [frontend-pricing-page, frontend-plan-selection, frontend-user-profile]

tech-stack:
  added: []
  patterns: [invokable-controllers, eager-loading-relationships, conditional-resource-fields]

key-files:
  created:
    - backend/app/Http/Controllers/Plan/PlanIndexController.php
    - backend/app/Http/Controllers/Plan/PlanSelectionController.php
    - backend/tests/Feature/Plan/PlanIndexTest.php
    - backend/tests/Feature/Plan/PlanSelectionTest.php
    - backend/tests/Feature/Plan/UserResourcePlanTest.php
  modified:
    - backend/app/Http/Resources/UserResource.php
    - backend/app/Http/Controllers/Auth/UserController.php
    - backend/routes/api.php

key-decisions:
  - "Enterprise plan excluded from validation rule (in:free,basic,pro) rather than post-validation check"
  - "Credit boost on upgrade uses min(remaining+diff, newLimit) to cap at plan maximum"
  - "UserResource uses conditional when() for plan/pendingPlan to avoid null relation access"
  - "UserController eager loads plan+pendingPlan to avoid N+1 queries"

patterns-established:
  - "Plan controller namespace: app/Http/Controllers/Plan/ for plan-related endpoints"
  - "Upgrade/downgrade direction determined by sort_order comparison"

requirements-completed: [PLAN-05, PLAN-06, PLAN-08, ONBD-05]

duration: 11min
completed: 2026-03-22
---

# Plan 23-02: Plan Listing & Selection APIs Summary

**Plan listing, upgrade/downgrade selection, and expanded UserResource with plan/trial/pending state**

## Performance

- **Duration:** ~11 min
- **Started:** 2026-03-22T12:55:32Z
- **Completed:** 2026-03-22T13:06:53Z
- **Tasks:** 2
- **Files created:** 5
- **Files modified:** 3

## Accomplishments
- Public GET /api/plans endpoint returning 4 active plans sorted by sort_order
- Authenticated POST /api/plan handling upgrades (immediate + credit boost), downgrades (pending 30d), enterprise block (422), same-plan no-op
- UserResource expanded with plan object, trial_active, trial_days_left, pending_plan, plan_change_at, timezone, organization, role
- 18 new tests all passing (4 PlanIndex + 8 PlanSelection + 6 UserResourcePlan)

## Task Commits

Each task was committed atomically:

1. **Task 1: Plan listing and selection controllers with routes**
   - `75d146d` (test) - RED: failing tests for plan listing and selection
   - `c85ec92` (feat) - GREEN: controllers and routes implementation
2. **Task 2: Expand UserResource with plan, trial, and pending fields**
   - `ab856b3` (test) - RED: failing tests for UserResource expansion
   - `8b4b85a` (feat) - GREEN: UserResource and UserController updates

## Files Created/Modified
- `backend/app/Http/Controllers/Plan/PlanIndexController.php` - Public plan listing endpoint
- `backend/app/Http/Controllers/Plan/PlanSelectionController.php` - Plan upgrade/downgrade endpoint
- `backend/app/Http/Resources/UserResource.php` - Expanded with plan, trial, pending, profile fields
- `backend/app/Http/Controllers/Auth/UserController.php` - Eager loads plan and pendingPlan
- `backend/routes/api.php` - Added GET /plans (public) and POST /plan (auth) routes
- `backend/tests/Feature/Plan/PlanIndexTest.php` - 4 tests for plan listing
- `backend/tests/Feature/Plan/PlanSelectionTest.php` - 8 tests for plan selection
- `backend/tests/Feature/Plan/UserResourcePlanTest.php` - 6 tests for UserResource expansion

## Decisions Made
- Enterprise plan excluded via validation rule (in:free,basic,pro) so invalid slug and enterprise both return 422
- Credit boost capped with min() to prevent remaining exceeding plan limit
- Conditional when() used in UserResource to safely handle null relations
- UserController eager loads both plan and pendingPlan to prevent N+1

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan listing and selection APIs complete, ready for frontend pricing page
- UserResource returns full plan/trial/pending state for frontend display
- All 227 tests pass (10 pre-existing failures in unrelated ThreatMap/DarkWeb/ThreatNews modules)

---
*Phase: 23-creditresolver-plan-aware-backend*
*Completed: 2026-03-22*
