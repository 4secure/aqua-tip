# Project Research Summary

**Project:** AQUA TIP v4.0 -- Plan Overhaul & UX Polish
**Domain:** Threat Intelligence Platform -- incremental feature additions to live SPA
**Researched:** 2026-04-10
**Confidence:** HIGH

## Executive Summary

AQUA TIP v4.0 is a focused milestone that restructures the plan/pricing system, adds feature gating for free-tier users, and polishes several UX rough edges (auth FOUC, chart improvements, D3 zoom, contact form). The critical finding across all research is that **zero new dependencies are needed**. Every feature is achievable with the existing stack: Laravel 12 Mail for contact emails, D3's built-in `d3.zoom()` for graph interaction, Chart.js `type: 'bar'` for new charts, and React state gating for the auth FOUC fix. This continues the project's strong pattern of shipping without dependency bloat.

The recommended approach is a dependency-ordered build starting with the plan data restructure (seeder + credit sync), then the auth FOUC fix, then feature gating (backend enforcement + frontend UX), followed by independent frontend improvements (charts, D3 zoom, contact form, polish). The most important architectural decision is treating trial as a user state (not a plan row) to avoid breaking the existing `CreditResolver` trial expiry logic. Feature gating must be enforced on both frontend (UX) and backend (security) simultaneously.

The key risks are: (1) plan seeder updating credit limits without syncing the denormalized `credits` table, causing stale limits until midnight reset; (2) creating a `trial` plan slug that conflicts with the existing trial-as-user-state pattern, breaking auto-downgrade; (3) implementing feature gating only in the frontend, allowing free users to bypass restrictions via direct API calls. All three are preventable with the specific mitigations documented in PITFALLS.md and built into the phase structure below.

## Key Findings

### Recommended Stack

No new packages. All v4.0 features use existing dependencies. See [STACK.md](./STACK.md) for feature-by-feature analysis.

**Core technologies (all already present):**
- **Laravel Mail** (`illuminate/mail`): Contact form email via existing SMTP config -- already sending verification emails
- **D3 `d3.zoom()`** (part of `d3@^7.9.0`): Graph zoom/pan -- already bundled, unused module
- **Chart.js `type: 'bar'`** (`chart.js@^4.5.1`): Horizontal bar charts -- already registered via `chart.js/auto`
- **React `useState`/`useAuth()`**: Auth FOUC fix -- `AuthContext.loading` state already exists, just needs global gating
- **`plans.features` JSON column**: Feature gating -- column exists with array cast, needs structured `gates` data

### Expected Features

See [FEATURES.md](./FEATURES.md) for full landscape with implementation details.

**Must have (table stakes):**
- Auth FOUC fix -- loading gate until auth resolves; every SPA with cookie auth must handle this
- Plan seeder with updated pricing/credits -- stale plan data breaks the entire credit system
- "Fetching data" loading states -- showing "Connection lost" during loading signals instability
- Dashboard renamed to Threat Map -- naming mismatch confuses navigation
- Breadcrumb capitalization and settings alignment -- visual polish baseline

**Should have (differentiators):**
- Free plan feature gating -- core conversion lever; restricts free users to threat search only
- Enterprise contact form with email -- "Contact Sales" CTA must actually reach someone
- Category bar charts (dashboard + threat news) -- improves data readability
- D3 zoom controls -- makes relationship graphs navigable
- Pricing page auth-aware routing -- authenticated users keep sidebar context

**Defer (beyond v4.0):**
- Stripe payment processing -- no validated demand yet
- Feature flag service (LaunchDarkly) -- static 4-tier gating does not need it
- WebSocket for real-time updates -- SSE already works
- Email drip campaigns -- requires CAN-SPAM compliance infrastructure
- D3 minimap -- overkill for <50 node graphs

### Architecture Approach

Five features integrating into the existing React 19 SPA + Laravel 12 backend. No greenfield systems. The architecture follows a frontend-primary gating pattern with backend enforcement: the frontend provides UX (sidebar lock icons, upgrade CTAs, route guards) while the backend provides security (middleware checking plan access on API routes). See [ARCHITECTURE.md](./ARCHITECTURE.md) for component boundaries, implementation details, and dependency graph.

**Major components:**
1. **`CheckFeatureAccess` middleware** (new) -- backend enforcement of plan-tier gating on API routes
2. **`PlanGatedRoute` component** (new) -- frontend route guard redirecting free users to pricing
3. **`planAccess.js` utility** (new) -- pure function for plan hierarchy comparison
4. **`AuthGate` wrapper** (new) -- global loading gate in App.jsx blocking render until auth resolves
5. **`ContactController` + `ContactMailable`** (new) -- contact form backend with rate limiting and honeypot

