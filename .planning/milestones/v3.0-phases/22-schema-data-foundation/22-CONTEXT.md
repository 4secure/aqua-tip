# Phase 22: Schema & Data Foundation - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Database schema supports plans, enhanced user profiles, and clean trial state for all users. This phase creates the Plans table, adds new user columns (plan_id, timezone, organization, role), resets all existing users to a fresh 30-day trial, fixes the UserResource onboarding heuristic, and pre-creates credit rows for existing users.

</domain>

<decisions>
## Implementation Decisions

### Plans table design
- Auto-increment ID primary key (consistent with existing tables)
- Columns: slug (unique), name, daily_credit_limit (integer), price_cents (integer, industry standard), features (JSON array of strings), description (text), is_popular (boolean), sort_order (integer), is_active (boolean, default true)
- No billing_interval column — deferred to payment gateway phase
- Enterprise "Contact Us" CTA handled in frontend by checking slug === 'enterprise', no extra DB column
- Features stored as JSON array — simple, no joins, easy to render on pricing page

### Trial reset migration
- Standard Laravel migration with raw SQL UPDATE — runs automatically on deploy
- Reset ALL existing users to trial_ends_at = NOW() + 30 days (clean slate for v3.0)
- Pre-create credit rows (limit: 10, remaining: 10) for all existing users who don't already have one
- Credit limit stays at 10 (trial default); Phase 23's CreditResolver will derive limits from plan

### New user columns
- plan_id: nullable unsigned bigint FK to plans table
- timezone: nullable VARCHAR(100) storing IANA identifiers (e.g. 'Asia/Manila')
- organization: nullable VARCHAR(255)
- role: nullable VARCHAR(255) storing role text, validated in application code (not DB enum)
- All columns nullable in DB — required/optional logic controlled at frontend + backend validation layer
- Existing onboarded users are NOT forced back to onboarding (new fields are optional additions)

### Seeder content
- 4 tiers: Free ($0, 3/day), Basic ($9/mo, 15/day), Pro ($29/mo, 50/day), Enterprise (custom, 200/day)
- Feature lists are credit-focused: differentiate by daily credits + data access level, NOT feature-gating
- Seeder uses updateOrCreate on slug — idempotent, safe to re-run
- PlanSeeder registered in DatabaseSeeder — runs on `migrate --seed` and fresh installs

### UserResource fix
- Replace fragile `name !== email_prefix && phone !== null` heuristic with `onboarding_completed_at !== null`
- Simple boolean check: `'onboarding_completed' => $this->onboarding_completed_at !== null`

### Claude's Discretion
- Exact feature list wording per plan tier
- Plan description text
- Migration ordering within the batch
- sort_order values for the 4 plans

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — Full v3.0 requirements; Phase 22 maps to PLAN-01, PLAN-02, TRIAL-04, ONBD-06

### Existing schema
- `backend/database/migrations/0001_01_01_000000_create_users_table.php` — Base users table schema
- `backend/database/migrations/2026_03_13_000003_add_trial_ends_at_to_users_table.php` — Existing trial_ends_at column
- `backend/database/migrations/2026_03_13_105454_add_phone_and_onboarding_to_users_table.php` — Existing phone + onboarding_completed_at columns
- `backend/database/migrations/2026_03_13_000001_create_credits_table.php` — Credits table schema

### Code to modify
- `backend/app/Models/User.php` — Add plan relationship, new fillable fields, casts
- `backend/app/Http/Resources/UserResource.php` — Fix onboarding_completed heuristic (ONBD-06)
- `backend/app/Http/Middleware/DeductCredit.php` — Hardcoded credit limits (context for Phase 23)
- `backend/app/Http/Controllers/Credit/CreditStatusController.php` — Duplicated resolveCredit (context for Phase 23)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- User model already has `trial_ends_at` column with datetime cast and `creating` boot hook
- `onboarding_completed_at` column already exists — just needs UserResource to use it
- Credit model with `firstOrCreate` lazy-creation pattern (being supplemented with pre-creation in migration)

### Established Patterns
- Migrations use cross-database compatible syntax (no MySQL-specific syntax) — maintain this
- Model uses `$fillable` whitelist, `casts()` method, relationship methods
- 111+ Pest tests exist — schema changes must be additive only (no breaking changes)

### Integration Points
- User → Plan relationship (new belongsTo)
- Plan model (new) with slug-based lookups
- PlanSeeder → DatabaseSeeder registration
- UserResource consumed by AuthContext on frontend — adding new fields here exposes them to React

</code_context>

<specifics>
## Specific Ideas

- All columns nullable in DB with application-layer validation controlling required/optional — gives flexibility to change requirements without migrations
- Pre-creating credit rows ensures every user has a record before Phase 23 introduces CreditResolver
- Credit-focused feature differentiation (not feature-gating) aligns with VirusTotal model in Out of Scope

</specifics>

<deferred>
## Deferred Ideas

- `billing_interval` column on plans table — add when payment gateway is implemented (v4.0+)
- Payment processing (Stripe/LemonSqueezy/Paddle) — v4.0+

</deferred>

---

*Phase: 22-schema-data-foundation*
*Context gathered: 2026-03-21*
