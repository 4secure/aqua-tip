# Requirements: AQUA TIP v3.0

**Defined:** 2026-03-20
**Core Value:** Real threat intelligence from OpenCTI -- searchable across all observable types through a secure, credit-gated platform.

## v3.0 Requirements

Requirements for Onboarding, Trial & Subscription Plans milestone. Each maps to roadmap phases.

### Onboarding

- [ ] **ONBD-01**: User sees timezone field on Get Started page, auto-detected from browser, editable via dropdown
- [ ] **ONBD-02**: User can optionally enter their organization name during onboarding
- [ ] **ONBD-03**: User can optionally select their role from a dropdown (Security Analyst, SOC Analyst, Threat Hunter, Incident Responder, CISO/Manager, Researcher, Student, Other)
- [x] **ONBD-04**: Backend validates and stores timezone, organization, and role fields on onboarding submission
- [x] **ONBD-05**: UserResource returns timezone, organization, and role fields
- [x] **ONBD-06**: Onboarding completion check uses `onboarding_completed_at` timestamp instead of fragile name/phone heuristic

### Trial Enforcement

- [ ] **TRIAL-01**: New users start with a 30-day trial at 10 credits/day (existing behavior, now enforced)
- [ ] **TRIAL-02**: When trial expires and user has no plan, credit limit drops to Free tier (3/day)
- [ ] **TRIAL-03**: Trial expiry check happens during lazy credit reset (no separate scheduled task)
- [x] **TRIAL-04**: Existing users receive a fresh 30-day trial via data migration on v3.0 deploy
- [x] **TRIAL-05**: User sees a trial countdown banner showing days remaining
- [x] **TRIAL-06**: User sees a "Trial expired -- upgrade" banner when trial ends without a plan

### Subscription Plans

- [x] **PLAN-01**: Plans table exists with 4 tiers: Free (3/day), Basic (15/day), Pro (50/day), Enterprise (200/day)
- [x] **PLAN-02**: User model has plan_id FK; null means no plan selected (trial or expired-trial/Free)
- [ ] **PLAN-03**: Credit limits are derived from user's plan (not hardcoded) via a shared CreditResolver service
- [ ] **PLAN-04**: Duplicated credit resolution logic in DeductCredit and CreditStatusController is extracted into CreditResolver
- [x] **PLAN-05**: User can select a plan via POST /api/plan (no payment processing -- stores choice in DB)
- [x] **PLAN-06**: Plan change immediately syncs credit limit and remaining balance (upgrade gives more, downgrade caps)
- [ ] **PLAN-07**: Guest credit limit stays at 1/day (unchanged)
- [x] **PLAN-08**: GET /api/plans returns all active plans (public endpoint, no auth required)

### Pricing & UI

- [ ] **PRICE-01**: Pricing page displays 4 plan tiers in a card comparison layout
- [ ] **PRICE-02**: Each plan card shows name, daily credit limit, feature list, and selection button
- [ ] **PRICE-03**: Pro plan is highlighted as "Most Popular"
- [ ] **PRICE-04**: Enterprise plan shows "Contact Us" CTA instead of selection button
- [ ] **PRICE-05**: User's current plan is indicated on the pricing page
- [x] **PRICE-06**: CreditBadge shows plan name alongside remaining/limit (e.g., "Pro: 42/50")
- [ ] **PRICE-07**: Credit exhaustion message is plan-aware with upgrade suggestion to next tier
- [ ] **PRICE-08**: Pricing page is accessible from sidebar navigation

### Timezone Display

- [x] **TZ-01**: All timestamps across the app render in the user's stored timezone
- [ ] **TZ-02**: AuthContext exposes user timezone for frontend consumption
- [x] **TZ-03**: Unauthenticated users see UTC timestamps (default behavior)

## Future Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Payments (v4.0+)

- **PAY-01**: User can pay for a subscription plan via payment provider (LemonSqueezy/Paddle)
- **PAY-02**: Monthly/annual billing toggle on pricing page
- **PAY-03**: Proration on mid-cycle plan changes

### Notifications

- **NOTIF-01**: User receives email 3 days before trial expiry
- **NOTIF-02**: User receives email when trial expires

### Advanced

- **ADV-01**: Trial extension for engaged users (5+ searches, complete profile)
- **ADV-02**: Plan usage trend widget on dashboard
- **ADV-03**: RBAC / team management for Enterprise tier

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real payment processing (Stripe/LemonSqueezy/Paddle) | No validated demand yet -- build plan structure first, add payments when users want to pay |
| Per-feature gating (Dark Web for Pro only, etc.) | Credit-only gating is simpler and matches TI industry norms (VirusTotal model) |
| Role-based access control | Requires admin panel, invitation system, team management -- massive scope for zero enterprise customers |
| Monthly/annual billing toggle | No payment processing = no billing cycles to toggle |
| Email drip campaigns for trial | Over-engineered for current scale -- defer to marketing automation milestone |
| Multi-step onboarding wizard | Over-engineering for 2 required + 3 optional fields -- single form is sufficient |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ONBD-01 | Phase 24 | Pending |
| ONBD-02 | Phase 24 | Pending |
| ONBD-03 | Phase 24 | Pending |
| ONBD-04 | Phase 24 | Complete |
| ONBD-05 | Phase 23 | Complete |
| ONBD-06 | Phase 22 | Complete |
| TRIAL-01 | Phase 23 | Pending |
| TRIAL-02 | Phase 23 | Pending |
| TRIAL-03 | Phase 23 | Pending |
| TRIAL-04 | Phase 22 | Complete |
| TRIAL-05 | Phase 25 | Complete |
| TRIAL-06 | Phase 25 | Complete |
| PLAN-01 | Phase 22 | Complete |
| PLAN-02 | Phase 22 | Complete |
| PLAN-03 | Phase 23 | Pending |
| PLAN-04 | Phase 23 | Pending |
| PLAN-05 | Phase 23 | Complete |
| PLAN-06 | Phase 23 | Complete |
| PLAN-07 | Phase 23 | Pending |
| PLAN-08 | Phase 23 | Complete |
| PRICE-01 | Phase 25 | Pending |
| PRICE-02 | Phase 25 | Pending |
| PRICE-03 | Phase 25 | Pending |
| PRICE-04 | Phase 25 | Pending |
| PRICE-05 | Phase 25 | Pending |
| PRICE-06 | Phase 25 | Complete |
| PRICE-07 | Phase 25 | Pending |
| PRICE-08 | Phase 25 | Pending |
| TZ-01 | Phase 25 | Complete |
| TZ-02 | Phase 24 | Pending |
| TZ-03 | Phase 25 | Complete |

**Coverage:**
- v3.0 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 after roadmap creation*
