# Stack Research

**Domain:** Onboarding expansion, trial enforcement, subscription plans, pricing page
**Researched:** 2026-03-20
**Confidence:** HIGH

## Executive Assessment

**Zero new dependencies required.** The existing stack (Laravel 12, Sanctum, React 19, Tailwind 3) handles every requirement for v3.0. This milestone is a data model + business logic + UI exercise, not a technology adoption exercise.

The critical insight: this milestone adds **no real payment processing**. Plans are stored in a database table, credits are already tracked per-user, and the pricing page is a static UI with plan selection that updates the user's plan. No Stripe, no Paddle, no billing library.

## Recommended Stack (Additions Only)

### Backend: Zero New Packages

| What | How | Why Not a Package |
|------|-----|-------------------|
| Plans table | Laravel migration + Eloquent model + seeder | 4 static rows (Free/Basic/Pro/Enterprise) -- a seeded table is sufficient |
| Trial enforcement | Middleware checking `trial_ends_at` | Single `now()->gt($user->trial_ends_at)` check -- Carbon is built into Laravel |
| Credit tier sync | Modify `DeductCredit` middleware to read plan's `daily_limit` | Already does lazy reset with `$credit->limit`; just need to source limit from plan |
| Onboarding fields | Migration adding `timezone`, `organization`, `role` to users | Standard `$table->string()` columns |
| Timezone handling | PHP `DateTimeZone` + Carbon | Laravel ships Carbon; `timezone_identifiers_list()` is native PHP |
| Plan selection endpoint | New controller + route | Standard REST: `POST /api/user/plan` |

### Frontend: Zero New Packages

| What | How | Why Not a Package |
|------|-----|-------------------|
| Pricing page | React component with Tailwind | Static cards with plan comparison -- no interactive pricing calculator |
| Timezone picker | Native `<select>` with `Intl.supportedValuesOf('timeZone')` | Browser API covers this; no library needed |
| Organization/role fields | Standard `<input>` and `<select>` | Two form fields -- no form library needed |
| Trial countdown/banner | Simple date math in JS | `Math.ceil((trialEnd - now) / 86400000)` -- no moment/dayjs needed |
| Plan selection UI | Radio cards with glassmorphism | Already have card patterns and Framer Motion for transitions |
| Timezone-aware display | `Intl.DateTimeFormat` with user timezone | Native browser API, zero deps |

## Existing Stack (Already Installed, Relevant to v3.0)

### Backend

| Package | Version | v3.0 Use |
|---------|---------|----------|
| `laravel/framework` | ^12.0 | Migrations, Eloquent, middleware, Carbon, validation, seeder |
| `laravel/sanctum` | ^4.0 | Auth context for plan/trial checks in middleware |
| `pestphp/pest` | ^3.8 | Tests for trial enforcement, plan assignment, credit tier sync |

### Frontend

| Package | Version | v3.0 Use |
|---------|---------|----------|
| `react` | ^19.2.4 | Components, context, hooks |
| `react-router-dom` | ^7.13.1 | `/pricing` route, plan-aware navigation |
| `framer-motion` | ^12.35.2 | Pricing page animations, plan card hover/selection effects |
| `lucide-react` | ^0.577.0 | Icons for plan feature lists (Check, X, Crown, Shield, Clock) |
| `tailwindcss` | ^3.4.19 | Pricing cards, onboarding form styling, trial banner |
| `react-phone-number-input` | ^3.4.16 | Already in onboarding -- stays |

## Integration Points (Where Existing Code Changes)

### 1. Credit System Needs Plan Awareness

**Current state:** `DeductCredit` middleware hardcodes `remaining: 10, limit: 10` for authenticated users (line 53-54). Same hardcoding in `CreditStatusController` (line 32-33).

**Required change:** Read `daily_limit` from the user's plan instead of hardcoding.

```
Current (DeductCredit::resolveCredit):
  Credit::firstOrCreate(['user_id' => $user->id], ['remaining' => 10, 'limit' => 10, ...])

After:
  $dailyLimit = $user->plan?->daily_credit_limit ?? 3;  // Free tier default
  Credit::firstOrCreate(['user_id' => $user->id], ['remaining' => $dailyLimit, 'limit' => $dailyLimit, ...])
```

**Lazy reset also needs updating** -- when credits reset at midnight, the new limit should come from the current plan, not the stale `$credit->limit`:

```
Current (lazyReset):
  $credit->update(['remaining' => $credit->limit, ...])

After:
  $planLimit = $credit->user?->plan?->daily_credit_limit ?? $credit->limit;
  $credit->update(['remaining' => $planLimit, 'limit' => $planLimit, ...])
```

