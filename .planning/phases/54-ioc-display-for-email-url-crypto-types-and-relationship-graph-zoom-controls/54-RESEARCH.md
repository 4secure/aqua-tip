# Phase 54: Feature Gating - Research

**Researched:** 2026-04-14
**Domain:** Laravel backend gating + React frontend route guards
**Confidence:** HIGH

## Summary

Phase 54 is a focused data update + verification phase, not a new build. The entire feature gating infrastructure was built in Phase 43 and is already functional. The only code change required is updating the PlanSeeder to reduce the free plan's features list from 6 items to 2 items ("5 searches per day" and "Threat search"). The rest is verification that existing middleware and frontend guards work correctly.

The existing implementation is well-structured: backend uses a `FeatureGate` middleware on route groups, frontend uses `FeatureGatedRoute` wrapper with `useFeatureAccess` hook, and the Sidebar shows lock icons with reduced opacity for gated items. All pieces are in place and wired correctly based on code inspection.

**Primary recommendation:** Update PlanSeeder free plan features array, re-seed, then verify backend 403 responses and frontend UpgradeCTA rendering for free plan users on all gated routes.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Free plan features list in PlanSeeder must be reduced to exactly 2 items: "5 searches per day" and "Threat search"
- **D-02:** Remove all misleading items from the free plan: "All threat lookups", "Full indicator data", "Search history", "Priority data access", "Dark web monitoring"
- **D-03:** Paid plans (Basic, Pro, Enterprise) keep their existing longer feature lists unchanged
- **D-04:** Quick spot-check that FeatureGate middleware returns 403 for free users on all 4 gated route groups (dashboard, threat-actors, threat-news, dark-web)
- **D-05:** Quick spot-check that FeatureGatedRoute shows UpgradeCTA on frontend for free users navigating to gated pages (threat-map, dark-web, threat-actors, threat-news)
- **D-06:** Fix only if broken -- do not refactor or rewrite existing Phase 43 implementation
- **D-07:** Free plan card on pricing page naturally shows shorter 2-item features list (from D-01), creating visual contrast with paid plans' longer lists
- **D-08:** No explicit restriction text or strikethrough needed -- the shorter list naturally encourages upgrades

### Claude's Discretion
- Free plan description text update (if current description is misleading)
- Whether to update the migration or just the seeder for features list change

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GATE-01 | Free plan seeder features list reflects "threat search only" restriction (not "all features") | PlanSeeder.php lines 21-28 contain 6 items including misleading ones; update to exactly 2 items per D-01/D-02 |
| GATE-02 | Backend FeatureGate middleware blocks free plan users from non-search routes | FeatureGate middleware exists and is registered; routes/api.php lines 69-89 wrap all premium routes; needs verification only |
| GATE-03 | Frontend route guards show UpgradeCTA for gated pages when user is on free plan | FeatureGatedRoute wraps /threat-map, /dark-web, /threat-actors, /threat-news in App.jsx lines 70-76; needs verification only |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- No TypeScript -- all .jsx/.js files
- No tests exist in the project
- No linter/formatter configured
- All data is mocked in `data/mock-data.js` for frontend
- Backend is Laravel 11 (PHP) with PostgreSQL on Railway
- Frontend is React 19 + Vite 7
- Dark theme only with specific color tokens

## Existing Implementation Audit

### Backend: FeatureGate Middleware (VERIFIED WORKING)

**File:** `backend/app/Http/Middleware/FeatureGate.php`

Logic flow:
1. No user (unauthenticated) -- passes through (other middleware handles auth)
2. Trial active (`plan_id === null` + `trial_ends_at` in future) -- passes through
3. Has a plan with slug !== 'free' -- passes through
4. Otherwise (free plan) -- returns 403 JSON: `{ error: 'upgrade_required', message: 'Upgrade your plan to access this feature' }`

**Registration:** `bootstrap/app.php` line 19 registers alias `'feature-gate'`

**Protected routes** (all under `feature-gate` middleware group in `routes/api.php` lines 69-89):
- `POST /dark-web/search` + `GET /dark-web/status/{taskId}`
- `GET /threat-actors` + `GET /threat-actors/{id}/enrichment`
- `GET /threat-news` + `GET /threat-news/labels`
- `GET /threat-map/stream`
- `GET /dashboard/counts` + `GET /dashboard/indicators` + `GET /dashboard/categories`

**Confidence:** HIGH -- code inspected directly, middleware registered correctly.

### Frontend: Route Guards (VERIFIED WORKING)

**FeatureGatedRoute** (`frontend/src/components/auth/FeatureGatedRoute.jsx`):
- Uses `useFeatureAccess` hook to check `hasAccess(location.pathname)`
- Renders `<UpgradeCTA />` if no access, else renders `<Outlet />`

