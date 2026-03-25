# Phase 22: Schema & Data Foundation - Research

**Researched:** 2026-03-21
**Domain:** Laravel migrations, seeders, Eloquent models, PostgreSQL schema design
**Confidence:** HIGH

## Summary

Phase 22 is a backend-only, schema-additive phase. It creates the `plans` table with 4 seeded tiers, adds new nullable columns to the `users` table (`plan_id`, `timezone`, `organization`, `role`), resets all existing users to a fresh 30-day trial, pre-creates credit rows for users who lack them, and fixes the `UserResource` onboarding heuristic to use `onboarding_completed_at` instead of a fragile name/phone check.

The existing codebase uses Laravel 12.54.1 with PostgreSQL (production on Railway, SQLite in-memory for tests). There are 30+ Pest feature tests using `RefreshDatabase`. All migrations must be additive-only -- no column drops, no renames, no breaking changes. The `User` model already has `trial_ends_at`, `phone`, and `onboarding_completed_at` columns. Credits table exists with `user_id` FK, `remaining`, `limit`, and `last_reset_at`.

**Primary recommendation:** Create 3 migrations (plans table, user columns, data migration for trial reset + credit pre-creation), 1 seeder (PlanSeeder), 1 new model (Plan), and update User model + UserResource. All schema changes are nullable additions. Data migration uses raw SQL for bulk updates.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Plans table: auto-increment ID PK, columns: slug (unique), name, daily_credit_limit (integer), price_cents (integer), features (JSON array), description (text), is_popular (boolean), sort_order (integer), is_active (boolean default true)
- No billing_interval column -- deferred to payment gateway phase
- Enterprise "Contact Us" handled in frontend by checking slug === 'enterprise'
- Features stored as JSON array
- Trial reset: standard Laravel migration with raw SQL UPDATE, reset ALL existing users to trial_ends_at = NOW() + 30 days
- Pre-create credit rows (limit: 10, remaining: 10) for existing users without one
- Credit limit stays at 10 (trial default); Phase 23 CreditResolver derives from plan
- New user columns: plan_id (nullable unsigned bigint FK), timezone (nullable VARCHAR(100) IANA), organization (nullable VARCHAR(255)), role (nullable VARCHAR(255))
- All columns nullable in DB -- required/optional at application layer
- Existing onboarded users NOT forced back to onboarding
- 4 seeded tiers: Free ($0, 3/day), Basic ($9/mo, 15/day), Pro ($29/mo, 50/day), Enterprise (custom, 200/day)
- Seeder uses updateOrCreate on slug -- idempotent
- PlanSeeder registered in DatabaseSeeder
- UserResource: replace heuristic with `onboarding_completed_at !== null`

### Claude's Discretion
- Exact feature list wording per plan tier
- Plan description text
- Migration ordering within the batch
- sort_order values for the 4 plans

### Deferred Ideas (OUT OF SCOPE)
- billing_interval column on plans table -- add when payment gateway is implemented (v4.0+)
- Payment processing (Stripe/LemonSqueezy/Paddle) -- v4.0+
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PLAN-01 | Plans table exists with 4 tiers: Free (3/day), Basic (15/day), Pro (50/day), Enterprise (200/day) | Plans table migration + PlanSeeder with updateOrCreate on slug |
| PLAN-02 | User model has plan_id FK; null means no plan selected (trial or expired-trial/Free) | User columns migration adds nullable plan_id FK to plans table |
| TRIAL-04 | Existing users receive a fresh 30-day trial via data migration on v3.0 deploy | Data migration with raw SQL UPDATE on users.trial_ends_at |
| ONBD-06 | Onboarding completion check uses onboarding_completed_at timestamp instead of fragile name/phone heuristic | UserResource fix: `$this->onboarding_completed_at !== null` |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Laravel Framework | 12.54.1 | Backend framework (migrations, Eloquent, seeders) | Already in use, verified via `php artisan --version` |
| Pest | (installed) | Test framework | Already in use, 30+ feature tests exist |
| PostgreSQL | (Railway) | Production database | Already deployed; SQLite for tests |

### Supporting
No new dependencies needed. Phase 22 uses only built-in Laravel features: Schema builder, Eloquent, DB facade, seeders.

## Architecture Patterns

### Migration Structure
```
backend/database/migrations/
  2026_03_21_000001_create_plans_table.php          # Plans table (must run BEFORE user FK)
  2026_03_21_000002_add_plan_columns_to_users.php   # plan_id FK + timezone/org/role
  2026_03_21_000003_reset_trials_and_precreate_credits.php  # Data migration
```

