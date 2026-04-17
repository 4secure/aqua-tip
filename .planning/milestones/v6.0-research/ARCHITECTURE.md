# Architecture Patterns

**Domain:** v4.0 Feature Integration into Existing Threat Intelligence Platform
**Researched:** 2026-04-10
**Confidence:** HIGH (all recommendations based on direct codebase analysis of existing patterns)

## Recommended Architecture

Five new features integrating into the existing React 19 SPA + Laravel 12 backend. Every feature touches existing code; no greenfield systems.

### Integration Map

```
Feature                        Frontend Touch Points              Backend Touch Points
-----------------------------  ---------------------------------  ----------------------------------
1. Feature Gating (Free tier)  Sidebar, mock-data.js, new util    Plan model (allowed_routes col),
                               new PlanGatedRoute                 new CheckFeatureAccess middleware
2. Auth FOUC Fix               App.jsx (AppContent wrapper)       None (pure frontend)
3. Contact Form Email          ContactUsPage.jsx, apiClient       New ContactController + Mailable,
                                                                  api.php route, throttle
4. D3 Zoom Controls            ThreatSearchPage.jsx (D3Graph fn)  None (pure frontend)
5. Pricing Dual Layout         App.jsx (route move),              None (pure frontend)
                               PricingPage.jsx (conditional nav)
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `AuthContext` | Holds user + plan data, `loading` state for FOUC gate | Every component via `useAuth()` |
| `Plan` model | Stores plan metadata including allowed routes | `CreditResolver`, `CheckFeatureAccess` middleware |
| `CheckFeatureAccess` middleware | Blocks API calls to gated features for Free tier | `Plan` model, request user |
| `Sidebar` | Renders nav items with plan-aware lock/upgrade icons | `useAuth()` for plan slug |
| `PlanGatedRoute` | Redirects Free users away from restricted routes | `useAuth()` for plan data |
| `planAccess.js` utility | Pure function: plan hierarchy comparison | Nav data, route guards |
| `ContactController` | Validates + dispatches contact email | Laravel Mail (existing config) |
| `D3Graph` (modified) | Force-directed graph with zoom/pan controls | D3 library (already loaded) |
| `PricingPage` (modified) | Dual layout: hides own navbar when inside AppLayout | `useAuth()`, React Router |

## Feature 1: Free Plan Feature Gating

### Problem
Free plan users should only access Threat Search. Plan info already exists on the user object (`user.plan.slug`, `user.plan.features`) but no route/feature restriction exists beyond auth vs guest.

### Architecture Decision: Frontend-Primary Gating with Backend Enforcement

Use frontend gating for UX (sidebar locks, redirects) and backend middleware for enforcement (API 403s).

### Frontend Changes

**1. Extend `NAV_CATEGORIES` in `mock-data.js`:**
Add a `minPlan` field to nav items. `null` means everyone (including guests).

```javascript
{ label: 'Threat Search', icon: 'search', href: '/threat-search', public: true, minPlan: null },
{ label: 'Dashboard', icon: 'dashboard', href: '/dashboard', public: false, minPlan: 'basic' },
{ label: 'Threat Actors', icon: 'users', href: '/threat-actors', public: false, minPlan: 'basic' },
{ label: 'Threat News', icon: 'rss', href: '/threat-news', public: false, minPlan: 'basic' },
{ label: 'Dark Web', icon: 'incognito', href: '/dark-web', public: false, minPlan: 'pro' },
```

**2. Plan access utility (new file `utils/planAccess.js`):**

```javascript
const PLAN_HIERARCHY = { free: 0, trial: 1, basic: 1, pro: 2, enterprise: 3 };