**useFeatureAccess** (`frontend/src/hooks/useFeatureAccess.js`):
- `FREE_ACCESSIBLE_PATHS = ['/threat-search', '/settings']`
- `isFreePlan = planSlug === 'free' && !isTrialActive`
- `hasAccess(path)` returns true if NOT free plan OR path is in accessible list

**Wrapped routes** in `App.jsx` lines 70-76:
- `/threat-map`, `/dashboard` (redirects to /threat-map), `/dark-web`, `/threat-actors`, `/threat-news`

**UpgradeCTA** (`frontend/src/components/ui/UpgradeCTA.jsx`):
- Has `PAGE_FEATURES` map for `/dashboard`, `/threat-actors`, `/threat-news`, `/dark-web`
- Falls back to `DEFAULT_FEATURE` for unknown paths
- Note: `/threat-map` is not in `PAGE_FEATURES` -- renders as "This Feature" via default. Minor cosmetic gap but not broken.

**Sidebar lock icons** (`frontend/src/components/layout/Sidebar.jsx`):
- Checks `item.gated` flag from `mock-data.js` navigation config
- Gated items for free plan users show `opacity-40` and lock-like reduced styling

**Gated items in mock-data.js:**
- Threat Map (`/threat-map`, gated: true)
- Threat Actors (`/threat-actors`, gated: true)
- Threat News (`/threat-news`, gated: true)
- Dark Web (`/dark-web`, gated: true)

**Confidence:** HIGH -- all code paths verified through direct inspection.

### PlanSeeder Current State (NEEDS UPDATE)

**File:** `backend/database/seeders/PlanSeeder.php`

Current free plan features (6 items -- MISLEADING):
```
'5 searches per day',
'All threat lookups',      // <-- REMOVE
'Full indicator data',     // <-- REMOVE
'Search history',          // <-- REMOVE
'Priority data access',    // <-- REMOVE
'Dark web monitoring',     // <-- REMOVE
```

Target free plan features (2 items):
```
'5 searches per day',
'Threat search',           // <-- ADD
```

Uses `Plan::updateOrCreate(['slug' => $plan['slug']], $plan)` which will update existing records when re-seeded. The `features` column is cast to `array` in the Plan model.

**No migration needed.** The seeder uses `updateOrCreate` so running `php artisan db:seed --class=PlanSeeder` will update the features JSON in the existing `plans` row. This is the established pattern used in Phase 41's migration as well.

## Architecture Patterns

### Data Flow for Features Display
```
PlanSeeder (PHP)
  → plans.features JSON column (PostgreSQL)
  → GET /api/plans (PlanIndexController)
  → PricingPage.jsx renders features list per plan card
```

The pricing page renders whatever is in the `features` array from the API. Updating the seeder and re-seeding is the only step needed -- no frontend pricing page changes required.

### Verification Pattern for Existing Gating
```
1. Seed updated data → php artisan db:seed --class=PlanSeeder
2. Backend verification → curl protected endpoints as free user → expect 403
3. Frontend verification → navigate to gated pages as free user → expect UpgradeCTA
4. Positive test → paid/trial users still access everything
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Feature gating middleware | New middleware | Existing FeatureGate.php | Already built and registered in Phase 43 |
| Frontend route guards | New guard components | Existing FeatureGatedRoute | Already wraps correct routes in App.jsx |
| Upgrade prompts | New CTA component | Existing UpgradeCTA | Already has page-specific messaging |

**Key insight:** This entire phase is about DATA correction (PlanSeeder) and VERIFICATION of existing code. Zero new components or middleware should be written (per D-06).

## Common Pitfalls

### Pitfall 1: Forgetting to Re-seed in Production
**What goes wrong:** PlanSeeder is updated but never run on Railway production database.
**Why it happens:** Local `db:seed` updates local DB; production requires separate action.
**How to avoid:** Include explicit step to run `php artisan db:seed --class=PlanSeeder` on production (via Railway console or deployment command).
**Warning signs:** Pricing page still shows 6 features for free plan after deploy.

### Pitfall 2: Migration vs Seeder Confusion
**What goes wrong:** Creating a new migration to update features when the seeder already handles it.
**Why it happens:** Instinct to use migrations for DB changes.
**How to avoid:** The seeder uses `updateOrCreate` -- re-running it is idempotent and correct. No migration needed.
**Warning signs:** Creating a migration file for a simple data update.

### Pitfall 3: UpgradeCTA Missing Threat Map Label
**What goes wrong:** `/threat-map` page shows "This Feature" instead of "Threat Map" in the UpgradeCTA.
**Why it happens:** `PAGE_FEATURES` map in UpgradeCTA has `/dashboard` but not `/threat-map`. Since `/dashboard` redirects to `/threat-map`, the CTA renders at `/threat-map` which falls to DEFAULT_FEATURE.
**How to avoid:** This is a pre-existing cosmetic issue from Phase 43. Per D-06, fix only if user considers it broken. The CTA still renders and blocks access correctly.
**Warning signs:** N/A -- functional behavior is correct.

### Pitfall 4: Refactoring Instead of Verifying
**What goes wrong:** Rewriting middleware or guards "for improvements" when they already work.
**Why it happens:** Developer instinct to improve code they're touching.
**How to avoid:** D-06 explicitly says "Fix only if broken -- do not refactor or rewrite existing Phase 43 implementation."
**Warning signs:** Touching FeatureGate.php, FeatureGatedRoute.jsx, or useFeatureAccess.js code.

## Code Examples

### PlanSeeder Update (the only code change)
```php
// backend/database/seeders/PlanSeeder.php
// Free plan features -- BEFORE (6 items, misleading):
'features' => [
    '5 searches per day',
    'All threat lookups',
    'Full indicator data',
    'Search history',
    'Priority data access',
    'Dark web monitoring',
],