### Pattern 1: Schema Migration (additive columns)
**What:** Add nullable columns to existing table without breaking anything
**When to use:** Extending users table with plan_id, timezone, organization, role
**Example:**
```php
// Standard Laravel pattern for additive columns
Schema::table('users', function (Blueprint $table) {
    $table->foreignId('plan_id')->nullable()->constrained('plans')->nullOnDelete();
    $table->string('timezone', 100)->nullable();
    $table->string('organization', 255)->nullable();
    $table->string('role', 255)->nullable();
});
```
**Critical:** Use `nullOnDelete()` on plan_id FK so deleting a plan sets user's plan_id to null rather than cascading delete.

### Pattern 2: Data Migration (raw SQL for bulk operations)
**What:** Migration that modifies data rather than schema
**When to use:** Trial reset and credit pre-creation for all existing users
**Example:**
```php
// In up() method -- raw SQL for performance on bulk update
use Illuminate\Support\Facades\DB;

// Reset all users to 30-day trial
DB::statement("UPDATE users SET trial_ends_at = NOW() + INTERVAL '30 days'");

// Pre-create credit rows for users who don't have one
DB::statement("
    INSERT INTO credits (user_id, ip_address, remaining, \"limit\", last_reset_at, created_at, updated_at)
    SELECT u.id, NULL, 10, 10, NOW(), NOW(), NOW()
    FROM users u
    LEFT JOIN credits c ON c.user_id = u.id
    WHERE c.id IS NULL
");
```
**Critical:** The `limit` column name is a PostgreSQL reserved word -- must be quoted with double quotes in raw SQL. In Schema builder, Laravel handles this automatically. Also note: SQLite uses different interval syntax, so the data migration needs cross-DB compatible approach (see Pitfalls).

### Pattern 3: Idempotent Seeder
**What:** Seeder that can run multiple times without creating duplicates
**When to use:** PlanSeeder with updateOrCreate on slug
**Example:**
```php
// PlanSeeder.php
$plans = [
    ['slug' => 'free', 'name' => 'Free', 'daily_credit_limit' => 3, ...],
    // ...
];
foreach ($plans as $plan) {
    Plan::updateOrCreate(['slug' => $plan['slug']], $plan);
}
```

### Pattern 4: Eloquent Model with JSON Cast
**What:** Plan model with JSON features column
**When to use:** Plan.features stores array of feature strings
**Example:**
```php
// Plan model
protected function casts(): array
{
    return [
        'features' => 'array',
        'is_popular' => 'boolean',
        'is_active' => 'boolean',
    ];
}
```

### Anti-Patterns to Avoid
- **DB enum for role column:** Context says VARCHAR with application-level validation. DB enums require migrations to add new values.
- **Eloquent loops in data migration:** Never loop `User::all()` to update individually -- use raw SQL for bulk operations.
- **Non-nullable new columns:** All new columns MUST be nullable. Adding a non-nullable column to a table with existing data fails without a default value and breaks additive-only constraint.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Idempotent seeding | Custom duplicate-check logic | `Model::updateOrCreate()` | Built-in, handles race conditions |
| Foreign key with null-on-delete | Manual cleanup listeners | `$table->nullOnDelete()` | Database-level integrity |
| JSON column handling | Manual json_encode/decode | Eloquent `'array'` cast | Automatic serialization/deserialization |
| Bulk data updates | Eloquent collection loops | Raw SQL via `DB::statement()` | Performance: single query vs N queries |

## Common Pitfalls

### Pitfall 1: SQLite vs PostgreSQL Syntax in Data Migration
**What goes wrong:** Data migration uses PostgreSQL-specific syntax (`INTERVAL '30 days'`) that fails in SQLite test environment.
**Why it happens:** Tests use `DB_CONNECTION=sqlite` with `:memory:` database (confirmed in phpunit.xml).
**How to avoid:** Use Laravel's `DB::getDriverName()` to branch SQL, or use Carbon-based approach:
```php
$trialEnd = now()->addDays(30)->toDateTimeString();
DB::table('users')->update(['trial_ends_at' => $trialEnd]);
```
This is cross-database compatible. For the credit INSERT, use Laravel's query builder:
```php
$usersWithoutCredits = DB::table('users')
    ->leftJoin('credits', 'users.id', '=', 'credits.user_id')
    ->whereNull('credits.id')
    ->pluck('users.id');

$now = now()->toDateTimeString();
$rows = $usersWithoutCredits->map(fn ($id) => [
    'user_id' => $id,
    'ip_address' => null,
    'remaining' => 10,
    'limit' => 10,
    'last_reset_at' => $now,
    'created_at' => $now,
    'updated_at' => $now,
])->all();

if (!empty($rows)) {
    DB::table('credits')->insert($rows);
}
```
**Warning signs:** Tests fail with "SQL syntax error" or "INTERVAL not recognized".

