# Domain Pitfalls

**Domain:** Adding trial enforcement, subscription tiers, and enhanced onboarding to an existing credit-based threat intelligence platform
**Project:** AQUA TIP v3.0 -- Onboarding, Trial & Subscription Plans
**Researched:** 2026-03-20
**Confidence:** HIGH (based on direct codebase analysis of all affected files and existing patterns)

---

## Critical Pitfalls

Mistakes that cause data corruption, broken access for existing users, or require emergency rollbacks.

### Pitfall 1: Existing Users Get Retroactive Trial Expiry

**What goes wrong:** The `trial_ends_at` column already exists and is set via `User::creating()` boot hook to `now()->addDays(30)`. All existing users already have `trial_ends_at` values backdated to their registration date. Users who registered more than 30 days ago already have an expired trial. Flipping on trial enforcement instantly locks out every early adopter.

**Why it happens:** Developers add a middleware check like `if (now() > $user->trial_ends_at)` without considering that `trial_ends_at` was set relative to original registration, not to the enforcement go-live date.

**Consequences:** Every existing user older than 30 days gets downgraded to Free tier (3 credits/day) the moment enforcement goes live. Users who were happily using 10 credits/day suddenly lose access mid-workflow. Support flood, trust damage.

**Prevention:**
- Write a data migration that resets `trial_ends_at` for all existing users to `NOW() + 30 days` (or assigns them to a grandfathered plan) before enabling enforcement.
- Gate enforcement behind a feature flag. Deploy the migration first, verify data, then flip the flag.
- Add a `plan` column with a default value that existing users get assigned BEFORE any enforcement code runs.

**Detection:** Before deploying, query `SELECT count(*) FROM users WHERE trial_ends_at < NOW()` -- if this returns anything, enforcement will break those users.

**Phase to address:** Must be the very first phase (data migration), before any enforcement middleware exists.

---

### Pitfall 2: Hardcoded Credits in Two Places Create Divergence

**What goes wrong:** Credit limits are hardcoded as `10` in both `DeductCredit::resolveCredit()` (middleware, line 55) and `CreditStatusController::resolveCredit()` (controller, line 35). These are independent `firstOrCreate` calls with identical but duplicated logic. When you update one to be plan-aware but miss the other, the status endpoint reports wrong limits, or new credit rows get created with stale hardcoded values.

**Why it happens:** The `resolveCredit` logic was copy-pasted across two files with no shared abstraction. Copy-paste code drifts silently when only one copy gets updated.

**Consequences:** User sees "3/3 credits" on the status widget but the deduction middleware thinks they have 10. Or vice versa -- middleware enforces 3 but status shows 10, so users think they have credits but searches return 429.

**Prevention:**
- Extract `resolveCredit` and `lazyReset` into a shared `CreditService` class before touching any plan logic. Both the middleware and controller must delegate to the same service.
- The service must resolve the user's plan to determine limits. Never hardcode limit values -- always derive from plan configuration.
- Write a test that creates a user on each plan tier and asserts that both the status endpoint and a credit-gated search endpoint agree on limits.

**Detection:** Grep for hardcoded `remaining.*10` and `limit.*10` across the codebase. Every occurrence is a bug waiting to happen. Currently found in: `DeductCredit.php:55`, `CreditStatusController.php:35`, and multiple test files.

**Phase to address:** Must be the first backend change -- extract the shared service before adding plan awareness.

---

### Pitfall 3: Lazy Reset Preserves Old Limits After Plan Change

**What goes wrong:** The `lazyReset` method resets `remaining` to `$credit->limit`. But if a user's plan changes (trial expires, user upgrades/downgrades), the `credits.limit` column still holds the old value. The lazy reset faithfully restores credits to the stale limit.

**Why it happens:** The `limit` column on the `credits` table is set once at `firstOrCreate` time and never updated when the user's plan changes. The lazy reset only fires once per day and has no awareness of plans.

**Consequences:** User downgrades from Pro (50/day) to Free (3/day) but continues getting 50 credits every day because `credits.limit` still says 50. Revenue leakage. Or user upgrades but keeps getting the old lower limit until the next day's reset.

**Prevention:**
- `lazyReset` must check the user's current plan and update `credits.limit` before resetting `remaining`. The reset flow should be: resolve plan -> set limit from plan -> set remaining to limit.
- Alternatively, do not store `limit` on the credits table at all. Derive it from the user's plan every time. The credits table only needs `remaining` and `last_reset_at`.
- If keeping `limit` cached on the credits row, add a `syncLimitFromPlan()` call that runs both on lazy reset and on plan change events.

