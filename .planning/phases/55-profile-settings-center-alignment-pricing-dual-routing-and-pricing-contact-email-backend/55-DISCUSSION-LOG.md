# Phase 55: Pricing & Enterprise - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 55-profile-settings-center-alignment-pricing-dual-routing-and-pricing-contact-email-backend
**Areas discussed:** Enterprise contact email, Dual routing approach, Standalone pricing navbar

---

## Enterprise Contact Email

### Q1: Where should enterprise contact form emails be sent?

| Option | Description | Selected |
|--------|-------------|----------|
| Your personal email | Send to busmani8460@gmail.com | |
| A dedicated sales email | Send to sales@aquasecure.ai or enterprise@aquasecure.ai | |
| Admin email from .env | Configure ADMIN_EMAIL in .env so it can be changed per environment | ✓ |

**User's choice:** Admin email from .env
**Notes:** Configurable per environment without code changes

### Q2: What email content should the enterprise contact notification include?

| Option | Description | Selected |
|--------|-------------|----------|
| Full form data only | Name, email, message, plan name — plain text | |
| Form data + user context | Include auth user info if logged in (current plan, trial status, usage stats) | ✓ |
| You decide | Claude picks best format | |

**User's choice:** Form data + user context
**Notes:** Richer context helps sales prioritize leads

---

## Dual Routing Approach

### Q3: How should the dual pricing route be implemented?

| Option | Description | Selected |
|--------|-------------|----------|
| Conditional wrapper in App.jsx | Single route, PricingPage checks auth to hide/show navbar | ✓ |
| Two separate routes | /pricing standalone + /app/pricing inside AppLayout | |
| You decide | Claude picks cleanest approach | |

**User's choice:** Conditional wrapper in App.jsx (Recommended)
**Notes:** Single route keeps things simple

### Q4: Should authenticated user's current plan be highlighted?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, highlight current plan | Show 'Current Plan' badge, disable CTA button | ✓ |
| Keep as-is | PlanCard already shows current state | |
| You decide | Claude checks and fills gaps | |

**User's choice:** Yes, highlight current plan
**Notes:** None

---

## Standalone Pricing Navbar

### Q5: What should the standalone pricing navbar look like?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep current navbar | Existing navbar already works with logo, login/signup | ✓ |
| Match landing page header | Reuse landing page nav style | |
| You decide | Claude picks for consistency | |

**User's choice:** Keep current navbar
**Notes:** Already functional, logo links to /

---

## Claude's Discretion

- Email validation rules on backend endpoint
- Error handling for mail delivery failures
- "Current Plan" badge styling

## Deferred Ideas

None
