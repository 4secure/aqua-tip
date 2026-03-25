# Phase 23: CreditResolver & Plan-Aware Backend - Research

**Researched:** 2026-03-21
**Domain:** Laravel 12 service extraction, plan-aware credit system, REST API endpoints
**Confidence:** HIGH

## Summary

Phase 23 extracts duplicated credit resolution logic from `DeductCredit` middleware and `CreditStatusController` into a shared `CreditResolver` service, makes credit limits plan-aware (derived from user's plan rather than hardcoded), enforces trial expiry with auto-downgrade to Free tier, adds plan selection/listing APIs, and expands `UserResource` with plan/trial/pending fields.

The codebase is Laravel 12.54.1 with Pest testing (111+ tests), PostgreSQL, and an established service pattern in `app/Services/`. The existing credit system uses a lazy midnight-UTC reset with race-safe atomic updates. Both `DeductCredit::resolveCredit()`/`lazyReset()` and `CreditStatusController::resolveCredit()`/`lazyReset()` are nearly identical -- extraction is straightforward copy-to-service with plan-awareness added.

**Primary recommendation:** Extract CreditResolver as a plain service class (no interface needed), inject via constructor in both consumers, add plan-aware limit resolution in the lazy reset path, then build the plan selection and listing endpoints as separate invokable controllers.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Single Service class at `App\Services\CreditResolver` -- not a trait or model method
- Both `DeductCredit` middleware and `CreditStatusController` call CreditResolver instead of duplicating methods
- Limit resolution priority: plan-first, trial fallback (plan -> trial 10/day -> auto-assign Free)
- Guest credit limit stays at 1/day (PLAN-07)
- Lazy reset syncs credit limit from plan on new day
- No hardcoded credit limits outside CreditResolver
- Trial expiry auto-assigns Free plan (sets plan_id in DB)
- Trial expiry check happens only during lazy credit reset (not on profile load)
- Immediate downgrade on trial expiry -- no grace period
- CreditResolver handles pending downgrade application (plan_change_at <= today)
- POST /api/plan -- authenticated, upgrades only via self-service
- Upgrade mid-day: add difference to remaining credits
- Downgrades stored as pending: pending_plan_id + plan_change_at = now + 30 days
- POST /api/plan returns 422 for immediate lower-tier selection
- Enterprise blocked from self-service (422 with "Contact us")
- Selectable plans: Free, Basic, Pro only
- Upgrading auto-cancels any pending downgrade
- New migration: pending_plan_id (nullable FK) and plan_change_at (nullable datetime) on users
- GET /api/plans -- public endpoint, no auth, returns active plans by sort_order
- UserResource: nested plan object, trial_active, trial_days_left, pending_plan, plan_change_at, timezone, organization, role

### Claude's Discretion
- CreditResolver internal method naming and structure
- Plan listing controller structure (invokable or resource)
- Validation error message wording
- Test organization and grouping
- Whether to use Form Request classes or inline validation for plan selection

### Deferred Ideas (OUT OF SCOPE)
- Actual payment processing (Stripe/LemonSqueezy/Paddle) -- v4.0+
- Proration on mid-cycle plan changes -- requires billing system
- billing_interval column on plans table -- add when payment gateway is implemented
- Email notifications for trial expiry -- future milestone (NOTIF-01, NOTIF-02)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PLAN-03 | Credit limits derived from user's plan via shared CreditResolver service | CreditResolver extraction pattern with plan-aware resolveLimit() |
| PLAN-04 | Duplicated credit resolution logic extracted into CreditResolver | Direct method extraction from DeductCredit + CreditStatusController |
| PLAN-05 | User can select plan via POST /api/plan | PlanSelectionController with tier ordering validation |
| PLAN-06 | Plan change syncs credit limit and remaining balance | Upgrade adds difference; downgrade is pending via pending_plan_id |
| PLAN-07 | Guest credit limit stays at 1/day | CreditResolver guest path unchanged |
| PLAN-08 | GET /api/plans returns all active plans (public) | PlanIndexController querying active plans by sort_order |
| TRIAL-01 | New users start with 30-day trial at 10 credits/day | CreditResolver trial path: no plan + trial active = 10/day |
| TRIAL-02 | Trial expiry drops credit limit to Free tier (3/day) | CreditResolver auto-assigns Free plan on expired trial |
| TRIAL-03 | Trial expiry check during lazy credit reset | Integrated into CreditResolver lazyReset method |
| ONBD-05 | UserResource returns timezone, organization, role | UserResource expansion with new fields from User model |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Laravel | 12.54.1 | Application framework | Already in use, provides service container, middleware, Eloquent |
| Pest | (existing) | Testing framework | Already configured with 111+ tests, Pest syntax throughout |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Laravel Sanctum | (existing) | API authentication | Already in use for auth:sanctum middleware |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Service class | Trait on Model | Service is testable via DI, trait couples to model -- service is correct |
| Form Request | Inline validation | Form Request is cleaner for plan selection, but inline is fine for 2 fields |

**Installation:**
```bash
# No new packages needed -- zero new dependencies per v3.0 decision
```

## Architecture Patterns

### Recommended Project Structure
```
backend/app/
├── Services/
│   └── CreditResolver.php          # NEW: extracted credit logic
├── Http/
│   ├── Middleware/
│   │   └── DeductCredit.php         # MODIFIED: delegates to CreditResolver
│   ├── Controllers/
│   │   ├── Credit/
│   │   │   └── CreditStatusController.php  # MODIFIED: delegates to CreditResolver
│   │   └── Plan/
│   │       ├── PlanIndexController.php     # NEW: GET /api/plans
│   │       └── PlanSelectionController.php # NEW: POST /api/plan
│   └── Resources/
│       └── UserResource.php         # MODIFIED: expanded fields
├── Models/
│   └── User.php                     # MODIFIED: pendingPlan relationship, fillable
└── database/
    └── migrations/
        └── 2026_03_21_000003_add_pending_plan_columns_to_users.php  # NEW
```

### Pattern 1: Service Extraction via Constructor Injection
**What:** CreditResolver is a plain class registered in the service container (auto-resolved by Laravel). Both DeductCredit and CreditStatusController receive it via constructor injection.
**When to use:** When multiple consumers share identical logic.
**Example:**
```php
// app/Services/CreditResolver.php
class CreditResolver
{
    public function resolve(Request $request): Credit { ... }
    public function lazyReset(Credit $credit, ?User $user): void { ... }
    public function resolveLimit(?User $user): int { ... }
}

// In DeductCredit middleware
public function __construct(private CreditResolver $creditResolver) {}

public function handle(Request $request, Closure $next): Response
{
    $credit = $this->creditResolver->resolve($request);
    $this->creditResolver->lazyReset($credit, $request->user());
    // ... atomic deduct unchanged
}
```

### Pattern 2: Invokable Controllers for Single-Action Endpoints
**What:** Each API endpoint gets its own controller with a single `__invoke` method.
**When to use:** Standard pattern in this codebase -- all existing controllers follow this pattern.
**Example:**
```php
// PlanIndexController -- public, no auth
class PlanIndexController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $plans = Plan::where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'slug', 'name', 'daily_credit_limit', 'price_cents', 'features', 'description', 'is_popular']);

        return response()->json($plans);
    }
}
```

### Pattern 3: Plan Tier Ordering for Upgrade/Downgrade Detection
**What:** Use `sort_order` column already on plans table to determine tier direction. Higher sort_order = higher tier. Upgrade = new sort_order > current sort_order.
**When to use:** POST /api/plan validation.
**Example:**
```php
$currentPlan = $user->plan;
$newPlan = Plan::where('slug', $validated['plan'])->firstOrFail();

if ($newPlan->sort_order <= $currentPlan->sort_order) {
    // Downgrade: store as pending
    $user->update([
        'pending_plan_id' => $newPlan->id,
        'plan_change_at' => now()->addDays(30),
    ]);
} else {
    // Upgrade: apply immediately, cancel pending
    $difference = $newPlan->daily_credit_limit - $currentPlan->daily_credit_limit;
    $user->update([
        'plan_id' => $newPlan->id,
        'pending_plan_id' => null,
        'plan_change_at' => null,
    ]);
    // Add credit difference
    $credit = $user->credit;
    if ($credit) {
        $credit->update([
            'remaining' => min($credit->remaining + $difference, $newPlan->daily_credit_limit),
            'limit' => $newPlan->daily_credit_limit,
        ]);
    }
}
```

### Pattern 4: Pending Downgrade Application in Lazy Reset
**What:** During lazy reset, before resetting credits, check if `plan_change_at <= today`. If so, apply the pending plan and clear pending fields. Then use the (potentially new) plan's limit for the reset.
**When to use:** CreditResolver lazyReset method.
**Example:**
```php
private function applyPendingDowngrade(User $user): void
{
    if ($user->pending_plan_id !== null
        && $user->plan_change_at !== null
        && $user->plan_change_at->startOfDay() <= now('UTC')->startOfDay()
    ) {
        $user->update([
            'plan_id' => $user->pending_plan_id,
            'pending_plan_id' => null,
            'plan_change_at' => null,
        ]);
        $user->refresh();
    }
}
```

### Anti-Patterns to Avoid
- **Hardcoding credit limits:** Never use magic numbers (3, 10, 15, 50, 200) outside CreditResolver. Always derive from plan or trial constant.
- **Checking trial expiry on profile load:** Trial enforcement only happens during credit reset to avoid unnecessary DB writes on every /api/user call.
- **Mutating credit record without atomic guard:** The `UPDATE WHERE remaining > 0` pattern in DeductCredit must be preserved -- CreditResolver handles resolution/reset, not deduction.
- **Using CreditResolver for the atomic deduction:** The deduction itself stays in DeductCredit middleware (raw DB query for atomicity). CreditResolver only handles resolve + lazyReset + limit derivation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Service container binding | Manual singleton/factory | Laravel auto-resolution | CreditResolver has no interface, auto-resolves via constructor injection |
| Date comparison | Manual string comparison | Carbon methods (startOfDay, lte) | Already used throughout codebase, handles timezone correctly |
| JSON resource transformation | Manual array building | Laravel JsonResource (UserResource) | Handles nested relations, conditional fields via `$this->when()` |
| Tier ordering logic | Hardcoded tier map | `sort_order` column on plans table | Already seeded, single source of truth |

## Common Pitfalls

### Pitfall 1: Race Condition on Credit Reset + Plan Change
**What goes wrong:** User changes plan while lazy reset fires concurrently, resulting in stale limit.
**Why it happens:** Two requests hit simultaneously -- one changing plan, one triggering lazy reset.
**How to avoid:** The lazy reset reads the user's plan relationship fresh (eager load with `$user->load('plan')`), and the plan change endpoint updates both user.plan_id and credit.limit atomically.
**Warning signs:** Credit limit doesn't match plan after upgrade.

### Pitfall 2: Null Plan During Trial
**What goes wrong:** Code assumes `$user->plan` always exists, causing null pointer on `$user->plan->daily_credit_limit`.
**Why it happens:** During trial, `plan_id` is null. Free plan is only assigned on trial expiry.
**How to avoid:** CreditResolver must handle the null case: `$user->plan?->daily_credit_limit ?? $this->trialLimit()`.
**Warning signs:** Error 500 on credit check for trial users.

### Pitfall 3: Existing Tests Hardcode 10-Credit Limit
**What goes wrong:** Existing tests (AuthCreditLimitTest) assert exactly 10 credits for authenticated users. After CreditResolver, trial users still get 10, but test setup may need PlanSeeder.
**Why it happens:** Tests use `User::factory()->create()` which creates a user with no plan (trial state). CreditResolver will resolve 10/day for trial users, so tests should still pass. But if CreditResolver reads from plans table for Free-tier fallback, the seeder must run.
**How to avoid:** Ensure PlanSeeder runs in test setup (or at minimum, the Free plan exists). Verify existing tests pass after extraction before adding new ones.
**Warning signs:** Test failures with "Plan not found" or wrong credit limits.

### Pitfall 4: Downgrade Mid-Day Credit Capping
**What goes wrong:** User on Pro (50/day) with 45 remaining selects Free. If pending downgrade applies on reset, remaining should be capped to Free limit (3), not left at 45.
**Why it happens:** Lazy reset sets remaining = new limit, which handles this naturally. But if the downgrade applies mid-day (via admin or edge case), remaining must be capped.
**How to avoid:** When applying pending downgrade in lazyReset, reset remaining to new plan's limit (since it's a new day anyway). The lazy reset already does `remaining = limit`.
**Warning signs:** User on Free tier with 45 remaining credits.

