# Project Research Summary

**Project:** Aqua TIP v3.0 -- Onboarding, Trial & Subscription Plans
**Domain:** SaaS subscription tiers, trial enforcement, and credit-based access control for a threat intelligence platform
**Researched:** 2026-03-20
**Confidence:** HIGH

## Executive Summary

Aqua TIP v3.0 is a business logic milestone, not a technology adoption exercise. The existing stack (Laravel 12, Sanctum, React 19, Tailwind 3) handles every requirement with zero new dependencies on either backend or frontend. The work consists of four interlocking concerns: (1) a `plans` database table with 4 seeded tiers, (2) plan-aware credit limit resolution replacing hardcoded values, (3) trial enforcement leveraging the existing `trial_ends_at` column, and (4) frontend UI for pricing, trial banners, and enhanced onboarding. No payment processing is needed -- plan selection is a simple database write.

The recommended approach is schema-first, logic-second, UI-last. The most critical insight from research is that existing users already have backdated `trial_ends_at` values, so enabling trial enforcement without a data migration will instantly downgrade every early adopter. The second critical insight is that credit limits are hardcoded identically in two files (`DeductCredit` middleware and `CreditStatusController`), which must be extracted into a shared `CreditResolver` service before any plan logic is added. Both issues are solvable with careful ordering.

The key differentiator opportunity is a reverse trial model: give new users Pro-level access (50 credits/day) for 30 days, then soft-downgrade to Free (3/day). Most competing TI platforms (VirusTotal, Shodan) offer only weak free tiers with no trial of premium features. Combined with credit-only gating (all features accessible, only search volume varies by tier), this creates a transparent, conversion-friendly model.

## Key Findings

### Recommended Stack

No new packages. Both `backend/composer.json` and `frontend/package.json` remain unchanged. Every capability needed -- migrations, Eloquent models, Carbon date handling, `Intl` browser APIs for timezone, Framer Motion for pricing page animations -- is already installed. See [STACK.md](./STACK.md) for the full analysis.

**Core technologies (all existing, all reused):**
- **Laravel 12 + Eloquent** -- plans table, user relations, credit resolver service, middleware, validation rules (including built-in `timezone` rule)
- **React 19 + Tailwind 3** -- pricing page cards, onboarding form extensions, trial banner, plan badges
- **Native browser APIs** -- `Intl.supportedValuesOf('timeZone')` for timezone picker, `Intl.DateTimeFormat` for timezone-aware display, `Date` math for trial countdown
- **Framer Motion (existing)** -- pricing card hover/selection animations
- **Lucide React (existing)** -- icons for plan feature checklists (Check, X, Crown, Shield)

**Explicitly avoid:** laravel/cashier, spatie/laravel-permission, date-fns/dayjs/moment, react-hook-form, zod/yup, react-select, any state management library. See STACK.md "What NOT to Use" table for full rationale on each.

### Expected Features

See [FEATURES.md](./FEATURES.md) for complete feature landscape, dependency graph, and competitor analysis.

**Must have (table stakes):**
- Plan-aware credit limits replacing hardcoded 10/day for all authenticated users
- Trial enforcement checking `trial_ends_at` and downgrading to Free tier on expiry
- Trial countdown banner showing days remaining with link to pricing
- Pricing page with 4-tier comparison grid (Free/Basic/Pro/Enterprise)
- Plan selection API that updates `users.plan_id` and syncs credit limits immediately
- Enhanced onboarding: timezone (auto-detected), organization, role fields
- Graceful trial-to-free transition (soft downgrade, not hard lockout)
- UserResource and AuthContext exposing plan, trial state, and timezone

**Should have (differentiators):**
- Reverse trial model: Pro-level credits (50/day) during 30-day trial
- Plan indicator in CreditBadge showing tier name alongside remaining/limit
- Upgrade CTA on credit exhaustion with plan-aware messaging
- Credit consumption transparency (per-action cost documentation)
- Auto-detected timezone default during onboarding

