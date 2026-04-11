# Phase 43: Feature Gating - Research

**Researched:** 2026-04-11
**Domain:** Plan-based feature gating (frontend route guards + backend middleware)
**Confidence:** HIGH

## Summary

Phase 43 adds plan-based feature gating so free-plan users can only access Threat Search while all other app pages show upgrade prompts. The implementation spans both frontend (route-level guards, sidebar lock icons, upgrade CTA component) and backend (new FeatureGate middleware on gated API endpoints returning 403).

The codebase already has all necessary infrastructure: `user.plan.slug` and `user.trial_active` are exposed via `UserResource` through `AuthContext`, the sidebar already implements a lock-icon pattern for unauthenticated users (lines 100-121 of Sidebar.jsx), `ProtectedRoute` demonstrates the route-wrapper pattern in App.jsx, and `DeductCredit` middleware provides the exact pattern to follow for the new `FeatureGate` middleware. No new dependencies are needed.

**Primary recommendation:** Create a `useFeatureAccess` hook that centralizes plan-check logic, a `FeatureGatedRoute` wrapper component (mirroring `ProtectedRoute`), an `UpgradeCTA` full-page component, and a `FeatureGate` Laravel middleware registered on gated route groups.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Threat Search (`/threat-search`) is the ONLY app page accessible to free-plan users (matches PLAN-04)
- **D-02:** Gated pages: Dashboard (`/dashboard`), Threat Actors (`/threat-actors`), Threat News (`/threat-news`), Dark Web (`/dark-web`)
- **D-03:** Settings (`/settings`) remains accessible to all authenticated users -- it's account management, not a feature
- **D-04:** Trial users (active trial) get FULL access to all pages, same as paid plans (per Phase 41 D-12)
- **D-05:** Basic, Pro, and Enterprise users have unrestricted access
- **D-06:** Free users navigating to a gated page see a full-page upgrade CTA that replaces the page content entirely (no partial/blurred content)
- **D-07:** The upgrade CTA is a reusable component (`UpgradeCTA` or similar) shown inside AppLayout (sidebar + topbar remain visible for navigation context)
- **D-08:** CTA includes: feature name they're trying to access, brief value proposition, prominent "Upgrade" button linking to `/pricing`, and a secondary "Start Free Trial" option if trial hasn't been used
- **D-09:** CTA design follows existing glassmorphism card pattern (`bg-surface/60 border border-border backdrop-blur-sm rounded-xl`)
- **D-10:** Sidebar shows Lock icon on pages the user's plan cannot access -- reuses existing Lock icon pattern from unauthenticated state
- **D-11:** Clicking a locked sidebar item navigates to the gated page (which shows UpgradeCTA) instead of blocking navigation -- user can see what they're missing
- **D-12:** The lock visual treatment (opacity-40, Lock icon) matches the current unauthenticated pattern for consistency
- **D-13:** New `FeatureGate` middleware (separate from `DeductCredit`) that checks user's plan tier before allowing access to gated API endpoints
- **D-14:** Gated endpoints: `/api/dashboard/*`, `/api/threat-actors`, `/api/threat-news`, `/api/dark-web/*`, `/api/sse/threats` (NOTE: actual SSE route is `/api/threat-map/stream`)
- **D-15:** Free users hitting gated endpoints receive 403 with JSON: `{ "error": "upgrade_required", "message": "Upgrade your plan to access this feature" }`
- **D-16:** Middleware checks: `user->plan->slug` against allowed list. Free plan (slug: "free") is gated. Trial active (`trial_ends_at > now`) bypasses gating.
- **D-17:** AuthContext user object already includes `user.plan.slug` and `user.trial_active` -- use these for frontend gating decisions
- **D-18:** Create a `useFeatureAccess` hook or utility that determines if current user can access a given feature, centralizing the plan check logic

### Claude's Discretion
- Exact UpgradeCTA copy and visual layout (within glassmorphism constraint)
- Whether to use a route-level wrapper component (like ProtectedRoute) or page-level checks
- NAV_CATEGORIES data structure changes (adding a `gated` flag vs deriving from plan)
- Whether FeatureGate middleware uses a config array or hardcoded route list