export function canAccessFeature(userPlanSlug, isTrialActive, minPlan) {
  if (!minPlan) return true;
  const effectiveSlug = isTrialActive ? 'trial' : (userPlanSlug ?? 'free');
  return (PLAN_HIERARCHY[effectiveSlug] ?? 0) >= (PLAN_HIERARCHY[minPlan] ?? 0);
}
```

Trial users get Basic-equivalent access (level 1), matching current trial behavior.

**3. Sidebar.jsx modification (lines 100-121):**
Current sidebar has a two-state check: `isAccessible = item.public || isAuthenticated`. Extend to three states:
- Guest (not authenticated): show lock icon + "Log in" redirect (existing behavior)
- Authenticated but plan-restricted: show lock icon + "Upgrade" label, navigate to `/pricing`
- Accessible: normal NavLink (existing behavior)

**4. New `PlanGatedRoute` component:**
Similar to existing `ProtectedRoute` pattern. Wraps route groups that require a minimum plan level. Redirects to `/pricing` with a flash message when plan is insufficient.

```jsx
// components/auth/PlanGatedRoute.jsx
export default function PlanGatedRoute({ minPlan = 'basic' }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  const planSlug = user?.plan?.slug ?? 'free';
  const isTrialActive = user?.trial_active === true;
  if (!canAccessFeature(planSlug, isTrialActive, minPlan)) {
    return <Navigate to="/pricing" state={{ upgrade: minPlan }} replace />;
  }
  return <Outlet />;
}
```

### Backend Changes

**1. Add `allowed_routes` JSON column to `plans` table:**

```php
// Migration
Schema::table('plans', function (Blueprint $table) {
    $table->json('allowed_routes')->nullable();
});
```

Seeder values:
- Free: `["threat-search"]`
- Basic: `["threat-search", "threat-actors", "threat-news", "dashboard"]`
- Pro/Enterprise: all routes

**2. New `CheckFeatureAccess` middleware:**

```php
class CheckFeatureAccess
{
    public function handle(Request $request, Closure $next, string $feature): Response
    {
        $user = $request->user();
        if (!$user) return $next($request); // Guest access handled elsewhere

        // Trial users get Basic-equivalent access
        if ($user->trial_ends_at?->isFuture() && $user->plan_id === null) {
            $plan = Plan::where('slug', 'basic')->first();
        } else {
            $plan = $user->plan ?? Plan::where('slug', 'free')->first();
        }

        $allowed = $plan->allowed_routes ?? [];
        if (!in_array($feature, $allowed, true)) {
            return response()->json([
                'message' => 'Upgrade your plan to access this feature',
                'current_plan' => $plan->slug,
            ], 403);
        }
        return $next($request);
    }
}
```

**3. Apply to gated API routes in `api.php`:**

```php
Route::get('/threat-actors', ThreatActorIndexController::class)->middleware('feature:threat-actors');
Route::get('/threat-news', ThreatNewsIndexController::class)->middleware('feature:threat-news');
Route::get('/threat-map/stream', ThreatMapStreamController::class)->middleware('feature:dashboard');
```

**4. Expose `allowed_routes` in UserResource:**
Add `allowed_routes` to the plan sub-object so frontend can use it for gating decisions without hardcoding.

### Why This Approach

- Trial users (no plan_id, trial_ends_at future) get Basic-equivalent access, matching existing `CreditResolver` trial logic.
- Backend enforcement prevents curl/API abuse even if frontend is bypassed.
- Sidebar visual gating provides clear upgrade path.
- No new Context provider needed -- plan data already lives in `useAuth().user.plan`.

## Feature 2: Auth FOUC Fix

### Problem
On page load, `AuthContext` calls `fetchCurrentUser()`. Until the response returns (~50-200ms), `loading` is `true` but only `ProtectedRoute` checks it. Public routes (landing, threat search, pricing) render immediately with `user: null`, then re-render when auth resolves. This causes:
- Flash of "Sign in" buttons before switching to authenticated UI
- Sidebar flashing unauthenticated state
- Topbar plan chip appearing with delay

### Architecture Decision: Global Loading Gate in App.jsx

Block all rendering until auth resolves. Single change point.

### Implementation

Extract routes into an `AppContent` component inside `AuthProvider`:

```jsx
function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img src="/logo.png" alt="Aqua Tip" className="w-10 h-10 animate-pulse" />
          <div className="w-8 h-8 border-2 border-violet border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<LazyFallback />}>
      <Routes>{/* ... existing routes unchanged ... */}</Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