**Defer (v3.x / v4+):**
- Stripe payment processing -- defer until validated demand
- Monthly/annual billing toggle -- requires Stripe
- RBAC / team management -- requires enterprise customer validation
- Email drip campaigns -- over-engineered for current scale
- Per-feature gating (vs credit-only gating) -- adds complexity, reduces transparency
- Proration on mid-cycle plan changes -- requires billing cycles

### Architecture Approach

The architecture extends the existing credit system with a plan-aware resolution layer. A new `CreditResolver` service extracts the duplicated `resolveCredit()` and `lazyReset()` logic from two files into a single shared class. Plan status is fully derivable from two columns (`plan_id` and `trial_ends_at`) with no redundant status enum. Trial enforcement is a soft mechanism embedded in credit resolution, not a hard route-blocking middleware. See [ARCHITECTURE.md](./ARCHITECTURE.md) for full system diagram, data flows, and build order.

**Major components:**
1. **`plans` table + `Plan` model** -- source of truth for 4 tier definitions (slug, daily_credits, price, features JSONB). Cached aggressively (4 rows, rarely changes).
2. **`CreditResolver` service** -- single place to compute effective daily credit limit for any user or guest. Replaces hardcoded values in both `DeductCredit` middleware and `CreditStatusController`. Handles trial expiry detection.
3. **`SubscriptionController`** -- handles plan selection via `POST /api/plan`. Updates `users.plan_id` and atomically syncs credit limits (immediate effect for upgrades, capped for downgrades).
4. **`PlanController`** -- public `GET /api/plans` endpoint for pricing page (no auth required).
5. **Extended `UserResource`** -- exposes plan object, `trial_active`, `trial_days_left`, timezone, organization, role. Fixes `onboarding_completed` to use `onboarding_completed_at` timestamp instead of fragile heuristic.
6. **`PricingPage.jsx`** -- plan comparison grid consuming `/api/plans`, with selection buttons calling `/api/plan`.
7. **`TrialBanner.jsx`** -- trial countdown or expired upgrade prompt, reading from AuthContext.

### Critical Pitfalls

See [PITFALLS.md](./PITFALLS.md) for the full list with detection queries, phase warnings, and a "looks done but isn't" checklist.

1. **Retroactive trial expiry for existing users** -- All existing users have backdated `trial_ends_at`. Enabling enforcement without a data migration instantly downgrades every early adopter. **Prevent:** Run a migration to reset `trial_ends_at` to `NOW() + 30 days` for all existing users before any enforcement code ships.

2. **Hardcoded credit limits in two files** -- `DeductCredit` middleware and `CreditStatusController` both hardcode `limit=10` independently. Updating one but missing the other causes the status widget and actual enforcement to disagree. **Prevent:** Extract both into `CreditResolver` service as the very first backend change.

3. **Lazy reset preserves stale limits after plan change** -- The `credits.limit` column is set once at creation and never updated when plans change. **Prevent:** `lazyReset()` must re-derive limit from current plan. Plan changes must atomically sync credits using `LEAST(remaining, new_limit)`.

4. **Onboarding validation change breaks existing users** -- `UserResource.onboarding_completed` uses a fragile heuristic instead of `onboarding_completed_at`. Adding required fields kicks existing users back to onboarding. **Prevent:** Fix `UserResource` to use `onboarding_completed_at !== null` before touching the onboarding form. Make new fields nullable.

5. **Race condition on plan downgrade** -- Concurrent credit deduction and plan downgrade can leave a user with more credits than their new plan allows. **Prevent:** Plan changes must use atomic SQL: `UPDATE credits SET limit = :new, remaining = LEAST(remaining, :new)`.

## Implications for Roadmap

Based on research, the milestone breaks cleanly into 4 phases ordered by data dependencies and risk.