// Free plan features -- AFTER (2 items, accurate):
'features' => [
    '5 searches per day',
    'Threat search',
],
```

### Re-seeding Command
```bash
# Local
cd backend && php artisan db:seed --class=PlanSeeder

# Production (Railway console)
php artisan db:seed --class=PlanSeeder
```

### Verification: Backend 403 Response
```bash
# As free plan user (with auth token):
curl -H "Authorization: Bearer $TOKEN" https://api.tip.aquasecure.ai/api/threat-actors
# Expected: 403 { "error": "upgrade_required", "message": "Upgrade your plan to access this feature" }

curl -H "Authorization: Bearer $TOKEN" https://api.tip.aquasecure.ai/api/threat-news
# Expected: 403

curl -H "Authorization: Bearer $TOKEN" https://api.tip.aquasecure.ai/api/threat-map/stream
# Expected: 403

curl -H "Authorization: Bearer $TOKEN" https://api.tip.aquasecure.ai/api/dashboard/counts
# Expected: 403

curl -H "Authorization: Bearer $TOKEN" -X POST https://api.tip.aquasecure.ai/api/dark-web/search
# Expected: 403
```

## Discretion Recommendations

### Free Plan Description Text
**Current:** "Get started with essential threat intelligence."
**Assessment:** Slightly misleading now that free plan only offers threat search (not "essential threat intelligence" broadly).
**Recommendation:** Update to "Search threats with 5 daily lookups." -- shorter, accurate, matches the 2-item feature list.
**Confidence:** MEDIUM -- this is a copywriting judgment call.

### Migration vs Seeder
**Recommendation:** Use seeder only (no migration). The `updateOrCreate` pattern in PlanSeeder is idempotent and the established deployment pattern. A migration would be redundant and add unnecessary complexity.
**Confidence:** HIGH -- verified that updateOrCreate works on the features JSON column.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None (no tests exist per CLAUDE.md) |
| Config file | none |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GATE-01 | Free plan features list has exactly 2 items | manual | `php artisan db:seed --class=PlanSeeder && php artisan tinker --execute="echo json_encode(App\Models\Plan::where('slug','free')->first()->features)"` | N/A |
| GATE-02 | Backend returns 403 for free users on gated routes | manual | curl commands against local/prod API with free plan token | N/A |
| GATE-03 | Frontend shows UpgradeCTA on gated pages for free users | manual | Browser navigation test as free plan user | N/A |

### Sampling Rate
- **Per task commit:** Manual verification via artisan tinker and curl
- **Per wave merge:** Full manual test of all 5 gated routes as free user + 1 positive test as paid user
- **Phase gate:** All 3 requirements verified manually before `/gsd:verify-work`

### Wave 0 Gaps
None -- no test infrastructure to create. All verification is manual for this phase due to project having no test framework.

## Open Questions

1. **UpgradeCTA missing /threat-map in PAGE_FEATURES**
   - What we know: Falls back to DEFAULT_FEATURE ("This Feature") instead of showing "Threat Map"
   - What's unclear: Whether user considers this a bug to fix under D-06
   - Recommendation: Leave as-is per D-06 unless verification explicitly flags it as broken

## Sources

### Primary (HIGH confidence)
- Direct code inspection of PlanSeeder.php, FeatureGate.php, api.php, FeatureGatedRoute.jsx, useFeatureAccess.js, UpgradeCTA.jsx, Sidebar.jsx, App.jsx, mock-data.js, Plan.php
- Phase 43 CONTEXT.md for original gating decisions

### Secondary (MEDIUM confidence)
- None needed -- all findings from direct code inspection

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, existing Laravel + React stack
- Architecture: HIGH -- all components already exist, verified by code inspection
- Pitfalls: HIGH -- well-understood domain, simple data update

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (stable -- no moving parts)