**New files:** 7 | **Modified files:** 8 | **New migration:** 1

### Critical Pitfalls

See [PITFALLS.md](./PITFALLS.md) for full analysis with warning signs, recovery strategies, and a "looks done but isn't" verification checklist.

1. **Plan seeder credit desync** -- Changing `daily_credit_limit` in seeder does not update the denormalized `credits.limit` until next midnight reset. Ship an atomic credit sync migration alongside the seeder.
2. **Trial plan slug conflict** -- Creating a `trial` row in the plans table breaks `CreditResolver::checkTrialExpiry()` which requires `plan_id === null`. Keep trial as user state, not a plan row.
3. **Frontend-only feature gating** -- Hiding sidebar links without backend middleware lets free users call gated API endpoints directly. Always enforce with `CheckFeatureAccess` middleware on backend routes.
4. **Auth FOUC on public pages** -- The fix must be a global `AuthGate` wrapper, not per-route checks. Public routes (pricing, threat search) flash unauthenticated UI without the global gate.
5. **D3 zoom captures drag events** -- Zoom on SVG and drag on nodes must coexist with `stopPropagation` in the drag start handler. Content must be in a child `<g>` group.

## Implications for Roadmap

Based on research, suggested 6-phase structure:

### Phase 1: Plan Data Restructure
**Rationale:** Every gating feature depends on correct plan data. Must come first.
**Delivers:** Updated plan seeder with new tiers/credits, atomic credit sync migration, CreditResolver constant updates, `allowed_routes` JSON column on plans table
**Addresses:** Plan seeder update (table stakes), credit limit consistency
**Avoids:** Pitfall 1 (credit desync) by shipping credit sync atomically with seeder; Pitfall 2 (trial slug conflict) by keeping trial as user state
**Key decision:** Do NOT create a `trial` plan slug. Trial remains `plan_id = null` + `trial_ends_at`.

### Phase 2: Auth FOUC Fix
**Rationale:** Must resolve before feature gating work; prevents confusing flash behavior during development and testing of all subsequent phases
**Delivers:** Global `AuthGate` wrapper in App.jsx, branded loading screen (logo + spinner on bg-primary)
**Addresses:** Auth FOUC fix (table stakes)
**Avoids:** Pitfall 4 (FOUC on public pages) by gating globally, not per-route

### Phase 3: Feature Gating
**Rationale:** Core value proposition of v4.0; depends on Phase 1 (plan data) and Phase 2 (FOUC fix prevents flash of wrong gating state)
**Delivers:** Backend `CheckFeatureAccess` middleware, frontend `PlanGatedRoute`, sidebar 3-state nav logic (guest/plan-locked/accessible), lock icons, upgrade CTAs, pricing page moved inside AppLayout
**Addresses:** Free plan feature gating (differentiator), pricing auth-aware routing (differentiator)
**Avoids:** Pitfall 3 (frontend-only gating) by shipping backend middleware simultaneously; Pitfall 7 (pricing dual-layout flash) by using the proven `/threat-search` pattern

### Phase 4: Chart and Visualization Improvements
**Rationale:** Independent frontend work; no backend dependencies beyond existing APIs
**Delivers:** Horizontal bar chart in dashboard right panel, threat news category chart redesign, D3 zoom controls with +/- buttons, dashboard rename to Threat Map
**Addresses:** Category bar charts (differentiator), D3 zoom (differentiator), dashboard rename (table stakes)
**Avoids:** Pitfall 5 (D3 zoom/drag conflict) by using zoom layer pattern with `stopPropagation`

### Phase 5: Enterprise Contact Form
**Rationale:** Backend endpoint with SMTP; independent but benefits from plan slugs being finalized in Phase 1
**Delivers:** Working contact form sending email via Laravel Mail, rate limiting (3/hour/IP), honeypot spam protection, time-based bot detection
**Addresses:** Enterprise contact form (differentiator)
**Avoids:** Pitfall 6 (spam abuse) by shipping rate limit + honeypot + time check together

### Phase 6: UI Polish
**Rationale:** Lowest risk, no dependencies, can be parallelized internally
**Delivers:** "Fetching data" loading states replacing connection errors, breadcrumb capitalization, settings profile alignment, top icon contextual navigation, landing page animation polish
**Addresses:** All remaining table stakes and polish items

