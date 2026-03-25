# Phase 25: Pricing, Trial Banners & Timezone Display - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can see plan options on a pricing page, understand their trial status via banners, select a plan with confirmation, see their plan name in the credit badge, and view all timestamps in their stored timezone. This phase builds the frontend UI for plan selection, trial awareness, and timezone-aware date formatting. Backend APIs already exist from Phase 23.

</domain>

<decisions>
## Implementation Decisions

### Pricing page layout
- **D-01:** Horizontal row of 4 cards on desktop, stacking vertically on mobile. Standard SaaS pricing pattern
- **D-02:** Pro card highlighted with violet glow border (`border-violet`, `shadow-violet`) + "Most Popular" badge at top. Other cards use standard `border-border`
- **D-03:** User's current plan indicated by "Current Plan" muted badge replacing the selection button (non-clickable). Available plans show "Upgrade" (violet gradient button)
- **D-04:** Enterprise card shows "Contact Us" CTA instead of selection button (checked via `slug === 'enterprise'`)
- **D-05:** Plan selection requires confirmation modal: "Switch to Pro? Daily limit: 3 → 50. Price: $0 → $29/mo" with Confirm/Cancel. Shows pending downgrade info if applicable
- **D-06:** Pricing page accessible from sidebar navigation (add to NAV_ITEMS)
- **D-07:** Each card shows: plan name, price, daily credit limit, feature list, and action button

### Trial banners
- **D-08:** Full-width banner strip below topbar, above page content. Rendered inside AppLayout
- **D-09:** Color escalation by phase:
  - 30-7 days: subtle amber (`bg-amber/10 border-amber/20`), dismissible per session, "X days left on trial" + "View Plans" link
  - 7-1 days: brighter amber (`bg-amber/20 border-amber/40`), dismissible, warning icon, "X days left!" + "View Plans" CTA
  - Expired: red (`bg-red/20 border-red/40`), NOT dismissible, "Trial ended" + "Upgrade Now" CTA
- **D-10:** Banner only shows for trial users (no plan_id AND trial active or expired). Users with any plan (Free/Basic/Pro/Enterprise) never see the banner

### Credit badge & exhaustion
- **D-11:** Plan-aware CreditBadge in sidebar footer (above collapse toggle). Shows "Pro: 42/50" when expanded, compact chip when collapsed
- **D-12:** Sidebar fetches credits independently on mount. Pages like ThreatSearch still fetch their own credits for real-time accuracy after each search. No shared state needed
- **D-13:** Credit exhaustion message is plan-aware:
  - Free user: "Daily limit reached (0/3). Upgrade to Basic for 15/day" + "View Plans" link
  - Basic user: "Daily limit reached (0/15). Upgrade to Pro for 50/day" + "View Plans" link
  - Pro user: "Daily limit reached (0/50). Resets tomorrow at midnight"
  - Enterprise user: "Daily limit reached (0/200). Resets tomorrow at midnight"
- **D-14:** Guest credit exhaustion unchanged: "Sign in for more lookups"

### Timezone formatting
- **D-15:** Shared `useFormatDate` hook reads timezone from `useAuth()`, returns `formatDate` and `formatDateTime` functions
- **D-16:** Uses native `Intl.DateTimeFormat` with user's IANA timezone — no new dependencies
- **D-17:** Absolute date format: "Mar 11, 2026" (date only) or "Mar 11, 2026 3:45 PM" (with time)
- **D-18:** Replace duplicated inline `formatDate()` in all 5 locations: ThreatSearchPage, ThreatActorsPage, ThreatNewsPage, DashboardPage, BreachCard
- **D-19:** Unauthenticated users default to UTC (already handled by AuthContext fallback)

### Claude's Discretion
- Exact spacing/padding in pricing cards and feature lists
- Confirmation modal animation and styling details
- Banner dismiss state management (useState vs sessionStorage)
- CreditBadge sidebar layout when collapsed (chip vs icon)
- `useFormatDate` hook internal memoization strategy
- Pricing page header text and any promotional copy

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — Full v3.0 requirements; Phase 25 maps to PRICE-01 through PRICE-08, TRIAL-05, TRIAL-06, TZ-01, TZ-03

