# Phase 41: Plan Data Restructure - Research

**Researched:** 2026-04-11
**Domain:** Laravel 11 database seeder updates, schema migration, credit sync
**Confidence:** HIGH

## Summary

This phase updates the plan seeder with new pricing/credit values, creates a schema migration to make `price_cents` nullable (for Enterprise "Contact Us"), creates a data migration to sync all existing users' credit records to new plan limits, and unifies feature lists across tiers. The existing codebase is well-structured for these changes -- `PlanSeeder` already uses `updateOrCreate` by slug (idempotent), `CreditResolver` already derives limits from plans, and the credits table already tracks `remaining`/`limit` per user.

The primary technical challenge is the `price_cents` column: it is currently `unsignedInteger` with a default of 0, which cannot store `null`. A schema migration must make this column nullable before the seeder can set Enterprise's `price_cents` to `null`. The credit sync migration is straightforward -- a single UPDATE query joining credits to users to plans, resetting `remaining` and `limit` to the plan's `daily_credit_limit`.

**Primary recommendation:** Create two migrations (schema change for nullable price_cents, then credit sync), update the seeder values, update the Plan model cast, and update all affected tests.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Free tier: 5 credits/day, $0
- D-02: Basic tier: 30 credits/day, $10 / 1000 cents
- D-03: Pro tier: 50 credits/day, $29 / 2900 cents (unchanged)
- D-04: Enterprise tier: 200 credits/day, price_cents: null to signal "Contact Us"
- D-05: All plans share the same feature set (currently Pro's list): searches per day, All threat lookups, Full indicator data, Search history, Priority data access, Dark web monitoring
- D-06: Enterprise adds "API access" as an additional feature (API itself deferred)
- D-07: Feature text for "searches per day" should reflect each tier's actual credit limit
- D-08: Migration resets all existing credit records: set remaining = new_limit and limit = new_limit based on user's current plan
- D-09: Full reset -- all users get a fresh start at the new cap, no proportional adjustment
- D-10: Migration must run atomically with the seeder update (seeder first, then migration)
- D-11: TRIAL_DAILY_LIMIT = 10 stays unchanged
- D-12: Trial users get access to ALL features (same as paid plans)
- D-13: Trial duration remains 30 days from registration

### Claude's Discretion
- Migration implementation approach (raw SQL vs Eloquent, single query vs chunked)
- Whether to update GUEST_DAILY_LIMIT (currently 1) -- requirement doesn't mention guests
- Seeder description text for each tier

### Deferred Ideas (OUT OF SCOPE)
- API access implementation for Enterprise tier -- future milestone
- Real payment processing (Stripe/LemonSqueezy) -- tracked as PAY-01, PAY-02
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLAN-01 | Plan seeder creates 4 tiers: Free (5/day), Basic ($10, 30/day), Pro ($29, 50/day), Enterprise (contact us) | Seeder already uses updateOrCreate by slug; update values in array. Schema migration needed for nullable price_cents. |
| PLAN-02 | Trial period grants 10 credits/day for 30 days with all features | TRIAL_DAILY_LIMIT already 10 in CreditResolver. No code changes needed -- just verify tests confirm this. |
| PLAN-03 | Credit sync migration updates existing users' credit limits to match new plan values | Single SQL UPDATE joining credits->users->plans. Handle trial users (no plan_id) and guests separately. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Laravel | 12.54.1 | Backend framework | Already in use |
| Pest PHP | (installed) | Test framework | Already in use, Pest-style tests throughout |

No new dependencies required. All changes are seeder updates, migrations, and test updates using existing stack.

## Architecture Patterns

### Migration Ordering

The migration must run AFTER the seeder updates plan rows. Laravel's standard workflow is:

1. `php artisan migrate` runs migrations
2. `php artisan db:seed` runs seeders

This means the credit sync migration cannot reference new plan values because the seeder hasn't run yet during `migrate`. Two approaches:

**Approach A (Recommended): Embed seeder logic in the migration**
Put the plan value updates directly in the migration's `up()` method using raw SQL or Eloquent, then sync credits in the same migration. This guarantees atomicity -- both happen in a single `php artisan migrate` call.

**Approach B: Separate seeder + migration with deployment script**
Update seeder, create credit sync migration, then ensure deployment runs `php artisan db:seed --class=PlanSeeder && php artisan migrate`. This splits concerns but requires coordinated deployment.

**Recommendation:** Use Approach A. The migration should:
1. Alter `price_cents` to be nullable
2. Update plan rows with new values (inline, not via seeder)
3. Sync credit records based on updated plan values
4. Also update the PlanSeeder so future fresh installs get correct values

### Schema Change Pattern

```php
// Make price_cents nullable (currently unsignedInteger NOT NULL DEFAULT 0)
Schema::table('plans', function (Blueprint $table) {
    $table->unsignedInteger('price_cents')->nullable()->default(null)->change();
});
```

This requires the `doctrine/dbal` package in older Laravel versions, but Laravel 11+ supports `change()` natively without DBAL.

### Credit Sync Pattern (Raw SQL -- Recommended for Discretion Area)

```php
// Sync credits for users WITH a plan
DB::statement('
    UPDATE credits
    SET remaining = plans.daily_credit_limit,
        "limit" = plans.daily_credit_limit,
        last_reset_at = NOW()
    FROM users
    JOIN plans ON users.plan_id = plans.id
    WHERE credits.user_id = users.id
');

// Sync credits for trial users (no plan, active trial) -- keep at TRIAL_DAILY_LIMIT
DB::statement('
    UPDATE credits
    SET remaining = 10,
        "limit" = 10,
        last_reset_at = NOW()
    FROM users
    WHERE credits.user_id = users.id
    AND users.plan_id IS NULL
    AND users.trial_ends_at > NOW()
');

// Sync credits for expired-trial users with no plan -- set to Free tier limit
DB::statement('
    UPDATE credits
    SET remaining = 5,
        "limit" = 5,
        last_reset_at = NOW()
    FROM users
    WHERE credits.user_id = users.id
    AND users.plan_id IS NULL
    AND (users.trial_ends_at IS NULL OR users.trial_ends_at <= NOW())
');
```

**Note on PostgreSQL syntax:** The project uses PostgreSQL. The `UPDATE ... FROM` join syntax is PostgreSQL-specific (not MySQL). This is correct for this project. `"limit"` must be quoted because it is a reserved word in PostgreSQL.

### Plan Model Cast Update

The `price_cents` cast in `Plan.php` is currently `'integer'`. After making the column nullable, the cast should remain `'integer'` -- Laravel's integer cast handles null correctly (returns null, not 0). No model change needed.

### Anti-Patterns to Avoid
- **Running seeder in migration via `Artisan::call('db:seed')`:** Couples migration to seeder class, fragile if seeder changes later. Inline the values instead.
- **Chunked Eloquent updates for credit sync:** Unnecessary complexity for what is a simple bulk UPDATE. Raw SQL is faster and atomic.
- **Forgetting to quote `limit` column:** `limit` is a reserved word in PostgreSQL. Always use double-quotes in raw SQL.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema column modification | Manual SQL ALTER | `$table->change()` in migration | Laravel handles dialect differences |
| Bulk credit sync | Eloquent loop per user | Single raw SQL UPDATE with JOIN | Performance (1 query vs N queries) |

## Common Pitfalls

### Pitfall 1: Migration-Seeder Ordering on Deployment
**What goes wrong:** Credit sync migration runs before seeder updates plan values, so credits get synced to OLD values.
**Why it happens:** `php artisan migrate` runs before `php artisan db:seed` in standard deployment.
**How to avoid:** Inline the plan value updates in the migration itself, then also update PlanSeeder for fresh installs.
**Warning signs:** Credit limits don't match expected new values after deployment.

### Pitfall 2: Reserved Word `limit` in PostgreSQL
**What goes wrong:** Raw SQL fails with syntax error because `limit` is a reserved keyword.
**Why it happens:** The credits table has a column named `limit`.
**How to avoid:** Always double-quote `"limit"` in raw SQL queries.
**Warning signs:** Migration fails with PostgreSQL syntax error.

### Pitfall 3: Unsigned Integer Blocking NULL
**What goes wrong:** Seeder fails when trying to set `price_cents = null` on Enterprise plan.
**Why it happens:** Column is `unsignedInteger NOT NULL DEFAULT 0` -- cannot store NULL.
**How to avoid:** Schema migration to make column nullable MUST run before seeder update.
**Warning signs:** SQL constraint violation error on seeder run.

### Pitfall 4: Test Assertions Using Old Values
**What goes wrong:** Tests pass with old credit values (Free=1 or Free=3) and fail after seeder update.
**Why it happens:** Multiple test files assert specific credit limits. Current tests already have a discrepancy (PlanSeederTest asserts Free=3 but seeder has Free=1).
**How to avoid:** Update ALL test files that reference plan credit limits: PlanSeederTest, CreditResolverTest, PlanIndexTest.
**Warning signs:** Pest test failures after migration.

### Pitfall 5: Guest Credit Records Left Stale
**What goes wrong:** Guest credit records (user_id IS NULL, ip_address based) are not synced by the migration.
**Why it happens:** Guests don't have plans -- their limit is hardcoded to GUEST_DAILY_LIMIT.
**How to avoid:** Decide whether to sync guest records (discretion area). If GUEST_DAILY_LIMIT stays at 1, no action needed. Guest credits reset daily via lazyReset anyway.
**Warning signs:** None visible -- guests naturally reset at midnight.

## Code Examples

### Updated Seeder Values (Final State)
```php
// backend/database/seeders/PlanSeeder.php
$plans = [
    [
        'slug' => 'free',
        'name' => 'Free',
        'daily_credit_limit' => 5,
        'price_cents' => 0,
        'is_popular' => false,
        'sort_order' => 1,
        'is_active' => true,
        'features' => [
            '5 searches per day',
            'All threat lookups',
            'Full indicator data',
            'Search history',
            'Priority data access',
            'Dark web monitoring',
        ],
        'description' => 'Get started with essential threat intelligence.',
    ],
    [
        'slug' => 'basic',
        'name' => 'Basic',
        'daily_credit_limit' => 30,
        'price_cents' => 1000,
        'is_popular' => false,
        'sort_order' => 2,
        'is_active' => true,
        'features' => [
            '30 searches per day',
            'All threat lookups',
            'Full indicator data',
            'Search history',
            'Priority data access',
            'Dark web monitoring',
        ],
        'description' => 'For individuals who need regular threat intelligence.',
    ],
    [
        'slug' => 'pro',
        'name' => 'Pro',
        'daily_credit_limit' => 50,
        'price_cents' => 2900,
        'is_popular' => true,
        'sort_order' => 3,
        'is_active' => true,
        'features' => [
            '50 searches per day',
            'All threat lookups',
            'Full indicator data',
            'Search history',
            'Priority data access',
            'Dark web monitoring',
        ],
        'description' => 'For security professionals and analysts.',
    ],
    [
        'slug' => 'enterprise',
        'name' => 'Enterprise',
        'daily_credit_limit' => 200,
        'price_cents' => null,
        'is_popular' => false,
        'sort_order' => 4,
        'is_active' => true,
        'features' => [
            '200 searches per day',
            'All threat lookups',
            'Full indicator data',
            'Search history',
            'Priority data access',
            'Dark web monitoring',
            'API access',
        ],
        'description' => 'For teams and organizations with advanced needs.',
    ],
];
```

### Migration Structure
```php
// backend/database/migrations/2026_04_11_000001_restructure_plans_and_sync_credits.php
return new class extends Migration
{
    public function up(): void
    {
        // Step 1: Make price_cents nullable
        Schema::table('plans', function (Blueprint $table) {
            $table->unsignedInteger('price_cents')->nullable()->default(null)->change();
        });

        // Step 2: Update plan values inline
        DB::table('plans')->where('slug', 'free')->update([
            'daily_credit_limit' => 5,
            'price_cents' => 0,
            'features' => json_encode([...]),
        ]);
        // ... repeat for basic, pro, enterprise

        // Step 3: Sync credit records
        // Users with plans
        DB::statement('UPDATE credits SET remaining = plans.daily_credit_limit, "limit" = plans.daily_credit_limit, last_reset_at = NOW() FROM users JOIN plans ON users.plan_id = plans.id WHERE credits.user_id = users.id');

        // Trial users
        DB::statement('UPDATE credits SET remaining = 10, "limit" = 10, last_reset_at = NOW() FROM users WHERE credits.user_id = users.id AND users.plan_id IS NULL AND users.trial_ends_at > NOW()');

        // Expired trial / no plan users -> Free tier limit
        DB::statement('UPDATE credits SET remaining = 5, "limit" = 5, last_reset_at = NOW() FROM users WHERE credits.user_id = users.id AND users.plan_id IS NULL AND (users.trial_ends_at IS NULL OR users.trial_ends_at <= NOW())');
    }

    public function down(): void
    {
        // Revert price_cents to non-nullable
        DB::table('plans')->where('slug', 'enterprise')->update(['price_cents' => 0]);
        Schema::table('plans', function (Blueprint $table) {
            $table->unsignedInteger('price_cents')->default(0)->change();
        });
        // Note: credit sync is not reversible -- credits were already consumed
    }
};
```

## Existing Test Discrepancy

The current `PlanSeederTest.php` asserts `$free->daily_credit_limit` is `3`, but the actual seeder has `1`. Similarly, `CreditResolverTest.php` asserts expired-trial users get `3` credits (Free tier). This means tests are already out of sync with the seeder. This phase should fix all test assertions to match the new values (Free=5).

**Tests requiring updates:**

| File | What Changes |
|------|-------------|
| `PlanSeederTest.php` | Free limit: 3->5, Basic limit: 15->30, Basic price: 900->1000, Enterprise price_cents assertion (null), feature list assertions |
| `CreditResolverTest.php` | Expired trial limit: 3->5, Basic credit: 15->30, pending downgrade to Free: 3->5 |
| `PlanIndexTest.php` | No value assertions -- should pass as-is |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Pest PHP (on PHPUnit) |
| Config file | `backend/phpunit.xml` |
| Quick run command | `cd backend && php artisan test --filter=Plan` |
| Full suite command | `cd backend && php artisan test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLAN-01 | Seeder creates 4 tiers with correct values | unit | `cd backend && php artisan test --filter=PlanSeederTest` | Yes -- update assertions |
| PLAN-01 | Enterprise price_cents is null | unit | `cd backend && php artisan test --filter=PlanSeederTest` | Yes -- add assertion |
| PLAN-01 | All plans share unified feature list | unit | `cd backend && php artisan test --filter=PlanSeederTest` | Yes -- update feature assertion |
| PLAN-02 | Trial grants 10 credits/day | unit | `cd backend && php artisan test --filter=CreditResolverTest` | Yes -- already passes |
| PLAN-03 | Credit sync migration updates limits | integration | `cd backend && php artisan test --filter=CreditSyncTest` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && php artisan test --filter=Plan`
- **Per wave merge:** `cd backend && php artisan test`
- **Phase gate:** Full suite green before verify

### Wave 0 Gaps
- [ ] `backend/tests/Feature/Plan/CreditSyncMigrationTest.php` -- covers PLAN-03 (migration syncs credit records)
- Update existing `PlanSeederTest.php` assertions to match new values
- Update existing `CreditResolverTest.php` assertions to match new Free tier limit (5)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `doctrine/dbal` for column changes | Native `->change()` in Laravel 11+ | Laravel 11 (2024) | No extra package needed for schema modifications |

## Open Questions

1. **GUEST_DAILY_LIMIT update**
   - What we know: Currently set to 1. Requirements don't mention guests. Free tier moving to 5.
   - What's unclear: Should guests also get 5 credits/day to match Free tier?
   - Recommendation: Leave at 1 (Claude's discretion area). Guests are unauthenticated -- lower limit encourages signup. Can be changed later if needed.

2. **Migration date prefix**
   - What we know: Existing migrations use `2026_03_21_*` prefix.
   - What's unclear: Exact date to use for new migration filename.
   - Recommendation: Use current date `2026_04_11_000001` for the migration.

## Sources

### Primary (HIGH confidence)
- Direct code inspection of `PlanSeeder.php`, `CreditResolver.php`, `Plan.php`, `Credit.php`
- Direct code inspection of `create_plans_table` migration schema
- Direct code inspection of all 3 test files
- `phpunit.xml` configuration for test framework setup

### Secondary (MEDIUM confidence)
- Laravel 11/12 native `->change()` support (verified via framework version 12.54.1)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all existing code inspected
- Architecture: HIGH - migration + seeder pattern is well-established Laravel practice, PostgreSQL syntax verified against schema
- Pitfalls: HIGH - identified from direct code inspection (reserved word, nullable column, test discrepancy)

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable -- no external dependencies)