### Pitfall 2: `limit` is a Reserved Word
**What goes wrong:** Raw SQL queries referencing the `limit` column fail because `LIMIT` is a SQL reserved keyword.
**Why it happens:** The credits table already uses `limit` as a column name.
**How to avoid:** Always quote the column in raw SQL: `"limit"` (PostgreSQL) or `` `limit` `` (MySQL). Laravel's query builder handles this automatically. Prefer query builder over raw SQL when touching the credits table.

### Pitfall 3: Migration Order Matters for Foreign Keys
**What goes wrong:** Adding `plan_id` FK to users before the `plans` table exists causes migration failure.
**Why it happens:** `constrained('plans')` references a table that doesn't exist yet.
**How to avoid:** Ensure `create_plans_table` migration runs before `add_plan_columns_to_users`. Use timestamp-based ordering: plans table gets `000001`, user columns get `000002`.

### Pitfall 4: Seeder Not Registered in DatabaseSeeder
**What goes wrong:** `php artisan migrate --seed` or `php artisan db:seed` doesn't run PlanSeeder.
**Why it happens:** Forgot to call `$this->call(PlanSeeder::class)` in DatabaseSeeder.
**How to avoid:** Add call in DatabaseSeeder. Existing DatabaseSeeder creates a test user -- PlanSeeder should run before it if any user needs a plan reference.

### Pitfall 5: UserResource Test Assertion Breakage
**What goes wrong:** Onboarding tests assert `onboarding_completed` is true. Changing the heuristic could break this.
**Why it happens:** The OnboardingTest at line 25 asserts `assertJsonPath('data.onboarding_completed', true)`.
**How to avoid:** The onboarding controller already sets `onboarding_completed_at` to `now()` when onboarding is submitted (confirmed by test passing). So switching the heuristic to `onboarding_completed_at !== null` will still return `true` after onboarding. The existing test should pass without modification. Verify by running `php artisan test --filter=OnboardingTest`.

### Pitfall 6: Data Migration Rollback
**What goes wrong:** The `down()` method for the trial-reset data migration cannot restore original `trial_ends_at` values.
**Why it happens:** Bulk UPDATE overwrites original values with no backup.
**How to avoid:** Accept this is a one-way data migration. The `down()` method should either be a no-op (with a comment explaining why) or throw an exception to prevent accidental rollback. The schema migrations (plans table, user columns) CAN be rolled back normally.

## Code Examples

### Plan Model (new file)
```php
// backend/app/Models/Plan.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    protected $fillable = [
        'slug',
        'name',
        'daily_credit_limit',
        'price_cents',
        'features',
        'description',
        'is_popular',
        'sort_order',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'features' => 'array',
            'is_popular' => 'boolean',
            'is_active' => 'boolean',
            'daily_credit_limit' => 'integer',
            'price_cents' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
```

### User Model Updates
```php
// Add to $fillable:
'plan_id', 'timezone', 'organization', 'role',

// Add to casts():
// (no new casts needed -- plan_id is integer by convention, strings don't need casts)

// Add relationship:
public function plan(): BelongsTo
{
    return $this->belongsTo(Plan::class);
}

// Add import:
use Illuminate\Database\Eloquent\Relations\BelongsTo;
```

### UserResource Fix
```php
// Replace line 24 in UserResource.php:
// OLD: 'onboarding_completed' => $this->name !== explode('@', $this->email)[0] && $this->phone !== null,
// NEW:
'onboarding_completed' => $this->onboarding_completed_at !== null,
```