### Pitfall 5: Enterprise Plan Self-Service Selection
**What goes wrong:** User selects Enterprise plan via API.
**Why it happens:** Missing validation on plan slug.
**How to avoid:** Validate `$newPlan->slug !== 'enterprise'` in PlanSelectionController. Return 422 with "Contact us" message.
**Warning signs:** Users on Enterprise tier without going through sales.

## Code Examples

### CreditResolver Service Structure
```php
// app/Services/CreditResolver.php
namespace App\Services;

use App\Models\Credit;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;

class CreditResolver
{
    private const TRIAL_DAILY_LIMIT = 10;
    private const GUEST_DAILY_LIMIT = 1;

    public function resolve(Request $request): Credit
    {
        $user = $request->user();

        try {
            if ($user !== null) {
                $limit = $this->resolveLimit($user);
                return Credit::firstOrCreate(
                    ['user_id' => $user->id],
                    [
                        'ip_address' => null,
                        'remaining' => $limit,
                        'limit' => $limit,
                        'last_reset_at' => now('UTC')->startOfDay(),
                    ]
                );
            }

            return Credit::firstOrCreate(
                ['ip_address' => $request->ip(), 'user_id' => null],
                [
                    'remaining' => self::GUEST_DAILY_LIMIT,
                    'limit' => self::GUEST_DAILY_LIMIT,
                    'last_reset_at' => now('UTC')->startOfDay(),
                ]
            );
        } catch (QueryException) {
            if ($user !== null) {
                return Credit::where('user_id', $user->id)->firstOrFail();
            }
            return Credit::where('ip_address', $request->ip())
                ->whereNull('user_id')
                ->firstOrFail();
        }
    }

    public function lazyReset(Credit $credit, ?User $user): void
    {
        $todayStart = now('UTC')->startOfDay();

        if ($credit->last_reset_at >= $todayStart) {
            return;
        }

        // Apply pending downgrade if due
        if ($user !== null) {
            $this->applyPendingDowngrade($user);
            $this->checkTrialExpiry($user);
        }

        $limit = $user !== null ? $this->resolveLimit($user) : self::GUEST_DAILY_LIMIT;

        $credit->update([
            'remaining' => $limit,
            'limit' => $limit,
            'last_reset_at' => $todayStart,
        ]);
    }

    public function resolveLimit(?User $user): int
    {
        if ($user === null) {
            return self::GUEST_DAILY_LIMIT;
        }

        // User has a plan -> use plan limit
        if ($user->plan_id !== null) {
            $user->loadMissing('plan');
            return $user->plan->daily_credit_limit;
        }

        // No plan + trial active -> trial limit
        if ($user->trial_ends_at !== null && $user->trial_ends_at->isFuture()) {
            return self::TRIAL_DAILY_LIMIT;
        }

        // No plan + trial expired -> should not reach here (checkTrialExpiry assigns Free)
        // Fallback: return Free tier limit
        return Plan::where('slug', 'free')->value('daily_credit_limit') ?? 3;
    }

    private function applyPendingDowngrade(User $user): void
    {
        if ($user->pending_plan_id !== null
            && $user->plan_change_at !== null
            && $user->plan_change_at->startOfDay()->lte(now('UTC')->startOfDay())
        ) {
            $user->update([
                'plan_id' => $user->pending_plan_id,
                'pending_plan_id' => null,
                'plan_change_at' => null,
            ]);
            $user->unsetRelation('plan');
        }
    }

    private function checkTrialExpiry(User $user): void
    {
        if ($user->plan_id === null
            && $user->trial_ends_at !== null
            && $user->trial_ends_at->isPast()
        ) {
            $freePlan = Plan::where('slug', 'free')->first();
            if ($freePlan) {
                $user->update(['plan_id' => $freePlan->id]);
                $user->unsetRelation('plan');
            }
        }
    }
}
```