```

### Why This Approach

- **Single point of control** -- one loading gate replaces scattered checks.
- **`AppContent` must be inside `AuthProvider`** -- `useAuth()` requires context. Current `Routes` is a direct child of `AuthProvider`, so extracting to `AppContent` is cleanest.
- **Branded loading** -- logo + spinner matches design system. Already used in `LazyFallback` and `ProtectedRoute`.
- **No performance concern** -- GET `/api/user` with Sanctum cookie resolves in 50-200ms. On unauthenticated sessions, the 401 is equally fast.
- **ProtectedRoute loading check** becomes redundant but harmless -- leave for defense-in-depth.

### What NOT to Do

- Do NOT cache auth state in `sessionStorage`/`localStorage`. Sanctum cookie sessions are the source of truth. Caching creates stale-auth bugs.
- Do NOT use `startTransition` or deferred rendering. Auth check must block.

## Feature 3: Enterprise Contact Form Email

### Problem
`ContactUsPage.jsx` has a form (name, email, message) that does nothing -- `handleSubmit` sets `submitted: true` without any API call (line 14-17).

### Architecture Decision: New API Endpoint + Laravel Mailable

Reuse existing Laravel Mail configuration (already used for email verification).

### Backend Changes

**1. `ContactRequest` form request** with name (max 100), email, message (max 5000), optional `plan_interest` field.

**2. `ContactMailable`** using `replyTo` set to sender's email, subject differentiated for enterprise inquiries. Sends to `config('mail.admin_address')`.

**3. `ContactController`** -- invokable, dispatches mailable synchronously (`Mail::send`, not `Mail::queue` -- low volume).

**4. Route:** `Route::post('/contact', ContactController::class)->middleware('throttle:3,60');`

The `throttle:3,60` limits to 3 requests per 60 minutes per IP. No auth required -- enterprise inquiries come from non-users. No CAPTCHA needed at this volume.

### Frontend Changes

Modify `ContactUsPage.jsx`:
- Replace fake `handleSubmit` with `apiClient.post('/api/contact', form)` call
- Add loading state during submission, error handling with user-friendly message
- Accept `plan_interest` via URL query param (`/contact?plan=enterprise`) from pricing page Enterprise "Contact Us" button
- Parse with `useSearchParams` and include in POST body

### Why This Approach

- Reuses existing Mail config -- no new SMTP setup.
- `replyTo` header lets admin reply directly to the sender.
- Rate limiting at route level prevents spam without CAPTCHA complexity.
- Synchronous mail is fine for expected volume (<10/day).

## Feature 4: D3 Relationship Graph Zoom Controls

### Problem
The `D3Graph` function in `ThreatSearchPage.jsx` (lines 36-134) renders a force-directed graph but has no zoom/pan. Users with complex graphs cannot navigate.

### Architecture Decision: D3 Zoom Behavior + Overlay Buttons

`d3.zoom()` on the SVG with all graph elements in a child `<g>` group. Overlay buttons for zoom in/out/reset.

### Implementation

**1. Refactor SVG structure** -- currently links, labels, and nodes are appended directly to `svg`. Wrap in a child `<g>`:

```javascript
const g = svg.append('g');
// Move all appends from svg to g:
const link = g.append('g').selectAll('line')...
const linkLabel = g.append('g').selectAll('text')...
const node = g.append('g').selectAll('g')...
```

**2. Add zoom behavior:**

```javascript
const zoom = d3.zoom()
  .scaleExtent([0.3, 4])
  .on('zoom', (event) => g.attr('transform', event.transform));

svg.call(zoom);
// Store ref for button controls
containerRef.current.__d3Zoom = zoom;
containerRef.current.__d3Svg = svg;
```

**3. Add zoom buttons (JSX in D3Graph return):**

Three buttons (+ - R) positioned `absolute top-3 right-3` over the graph container. Styled with `bg-surface-2/90 border border-border rounded-md` to match design system.

- Zoom in: `svg.transition().call(zoom.scaleBy, 1.3)`
- Zoom out: `svg.transition().call(zoom.scaleBy, 0.7)`
- Reset: `svg.transition().call(zoom.transform, d3.zoomIdentity)`

### Key Details

- **Drag + zoom coexistence:** `d3.drag()` on nodes (line 103) and `d3.zoom()` on SVG coexist correctly. D3 drag stops event propagation, preventing zoom during node drag. This is built-in D3 behavior.
- **Store references on `containerRef.current`** rather than React state to avoid re-renders. Zoom state is D3-managed, not React-managed.
- **`scaleExtent([0.3, 4])`** prevents over-zoom.
- **Zero new dependencies** -- D3 already provides `d3.zoom()`.

## Feature 5: Pricing Page Dual Layout

### Problem
`PricingPage.jsx` renders as standalone with its own navbar (lines 65-97). Authenticated users lose the app layout when visiting from the topbar "Upgrade" button.

### Architecture Decision: Move Route Inside AppLayout, Conditional Navbar

**Place `/pricing` inside `AppLayout` but outside `ProtectedRoute` (same pattern as `/threat-search`). PricingPage conditionally hides its own navbar when user is authenticated.**

### Implementation

**1. Move route in `App.jsx`:**

```jsx
{/* Remove from standalone routes */}
{/* <Route path="/pricing" element={<PricingPage />} /> */}