### PlanSeeder Data
```php
// Tier data (Claude's discretion on exact wording)
$plans = [
    [
        'slug' => 'free',
        'name' => 'Free',
        'daily_credit_limit' => 3,
        'price_cents' => 0,
        'features' => ['3 searches per day', 'Basic threat lookups', 'Community data access'],
        'description' => 'Get started with essential threat intelligence.',
        'is_popular' => false,
        'sort_order' => 1,
        'is_active' => true,
    ],
    [
        'slug' => 'basic',
        'name' => 'Basic',
        'daily_credit_limit' => 15,
        'price_cents' => 900,
        'features' => ['15 searches per day', 'All threat lookups', 'Full indicator data', 'Search history'],
        'description' => 'For individuals who need regular threat intelligence.',
        'is_popular' => false,
        'sort_order' => 2,
        'is_active' => true,
    ],
    [
        'slug' => 'pro',
        'name' => 'Pro',
        'daily_credit_limit' => 50,
        'price_cents' => 2900,
        'features' => ['50 searches per day', 'All threat lookups', 'Full indicator data', 'Search history', 'Priority data access', 'Dark web monitoring'],
        'description' => 'For security professionals and analysts.',
        'is_popular' => true,
        'sort_order' => 3,
        'is_active' => true,
    ],
    [
        'slug' => 'enterprise',
        'name' => 'Enterprise',
        'daily_credit_limit' => 200,
        'price_cents' => 0, // Custom pricing
        'features' => ['200 searches per day', 'All threat lookups', 'Full indicator data', 'Search history', 'Priority data access', 'Dark web monitoring', 'Dedicated support', 'Custom integrations'],
        'description' => 'For teams and organizations with advanced needs.',
        'is_popular' => false,
        'sort_order' => 4,
        'is_active' => true,
    ],
];
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| DB enum for role | VARCHAR + app validation | Laravel best practice | No migration needed for new role values |
| Decimal for price | Integer cents (price_cents) | Industry standard | Avoids floating point rounding issues |
| Feature columns (boolean per feature) | JSON array | Common SaaS pattern | Flexible, no migration per new feature |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Pest (on PHPUnit, Laravel 12) |
| Config file | `backend/phpunit.xml` |
| Quick run command | `cd backend && php artisan test --filter={TestClass}` |
| Full suite command | `cd backend && php artisan test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLAN-01 | Plans table seeded with 4 tiers | unit | `php artisan test --filter=PlanSeederTest` | No -- Wave 0 |
| PLAN-02 | User has nullable plan_id FK | feature | `php artisan test --filter=UserPlanRelationshipTest` | No -- Wave 0 |
| TRIAL-04 | Existing users get fresh 30-day trial | feature | `php artisan test --filter=TrialResetMigrationTest` | No -- Wave 0 |
| ONBD-06 | UserResource uses onboarding_completed_at | feature | `php artisan test --filter=OnboardingTest` | Yes (existing -- should pass after fix) |

### Sampling Rate
- **Per task commit:** `cd backend && php artisan test --filter={relevant test}`
- **Per wave merge:** `cd backend && php artisan test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/Feature/Plan/PlanSeederTest.php` -- verifies 4 plans seeded with correct data (PLAN-01)
- [ ] `tests/Feature/Plan/UserPlanRelationshipTest.php` -- verifies plan_id FK, belongsTo, nullable (PLAN-02)
- [ ] `tests/Feature/Auth/TrialResetTest.php` -- verifies trial_ends_at is reset for existing users (TRIAL-04)
- [ ] Existing `tests/Feature/Auth/OnboardingTest.php` covers ONBD-06 (verify it still passes)

## Open Questions

1. **Enterprise price_cents value**
   - What we know: Enterprise is "custom pricing" with a "Contact Us" CTA
   - What's unclear: Should price_cents be 0, null, or a sentinel value?
   - Recommendation: Use 0 (simplest). Frontend checks `slug === 'enterprise'` for the CTA, not the price. This is consistent with CONTEXT.md decisions.

2. **Data migration testing in SQLite**
   - What we know: Tests use SQLite in-memory. Data migrations with INSERT...SELECT may behave differently.
   - What's unclear: Whether the credit pre-creation query works identically in SQLite
   - Recommendation: Use Laravel query builder (not raw SQL) for cross-DB compatibility. Verified approach in Pitfall 1 section.

## Sources

### Primary (HIGH confidence)
- `backend/app/Models/User.php` -- current model structure, fillable, casts, relationships
- `backend/app/Http/Resources/UserResource.php` -- current onboarding heuristic (line 24)
- `backend/database/migrations/*` -- all 10 existing migrations reviewed
- `backend/phpunit.xml` -- test configuration (SQLite in-memory)
- `backend/tests/Feature/Auth/OnboardingTest.php` -- confirms onboarding_completed_at already set by controller
- `backend/tests/Feature/Credit/AuthCreditLimitTest.php` -- confirms credit limit=10 hardcoded assumption
- `backend/app/Http/Middleware/DeductCredit.php` -- current resolveCredit with hardcoded 10
- `php artisan --version` -- Laravel 12.54.1 confirmed
- `.planning/phases/22-schema-data-foundation/22-CONTEXT.md` -- all locked decisions

### Secondary (MEDIUM confidence)
- Laravel documentation patterns for migrations, seeders, JSON casts -- based on framework conventions confirmed in existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all existing Laravel features
- Architecture: HIGH -- patterns directly observed in existing codebase migrations/models
- Pitfalls: HIGH -- SQLite/PostgreSQL divergence confirmed from phpunit.xml; reserved word issue confirmed from existing credits schema

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable -- Laravel schema APIs rarely change)