### UserResource Expansion
```php
// app/Http/Resources/UserResource.php
public function toArray(Request $request): array
{
    return [
        'id' => $this->id,
        'name' => $this->name,
        'email' => $this->email,
        'avatar_url' => $this->avatar_url,
        'phone' => $this->phone,
        'email_verified' => $this->email_verified_at !== null,
        'onboarding_completed' => $this->onboarding_completed_at !== null,
        'timezone' => $this->timezone,
        'organization' => $this->organization,
        'role' => $this->role,
        'plan' => $this->when($this->relationLoaded('plan') && $this->plan !== null, function () {
            return [
                'id' => $this->plan->id,
                'slug' => $this->plan->slug,
                'name' => $this->plan->name,
                'daily_credit_limit' => $this->plan->daily_credit_limit,
                'features' => $this->plan->features,
            ];
        }),
        'trial_active' => $this->trial_ends_at !== null
            && $this->trial_ends_at->isFuture()
            && $this->plan_id === null,
        'trial_days_left' => $this->trial_ends_at !== null
            ? max(0, (int) now()->diffInDays($this->trial_ends_at, false))
            : 0,
        'pending_plan' => $this->when(
            $this->relationLoaded('pendingPlan') && $this->pendingPlan !== null,
            function () {
                return [
                    'id' => $this->pendingPlan->id,
                    'slug' => $this->pendingPlan->slug,
                    'name' => $this->pendingPlan->name,
                    'daily_credit_limit' => $this->pendingPlan->daily_credit_limit,
                ];
            }
        ),
        'plan_change_at' => $this->plan_change_at?->toIso8601String(),
    ];
}
```

