# Phase 43: Feature Gating - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Restrict free-plan users to Threat Search only. All other app pages (Dashboard/Threat Map, Threat Actors, Threat News, Dark Web) show an upgrade CTA instead of content. Sidebar shows lock icons on gated pages. Backend middleware rejects API calls from free-plan users to gated endpoints. Basic, Pro, Enterprise, and trial users access everything.

</domain>

<decisions>
## Implementation Decisions

### Gated vs Open Pages
- **D-01:** Threat Search (`/threat-search`) is the ONLY app page accessible to free-plan users (matches PLAN-04)
- **D-02:** Gated pages: Dashboard (`/dashboard`), Threat Actors (`/threat-actors`), Threat News (`/threat-news`), Dark Web (`/dark-web`)
- **D-03:** Settings (`/settings`) remains accessible to all authenticated users — it's account management, not a feature
- **D-04:** Trial users (active trial) get FULL access to all pages, same as paid plans (per Phase 41 D-12)
- **D-05:** Basic, Pro, and Enterprise users have unrestricted access

### Upgrade CTA (Frontend)
- **D-06:** Free users navigating to a gated page see a full-page upgrade CTA that replaces the page content entirely (no partial/blurred content)
- **D-07:** The upgrade CTA is a reusable component (`UpgradeCTA` or similar) shown inside AppLayout (sidebar + topbar remain visible for navigation context)
- **D-08:** CTA includes: feature name they're trying to access, brief value proposition, prominent "Upgrade" button linking to `/pricing`, and a secondary "Start Free Trial" option if trial hasn't been used
- **D-09:** CTA design follows existing glassmorphism card pattern (`bg-surface/60 border border-border backdrop-blur-sm rounded-xl`)

### Sidebar Lock Icons
- **D-10:** Sidebar shows Lock icon on pages the user's plan cannot access — reuses existing Lock icon pattern from unauthenticated state
- **D-11:** Clicking a locked sidebar item navigates to the gated page (which shows UpgradeCTA) instead of blocking navigation — user can see what they're missing
- **D-12:** The lock visual treatment (opacity-40, Lock icon) matches the current unauthenticated pattern for consistency

### Backend Middleware
- **D-13:** New `FeatureGate` middleware (separate from `DeductCredit`) that checks user's plan tier before allowing access to gated API endpoints
- **D-14:** Gated endpoints: `/api/dashboard/*`, `/api/threat-actors`, `/api/threat-news`, `/api/dark-web/*`, `/api/sse/threats`
- **D-15:** Free users hitting gated endpoints receive 403 with JSON: `{ "error": "upgrade_required", "message": "Upgrade your plan to access this feature" }`
- **D-16:** Middleware checks: `user->plan->slug` against allowed list. Free plan (slug: "free") is gated. Trial active (`trial_ends_at > now`) bypasses gating.

### Plan Detection (Frontend)
- **D-17:** AuthContext user object already includes `user.plan.slug` and `user.trial_active` — use these for frontend gating decisions
- **D-18:** Create a `useFeatureAccess` hook or utility that determines if current user can access a given feature, centralizing the plan check logic

### Claude's Discretion
- Exact UpgradeCTA copy and visual layout (within glassmorphism constraint)
- Whether to use a route-level wrapper component (like ProtectedRoute) or page-level checks
- NAV_CATEGORIES data structure changes (adding a `gated` flag vs deriving from plan)
- Whether FeatureGate middleware uses a config array or hardcoded route list

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Plan System
- `backend/app/Models/Plan.php` — Plan model with slug field
- `backend/app/Models/User.php` — User model with plan relationship and trial fields
- `backend/app/Services/CreditResolver.php` — Credit resolution with trial handling
- `backend/app/Http/Middleware/DeductCredit.php` — Existing credit middleware pattern to follow

### Frontend Auth & Navigation
- `frontend/src/contexts/AuthContext.jsx` — Auth context exposing user object with plan data
- `frontend/src/components/layout/Sidebar.jsx` — Current nav with public/auth lock pattern (line 101-121)
- `frontend/src/data/mock-data.js` — NAV_CATEGORIES with `public` flag per item (line 135-156)
- `frontend/src/App.jsx` — Router structure with ProtectedRoute wrapper
- `frontend/src/components/auth/ProtectedRoute.jsx` — Auth guard pattern to extend or mirror for plan gating

### Layout
- `frontend/src/components/layout/AppLayout.jsx` — Layout wrapper where gated pages render
- `frontend/src/components/layout/Topbar.jsx` — Shows plan chip (line 72)

### Backend Routes
- `backend/routes/api.php` — API route definitions where middleware will be applied

### Requirements
- `.planning/REQUIREMENTS.md` — PLAN-04, PLAN-05

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Sidebar already has Lock icon + opacity-40 pattern for unauthenticated users — same visual can be reused for plan-gated items
- `user.plan.slug` and `user.trial_active` already available via AuthContext
- Topbar plan chip already reads `user?.plan?.name` — plan data flows to frontend
- GradientButton component available for CTA buttons
- Glassmorphism card pattern used throughout (`bg-surface/60 border border-border backdrop-blur-sm`)

### Established Patterns
- Route-level guards: ProtectedRoute wraps auth-required routes in App.jsx
- Middleware pattern: DeductCredit middleware checks credits per request
- NAV_CATEGORIES uses `public: boolean` — extend with `gated: boolean` or derive from plan

### Integration Points
- App.jsx router needs a new wrapper (PlanGatedRoute or similar) around gated routes
- Sidebar needs to read user plan to determine lock state (currently only checks isAuthenticated)
- Backend needs FeatureGate middleware registered on gated route groups
- Frontend API client should handle 403 upgrade_required responses gracefully

</code_context>

<specifics>
## Specific Ideas

- The upgrade CTA should feel encouraging, not punitive — "Unlock Threat Map" not "Access Denied"
- Sidebar locks should look the same as unauthenticated locks for visual consistency
- Trial users should never see any gating — full access during trial period
- Settings page must stay accessible (it's account management, not a gated feature)

</specifics>

<deferred>
## Deferred Ideas

- Per-feature gating (e.g., Dark Web only for Pro+) — out of scope per PROJECT.md, credit-only + plan-level is sufficient
- Real payment processing integration with plan selection — PAY-01, PAY-02 tracked for future
- Admin dashboard for managing plan assignments — ADMIN-01

</deferred>

---

*Phase: 43-feature-gating*
*Context gathered: 2026-04-11*