### Phase 1: Schema and Data Migration
**Rationale:** Everything depends on the `plans` table existing and existing users having clean data. This phase is purely additive -- no behavior changes, all existing functionality continues working identically.
**Delivers:** `plans` table with 4 seeded tiers, `plan_id`/`timezone`/`organization`/`role` columns on users, `Plan` model with relations, data migration resetting `trial_ends_at` for existing users.
**Addresses:** Plan column + credit tier mapping (P1), enhanced onboarding fields schema (P1)
**Avoids:** Pitfall 1 (retroactive trial expiry), Pitfall 5 (null plan for existing users)

### Phase 2: CreditResolver Service and Plan-Aware Credits
**Rationale:** This is the highest-risk change -- modifying the core credit system that gates every search. Must be stabilized and tested before building any UI on top. Extracting the shared service eliminates the duplication pitfall and creates the foundation for all plan enforcement.
**Delivers:** `CreditResolver` service, plan-aware `DeductCredit` middleware, plan-aware `CreditStatusController`, trial enforcement logic (soft downgrade on expiry), updated `UserResource` with plan/trial fields, `PlanController` (GET /api/plans), `SubscriptionController` (POST /api/plan) with atomic credit sync.
**Addresses:** Trial enforcement (P1), plan-aware credit limits (P1), UserResource updates (P1), plan selection API (P1)
**Avoids:** Pitfall 2 (duplicated logic), Pitfall 3 (stale lazy reset), Pitfall 6 (guest conflation), Pitfall 8 (race condition), Pitfall 9 (timezone mismatch)

### Phase 3: Enhanced Onboarding
**Rationale:** Independent of credit system changes but depends on schema from Phase 1. The `UserResource` fix (use `onboarding_completed_at` instead of heuristic) should ship here to prevent Pitfall 4 before any form changes.
**Delivers:** Extended `OnboardingController` (timezone, organization, role), updated `GetStartedPage.jsx` with timezone auto-detect and new fields, updated `api/auth.js` onboarding payload.
**Addresses:** Enhanced onboarding fields (P1), auto-detected timezone default (P2)
**Avoids:** Pitfall 4 (onboarding validation break), Pitfall 13 (form data loss on re-submission)

### Phase 4: Frontend Plan UI and Pricing
**Rationale:** All backend APIs are operational. Frontend components can be built independently and wired to real endpoints. Shipping enforcement and UI together avoids Pitfall 10 (pricing page without enforcement).
**Delivers:** Updated `AuthContext` with plan/trial state, `PricingPage.jsx` with plan comparison grid and selection, `TrialBanner.jsx` in AppLayout, `PlanBadge.jsx` in sidebar/topbar, updated `CreditBadge.jsx` with plan context, timezone-aware time display across the app, `/pricing` route.
**Addresses:** Trial countdown banner (P1), pricing page (P1), plan indicator in CreditBadge (P2), upgrade CTA on exhaustion (P2), timezone-aware display (P1)
**Avoids:** Pitfall 7 (missing frontend plan state), Pitfall 10 (UI without enforcement)

### Phase Ordering Rationale

- **Schema before logic** because migrations are additive and non-breaking. They create the data foundation without changing any behavior. All existing tests pass after Phase 1.
- **Credit system before API endpoints and UI** because the `CreditResolver` is consumed by both the deduction middleware and the subscription controller. It must exist and be tested first.
- **Onboarding independent but after schema** because it needs the `timezone`, `organization`, and `role` columns from Phase 1 but does not depend on the credit system changes.
- **Frontend last** because every frontend component consumes a backend API. Building UI before APIs are stable creates throwaway work.
- **Enforcement ships with pricing page** because the pricing page must never promise what the backend cannot deliver.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (CreditResolver + Plan-Aware Credits):** The credit deduction and lazy reset modifications touch the core rate-limiting system. Needs careful test coverage for all plan tiers, trial expiry edge cases, and plan change credit sync. Consider writing the test matrix before implementation. The atomic SQL pattern for plan downgrades (`LEAST(remaining, new_limit)`) should be validated against PostgreSQL.

