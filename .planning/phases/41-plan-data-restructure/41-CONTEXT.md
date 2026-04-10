# Phase 41: Plan Data Restructure - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Update the plan seeder with new credit limits, prices, and unified feature lists. Create a credit sync migration that immediately resets existing users' credit records to new plan values. Adjust Enterprise pricing signal and confirm trial behavior.

</domain>

<decisions>
## Implementation Decisions

### Seeder Values
- **D-01:** Free tier: 5 credits/day, $0 (was 1/day)
- **D-02:** Basic tier: 30 credits/day, $10 / 1000 cents (was 15/day, $9 / 900 cents)
- **D-03:** Pro tier: 50 credits/day, $29 / 2900 cents (unchanged)
- **D-04:** Enterprise tier: 200 credits/day, `price_cents: null` to signal "Contact Us" (was $0 / 0 cents)

### Feature Lists
- **D-05:** All plans share the same feature set (currently Pro's list): searches per day, All threat lookups, Full indicator data, Search history, Priority data access, Dark web monitoring
- **D-06:** Enterprise adds "API access" as an additional feature (API itself deferred to future milestone)
- **D-07:** Feature text for "searches per day" should reflect each tier's actual credit limit (e.g., "5 searches per day" for Free)

### Credit Sync Migration
- **D-08:** Migration resets all existing credit records: set `remaining = new_limit` and `limit = new_limit` based on the user's current plan
- **D-09:** This is a full reset — all users get a fresh start at the new cap, no proportional adjustment
- **D-10:** Migration must run atomically with the seeder update (seeder first to update plan rows, then migration to sync credits)

### Trial Behavior
- **D-11:** `TRIAL_DAILY_LIMIT = 10` stays unchanged (matches requirement)
- **D-12:** Trial users get access to ALL features (same as paid plans). Feature gating only applies after trial expires and user falls to Free tier.
- **D-13:** Trial duration remains 30 days from registration (`trial_ends_at`)

### Claude's Discretion
- Migration implementation approach (raw SQL vs Eloquent, single query vs chunked)
- Whether to update `CreditResolver::GUEST_DAILY_LIMIT` (currently 1) — requirement doesn't mention guests
- Seeder description text for each tier

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Plan System
- `backend/database/seeders/PlanSeeder.php` — Current seeder with 4 tiers to update
- `backend/app/Services/CreditResolver.php` — Credit resolution logic, trial handling, lazy reset
- `backend/app/Models/Plan.php` — Plan model with fillable fields and casts
- `backend/app/Models/Credit.php` — Credit model

### Database Schema
- `backend/database/migrations/2026_03_21_000001_create_plans_table.php` — Plans table schema (price_cents is unsignedInteger, may need schema change for null)
- `backend/database/migrations/2026_03_21_000002_add_plan_columns_to_users.php` — User plan columns
- `backend/database/migrations/2026_03_21_000003_add_pending_plan_columns_to_users.php` — Pending plan columns

### Tests
- `backend/tests/Feature/Plan/PlanSeederTest.php` — Seeder tests to update
- `backend/tests/Feature/Credit/CreditResolverTest.php` — Credit resolver tests
- `backend/tests/Feature/Plan/PlanIndexTest.php` — Plan listing tests

### Requirements
- `.planning/REQUIREMENTS.md` — PLAN-01, PLAN-02, PLAN-03

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PlanSeeder` already uses `updateOrCreate` by slug — new values just need updating in the array
- `CreditResolver` already handles plan-based limits, trial limits, and lazy reset — no structural changes needed
- `DeductCredit` middleware already deducts from resolved credits

### Established Patterns
- Seeder uses `updateOrCreate` keyed by `slug` — idempotent, safe to re-run
- Credits table has `remaining`, `limit`, `last_reset_at` per user/IP
- Lazy reset at midnight UTC already syncs limits from plan — migration handles the immediate sync

### Integration Points
- `price_cents` column is currently `unsignedInteger` — changing to nullable requires a schema migration
- Frontend pricing page (Phase 44) will check `price_cents === null` for "Contact Us" display
- Feature gating (Phase 43) will need to know trial users get full access — `CreditResolver` or a new service

</code_context>

<specifics>
## Specific Ideas

- All plans should feel equal in features — the differentiator is credit volume, not feature access
- Enterprise "API access" is a forward-looking placeholder, not implemented in this phase
- The credit sync should feel like a gift (full reset) not a penalty

</specifics>

<deferred>
## Deferred Ideas

- API access implementation for Enterprise tier — future milestone
- Real payment processing (Stripe/LemonSqueezy) — tracked as PAY-01, PAY-02

</deferred>

---

*Phase: 41-plan-data-restructure*
*Context gathered: 2026-04-11*