**Detection:** Change a user's plan in the database manually, wait for next-day reset, check if limit updated. If not, bug confirmed.

**Phase to address:** Must be addressed when building the plan-aware credit service. Cannot be deferred.

---

### Pitfall 4: Onboarding Validation Change Breaks Existing Flow

**What goes wrong:** Current onboarding requires only `name` and `phone`. Adding `timezone`, `organization`, and `role` as required fields changes the validation rules. But `UserResource::onboarding_completed` is computed as `$this->name !== explode('@', $this->email)[0] && $this->phone !== null` -- it is a heuristic with no knowledge of new fields. The `ProtectedRoute` component checks `onboardingCompleted` from this heuristic to gate access.

**Consequences:** Two failure modes:
1. **Existing onboarded users have null new fields.** Code that assumes timezone/org/role exist (e.g., timezone-aware display) throws errors or shows "undefined".
2. **If you update the heuristic to require new fields,** existing onboarded users get kicked back to the onboarding screen, disrupting their workflow on an app they have been using for weeks.

**Prevention:**
- Use `onboarding_completed_at !== null` as the single source of truth for onboarding completion. It already exists in the database but is NOT used in `UserResource` (which uses the fragile heuristic instead).
- Make new fields (`timezone`, `organization`, `role`) nullable in the database. Do NOT require them for the onboarding completion check.
- If new fields should be collected from existing users, add a "profile completion" prompt (soft nudge banner) separate from the hard onboarding gate.
- For timezone specifically, auto-detect from browser (`Intl.DateTimeFormat().resolvedOptions().timeZone`) and send it silently -- do not force a dropdown.

**Detection:** Check `UserResource` line 24 -- if `onboarding_completed` uses anything other than `onboarding_completed_at`, the logic is fragile and will break when fields change.

**Phase to address:** Fix `UserResource` to use `onboarding_completed_at` as the very first change before touching the onboarding form.

---

## Moderate Pitfalls

### Pitfall 5: Plan Column Without Default Leaves Existing Users Plan-less

**What goes wrong:** Adding a `plan` column (e.g., string or enum: free/basic/pro/enterprise/trial) to the users table with `null` default means all existing users have no plan. Any code that does `$user->plan` to determine credit limits gets `null`, and depending on implementation, either crashes or falls through to unexpected behavior (0 credits, or infinite credits).

**Prevention:**
- Migration must set a sensible default: `$table->string('plan')->default('trial')` for new users.
- The same migration must backfill: `DB::table('users')->whereNull('plan')->update(['plan' => 'trial'])`.
- Add a plan configuration array/enum that defines credit limits per plan. Never use raw strings for plan comparisons -- centralize in a config file or PHP enum.
- The plan resolver must have a fallback: if plan is null or unrecognized, treat as Free tier (safest restrictive default).

**Phase to address:** Data migration phase, simultaneous with Pitfall 1 fix.

---

### Pitfall 6: Guest Credits Conflated with Plan Logic

**What goes wrong:** The credit system has two branches: authenticated (by `user_id`) and guest (by `ip_address`). Plan/subscription logic only applies to authenticated users, but developers accidentally add plan checks to the guest path, causing errors when `$credit->user` is null and `$credit->user->plan` throws.

**Prevention:**
- Keep guest credit logic completely separate. Guests always get 1 credit/day, period. No plan, no trial, no subscription.
- In the shared `CreditService`, branch early: `if guest -> return guest pool with hardcoded limit of 1` before any plan resolution.
- Add explicit tests: guest credit deduction must work identically before and after the plan system ships.

**Phase to address:** CreditService extraction phase -- design the branch point correctly from the start.

---

### Pitfall 7: Frontend Auth Context Missing Plan/Trial State

**What goes wrong:** The `AuthContext` currently exposes `isAuthenticated`, `emailVerified`, and `onboardingCompleted`. After adding plans and trial enforcement, the frontend needs `plan`, `trialEndsAt`, `trialActive`, `trialDaysRemaining`, and `creditLimit` to render the correct UI (pricing CTAs, upgrade banners, limit displays, trial countdown). Without these, the frontend cannot differentiate user tiers.

**Prevention:**
- Update `UserResource` to include `plan`, `trial_ends_at`, `trial_active` (computed boolean), `trial_days_remaining` (computed int) in the JSON response.
- Update `AuthContext` to derive `plan`, `isTrialActive`, `trialDaysRemaining` from the user object.
- The `CreditBadge` component and dashboard credit widget must read limits from the API response, not from any hardcoded values on the frontend.
- The `ProtectedRoute` component may need a new guard step for trial-expired users (redirect to pricing page).