Phases with standard patterns (skip `/gsd:research-phase`):
- **Phase 1 (Schema):** Standard Laravel migrations and seeders. Well-documented, zero ambiguity.
- **Phase 3 (Enhanced Onboarding):** Standard controller field additions. Timezone auto-detect uses native browser API. Existing onboarding pattern is clear.
- **Phase 4 (Frontend Plan UI):** Standard React components consuming REST APIs. Pricing page design patterns are well-documented. No new libraries.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new dependencies. All recommendations verified against existing `composer.json` and `package.json`. Every technology is already installed and in use. |
| Features | HIGH | Feature list derived from direct codebase analysis of existing credit system, competitor analysis (VirusTotal, Shodan, ThreatIntelligencePlatform.com), and SaaS best practice sources. Reverse trial model backed by multiple conversion studies. |
| Architecture | HIGH | Architecture extends existing patterns (single-invocable controllers, Eloquent relations, AuthContext). All integration points verified by reading actual source files. No speculative components. |
| Pitfalls | HIGH | Every pitfall identified from direct code inspection with specific file names and line numbers. The retroactive trial expiry and hardcoded credit duplication are verified bugs-in-waiting. |

**Overall confidence:** HIGH

### Gaps to Address

- **Pricing amounts:** Actual dollar amounts for Basic/Pro/Enterprise are TBD. STACK.md and FEATURES.md use placeholder prices. Does not block implementation (prices are seeder data) but must be decided before the pricing page ships to production.
- **Trial credit level disagreement:** FEATURES.md recommends 50/day (Pro equivalent) for reverse trial. ARCHITECTURE.md uses 15/day (Basic equivalent) in `CreditResolver` constants. This is a product decision. **Recommendation:** Go with 50/day (Pro level) -- higher trial value drives higher conversion per SaaS reverse trial research.
- **Enterprise tier CTA flow:** Enterprise plan uses "Contact Us" instead of self-service selection. The inquiry mechanism (email form, Calendly link, mailto) is unspecified. A simple mailto link is sufficient for v3.0.
- **Existing test updates:** Multiple test files reference hardcoded credit limit of 10. These will break when plan-aware limits ship. Must inventory and update during Phase 2.
- **Guest credit limit:** STACK.md says guest limit stays at 1/day. ARCHITECTURE.md `CreditResolver` sets `GUEST_LIMIT = 3` (Free tier equivalent). **Recommendation:** Keep guests at 1/day to maintain differentiation between anonymous and free-tier users.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of all affected files: `DeductCredit.php`, `CreditStatusController.php`, `User.php`, `UserResource.php`, `OnboardingController.php`, `AuthContext.jsx`, `GetStartedPage.jsx`, `ProtectedRoute.jsx`, `Credit.php`, all database migrations
- Laravel 12 documentation: `timezone` validation rule, Carbon timezone support, database seeding, middleware patterns
- MDN Web Docs: `Intl.supportedValuesOf('timeZone')`, `Intl.DateTimeFormat` timezone parameter

### Secondary (MEDIUM confidence)
- SaaS reverse trial conversion data: UserPilot, Chargebee guides
- SaaS pricing page design patterns: Eleken, Webstacks
- Credit-based SaaS model examples: PricingSaaS Newsletter, Inflection.io
- Competitor analysis: VirusTotal Public vs Premium API docs, ThreatIntelligencePlatform.com pricing page

### Tertiary (LOW confidence)
- VirusTotal premium pricing specifics (not publicly documented, inferred from API documentation)
- Exact conversion lift from reverse trials (varies by domain, SaaS averages cited but TIP-specific data unavailable)

---
*Research completed: 2026-03-20*
*Ready for roadmap: yes*
