# Architecture Patterns

**Domain:** Subscription plan tiers, trial enforcement, and extended onboarding for existing TIP (v3.0)
**Researched:** 2026-03-20
**Confidence:** HIGH (based on direct codebase analysis of existing patterns)

## Existing Architecture Snapshot

Before describing new components, here is what already exists and how the new features attach to it.

### Current Data Model

```
users
  id, name, email, password, oauth_provider, oauth_id, avatar_url,
  phone, email_verified_at, onboarding_completed_at, trial_ends_at,
  remember_token, timestamps

credits
  id, user_id (FK, unique), ip_address, remaining, limit, last_reset_at,
  timestamps
```

### Current Auth Flow

```
Register/Login -> email_verified_at check -> onboarding_completed_at check -> AppLayout
                  |                          |
                  v                          v
              VerifyEmailPage           GetStartedPage (name + phone)
```

### Current Credit Flow

```
Request -> DeductCredit middleware -> resolveCredit() -> lazyReset() -> atomic decrement
                                     |
                                     v
                              firstOrCreate with hardcoded limits:
                                guest: limit=1, remaining=1
                                auth:  limit=10, remaining=10
```

**Key observation:** Credit limits are hardcoded in two places -- `DeductCredit` middleware (`resolveCredit()` method) and `CreditStatusController` (`resolveCredit()` method). There is no plan concept; every authenticated user gets 10/day. The `trial_ends_at` column exists on users and is set to `now + 30 days` in `User::booted()`, but nothing reads or enforces it yet.

### Current UserResource Response

```php
return [
    'id', 'name', 'email', 'avatar_url', 'phone',
    'email_verified'       => $this->email_verified_at !== null,
    'onboarding_completed' => $this->name !== explode('@', $this->email)[0] && $this->phone !== null,
];
```

**Note:** `onboarding_completed` is computed from name + phone presence -- not from the `onboarding_completed_at` timestamp. This is a minor inconsistency to address.

---

## Recommended Architecture

### New Components Overview

| Component | Type | New/Modified | Purpose |
|-----------|------|--------------|---------|
| `plans` table | Migration | NEW | Plan definitions (slug, name, daily_credits, price, features) |
| `Plan` model | Model | NEW | Eloquent model for plan tiers |
| `PlanSeeder` | Seeder | NEW | Seed Free/Basic/Pro/Enterprise rows |
| `plan_id` + profile cols on users | Migration | NEW | FK to plans, plus timezone, organization, role |
| `User` model | Model | MODIFIED | Add `plan()` relation, `isOnTrial()`, `isTrialExpired()`, `effectiveDailyCredits()` |
| `UserResource` | Resource | MODIFIED | Expose plan, trial status, timezone, org, role |
| `DeductCredit` middleware | Middleware | MODIFIED | Resolve limit from user's effective plan instead of hardcoded 10 |
| `CreditStatusController` | Controller | MODIFIED | Same: derive limit from plan |
| `CreditResolver` | Service | NEW | Shared credit-limit resolution logic (DRY extraction) |
| `OnboardingController` | Controller | MODIFIED | Accept timezone, organization, role fields |
| `PlanController` | Controller | NEW | List available plans (GET /api/plans, public) |
| `SubscriptionController` | Controller | NEW | Select/change plan (POST /api/plan, auth) |
| `GetStartedPage.jsx` | Page | MODIFIED | Add timezone, organization, role fields |
| `PricingPage.jsx` | Page | NEW | Plan comparison grid + selection UI |
| `TrialBanner.jsx` | Component | NEW | Trial countdown / expired upgrade prompt |
| `PlanBadge.jsx` | Component | NEW | Current plan indicator in sidebar/topbar |
| `AuthContext.jsx` | Context | MODIFIED | Expose plan, trial state |
| `App.jsx` | Router | MODIFIED | Add /pricing route |
| `api/plans.js` | API module | NEW | Plan listing + selection API calls |
| `api/auth.js` | API module | MODIFIED | Update onboarding payload with new fields |

### System Diagram