**Phase to address:** Frontend plan UI phase -- must be coordinated with backend `UserResource` changes.

---

### Pitfall 8: Atomic Deduction Race with Plan Downgrade

**What goes wrong:** The current atomic deduction (`UPDATE credits SET remaining = remaining - 1 WHERE remaining > 0`) is race-safe for concurrent searches. But if a plan downgrade runs concurrently (setting `limit` from 50 to 3 and `remaining` to 3), a race can occur: the deduction reads old remaining (50), the downgrade sets remaining to 3, the deduction decrements from 50 to 49 -- user now has 49 credits on a 3-credit plan.

**Prevention:**
- Plan changes must use an atomic pattern: `UPDATE credits SET "limit" = :new_limit, remaining = LEAST(remaining, :new_limit) WHERE user_id = :id`. This caps remaining to the new limit atomically.
- Never do a read-then-write for plan changes. Always single-statement atomic updates.
- The lazy reset already handles the next-day correction, but the same-day window matters for fairness.

**Phase to address:** Plan-aware credit limits phase.

---

### Pitfall 9: Trial Expiry Check Timezone Mismatch

**What goes wrong:** `trial_ends_at` is set via `now()->addDays(30)` (uses app default timezone). The lazy credit reset uses `now('UTC')`. If the app timezone is not UTC, trial expiry and credit reset happen on different clock references, causing a window where a user's trial appears expired but credits have not yet reset (or vice versa).

**Prevention:**
- Standardize ALL server-side time operations on UTC. Verify `config('app.timezone')` is `'UTC'`.
- The `now()->addDays(30)` call in the User model boot should be `now('UTC')->addDays(30)` for explicitness.
- User timezone preference is purely a frontend display concern -- never use it for server-side enforcement decisions.

**Phase to address:** Trial enforcement phase -- audit all time references.

---

### Pitfall 10: Pricing Page Without Enforcement Creates False Promises

**What goes wrong:** Building the pricing page before enforcement creates confusing UX. Users "select" a plan but nothing actually changes. They see "Pro - 50 searches/day" but still get 10 (or 3). Trust erodes when the UI promises something the backend does not deliver.

**Prevention:**
- Ship enforcement before (or simultaneously with) the pricing page. Never show plans you cannot enforce.
- If the pricing page must ship first, clearly label it "Coming Soon" and disable plan selection buttons.
- The plan selection flow (even without payment) must actually update `users.plan` and trigger a credit limit sync.

**Phase to address:** Pricing page must ship in the same phase as or after enforcement.

---

## Minor Pitfalls

### Pitfall 11: Missing Index on Plan Column

**What goes wrong:** Queries like `User::where('plan', 'pro')->count()` for admin analytics, or batch operations on trial-expired users, do full table scans on the users table.

**Prevention:**
- Add an index on the `plan` column in the migration.
- Consider a composite index on `(plan, trial_ends_at)` if you will query trial-expired users by plan.

---

### Pitfall 12: Credit Refund Exceeds Plan Limit

**What goes wrong:** The existing credit refund on OpenCTI API failure does `remaining + 1`. If a user is at their plan limit (e.g., 3/3 on Free), a search starts (2/3), OpenCTI fails, refund gives 3/3. That is fine. But if a concurrent refund pushes past the limit (rare race), the user has more credits than their plan allows.

**Prevention:**
- Refund should be `UPDATE credits SET remaining = LEAST(remaining + 1, "limit") WHERE id = :id`.
- Or accept the minor over-credit as tolerable (user earned it by having a failed search). Document the decision either way.

---

### Pitfall 13: Onboarding Form Loses Existing Data on Re-submission

**What goes wrong:** The current `OnboardingController` does `$user->update(['name' => ..., 'phone' => ..., 'onboarding_completed_at' => now()])`. If the enhanced form adds timezone/org/role but a validation error returns only partial data, the existing name and phone could get overwritten with stale form values on retry.

**Prevention:**
- Use `$request->only()` with explicit field list, and only update fields that are present and validated.
- Pre-populate the form with existing user data so re-submissions do not blank out previously saved fields.

---

## Integration Gotchas