{/* Add inside AppLayout, outside ProtectedRoute */}
<Route element={<AppLayout />}>
  <Route path="/threat-search" element={<ThreatSearchPage />} />
  <Route path="/pricing" element={<PricingPage />} />
  <Route element={<ProtectedRoute />}>
    {/* ... protected routes ... */}
  </Route>
</Route>
```

**2. Modify `PricingPage.jsx`:**

```jsx
export default function PricingPage() {
  const { user } = useAuth();

  return (
    <div className={user ? '' : 'min-h-screen bg-primary'}>
      {/* Public navbar only when not inside AppLayout */}
      {!user && <PublicNavbar />}

      <div className={user ? 'py-8' : 'px-12 py-16'}>
        {/* ... plan cards content unchanged ... */}
      </div>
    </div>
  );
}
```

### Why This Approach

- **`/threat-search` already uses this exact pattern** -- inside `AppLayout`, outside `ProtectedRoute`, accessible by guests. Proven pattern.
- **Single route, single component** -- no duplication, no redirect overhead.
- **PricingPage already checks `user`** (line 75 toggles button text). Adding navbar conditional is minimal.
- **Topbar "Upgrade" link** already points to `/pricing` -- no link changes.
- **Public visitors see sidebar in guest mode** which helps platform discoverability.

### What Changes in PricingPage.jsx

1. Wrap the `<nav>` element (lines 65-97) in `{!user && ...}` conditional
2. Remove `min-h-screen bg-primary` from outer div when embedded (AppLayout provides background)
3. Adjust padding from `px-12 py-16` to `py-8` when user is authenticated (sidebar provides left margin)

## Build Order (Dependency-Aware)

```
Phase 1: Auth FOUC Fix
  No dependencies. Unblocks clean development of all other features.
  Prevents confusing flash behavior during feature gating work.
  Touches: App.jsx only (extract AppContent component)

Phase 2: Plan Seeder + Backend Feature Gating
  Updates PlanSeeder with new tiers, credits, allowed_routes.
  Adds allowed_routes column migration + CheckFeatureAccess middleware.
  Updates CreditResolver constants for new tier values.
  Touches: PlanSeeder.php, CreditResolver.php, new migration, new middleware, api.php

Phase 3: Frontend Feature Gating
  Depends on Phase 2 (plan data with allowed_routes must exist in /api/user response).
  Touches: mock-data.js (minPlan field), Sidebar.jsx (3-state logic), new planAccess.js, new PlanGatedRoute.jsx

Phase 4: Pricing Dual Layout
  Depends on Phase 1 (FOUC fix prevents flash of wrong layout).
  Depends on Phase 3 (feature gating determines upgrade CTAs on pricing).
  Touches: App.jsx (route move), PricingPage.jsx (conditional navbar removal)

Phase 5: Contact Form Email
  Depends on Phase 2 (plan_interest references new plan slugs).
  Independent of frontend gating otherwise.
  Touches: ContactUsPage.jsx, new ContactController, ContactMailable, ContactRequest

Phase 6: D3 Zoom Controls
  Fully independent. Can parallel with Phase 4 or 5.
  Touches: ThreatSearchPage.jsx (D3Graph function only, ~30 lines changed)
```

### Dependency Graph

```
Phase 1 (FOUC) -----> Phase 4 (Pricing Layout)
                  |
Phase 2 (Backend) --> Phase 3 (Frontend Gating) --> Phase 4 (Pricing Layout)
                  |
                  --> Phase 5 (Contact Form)