### 2. Trial Enforcement

**Current state:** `trial_ends_at` is set to `now()->addDays(30)` on user creation (User model `booted()` hook, line 76). Never checked anywhere.

**Required change:** New middleware or modification to existing flow:
- Check if trial expired AND user has no paid plan
- If expired: auto-assign Free plan, downgrade credit limit to 3/day
- Return trial status in UserResource so frontend can show banners

**Key decision:** Trial enforcement should happen in `DeductCredit` middleware (not a separate middleware) because credit limits are the enforcement mechanism. When trial expires, credits downgrade. No need for hard blocking -- the user still has Free tier access.

### 3. Onboarding Controller Expansion

**Current state:** `OnboardingController` validates `name` (required) + `phone` (required), sets `onboarding_completed_at`.

**Required change:** Add `timezone`, `organization`, `role` to validation. Make `organization` and `role` optional (not all users belong to organizations).

**Timezone validation:** Use Laravel's `timezone` validation rule (built-in) -- validates against PHP's `DateTimeZone` list.

### 4. UserResource Expansion

**Current state:** Returns `id, name, email, avatar_url, phone, email_verified, onboarding_completed`.

**Required change:** Add fields:
- `trial_ends_at` -- ISO 8601 datetime
- `trial_active` -- boolean (`trial_ends_at > now()`)
- `trial_days_left` -- integer (0 if expired)
- `plan` -- object `{ name, display_name, daily_credit_limit }` or null
- `timezone` -- string (IANA timezone)
- `organization` -- string or null
- `role` -- string or null

### 5. AuthContext Expansion (Frontend)

**Current state:** Exposes `user, isAuthenticated, emailVerified, onboardingCompleted, userInitials`.

**Required change:** Add derived properties:
- `trialActive` -- from `user.trial_active`
- `trialDaysLeft` -- from `user.trial_days_left`
- `plan` -- from `user.plan`
- `userTimezone` -- from `user.timezone` (for timezone-aware display)

## Data Model Design

### Plans Table (New)

```sql
CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(50) NOT NULL UNIQUE,       -- 'free', 'basic', 'pro', 'enterprise'
    display_name VARCHAR(100) NOT NULL,      -- 'Free', 'Basic', 'Pro', 'Enterprise'
    daily_credit_limit INTEGER NOT NULL,     -- 3, 15, 50, 200
    price_monthly INTEGER NOT NULL DEFAULT 0,-- cents: 0, 1900, 4900, 9900
    features JSONB NOT NULL DEFAULT '[]',    -- feature list for pricing page display
    is_active BOOLEAN NOT NULL DEFAULT true, -- soft-disable plans
    sort_order INTEGER NOT NULL DEFAULT 0,   -- display ordering on pricing page
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Why database table over config array:** The pricing page needs to fetch plans from an API endpoint (`GET /api/plans`). A table is queryable, seedable, and the single source of truth. Config arrays require a wrapper endpoint and duplicate data shapes.

### Users Table Changes (Migration)

```sql
ALTER TABLE users ADD COLUMN plan_id INTEGER REFERENCES plans(id) DEFAULT NULL;
ALTER TABLE users ADD COLUMN timezone VARCHAR(100) DEFAULT NULL;
ALTER TABLE users ADD COLUMN organization VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN role VARCHAR(100) DEFAULT NULL;
```

**`plan_id` NULL means "no plan selected yet"** -- during trial, users have trial-tier credits (same as Basic: 15/day). After trial expires with no plan, they get Free tier (3/day).

### Seed Data

```
| slug       | display_name | daily_credit_limit | price_monthly | sort_order |
|------------|-------------|--------------------:|-------------:|----------:|
| free       | Free         |                  3 |            0 |         1 |
| basic      | Basic        |                 15 |         1900 |         2 |
| pro        | Pro          |                 50 |         4900 |         3 |
| enterprise | Enterprise   |                200 |         9900 |         4 |
```

### Credit Resolution Logic (Updated)

```
if user is guest:
    limit = 1/day (unchanged)
else if trial is active (trial_ends_at > now):
    limit = 15/day (trial gets Basic-tier credits)
else if user has plan:
    limit = plan.daily_credit_limit
else:
    limit = 3/day (Free tier fallback)