### Phase Ordering Rationale

- **Phase 1 before Phase 3:** Feature gating reads from plan data and `allowed_routes`; plan structure must be finalized first
- **Phase 2 before Phase 3:** FOUC fix prevents confusing flash states during feature gating development and is required for pricing dual-layout to work cleanly
- **Phase 3 before Phase 4:** Pricing auth-aware routing depends on gating being in place; dashboard rename in Phase 4 is a text-only follow-up
- **Phases 4, 5, 6 are independent:** Can run in parallel or any order after Phase 3
- **Phase 4 groups all chart/viz work:** D3 zoom, bar charts, and dashboard rename share no dependencies but benefit from focused visual testing
- **Phase 6 last:** Polish items are lowest priority and risk; defer if timeline is tight

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Feature Gating):** Medium complexity -- 3-state sidebar logic, route guards, backend middleware, and pricing layout changes all interleave. Needs careful task sequencing to avoid regression on guest access to threat search.

Phases with standard patterns (skip `/gsd:research-phase`):
- **Phase 1 (Plan Data):** Well-documented Laravel seeder + migration pattern
- **Phase 2 (Auth FOUC):** 5-line `AuthGate` component; standard React SPA pattern
- **Phase 4 (Charts/D3):** D3 zoom and Chart.js bar are extensively documented with existing codebase patterns to follow
- **Phase 5 (Contact Form):** Standard Laravel Mailable + controller pattern; existing SMTP config already working
- **Phase 6 (UI Polish):** CSS adjustments, text changes, and loading state pattern fixes only

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new dependencies; all features verified against existing package versions and working codebase patterns |
| Features | HIGH | Feature list derived from PROJECT.md analysis; implementation approaches validated against codebase with exact line references |
| Architecture | HIGH | All recommendations based on direct codebase analysis of existing patterns (AuthContext, ProtectedRoute, CreditResolver, ThreatSearchPage D3Graph) |
| Pitfalls | HIGH | Pitfalls identified from actual code paths (CreditResolver trial logic, D3Graph drag handlers, PlanSeeder updateOrCreate); includes verification queries and recovery strategies |

**Overall confidence:** HIGH

### Gaps to Address

- **Pricing page dual layout approach:** ARCHITECTURE.md proposes moving `/pricing` inside AppLayout (same as `/threat-search`), but PITFALLS.md warns this may cause flash or route conflicts. The simpler approach (keep standalone with navigation link for auth users) may suffice. Validate during Phase 3 planning.
- **Contact form email queuing vs sync:** PITFALLS.md recommends `Mail::queue()` to avoid blocking HTTP responses, but this requires a queue driver configured on Railway. If no queue driver is available, synchronous send is acceptable at expected volume (<10/day). Verify Railway queue setup during Phase 5.
- **Chart.js canvas lifecycle on navigation:** Multiple charts across dashboard and threat news pages may cause "Canvas is already in use" errors. Verify `chart.destroy()` cleanup in useEffect during Phase 4 implementation.
- **Plan change immediate effect:** When a user upgrades plans, the credit badge and plan chip must update immediately (not at next midnight). The `refreshUser()` call in AuthContext must be triggered in the plan selection success handler. Verify during Phase 1/3 integration.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of 15+ files: AuthContext.jsx, App.jsx, ProtectedRoute.jsx, Sidebar.jsx, PricingPage.jsx, ContactUsPage.jsx, ThreatSearchPage.jsx, CreditResolver.php, PlanSeeder.php, Plan.php, UserResource.php, api.php, mock-data.js, useChartJs.js, ThreatMapDonut.jsx
- D3 zoom documentation: https://d3js.org/d3-zoom
- Chart.js bar chart docs: https://www.chartjs.org/docs/latest/charts/bar.html
- Laravel Mail (framework core, verified via existing VerifyEmailWithCode notification)

### Secondary (MEDIUM confidence)
- Feature gating patterns: DEV Community (Aniefon Umanah), Orb blog
- SaaS pricing page best practices: PipelineRoad, Webstacks
- D3 zoom + React integration: Swizec blog, AntStack blog
- Auth FOUC patterns: Auth0 Community
- D3 network graphs with zoom: AntStack blog

### Tertiary (LOW confidence)
- Contact form spam prevention: general web security patterns (well-established but not project-specific)

---
*Research completed: 2026-04-10*
*Ready for roadmap: yes*