```
                    Frontend                                    Backend
              +------------------+                    +---------------------+
              |   AuthContext     |                    |   /api/user         |
              | + user.plan {}   |<---GET /api/user---|   UserResource      |
              | + trialActive    |                    |   + plan relation   |
              | + trialDaysLeft  |                    |   + trial fields    |
              +--------+---------+                    |   + profile fields  |
                       |                              +---------------------+
          +------------+------------+
          |            |            |
    ProtectedRoute  TrialBanner  PlanBadge
          |
          v
    (trial expired && no plan -> TrialBanner shows upgrade CTA)
    (NOT a hard block -- user stays on Free tier limits)

              +------------------+                    +---------------------+
              |  PricingPage     |---POST /api/plan-->| SubscriptionCtrl    |
              |  (plan cards)    |                    | + update user.plan_id|
              +------------------+                    | + sync credit limit |
                                                      +---------------------+

              +------------------+                    +---------------------+
              |  ThreatSearch    |---POST /api/       | DeductCredit MW     |
              |  (any search)    |  threat-search     | + CreditResolver    |
              +------------------+                    |   (plan-aware)      |
                                                      +---------------------+

              +------------------+                    +---------------------+
              | GetStartedPage   |---POST /api/       | OnboardingController|
              | (extended fields)|  onboarding        | + timezone, org,    |
              +------------------+                    |   role fields       |
                                                      +---------------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `plans` table + `Plan` model | Source of truth for tier definitions (4 rows) | User (belongsTo inverse), CreditResolver, PlanController, SubscriptionController |
| `CreditResolver` service | Single place to compute effective daily credit limit for any user/guest | DeductCredit middleware, CreditStatusController |
| `SubscriptionController` | Handle plan selection, sync credit limit on credits table | User model, Credit model, Plan model |
| `DeductCredit` middleware | Gate searches by credit balance (delegates limit calc to CreditResolver) | CreditResolver, Credit model |
| `OnboardingController` | Collect profile fields (name, phone, timezone, org, role) | User model |
| `AuthContext` | Frontend auth state + plan/trial data derived from UserResource | /api/user endpoint |
| `PricingPage` | Display plan comparison, handle selection | /api/plans (read), /api/plan (write) |
| `TrialBanner` | Show trial countdown or expired upgrade prompt | AuthContext (reads trialActive, trialDaysLeft) |

---

## Database Schema Changes

### New Table: `plans`

```sql
CREATE TABLE plans (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,           -- "Free", "Basic", "Pro", "Enterprise"
    slug VARCHAR(50) NOT NULL UNIQUE,    -- "free", "basic", "pro", "enterprise"
    daily_credits INTEGER NOT NULL,       -- 3, 15, 50, 200
    price_monthly DECIMAL(8,2) NOT NULL, -- 0.00, 9.99, 29.99, 99.99
    features JSONB NOT NULL DEFAULT '[]', -- Feature list for pricing page display
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Seeder Data

| slug | name | daily_credits | price_monthly | sort_order |
|------|------|---------------|---------------|------------|
| free | Free | 3 | 0.00 | 0 |
| basic | Basic | 15 | 9.99 | 1 |
| pro | Pro | 50 | 29.99 | 2 |
| enterprise | Enterprise | 200 | 99.99 | 3 |

### New Columns on `users`

```sql
ALTER TABLE users ADD COLUMN plan_id BIGINT REFERENCES plans(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN timezone VARCHAR(64) DEFAULT 'UTC';
ALTER TABLE users ADD COLUMN organization VARCHAR(255);
ALTER TABLE users ADD COLUMN role VARCHAR(100);
```

**Why `ON DELETE SET NULL` for plan_id:** If a plan row is ever removed, user falls back to "no plan" state (treated as Free tier). Defensive against accidental data loss.

**Why `plan_id = NULL` means "no explicit plan":** During trial, users have no plan selected. When trial expires without plan selection, they get Free-tier limits. This avoids a separate `subscription_status` enum column and the state synchronization problems that come with it. The plan status is fully derivable:
- `plan_id != null` = subscribed to that plan
- `plan_id = null && trial_ends_at > now` = on trial (Basic-tier credits)
- `plan_id = null && trial_ends_at <= now` = trial expired (Free-tier credits)

---

## Data Flow Changes

### 1. Credit Limit Resolution (Critical Change)

**Before:** Hardcoded `limit=10` for auth users, `limit=1` for guests in two files.
**After:** Centralized in `CreditResolver` service, derived from plan/trial state.

```php
// app/Services/CreditResolver.php
class CreditResolver
{
    private const GUEST_LIMIT = 3;       // Free tier equivalent
    private const TRIAL_LIMIT = 15;      // Basic tier equivalent
    private const FREE_FALLBACK = 3;     // Expired trial, no plan

    public function resolveLimitFor(?User $user): int
    {
        if ($user === null) {
            return self::GUEST_LIMIT;
        }

        // Has an explicit plan
        if ($user->plan_id !== null) {
            return $user->plan->daily_credits;
        }

        // On active trial
        if ($user->trial_ends_at?->isFuture()) {
            return self::TRIAL_LIMIT;
        }

        // Trial expired, no plan selected
        return self::FREE_FALLBACK;
    }
}
```

**Where it is used:**
1. `DeductCredit::resolveCredit()` -- uses `CreditResolver` to determine limit for `firstOrCreate` and `lazyReset`
2. `CreditStatusController::resolveCredit()` -- same

**DRY rationale:** Both `DeductCredit` and `CreditStatusController` currently have duplicate `resolveCredit()` and `lazyReset()` methods. Extracting to `CreditResolver` eliminates this duplication and ensures plan-aware logic lives in one place.

### 2. Lazy Reset with Plan Sync

When `lazyReset()` fires (credit row is stale from previous day), it re-derives the limit from the user's current plan. This ensures plan upgrades/downgrades take effect at the next daily reset without a separate sync mechanism.

```php
private function lazyReset(Credit $credit, int $currentPlanLimit): void
{
    $todayStart = now('UTC')->startOfDay();

    if ($credit->last_reset_at < $todayStart) {
        $credit->update([
            'remaining' => $currentPlanLimit,
            'limit' => $currentPlanLimit,
            'last_reset_at' => $todayStart,
        ]);
    }
}
```

### 3. Plan Selection Flow

```
User clicks plan on PricingPage
  -> POST /api/plan { plan_slug: "pro" }
  -> SubscriptionController:
       1. Validate plan_slug exists in plans table
       2. Update user.plan_id
       3. Sync credits:
          - If new limit > old limit: set remaining += (new_limit - old_limit), set limit = new_limit
          - If new limit < old limit: set limit = new_limit, clamp remaining to new_limit
          - Use atomic UPDATE to prevent race conditions
       4. Return updated UserResource
  -> Frontend refreshes AuthContext (plan data updates)
```

**Why immediate credit sync (not wait for next day):** Upgrades should give users more credits right away. Waiting until midnight feels broken. Downgrades should cap remaining immediately to prevent hoarding.

### 4. Trial Enforcement Flow

```
User registers
  -> User::booted() sets trial_ends_at = now + 30 days (ALREADY EXISTS)
  -> plan_id remains NULL

During trial (plan_id=null, trial_ends_at > now):
  -> CreditResolver returns 15 (Basic-tier equivalent)
  -> Frontend: AuthContext.trialActive = true, trialDaysLeft = N
  -> TrialBanner shows "N days left in your trial"

Trial expires (plan_id=null, trial_ends_at <= now):
  -> CreditResolver returns 3 (Free-tier equivalent)
  -> Frontend: AuthContext.trialActive = false
  -> TrialBanner shows "Trial expired -- upgrade for more searches"
  -> User is NOT locked out -- they still get 3 searches/day

User selects a plan:
  -> POST /api/plan sets plan_id
  -> Trial status becomes irrelevant (plan_id != null = subscribed)
  -> TrialBanner disappears
```

**Key design decision:** Trial expiry is a soft downgrade, not a hard block. Users retain Free-tier access. This avoids hostile UX and is more likely to convert users who see the value but need more time.

### 5. Onboarding Extension

**Before:** GetStartedPage collects name + phone -> POST /api/onboarding
**After:** GetStartedPage collects name + phone + timezone + organization + role

```
GetStartedPage (single form, not multi-step)
  Required: name, phone (unchanged)
  New optional: timezone (auto-detected), organization (text), role (dropdown)
  -> POST /api/onboarding { name, phone, timezone, organization, role }

OnboardingController:
  validate({
    'name'         => ['required', 'string', 'min:2', 'max:255'],
    'phone'        => ['required', 'string', 'min:5', 'max:20'],
    'timezone'     => ['nullable', 'string', 'timezone:all'],   // NEW
    'organization' => ['nullable', 'string', 'max:255'],        // NEW
    'role'         => ['nullable', 'string', Rule::in([...])],  // NEW
  })
  update user with all fields
  set onboarding_completed_at = now()
```

**Why single form (not multi-step wizard):** The onboarding has 2 required fields and 3 optional fields. A wizard for 5 fields is over-engineering. The new fields have sensible defaults (timezone auto-detected, org and role are optional). Users should be able to complete onboarding in one submit.

**Timezone auto-detection:** Browser provides `Intl.DateTimeFormat().resolvedOptions().timeZone` (e.g., "Asia/Manila"). Pre-fill this value; let user override via a dropdown of IANA timezones.

### 6. UserResource Extension

```php
// Updated UserResource::toArray()
return [
    'id' => $this->id,
    'name' => $this->name,
    'email' => $this->email,
    'avatar_url' => $this->avatar_url,
    'phone' => $this->phone,
    'timezone' => $this->timezone,
    'organization' => $this->organization,
    'role' => $this->role,
    'email_verified' => $this->email_verified_at !== null,
    'onboarding_completed' => $this->onboarding_completed_at !== null,  // FIX: use timestamp
    'plan' => $this->plan ? [
        'id' => $this->plan->id,
        'name' => $this->plan->name,
        'slug' => $this->plan->slug,
        'daily_credits' => $this->plan->daily_credits,
    ] : null,
    'trial_active' => $this->plan_id === null && $this->trial_ends_at?->isFuture(),
    'trial_days_left' => $this->trial_ends_at
        ? (int) max(0, now()->diffInDays($this->trial_ends_at, absolute: false))
        : 0,
    'trial_ends_at' => $this->trial_ends_at?->toIso8601String(),
];
```

**Important fix:** Change `onboarding_completed` from the current heuristic (`name !== email_prefix && phone !== null`) to `onboarding_completed_at !== null`. The timestamp is already set by `OnboardingController`; the heuristic is fragile and breaks if a user has a pre-populated name from OAuth.

### 7. Credit Status Extension

```
GET /api/credits response:

// Before
{ remaining, limit, resets_at, is_guest }

// After
{ remaining, limit, resets_at, is_guest, plan_name, trial_active, trial_days_left }
```

### 8. AuthContext Extension

```jsx
// In AuthContext useMemo value:
const value = useMemo(() => ({
    user,
    loading,
    error,
    isAuthenticated: user !== null,
    emailVerified: user?.email_verified ?? false,
    onboardingCompleted: user?.onboarding_completed ?? false,
    userInitials: getInitials(user?.name),
    // NEW
    plan: user?.plan ?? null,
    trialActive: user?.trial_active ?? false,
    trialDaysLeft: user?.trial_days_left ?? 0,
    // existing
    login,
    register,
    logout,
    refreshUser: checkAuth,
}), [user, loading, error, login, register, logout, checkAuth]);
```

---

## New API Routes

```php
// Public -- pricing page needs this without auth
Route::get('/plans', PlanController::class);

// Inside auth:sanctum group
Route::post('/plan', SubscriptionController::class);
```

**Why /api/plans is public:** The pricing page should render for unauthenticated visitors so they can see plan options before signing up. Plan data is not sensitive.

**Why /api/plan (POST) requires auth:** It modifies user state (sets plan_id, syncs credits).

---

## Patterns to Follow

### Pattern 1: CreditResolver Service (DRY Extraction)

**What:** Extract the duplicated `resolveCredit()` + `lazyReset()` logic from `DeductCredit` and `CreditStatusController` into a shared `CreditResolver` service.

**Why:** Both files currently have identical private methods. Adding plan awareness would mean duplicating the plan logic in both places. A service class is the natural Laravel pattern.

```php
// app/Services/CreditResolver.php
class CreditResolver
{
    public function resolve(Request $request): Credit { ... }
    public function resolveLimitFor(?User $user): int { ... }
    public function lazyReset(Credit $credit, int $planLimit): void { ... }
}
```

### Pattern 2: Single-Invocable Controllers (Existing Pattern)

**What:** Every controller in the codebase uses `__invoke()`. New controllers must follow this.

```php
// app/Http/Controllers/Plan/PlanController.php
class PlanController extends Controller
{
    public function __invoke(): JsonResponse { ... }
}

// app/Http/Controllers/Plan/SubscriptionController.php
class SubscriptionController extends Controller
{
    public function __invoke(Request $request): UserResource { ... }
}
```

### Pattern 3: Timezone Auto-Detection on Frontend

**What:** Pre-fill timezone from browser `Intl` API, allow override.

```jsx
const [timezone, setTimezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
);
```

### Pattern 4: Plan as Lookup Table with Aggressive Caching

**What:** The `plans` table has exactly 4 rows. Cache the full list.

```php
// PlanController
public function __invoke(): JsonResponse
{
    $plans = Cache::rememberForever('plans:active', function () {
        return Plan::where('is_active', true)->orderBy('sort_order')->get();
    });

    return response()->json(['data' => $plans]);
}
```

Invalidate on plan updates (rare/manual operation).

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Subscription Status Enum Column

**What:** Adding a `subscription_status` enum (trial, active, expired, cancelled) to users.
**Why bad:** Redundant derivable state. Status is fully computable from `plan_id` + `trial_ends_at`. An enum creates synchronization risk -- what if `plan_id` is set but status still says "trial"?
**Instead:** Derive status in code. Add helper methods on User model: `isOnTrial()`, `isTrialExpired()`, `hasActivePlan()`, `effectiveDailyCredits()`.

### Anti-Pattern 2: Separate Trial Credits System

**What:** Creating a separate credits table or column for trial vs plan credits.
**Why bad:** The existing `credits` table already handles limits and remaining. The limit just needs to come from the plan instead of a hardcoded value.
**Instead:** Single credits row per user. `credits.limit` is the cached version of the plan's daily_credits, synced on plan change and daily reset.

### Anti-Pattern 3: Hard-Blocking on Trial Expiry

**What:** Completely locking users out when trial expires (redirect to pricing, block all routes).
**Why bad:** Users lose access to browse pages (threat actors, news, map) that do not cost credits. Creates hostile UX. Reduces conversion -- users who feel locked out are more likely to churn than upgrade.
**Instead:** Soft downgrade to Free tier (3 searches/day). Show `TrialBanner` with upgrade CTA. All features remain accessible, just rate-limited. Browse pages (no credit cost) are fully available.

### Anti-Pattern 4: Payment Infrastructure Now

**What:** Building Stripe integration, webhooks, invoice tables, subscription lifecycle management.
**Why bad:** Milestone says "no real payment processing yet." Payment infra is complex (webhooks, idempotency, failed payment handling, proration). Building it without real payments creates untestable dead code.
**Instead:** Plan selection is a simple `POST /api/plan` that updates `users.plan_id`. When payment processing is added later, wrap that endpoint with Stripe checkout session validation. The plan model and credit resolver are payment-agnostic by design.

### Anti-Pattern 5: Multi-Step Onboarding Wizard

**What:** Breaking 5 fields across 3 wizard steps with progress bars, back buttons, skip logic.
**Why bad:** Over-engineering for 2 required + 3 optional fields. The current onboarding is a single card with a form. Wizard complexity (step state, validation per step, browser back handling) is disproportionate to the benefit.
**Instead:** Single form with a visual section separator. Required section: name, phone. Optional section: timezone (auto-detected), organization (text input), role (dropdown select). One submit button.

---

## Modified Files Inventory

### Backend -- Modified

| File | Change | Risk |
|------|--------|------|
| `app/Models/User.php` | Add `plan()` relation, fillable fields (plan_id, timezone, organization, role), helper methods | LOW |
| `app/Http/Resources/UserResource.php` | Add plan, trial, profile fields; fix onboarding_completed to use timestamp | LOW |
| `app/Http/Middleware/DeductCredit.php` | Replace hardcoded limits with CreditResolver service | MEDIUM (core credit flow) |
| `app/Http/Controllers/Credit/CreditStatusController.php` | Replace hardcoded limits with CreditResolver service | LOW |
| `app/Http/Controllers/Auth/OnboardingController.php` | Accept timezone, organization, role fields | LOW |
| `routes/api.php` | Add GET /plans (public), POST /plan (auth) | LOW |

### Backend -- New

| File | Purpose |
|------|---------|
| `app/Models/Plan.php` | Plan Eloquent model |
| `app/Services/CreditResolver.php` | Shared credit limit resolution (plan-aware) |
| `app/Http/Controllers/Plan/PlanController.php` | List plans (GET /api/plans) |
| `app/Http/Controllers/Plan/SubscriptionController.php` | Select/change plan (POST /api/plan) |
| `database/migrations/xxxx_create_plans_table.php` | Plans table schema |
| `database/migrations/xxxx_add_plan_and_profile_to_users.php` | plan_id FK, timezone, organization, role |
| `database/seeders/PlanSeeder.php` | Seed 4 plan tiers |

### Frontend -- Modified

| File | Change | Risk |
|------|--------|------|
| `src/contexts/AuthContext.jsx` | Expose plan, trialActive, trialDaysLeft | LOW |
| `src/pages/GetStartedPage.jsx` | Add timezone (auto-detect + dropdown), organization, role fields | LOW |
| `src/components/shared/CreditBadge.jsx` | Optionally show plan name alongside remaining/limit | LOW |
| `src/api/auth.js` | Update completeOnboarding payload with new fields | LOW |
| `src/App.jsx` | Add /pricing route | LOW |

### Frontend -- New

| File | Purpose |
|------|---------|
| `src/pages/PricingPage.jsx` | Plan comparison grid with feature lists + selection buttons |
| `src/components/shared/TrialBanner.jsx` | Trial countdown bar or expired upgrade prompt |
| `src/components/shared/PlanBadge.jsx` | Current plan indicator chip |
| `src/api/plans.js` | `fetchPlans()` and `selectPlan(slug)` API functions |

---

## Suggested Build Order

Build order respects data dependencies: schema first, backend logic second, frontend consumption last.

```
Phase 1: Schema + Models (additive, no behavior change)
  1. Migration: create plans table
  2. PlanSeeder: seed Free/Basic/Pro/Enterprise rows
  3. Plan model with fillable, casts
  4. Migration: add plan_id, timezone, organization, role to users
  5. Update User model: plan() relation, new fillable, helper methods
  => Existing tests still pass (no behavior change)

Phase 2: CreditResolver + Plan-Aware Credits (behavior change, highest risk)
  6. CreditResolver service
  7. Modify DeductCredit middleware to use CreditResolver
  8. Modify CreditStatusController to use CreditResolver
  9. Tests: plan-aware credit limits, trial expiry downgrade, guest limits
  => This is the riskiest change -- modify core credit flow

Phase 3: Backend API Endpoints (new endpoints)
  10. PlanController (GET /api/plans)
  11. SubscriptionController (POST /api/plan with credit sync)
  12. Update OnboardingController (timezone, organization, role)
  13. Update UserResource (plan, trial, profile fields, fix onboarding_completed)
  14. Register routes in api.php
  15. Tests: plan listing, plan selection, onboarding with new fields
  => All endpoints operational, ready for frontend

Phase 4: Frontend Integration
  16. Update AuthContext (plan, trial derived state)
  17. api/plans.js (fetchPlans, selectPlan)
  18. Update api/auth.js (onboarding payload)
  19. Update GetStartedPage.jsx (timezone auto-detect, org, role)
  20. PricingPage.jsx (plan grid + selection)
  21. TrialBanner.jsx + PlanBadge.jsx
  22. Wire TrialBanner into AppLayout
  23. Update CreditBadge.jsx (plan context)
  24. Add /pricing route to App.jsx
```

**Why this order:**
- Phase 1 is pure additive -- no breaking changes, all existing tests pass
- Phase 2 is the riskiest change (core credit flow) -- stabilize before building on top
- Phase 3 builds on Phase 1+2 models and requires Phase 2's CreditResolver
- Phase 4 consumes all backend changes; each frontend component can be built independently once APIs are ready

---

## Scalability Considerations

| Concern | Current (100 users) | At 10K users | At 100K users |
|---------|---------------------|--------------|---------------|
| Plan lookups | Eager load `plan` on user fetch (1 JOIN) | Same (plans table = 4 rows) | Cache plans in memory, `Cache::rememberForever` |
| Credit resolution | 1 query per credit-gated request | Same (indexed on user_id unique) | Consider Redis-cached credits if DB load is concern |
| Trial expiry check | PHP timestamp comparison | Same (single column) | Same |
| Plan changes | Direct DB update + credit sync | Same | Queue credit sync if batch plan migrations needed |
| UserResource with plan | 1 extra JOIN or eager load | Same | Same (negligible) |

The `plans` table is effectively a lookup table (4 rows, rarely changes). It can be cached aggressively.

---

## Sources

- Direct codebase analysis: `backend/app/Http/Middleware/DeductCredit.php` (credit flow)
- Direct codebase analysis: `backend/app/Http/Controllers/Credit/CreditStatusController.php` (duplicate logic)
- Direct codebase analysis: `backend/app/Models/User.php` (trial_ends_at, existing relations)
- Direct codebase analysis: `backend/app/Http/Resources/UserResource.php` (current response shape)
- Direct codebase analysis: `backend/app/Http/Controllers/Auth/OnboardingController.php` (current fields)
- Direct codebase analysis: `frontend/src/contexts/AuthContext.jsx` (current state shape)
- Direct codebase analysis: `frontend/src/pages/GetStartedPage.jsx` (current form)
- Direct codebase analysis: `frontend/src/components/auth/ProtectedRoute.jsx` (guard chain)
- Direct codebase analysis: `backend/routes/api.php` (route structure)
- Direct codebase analysis: `backend/database/migrations/` (all migration files)
- All recommendations are integration-focused, building on verified patterns in the existing codebase (HIGH confidence)