### Migration for Pending Plan Columns
```php
// database/migrations/2026_03_21_000003_add_pending_plan_columns_to_users.php
Schema::table('users', function (Blueprint $table) {
    $table->foreignId('pending_plan_id')
        ->nullable()
        ->after('plan_id')
        ->constrained('plans')
        ->nullOnDelete();
    $table->timestamp('plan_change_at')
        ->nullable()
        ->after('pending_plan_id');
});
```

### Plan Selection Controller
```php
// POST /api/plan
class PlanSelectionController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plan' => 'required|string|in:free,basic,pro',
        ]);

        $user = $request->user();
        $newPlan = Plan::where('slug', $validated['plan'])->firstOrFail();

        // No change needed
        if ($user->plan_id === $newPlan->id) {
            return response()->json(['message' => 'Already on this plan'], 200);
        }

        $currentSortOrder = $user->plan?->sort_order ?? 0;

        if ($newPlan->sort_order > $currentSortOrder) {
            // Upgrade: apply immediately
            $oldLimit = $user->plan?->daily_credit_limit ?? 10; // trial default
            $difference = $newPlan->daily_credit_limit - $oldLimit;

            $user->update([
                'plan_id' => $newPlan->id,
                'pending_plan_id' => null,
                'plan_change_at' => null,
            ]);

            $credit = $user->credit;
            if ($credit) {
                $credit->update([
                    'remaining' => min($credit->remaining + $difference, $newPlan->daily_credit_limit),
                    'limit' => $newPlan->daily_credit_limit,
                ]);
            }

            return response()->json([
                'message' => 'Plan upgraded',
                'plan' => $newPlan->only(['id', 'slug', 'name', 'daily_credit_limit']),
            ]);
        }

        // Downgrade: store as pending
        $user->update([
            'pending_plan_id' => $newPlan->id,
            'plan_change_at' => now()->addDays(30),
        ]);

        return response()->json([
            'message' => 'Downgrade scheduled',
            'pending_plan' => $newPlan->only(['id', 'slug', 'name']),
            'plan_change_at' => $user->fresh()->plan_change_at->toIso8601String(),
        ]);
    }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded 10-credit limit in two places | Plan-derived limit via CreditResolver | Phase 23 | Single source of truth for all credit limits |
| No plan awareness in credit system | Credit limit syncs with plan on daily reset | Phase 23 | Users get plan-appropriate limits automatically |
| Trial expiry not enforced | Auto-assign Free plan on trial expiry | Phase 23 | Clean state -- every post-trial user has a plan_id |
| UserResource returns 7 fields | UserResource returns 15+ fields with plan/trial data | Phase 23 | Frontend can show plan info, trial countdown |

## Open Questions

1. **Trial user sort_order for upgrade detection**
   - What we know: Trial users have `plan_id = null`, so `$user->plan?->sort_order` is null.
   - What's unclear: Should trial users be treated as sort_order 0 (below Free) for upgrade detection?
   - Recommendation: Yes -- treat null plan (trial) as sort_order 0. Any plan selection during trial is an "upgrade" (immediate application). This matches the CONTEXT.md intent that selecting Free during trial is valid.

2. **Credit record creation for new users with plans**
   - What we know: `firstOrCreate` uses hardcoded 10 for initial remaining/limit.
   - What's unclear: If a user somehow gets a plan before their first credit check, the initial credit record should use the plan's limit.
   - Recommendation: CreditResolver.resolve() should use `resolveLimit($user)` for the initial `remaining` and `limit` values in `firstOrCreate`. This is shown in the code example above.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Pest (on PHPUnit) |
| Config file | `backend/phpunit.xml` |
| Quick run command | `cd backend && php artisan test --filter=CreditResolver` |
| Full suite command | `cd backend && php artisan test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLAN-03 | CreditResolver derives limits from plan | unit | `php artisan test --filter=CreditResolverTest` | No -- Wave 0 |
| PLAN-04 | Duplication extracted, consumers delegate | integration | `php artisan test --filter=Credit` | Partially (existing tests verify behavior) |
| PLAN-05 | POST /api/plan selects plan | feature | `php artisan test --filter=PlanSelectionTest` | No -- Wave 0 |
| PLAN-06 | Plan change syncs credits | feature | `php artisan test --filter=PlanSelectionTest` | No -- Wave 0 |
| PLAN-07 | Guest stays 1/day | feature | `php artisan test --filter=GuestCreditLimitTest` | Yes |
| PLAN-08 | GET /api/plans returns active plans | feature | `php artisan test --filter=PlanIndexTest` | No -- Wave 0 |
| TRIAL-01 | Trial users get 10/day | feature | `php artisan test --filter=CreditResolverTest` | No -- Wave 0 |
| TRIAL-02 | Trial expiry -> Free tier | feature | `php artisan test --filter=TrialExpiryTest` | No -- Wave 0 |
| TRIAL-03 | Trial check in lazy reset | unit | `php artisan test --filter=CreditResolverTest` | No -- Wave 0 |
| ONBD-05 | UserResource returns new fields | feature | `php artisan test --filter=UserResourceTest` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && php artisan test --filter=CreditResolver --filter=Plan`
- **Per wave merge:** `cd backend && php artisan test`
- **Phase gate:** Full suite green before verify-work

### Wave 0 Gaps
- [ ] `tests/Feature/Credit/CreditResolverTest.php` -- covers PLAN-03, PLAN-07, TRIAL-01, TRIAL-02, TRIAL-03
- [ ] `tests/Feature/Plan/PlanSelectionTest.php` -- covers PLAN-05, PLAN-06
- [ ] `tests/Feature/Plan/PlanIndexTest.php` -- covers PLAN-08
- [ ] `tests/Feature/Credit/TrialExpiryTest.php` -- covers TRIAL-02 (end-to-end via search endpoint)
- [ ] `tests/Feature/Auth/UserResourceTest.php` -- covers ONBD-05
- [ ] PlanSeeder must run in test setUp for plan-dependent tests

## Sources

### Primary (HIGH confidence)
- Existing codebase: `DeductCredit.php`, `CreditStatusController.php`, `User.php`, `Plan.php`, `Credit.php`, `UserResource.php` -- read directly
- Existing tests: `AuthCreditLimitTest.php`, `GuestCreditLimitTest.php` -- read directly
- Existing migrations and seeders -- read directly
- `routes/api.php` -- read directly
- Laravel 12.54.1 confirmed via `php artisan --version`

### Secondary (MEDIUM confidence)
- Laravel service container auto-resolution -- standard Laravel behavior, well-documented
- Carbon date methods (isFuture, isPast, diffInDays) -- standard Carbon API

### Tertiary (LOW confidence)
- None -- all findings verified from existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all existing Laravel patterns
- Architecture: HIGH -- extraction pattern is mechanical, plan-awareness logic is well-defined in CONTEXT.md
- Pitfalls: HIGH -- identified from reading actual code and test files

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable -- no external dependency changes expected)
