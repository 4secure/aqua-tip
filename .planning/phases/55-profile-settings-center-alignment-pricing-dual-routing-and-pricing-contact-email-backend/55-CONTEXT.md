# Phase 55: Pricing & Enterprise - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Auth-aware pricing page routing (inside AppLayout when authenticated, standalone when not) and enterprise contact form backend (real email delivery via Laravel Mail).

</domain>

<decisions>
## Implementation Decisions

### Enterprise Contact Email
- **D-01:** Backend endpoint receives contact form submissions and sends email notification via Laravel Mail
- **D-02:** Recipient address comes from `ADMIN_EMAIL` in `.env` — configurable per environment without code changes
- **D-03:** Email body includes full form data (name, email, message, plan name) PLUS authenticated user context if logged in (current plan slug, trial status, usage stats)
- **D-04:** Frontend `PlanContactModal` wires its `handleSubmit` to the new backend endpoint instead of the fake 1-second delay

### Dual Routing
- **D-05:** Single `/pricing` route in App.jsx with conditional wrapper — render inside `AppLayout` when user is authenticated, standalone (with its own navbar) when not. PricingPage checks auth context to hide/show its built-in navbar.
- **D-06:** Authenticated user's current plan card shows a "Current Plan" badge and its CTA button is disabled. PlanCard already receives `currentPlanSlug` — extend it with visual badge.

### Standalone Pricing Navbar
- **D-07:** Keep the existing navbar in PricingPage.jsx as-is for unauthenticated users. Logo already links to `/` (satisfies PRICE-04).

### Claude's Discretion
- Email validation rules on the backend endpoint (standard Laravel validation)
- Error handling for mail delivery failures (queue vs sync, retry logic)
- Exact "Current Plan" badge styling (should follow existing design system tokens)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Pricing Components
- `frontend/src/pages/PricingPage.jsx` — Current standalone pricing page with custom navbar
- `frontend/src/components/pricing/PlanCard.jsx` — Plan card component with `currentPlanSlug` prop
- `frontend/src/components/pricing/PlanConfirmModal.jsx` — Enterprise contact modal with TODO placeholder

### Routing
- `frontend/src/App.jsx` — Route definitions, AppLayout wrapper, FeatureGatedRoute
- `frontend/src/components/layout/AppLayout.jsx` — Sidebar + topbar layout wrapper

### Backend
- `backend/routes/api.php` — API route definitions
- `backend/.env` — Environment config (add ADMIN_EMAIL here)

### Auth Context
- `frontend/src/contexts/AuthContext.jsx` — Provides `user` object with plan, trial_active

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PlanContactModal` — Already has full form UI (name, email, message), just needs real backend call
- `PlanCard` — Already receives `currentPlanSlug` and has conditional rendering logic
- `apiClient` — Existing API client used by PricingPage for `GET /api/plans`
- `useAuth` — Auth context hook used throughout the app

### Established Patterns
- Laravel Mail with Mailable classes (existing pattern from email verification)
- `apiClient.post()` for form submissions
- Route-level auth detection via `useAuth()` hook
- `GradientButton` for CTAs, glassmorphism for modals

### Integration Points
- App.jsx route table — `/pricing` needs conditional AppLayout wrapping
- PricingPage.jsx — Conditionally render/hide built-in navbar based on auth state
- PlanContactModal — Replace fake delay with `apiClient.post('/api/enterprise/contact')`
- backend/routes/api.php — New POST endpoint for contact form

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches within the decisions above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 55-profile-settings-center-alignment-pricing-dual-routing-and-pricing-contact-email-backend*
*Context gathered: 2026-04-14*