Phase 6 (D3 Zoom) -- independent, any time after Phase 1
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Separate PlanContext Provider
**What:** Creating a new `PlanContext` to hold plan/gating state.
**Why bad:** Plan data already lives in `AuthContext.user.plan`. Second provider creates sync issues and unnecessary re-renders.
**Instead:** Read `user.plan.slug` from `useAuth()`. Extract `usePlanAccess()` hook if logic gets complex.

### Anti-Pattern 2: Client-Only Feature Gating
**What:** Only checking plan access in frontend without backend enforcement.
**Why bad:** Any authenticated user can call API endpoints directly. Free tier users access premium data via curl.
**Instead:** Always enforce on backend via middleware. Frontend gating is UX; backend gating is security.

### Anti-Pattern 3: localStorage Auth Cache for FOUC
**What:** Caching user data in localStorage to skip loading screen.
**Why bad:** Stale auth state shows logged-in UI when session expired. Cookie-based Sanctum sessions are the source of truth.
**Instead:** Show branded loading screen for 50-200ms while auth resolves.

### Anti-Pattern 4: Dual Route Registration for Pricing
**What:** `/pricing` (public) and `/app-pricing` (authenticated) pointing to same component.
**Why bad:** Two URLs for same content, back-button confusion, link management.
**Instead:** Single `/pricing` inside `AppLayout` (same as `/threat-search`), conditional navbar.

### Anti-Pattern 5: Separate Zoom SVG Overlay
**What:** Creating a separate canvas/SVG for D3 zoom controls.
**Why bad:** DOM complexity, z-index conflicts.
**Instead:** HTML buttons positioned over the SVG container. Standard pattern for map/graph controls.

## Files Changed Summary

### New Files (7)

| File | Purpose |
|------|---------|
| `frontend/src/utils/planAccess.js` | Plan hierarchy comparison utility |
| `frontend/src/components/auth/PlanGatedRoute.jsx` | Route guard for plan-restricted routes |
| `backend/app/Http/Middleware/CheckFeatureAccess.php` | API-level plan enforcement |
| `backend/app/Http/Controllers/Contact/ContactController.php` | Contact form endpoint |
| `backend/app/Http/Requests/ContactRequest.php` | Contact form validation |
| `backend/app/Mail/ContactMailable.php` | Contact form email template |
| `backend/resources/views/emails/contact.blade.php` | Email view template |

### Modified Files (8)

| File | Change | Risk |
|------|--------|------|
| `frontend/src/App.jsx` | Extract AppContent for FOUC fix + move pricing route | LOW |
| `frontend/src/data/mock-data.js` | Add `minPlan` to NAV_CATEGORIES items | LOW |
| `frontend/src/components/layout/Sidebar.jsx` | 3-state nav item logic (guest/plan-locked/accessible) | MEDIUM |
| `frontend/src/pages/PricingPage.jsx` | Conditional navbar, adjusted padding | LOW |
| `frontend/src/pages/ContactUsPage.jsx` | Wire API call, loading/error states | LOW |
| `frontend/src/pages/ThreatSearchPage.jsx` | D3Graph zoom: g wrapper + zoom behavior + buttons | MEDIUM |
| `backend/routes/api.php` | Add contact route, feature middleware on gated routes | LOW |
| `backend/database/seeders/PlanSeeder.php` | New tiers, allowed_routes | LOW |

### New Migration (1)

| Migration | Change |
|-----------|--------|
| `add_allowed_routes_to_plans` | JSON `allowed_routes` column on plans table |

### Backend Config (1)

| File | Change |
|------|--------|
| `backend/config/mail.php` | Add `admin_address` config key |

## Sources

- Direct codebase analysis: `AuthContext.jsx`, `App.jsx`, `ProtectedRoute.jsx`, `Sidebar.jsx`, `PricingPage.jsx`, `ContactUsPage.jsx`, `ThreatSearchPage.jsx` (D3Graph), `CreditResolver.php`, `DeductCredit.php`, `PlanSeeder.php`, `UserResource.php`, `api.php`, `mock-data.js`
- D3 zoom behavior: standard D3 pattern (d3.zoom + child g transform) -- HIGH confidence, well-established
- Laravel Mail: existing codebase uses Mail for verification -- HIGH confidence
- React Router nested layouts: existing codebase uses AppLayout + ProtectedRoute pattern -- HIGH confidence