### Deferred Ideas (OUT OF SCOPE)
- Per-feature gating (e.g., Dark Web only for Pro+) -- out of scope per PROJECT.md, credit-only + plan-level is sufficient
- Real payment processing integration with plan selection -- PAY-01, PAY-02 tracked for future
- Admin dashboard for managing plan assignments -- ADMIN-01

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLAN-04 | Free plan restricts access to Threat Search only -- other pages show upgrade CTA | Frontend: FeatureGatedRoute wrapper + UpgradeCTA component + useFeatureAccess hook. Backend: FeatureGate middleware on gated endpoints. |
| PLAN-05 | Feature gating enforced on both frontend (route guards + sidebar lock) and backend (middleware) | Sidebar lock icon pattern already exists (lines 100-121), ProtectedRoute pattern for route guards, DeductCredit middleware pattern for backend enforcement. |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **No TypeScript** -- all files are `.jsx`/`.js`
- **No tests exist** on frontend (no linter/formatter configured)
- **Backend uses Pest 3.8** with SQLite in-memory for tests (140+ existing tests)
- **React 19 + Vite 7** (ESM)
- **Dark theme only** with glassmorphism design pattern
- **Design tokens:** violet (#7A44E4) primary accent, cyan (#00E5FF) secondary, surface (#0F1117) cards
- **Fonts:** Outfit (sans) for all UI, JetBrains Mono (mono) for code/data
- **All data mocked** in `data/mock-data.js` -- no frontend tests to worry about

## Standard Stack

No new dependencies needed. This phase uses only existing libraries:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 | 19.x | Frontend framework | Already in use |
| React Router DOM | 7.x | Route guards via wrapper components | Already in use, ProtectedRoute pattern established |
| Lucide React | latest | Lock icon for sidebar gating | Already imported in Sidebar.jsx |
| Framer Motion | latest | UpgradeCTA entrance animation | Already in use for transitions |
| Laravel 11 | 11.x | Backend middleware | Already in use, DeductCredit pattern established |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| GradientButton | (internal) | CTA "Upgrade" button | Already built at `components/ui/GradientButton.jsx` |

## Architecture Patterns

### Frontend: New Files
```
frontend/src/
  hooks/
    useFeatureAccess.js      # NEW: Centralized plan-check logic
  components/
    auth/
      FeatureGatedRoute.jsx  # NEW: Route wrapper (mirrors ProtectedRoute)
    ui/
      UpgradeCTA.jsx         # NEW: Full-page upgrade prompt component
```

### Backend: New Files
```
backend/app/Http/Middleware/
  FeatureGate.php            # NEW: Plan-based endpoint gating
```

### Pattern 1: useFeatureAccess Hook
**What:** Centralizes all plan-checking logic in one hook. Returns `{ hasAccess, isFreePlan, isTrialActive }` based on the current user's plan data from AuthContext.
**When to use:** Sidebar lock rendering, FeatureGatedRoute decision, any component that needs plan awareness.

**Logic (derived from UserResource and AuthContext):**
```javascript
// frontend/src/hooks/useFeatureAccess.js
import { useAuth } from '../contexts/AuthContext';

// Pages accessible to free-plan users (no gating)
const FREE_ACCESSIBLE_PATHS = ['/threat-search', '/settings'];

export function useFeatureAccess() {
  const { user, isAuthenticated } = useAuth();

  // Not authenticated = no plan gating (ProtectedRoute handles auth)
  if (!isAuthenticated || !user) {
    return { hasAccess: () => true, isFreePlan: false, isTrialActive: false };
  }

  const planSlug = user.plan?.slug;
  const isTrialActive = user.trial_active === true;
  const isFreePlan = planSlug === 'free' && !isTrialActive;

  const hasAccess = (path) => {
    // Trial users, paid plans = full access
    if (!isFreePlan) return true;
    // Free plan = only allowed paths
    return FREE_ACCESSIBLE_PATHS.includes(path);
  };

  return { hasAccess, isFreePlan, isTrialActive };
}
```

**Key insight:** `user.trial_active` is `true` only when `trial_ends_at` is future AND `plan_id` is null (see UserResource line 38-40). Once trial expires, user gets assigned to free plan (slug: "free") by CreditResolver. So checking `planSlug === 'free' && !isTrialActive` correctly identifies gated users.

### Pattern 2: FeatureGatedRoute Wrapper
**What:** Route-level wrapper component that checks plan access, renders UpgradeCTA for gated users.
**When to use:** Wrap gated routes in App.jsx, similar to how ProtectedRoute wraps auth-required routes.

**Approach:** Nest inside ProtectedRoute so auth is guaranteed. FeatureGatedRoute only checks plan.

```javascript
// frontend/src/components/auth/FeatureGatedRoute.jsx
import { Outlet, useLocation } from 'react-router-dom';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
import UpgradeCTA from '../ui/UpgradeCTA';

export default function FeatureGatedRoute() {
  const location = useLocation();
  const { hasAccess } = useFeatureAccess();

  if (!hasAccess(location.pathname)) {
    return <UpgradeCTA />;
  }

  return <Outlet />;
}
```

### Pattern 3: Sidebar Lock Icons for Plan-Gated Users
**What:** Extend existing sidebar lock pattern to also show locks for authenticated free-plan users on gated pages.
**Current behavior (Sidebar.jsx lines 100-121):** Items with `public: false` show Lock icon when `!isAuthenticated`. Authenticated users see all items as accessible.
**New behavior:** Items with `public: false` ALSO show Lock icon when user is on free plan (but clicking navigates to the page instead of redirecting to login).

**Key difference from unauthenticated lock:**
- Unauthenticated: button onClick redirects to `/login`
- Free-plan gated: NavLink navigates to the page (which shows UpgradeCTA via FeatureGatedRoute)

The sidebar needs a third rendering branch:
1. `!isAuthenticated && !item.public` => Lock + redirect to login (existing)
2. `isAuthenticated && isFreePlan && !hasAccess(item.href)` => Lock + NavLink to page (NEW)
3. Otherwise => Normal NavLink (existing)

### Pattern 4: FeatureGate Middleware (Backend)
**What:** Laravel middleware checking plan slug before allowing endpoint access.
**Mirrors:** `DeductCredit` middleware pattern (constructor injection, `handle` method, JSON error response).

```php
// backend/app/Http/Middleware/FeatureGate.php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class FeatureGate
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // No user = let auth middleware handle it
        if ($user === null) {
            return $next($request);
        }

        // Trial active = full access
        if ($user->trial_ends_at !== null && $user->trial_ends_at->isFuture() && $user->plan_id === null) {
            return $next($request);
        }

        // Load plan relationship
        $user->loadMissing('plan');

        // Free plan = gated
        if ($user->plan !== null && $user->plan->slug === 'free') {
            return response()->json([
                'error' => 'upgrade_required',
                'message' => 'Upgrade your plan to access this feature',
            ], 403);
        }

        // Paid plans (basic, pro, enterprise) or no plan assigned = allow
        return $next($request);
    }
}
```

**Registration:** Add alias in `bootstrap/app.php`:
```php
$middleware->alias([
    'deduct-credit' => \App\Http\Middleware\DeductCredit::class,
    'feature-gate' => \App\Http\Middleware\FeatureGate::class,
]);
```

### Pattern 5: App.jsx Route Structure Change

Current structure nests all protected routes under one `<ProtectedRoute>`. The new structure nests gated routes under `<FeatureGatedRoute>` within `<ProtectedRoute>`:

```jsx
<Route element={<AppLayout />}>
  {/* Public route -- accessible without auth */}
  <Route path="/threat-search" element={<ThreatSearchPage />} />
  <Route path="/ip-search" element={<Navigate to="/threat-search" replace />} />

  {/* Protected routes -- auth + verified + onboarded */}
  <Route element={<ProtectedRoute />}>
    {/* Settings is NOT gated (D-03) */}
    <Route path="/settings" element={<SettingsPage />} />

    {/* Plan-gated routes -- free plan sees UpgradeCTA */}
    <Route element={<FeatureGatedRoute />}>
      <Route path="/dashboard" element={<ThreatMapPage />} />
      <Route path="/threat-map" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dark-web" element={<DarkWebPage />} />
      <Route path="/threat-actors" element={<ThreatActorsPage />} />
      <Route path="/threat-news" element={<ThreatNewsPage />} />
    </Route>
  </Route>
</Route>
```

### Pattern 6: Backend Route Grouping

Apply `feature-gate` middleware to gated endpoint groups in `routes/api.php`:

```php
// Inside auth:sanctum group, wrap gated routes:
Route::middleware('feature-gate')->group(function () {
    Route::post('/dark-web/search', DarkWebSearchController::class)->middleware('deduct-credit');
    Route::get('/dark-web/status/{taskId}', [DarkWebSearchController::class, 'status']);
    Route::get('/threat-actors', ThreatActorIndexController::class);
    Route::get('/threat-actors/{id}/enrichment', ThreatActorEnrichmentController::class);
    Route::get('/threat-news', ThreatNewsIndexController::class);
    Route::get('/threat-news/labels', ThreatNewsLabelsController::class);
    Route::get('/threat-map/stream', ThreatMapStreamController::class);
});
```

**Dashboard endpoints note:** The dashboard routes (`/dashboard/counts`, `/dashboard/indicators`, `/dashboard/categories`) and `/threat-map/snapshot` are currently PUBLIC (outside `auth:sanctum` group). Per D-14 they should be gated. This requires moving them inside the `auth:sanctum` group AND adding `feature-gate` middleware. However, this is a BREAKING CHANGE for unauthenticated dashboard views (currently supported per PROJECT.md "Public dashboard routes (no auth)"). The CONTEXT.md decision D-14 explicitly lists these as gated, so the plan should address this migration.

### Anti-Patterns to Avoid
- **Checking plan in every page component:** Use the route wrapper instead. Individual pages should not contain plan-check logic.
- **Blocking navigation in sidebar:** D-11 explicitly says clicking locked items navigates to the page (showing UpgradeCTA). Do NOT prevent navigation.
- **Duplicating trial logic:** UserResource already computes `trial_active`. The frontend hook should use `user.trial_active`, not recompute from `trial_ends_at`.
- **Modifying AuthContext:** No changes needed to AuthContext. All data (`user.plan.slug`, `user.trial_active`) is already available.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Plan-check logic | Inline checks in every component | `useFeatureAccess` hook | Single source of truth, tested once, used everywhere |
| Route gating | Per-page if/else guards | `FeatureGatedRoute` wrapper | Consistent with existing ProtectedRoute pattern |
| Lock icon rendering | New lock icon component | Existing Lock from lucide-react + existing sidebar CSS pattern | Already built at Sidebar.jsx lines 104-119 |
| CTA button | Custom button | Existing `GradientButton` component | Design system consistency |

## Common Pitfalls

### Pitfall 1: Dashboard Endpoints Are Currently Public
**What goes wrong:** D-14 gates `/api/dashboard/*` but these routes are currently outside `auth:sanctum` middleware, serving unauthenticated users.
**Why it happens:** Dashboard was intentionally public for unauthenticated map views (PROJECT.md key decision).
**How to avoid:** Move dashboard endpoints inside `auth:sanctum` + `feature-gate` group. Since the frontend dashboard page is already behind ProtectedRoute (requires auth), the public API endpoints are not used by the frontend for unauthenticated users. The threat map snapshot endpoint may need to remain public if the landing page uses it.
**Warning signs:** Unauthenticated API consumers (if any) will break.

### Pitfall 2: Trial Active Edge Case
**What goes wrong:** A user with `plan_id = null` and `trial_ends_at` in the future is on trial (full access). But if `plan_id` is set to free plan AND trial hasn't expired, `trial_active` is `false` (see UserResource line 40: `&& $this->plan_id === null`).
**Why it happens:** Trial downgrade assigns `plan_id` to free plan. If a manual admin action sets plan_id to free before trial expires, trial_active becomes false.
**How to avoid:** The FeatureGate middleware should mirror UserResource logic exactly: trial bypasses gating only when `plan_id === null && trial_ends_at > now`.

### Pitfall 3: SSE Route Name Mismatch
**What goes wrong:** CONTEXT.md D-14 lists `/api/sse/threats` as a gated endpoint, but the actual route is `/api/threat-map/stream` (see api.php line 73).
**Why it happens:** Naming discrepancy in context document.
**How to avoid:** Gate `/api/threat-map/stream`, not `/api/sse/threats`.

### Pitfall 4: Search History Endpoint
**What goes wrong:** `/api/search-history` is auth-required but not in the gated list. Since it serves data for the Threat Search page (which free users CAN access), it should remain ungated.
**Why it happens:** Easy to accidentally include all auth-required routes in the feature-gate group.
**How to avoid:** Only wrap explicitly listed endpoints. Search history, user profile, plan selection, and credit status remain ungated.

### Pitfall 5: API Client 403 Handling
**What goes wrong:** The frontend API client (`api/client.js`) throws errors for non-OK responses but doesn't distinguish 403 "upgrade_required" from other 403s.
**Why it happens:** Current error handling extracts `message` and `errors` but not `error` field.
**How to avoid:** Pages behind FeatureGatedRoute won't make API calls (UpgradeCTA replaces content). But if a race condition occurs (user downgrades mid-session), the API client should handle 403 gracefully. Consider adding `error` field extraction to the client error object.

## Code Examples

### UpgradeCTA Component
```jsx
// frontend/src/components/ui/UpgradeCTA.jsx
import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Lock, Zap } from 'lucide-react';
import { GradientButton } from './GradientButton';
import { useAuth } from '../../contexts/AuthContext';

const PAGE_FEATURES = {
  '/dashboard': { name: 'Dashboard', description: 'Real-time threat map with live attack monitoring' },
  '/threat-actors': { name: 'Threat Actors', description: 'Browse intrusion sets with TTPs, tools, and campaigns' },
  '/threat-news': { name: 'Threat News', description: 'Latest intelligence reports with category filtering' },
  '/dark-web': { name: 'Dark Web', description: 'Search for compromised credentials and data breaches' },
};

export default function UpgradeCTA() {
  const location = useLocation();
  const { user } = useAuth();
  const feature = PAGE_FEATURES[location.pathname] || { name: 'This Feature', description: '' };
  const canStartTrial = user?.trial_days_left > 0 && !user?.plan;

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-surface/60 border border-border backdrop-blur-sm rounded-xl p-10 max-w-lg text-center">
        <div className="w-14 h-14 rounded-full bg-violet/10 border border-violet/20 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-7 h-7 text-violet-light" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">
          Unlock {feature.name}
        </h2>
        <p className="text-text-secondary mb-8">
          {feature.description}
        </p>
        <div className="flex flex-col gap-3">
          <Link to="/pricing">
            <GradientButton size="md" className="w-full">
              <Zap className="w-4 h-4" />
              Upgrade Plan
            </GradientButton>
          </Link>
          {canStartTrial && (
            <Link
              to="/pricing"
              className="text-sm text-text-muted hover:text-cyan transition-colors"
            >
              Or start your free trial
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
```

### NAV_CATEGORIES: Adding `gated` Flag
**Recommendation:** Add a `gated: true` property to items that are plan-restricted. This is simpler than deriving gating from the `public` flag (which means "accessible without auth") and avoids overloading the `public` field.

```javascript
export const NAV_CATEGORIES = Object.freeze([
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', icon: 'dashboard', href: '/dashboard', public: false, gated: true },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { label: 'Threat Search', icon: 'search', href: '/threat-search', public: true, gated: false },
      { label: 'Threat Actors', icon: 'users', href: '/threat-actors', public: false, gated: true },
      { label: 'Threat News', icon: 'rss', href: '/threat-news', public: false, gated: true },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      { label: 'Dark Web', icon: 'incognito', href: '/dark-web', public: false, gated: true },
    ],
  },
]);
```

The sidebar then uses: `item.gated && isFreePlan` to decide lock rendering for authenticated users.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Pest 3.8 (PHP) |
| Config file | `backend/phpunit.xml` |
| Quick run command | `cd backend && php artisan test --filter=FeatureGate` |
| Full suite command | `cd backend && php artisan test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLAN-04 | Free user gets 403 on gated endpoints | Feature | `cd backend && php artisan test --filter=FeatureGateMiddlewareTest -x` | Wave 0 |
| PLAN-04 | Paid user (basic/pro/enterprise) gets 200 on gated endpoints | Feature | `cd backend && php artisan test --filter=FeatureGateMiddlewareTest -x` | Wave 0 |
| PLAN-04 | Trial user gets 200 on gated endpoints | Feature | `cd backend && php artisan test --filter=FeatureGateMiddlewareTest -x` | Wave 0 |
| PLAN-05 | FeatureGate middleware returns correct 403 JSON shape | Feature | `cd backend && php artisan test --filter=FeatureGateMiddlewareTest -x` | Wave 0 |
| PLAN-05 | Threat search endpoint remains accessible to free users | Feature | `cd backend && php artisan test --filter=FeatureGateMiddlewareTest -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && php artisan test --filter=FeatureGate`
- **Per wave merge:** `cd backend && php artisan test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/tests/Feature/FeatureGate/FeatureGateMiddlewareTest.php` -- covers PLAN-04, PLAN-05
- [ ] No frontend test infrastructure exists (per CLAUDE.md "No tests exist") -- frontend verification is manual

## Open Questions

1. **Dashboard Public Endpoints Migration**
   - What we know: D-14 lists `/api/dashboard/*` as gated. These are currently public routes (outside auth:sanctum).
   - What's unclear: Does the landing page or any unauthenticated view consume these endpoints? The threat map snapshot (`/threat-map/snapshot`) is used by the dashboard map widget.
   - Recommendation: Move dashboard stat endpoints (`/dashboard/counts`, `/dashboard/indicators`, `/dashboard/categories`) inside auth+feature-gate. Keep `/threat-map/snapshot` public if landing page needs it. Verify no landing page components call dashboard endpoints.

2. **Trial "Start Free Trial" Option on CTA**
   - What we know: D-08 says CTA should include "Start Free Trial" if trial hasn't been used.
   - What's unclear: How to determine if trial has been used. `user.trial_active` is false for both "trial expired" and "never had trial" (though all users get 30-day trial on creation per User model `booted()` method).
   - Recommendation: Since ALL users get a trial on creation, the "Start Free Trial" option only applies if `trial_days_left > 0` and user has no plan (i.e., still in trial period). In practice, a free-plan user with expired trial will never see this option, which is correct.

## Sources

### Primary (HIGH confidence)
- `backend/app/Http/Resources/UserResource.php` -- Verified user.plan.slug and user.trial_active computation
- `backend/app/Http/Middleware/DeductCredit.php` -- Middleware pattern to follow
- `backend/routes/api.php` -- Current route structure and middleware application
- `frontend/src/components/layout/Sidebar.jsx` -- Lock icon pattern (lines 100-121)
- `frontend/src/components/auth/ProtectedRoute.jsx` -- Route wrapper pattern
- `frontend/src/contexts/AuthContext.jsx` -- User data available on frontend
- `backend/app/Models/User.php` -- Trial assignment on creation (booted method)
- `backend/bootstrap/app.php` -- Middleware alias registration

### Secondary (MEDIUM confidence)
- `backend/app/Services/CreditResolver.php` -- Trial expiry and free plan assignment logic

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new dependencies, all patterns exist in codebase
- Architecture: HIGH -- Direct extension of existing ProtectedRoute and DeductCredit patterns
- Pitfalls: HIGH -- All edge cases verified against actual UserResource and CreditResolver code

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable -- internal codebase patterns)