```

## New API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `GET /api/plans` | GET | None | List all active plans for pricing page |
| `POST /api/user/plan` | POST | auth:sanctum | Select/change plan (no payment) |
| `GET /api/user` | GET | auth:sanctum | Already exists -- add plan/trial/timezone fields |
| `POST /api/onboarding` | POST | auth:sanctum | Already exists -- add timezone/org/role fields |

## Timezone Strategy

**Backend:**
- Store IANA timezone string (e.g., `America/New_York`) in `users.timezone`
- Validate with Laravel's built-in `timezone` rule
- Use Carbon's `->setTimezone($user->timezone)` when formatting user-facing dates

**Frontend:**
- Auto-detect on onboarding: `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Display picker: `Intl.supportedValuesOf('timeZone')` (all modern browsers)
- Format dates: `new Intl.DateTimeFormat(undefined, { timeZone: userTimezone, ...options })`
- Group timezones by continent for UX (parse the IANA strings by `/` separator)

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `laravel/cashier` | No payment processing needed; adds Stripe SDK, webhooks, subscription tables, invoice logic | Plain `plans` table + `plan_id` on users |
| `spatie/laravel-permission` | Plans are credit tiers, not permission/role systems; adds 5 tables | `plan_id` foreign key on users |
| `date-fns` / `dayjs` / `moment` | One date subtraction for trial countdown; timezone uses native `Intl` | Native `Date` math + `Intl.DateTimeFormat` |
| `react-hook-form` / `formik` | Onboarding has 5-6 fields total; no dynamic forms | `useState` per field (existing pattern in GetStartedPage) |
| `zod` / `yup` | Server validates all input via Laravel; client validation is UX sugar | Inline checks before submit (existing pattern) |
| `react-select` | Timezone picker is a styled dropdown | Native `<select>` with Tailwind + grouped `<optgroup>` by continent |
| `@headlessui/react` | Only needed for complex accessible modals/dropdowns | Native elements with Tailwind (existing pattern across all pages) |
| `luxon` | Timezone-aware dates in JS | `Intl.DateTimeFormat` does this natively |
| Any state management library | Plan/trial data comes from user object in AuthContext | Extend existing `AuthContext` (already works) |

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Plans as database table | Plans as `config/plans.php` array | Never for this app -- pricing page needs API access; table is single source of truth |
| `plan_id` on users table | Separate `subscriptions` pivot table | When adding billing history, plan change logs, or real payment processing (future) |
| Trial enforcement in `DeductCredit` | Separate `TrialEnforcement` middleware | When trial blocking needs to happen on non-credit-consuming routes |
| Timezone in `users.timezone` | Timezone in `user_preferences` JSON column | When there are 10+ user preferences; not justified for one field |
| `Intl.supportedValuesOf('timeZone')` | Hardcoded timezone list | When supporting browsers older than 2022 (not our audience for a TIP) |
| Credit limit derived from plan at reset time | Credit limit stored statically on credits table | Current approach; must change because plan changes need to take effect at next reset |

## Installation

```bash
# Backend: No new packages to install
# Create migrations, seeder, then run:
cd backend && php artisan migrate && php artisan db:seed --class=PlanSeeder

# Frontend: No new packages to install
# Zero npm installs needed
```

## Sources

- **Codebase analysis (HIGH confidence):**
  - `backend/app/Http/Middleware/DeductCredit.php` -- credit hardcoding at lines 53-58, lazy reset at lines 83-89
  - `backend/app/Http/Controllers/Credit/CreditStatusController.php` -- duplicate hardcoding at lines 32-37
  - `backend/app/Models/User.php` -- `trial_ends_at` set in `booted()` hook (line 76), never enforced
  - `backend/app/Http/Controllers/Auth/OnboardingController.php` -- current 2-field onboarding
  - `backend/app/Http/Resources/UserResource.php` -- current response shape, no plan/trial fields
  - `frontend/src/pages/GetStartedPage.jsx` -- current onboarding UI (name + phone)
  - `frontend/src/contexts/AuthContext.jsx` -- current auth state shape
  - `backend/database/migrations/` -- existing schema for users, credits, search_logs
  - `frontend/package.json` -- current dependency list (zero additions needed)
  - `backend/composer.json` -- current dependency list (zero additions needed)
- **Laravel docs (HIGH confidence):** `timezone` validation rule, Carbon timezone support, database seeding
- **MDN Web Docs (HIGH confidence):** `Intl.supportedValuesOf('timeZone')`, `Intl.DateTimeFormat` timezone parameter

---
*Stack research for: Aqua TIP v3.0 -- Onboarding, Trial & Subscription Plans*
*Researched: 2026-03-20*