| Integration Point | Common Mistake | Correct Approach |
|-------------------|----------------|------------------|
| `DeductCredit` middleware + plans | Adding plan check inside middleware (bloats middleware) | Middleware calls `CreditService::deduct()` which internally resolves plan |
| `CreditStatusController` + plans | Duplicating plan resolution logic | Controller calls `CreditService::status()` -- same service as middleware |
| `UserResource` + trial state | Returning raw `trial_ends_at` without computed fields | Add `trial_active`, `trial_days_remaining` as computed fields in the resource |
| `ProtectedRoute` + trial | Adding trial check in same guard as onboarding | Trial expiry should redirect to pricing page, not onboarding page. Separate guard step |
| `AuthContext` + plan data | Not refreshing user after plan change | Call `refreshUser()` after any plan selection to update context |
| Existing tests + new plans | Tests assume hardcoded limit of 10 | Update test helpers to accept plan parameter; add plan-specific test suites |

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Data migration for existing users | Pitfall 1 (retroactive trial), Pitfall 5 (null plan) | Run migration to set plan + reset trial_ends_at BEFORE enabling enforcement. Feature-flag enforcement. |
| CreditService extraction | Pitfall 2 (duplicated resolveCredit), Pitfall 6 (guest conflation) | Extract shared service first. Both middleware and controller must use it. Branch guest path early. |
| Enhanced onboarding form | Pitfall 4 (validation change), Pitfall 13 (data loss) | Fix UserResource to use `onboarding_completed_at`. Make new fields nullable. Pre-populate form. |
| Trial enforcement middleware | Pitfall 1 (retroactive expiry), Pitfall 9 (timezone) | Verify existing user data is migrated. Ensure all time ops use UTC. |
| Plan-aware credit limits | Pitfall 3 (lazy reset stale limit), Pitfall 8 (race condition) | lazyReset must sync limit from plan. Plan changes use atomic LEAST(). |
| Pricing page | Pitfall 10 (no enforcement) | Ship simultaneously with enforcement, or label "Coming Soon". |
| Frontend plan UI | Pitfall 7 (missing context) | Update UserResource, AuthContext, CreditBadge in lockstep. |

## Recommended Phase Order (Based on Pitfall Dependencies)

1. **Data migration + CreditService extraction** -- Addresses Pitfalls 1, 2, 3, 5, 6. Everything else depends on clean data and a single credit resolution path.
2. **Enhanced onboarding** -- Addresses Pitfalls 4, 13. Independent of credit system but needs UserResource fix first.
3. **Trial enforcement + plan-aware limits** -- Addresses Pitfalls 3, 8, 9. Only safe after data migration.
4. **Pricing page + frontend plan UI** -- Addresses Pitfalls 7, 10. Only meaningful after enforcement works.

## "Looks Done But Isn't" Checklist

- [ ] **Existing user migration:** Verify ALL existing users have a non-null `plan` value and a `trial_ends_at` that is in the future (or are on a permanent plan)
- [ ] **Credit limit consistency:** Verify `DeductCredit` middleware and `CreditStatusController` both return the same limit for the same user
- [ ] **Lazy reset plan sync:** Verify that changing a user's plan and waiting for next-day reset updates both `limit` and `remaining` on the credits row
- [ ] **Guest isolation:** Verify guest credit deduction works identically with plan system enabled -- no null reference errors
- [ ] **Onboarding gate:** Verify existing onboarded users are NOT kicked back to onboarding after new fields are added
- [ ] **UserResource fields:** Verify `plan`, `trial_active`, `trial_days_remaining` appear in the `/api/user` response
- [ ] **Frontend context:** Verify `AuthContext` exposes plan and trial state to components
- [ ] **Pricing page enforcement:** Verify selecting a plan actually changes the user's credit limit (not just UI state)
- [ ] **Trial expiry redirect:** Verify trial-expired users see a pricing/upgrade page, not a broken dashboard
- [ ] **Timezone consistency:** Verify `trial_ends_at` and credit reset both use UTC

## Sources

- Direct codebase analysis: `DeductCredit.php` (middleware with duplicated resolveCredit, hardcoded limit 10)
- Direct codebase analysis: `CreditStatusController.php` (controller with duplicated resolveCredit, hardcoded limit 10)
- Direct codebase analysis: `Credit.php` (model with `limit` column that persists stale values)
- Direct codebase analysis: `User.php` (boot hook setting `trial_ends_at` on creation, `plan` column not yet present)
- Direct codebase analysis: `UserResource.php` (fragile onboarding heuristic on line 24)
- Direct codebase analysis: `OnboardingController.php` (validates only name + phone)
- Direct codebase analysis: `AuthContext.jsx` (no plan/trial state exposed)
- Direct codebase analysis: `ProtectedRoute.jsx` (3-step guard with no trial check)
- Database migrations: `create_credits_table`, `add_trial_ends_at_to_users_table`, `add_phone_and_onboarding_to_users_table`
- All findings are HIGH confidence based on direct code inspection of the existing system

---
*Pitfalls research for: AQUA TIP v3.0 -- Onboarding, Trial & Subscription Plans*
*Researched: 2026-03-20*
