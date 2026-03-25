# Phase 23: CreditResolver & Plan-Aware Backend - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Credit system derives limits from user plan, trial enforcement works automatically, and plan management APIs are operational. This phase extracts duplicated credit logic into a shared CreditResolver service, makes credit limits plan-aware, enforces trial expiry with auto-downgrade, adds plan selection/listing APIs, and expands UserResource with plan and trial fields.

</domain>

<decisions>
## Implementation Decisions

### CreditResolver extraction
- Single Service class at `App\Services\CreditResolver` — not a trait or model method
- Both `DeductCredit` middleware and `CreditStatusController` call CreditResolver instead of duplicating `resolveCredit()` and `lazyReset()` methods
- Limit resolution priority: plan-first, trial fallback
  - User has plan -> `plan.daily_credit_limit`
  - User has no plan + trial active -> 10/day (trial default)
  - User has no plan + trial expired -> auto-assign Free plan (see Trial expiry below)
  - Guest (unauthenticated) -> 1/day (unchanged, PLAN-07)
- Lazy reset syncs credit limit from plan: when lazy reset fires (new day), update `credit.limit` to match current plan's `daily_credit_limit`, then reset `remaining` to that limit
- No hardcoded credit limits outside CreditResolver

### Trial expiry behavior
- When trial expires and user has no plan: auto-assign Free plan (`plan_id` set to Free plan's ID in DB)
- Every post-trial user will have a `plan_id` — clean state for downstream logic
- Trial expiry check happens only during lazy credit reset (TRIAL-03) — not on profile load
- Immediate downgrade — no grace period. Trial expires -> next credit check uses Free-tier limit (3/day)
- CreditResolver handles pending downgrade application: if `plan_change_at <= today`, apply `pending_plan_id` and clear both fields

### Plan selection API
- `POST /api/plan` — authenticated endpoint to select/change plan
- **Upgrades only** via self-service API — user can move to a higher tier immediately
- Upgrade mid-day behavior: add the difference to remaining credits (e.g., Free 1/3 remaining -> Pro gives 1 + (50-3) = 48 remaining)
- **Downgrades** are stored as pending: set `pending_plan_id` and `plan_change_at = now + 30 days`
- `POST /api/plan` returns 422 if attempting to select a lower-tier plan as an immediate change (must be pending downgrade)
- Enterprise plan blocked from self-service selection — returns 422 with "Contact us" message
- Selectable plans: Free, Basic, Pro only
- Upgrading auto-cancels any pending downgrade (clears `pending_plan_id` and `plan_change_at`)
- New migration needed: add `pending_plan_id` (nullable FK to plans) and `plan_change_at` (nullable datetime) columns to users table
- `GET /api/plans` — public endpoint (no auth required), returns all active plans sorted by `sort_order`

### UserResource expansion
- Nested plan object: `{ id, slug, name, daily_credit_limit, features }` — null if no plan selected yet
- Computed trial fields: `trial_active` (boolean: `trial_ends_at > now && plan_id is null`), `trial_days_left` (integer: `max(0, days until trial_ends_at)`)
- Pending downgrade fields: `pending_plan` (nested plan object or null), `plan_change_at` (ISO datetime or null)
- Also expose: `timezone`, `organization`, `role` fields (already on User model from Phase 22)
- GET /api/user returns plan object, trial_active, trial_days_left, pending_plan, plan_change_at, timezone, organization, role

### Claude's Discretion
- CreditResolver internal method naming and structure
- Plan listing controller structure (invokable or resource)
- Validation error message wording
- Test organization and grouping
- Whether to use Form Request classes or inline validation for plan selection

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — Full v3.0 requirements; Phase 23 maps to PLAN-03, PLAN-04, PLAN-05, PLAN-06, PLAN-07, PLAN-08, TRIAL-01, TRIAL-02, TRIAL-03, ONBD-05

### Prior phase context
- `.planning/phases/22-schema-data-foundation/22-CONTEXT.md` — Phase 22 decisions on Plans table design, seeder content, trial reset migration, user columns

### Credit system (extraction targets)
- `backend/app/Http/Middleware/DeductCredit.php` — Duplicated resolveCredit() and lazyReset() to extract into CreditResolver
- `backend/app/Http/Controllers/Credit/CreditStatusController.php` — Duplicated resolveCredit() and lazyReset() to extract into CreditResolver

### Models
- `backend/app/Models/User.php` — User model with plan relationship, trial_ends_at, plan_id FK
- `backend/app/Models/Plan.php` — Plan model with daily_credit_limit, slug, features
- `backend/app/Models/Credit.php` — Credit model with remaining, limit, last_reset_at

### Database
- `backend/database/seeders/PlanSeeder.php` — 4 plan tiers with credit limits and features
- `backend/database/migrations/2026_03_13_000001_create_credits_table.php` — Credits table schema
- `backend/database/migrations/2026_03_21_000002_add_plan_columns_to_users.php` — plan_id, timezone, organization, role columns

### API routes
- `backend/routes/api.php` — Current route definitions; new routes for POST /api/plan and GET /api/plans needed
- `backend/app/Http/Resources/UserResource.php` — Currently returns 7 fields, needs expansion with plan/trial/pending fields

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DeductCredit` middleware: race-safe atomic `UPDATE WHERE remaining > 0` pattern — preserve this in CreditResolver
- `Credit::firstOrCreate` lazy-creation pattern — CreditResolver should maintain this for guests and new users
- `User::booted()` creating hook: auto-sets `trial_ends_at = now + 30 days` for new users
- `PlanSeeder` with `updateOrCreate` on slug — idempotent, all 4 tiers already seeded
- `UserResource` as JsonResource — extend with plan/trial computed fields

### Established Patterns
- Middleware-based credit gating via `deduct-credit` alias in routes
- Lazy midnight UTC credit reset (reset on access, not scheduled task)
- Invokable controllers (`__invoke`) for single-action endpoints
- Cross-database compatible migrations (no MySQL-specific syntax)
- 111+ Pest tests — new features need matching test coverage

### Integration Points
- `DeductCredit` middleware -> CreditResolver (replace internal methods)
- `CreditStatusController` -> CreditResolver (replace internal methods)
- `UserController` / `UserResource` -> add plan eager loading and computed fields
- `routes/api.php` -> new POST /api/plan (auth required) and GET /api/plans (public) routes
- Users table migration -> add `pending_plan_id` and `plan_change_at` columns
- User model -> add `pending_plan_id` to fillable, add `pendingPlan()` relationship

</code_context>

<specifics>
## Specific Ideas

- Plans are monthly subscriptions — downgrades take effect 30 days from request, not immediately
- Upgrade-only self-service: users can only move UP tiers via the API; downgrades are stored as pending
- Upgrading cancels any pending downgrade — prevents confusing state where user upgraded but still has a pending lower-tier switch
- Enterprise is "Contact Us" only — never self-service selectable
- Mid-day upgrade gives immediate credit boost (add the difference) — rewards upgrading right away

</specifics>

<deferred>
## Deferred Ideas

- Actual payment processing (Stripe/LemonSqueezy/Paddle) — v4.0+
- Proration on mid-cycle plan changes — requires billing system
- `billing_interval` column on plans table — add when payment gateway is implemented
- Email notifications for trial expiry (3 days before, on expiry) — future milestone (NOTIF-01, NOTIF-02)

</deferred>

---

*Phase: 23-creditresolver-plan-aware-backend*
*Context gathered: 2026-03-21*