### Prior phase context
- `.planning/phases/22-schema-data-foundation/22-CONTEXT.md` — Plans table design: slug, daily_credit_limit, price_cents, features (JSON), is_popular, sort_order. Enterprise "Contact Us" via slug check
- `.planning/phases/23-creditresolver-plan-aware-backend/23-CONTEXT.md` — CreditResolver service, plan selection API (POST /api/plan), plan listing (GET /api/plans), UserResource expansion with plan/trial fields, pending downgrade logic
- `.planning/phases/24-enhanced-onboarding/24-CONTEXT.md` — AuthContext timezone exposure, SearchableDropdown/SimpleDropdown components

### Frontend (modify)
- `frontend/src/App.jsx` — Add pricing page route
- `frontend/src/components/layout/AppLayout.jsx` — Trial banner integration point (between topbar and outlet)
- `frontend/src/components/layout/Sidebar.jsx` — CreditBadge integration point (sidebar footer area)
- `frontend/src/components/shared/CreditBadge.jsx` — Existing badge showing remaining/limit, needs plan name
- `frontend/src/data/mock-data.js` — NAV_ITEMS array, add Pricing entry
- `frontend/src/contexts/AuthContext.jsx` — Already exposes timezone, user object with plan/trial fields

### Pages with duplicated formatDate (replace)
- `frontend/src/pages/ThreatSearchPage.jsx` — line 168
- `frontend/src/pages/ThreatActorsPage.jsx` — line 8
- `frontend/src/pages/ThreatNewsPage.jsx` — line 33
- `frontend/src/pages/DashboardPage.jsx` — line 57
- `frontend/src/components/shared/BreachCard.jsx` — line 4

### Backend APIs (already built, read for contract)
- `backend/app/Http/Controllers/Plan/PlanController.php` — GET /api/plans
- `backend/app/Http/Controllers/Plan/PlanSelectionController.php` — POST /api/plan
- `backend/app/Http/Resources/UserResource.php` — Returns plan object, trial_active, trial_days_left, pending_plan, plan_change_at
- `backend/app/Http/Controllers/Credit/CreditStatusController.php` — GET /api/credits

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CreditBadge` component (`components/shared/CreditBadge.jsx`): currently shows `remaining/limit` with color-coded chip — extend with plan name
- `GradientButton` component: violet gradient button used across auth pages — reuse for pricing CTAs
- `SearchableDropdown` and `SimpleDropdown` (from Phase 24): dark-themed dropdowns if needed
- `useAuth` hook: exposes `user` with plan, trial_active, trial_days_left, timezone fields
- Glassmorphism card pattern: `bg-surface/60 border border-border backdrop-blur-sm rounded-xl`
- `chip` CSS class with `chip-cyan`, `chip-amber`, `chip-red` variants

### Established Patterns
- Pages fetch their own data via `useEffect` on mount with error handling
- Auth-aware conditional rendering via `isAuthenticated` from `useAuth()`
- Font classes: `font-display` for headings, `font-mono` for data, `font-body` for general text
- NAV_ITEMS drives sidebar nav — add new entry for Pricing page
- Lazy-loaded pages via `React.lazy()` for non-critical routes

### Integration Points
- `AppLayout` renders `<Outlet />` for page content — trial banner goes between topbar and outlet
- `Sidebar` footer area (before collapse toggle) — CreditBadge placement
- `App.jsx` Routes — new `/pricing` route inside AppLayout, public access
- `apiClient` from `frontend/src/api/client.js` — for plan selection and credit fetching API calls

</code_context>

<specifics>
## Specific Ideas

- Confirmation modal prevents accidental plan changes — shows clear before/after comparison of credits and price
- Trial banner escalation (amber → red) creates urgency without being annoying; expired banner is non-dismissible to ensure action
- Plan-aware exhaustion messages point to the specific next tier — more actionable than generic "upgrade" messaging
- `useFormatDate` hook eliminates all 5 duplicated `formatDate()` functions while adding timezone awareness with zero new dependencies
- Sidebar CreditBadge gives constant credit awareness without cluttering page content

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 25-pricing-trial-banners-timezone-display*
*Context gathered: 2026-03-24*
