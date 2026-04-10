# Requirements: AQUA TIP

**Defined:** 2026-04-10
**Core Value:** Real threat intelligence from OpenCTI — searchable across all observable types through a secure, credit-gated platform with subscription plan tiers.

## v4.0 Requirements

Requirements for Plan Overhaul & UX Polish milestone. Each maps to roadmap phases.

### Plans & Credits

- [ ] **PLAN-01**: Plan seeder creates 4 tiers: Free (5 credits/day), Basic ($10, 30/day), Pro ($29, 50/day), Enterprise (contact us)
- [ ] **PLAN-02**: Trial period grants 10 credits/day for 30 days with all features
- [ ] **PLAN-03**: Credit sync migration updates existing users' credit limits to match new plan values
- [ ] **PLAN-04**: Free plan restricts access to Threat Search only — other pages show upgrade CTA
- [ ] **PLAN-05**: Feature gating enforced on both frontend (route guards + sidebar lock) and backend (middleware)

### Pricing & Contact

- [ ] **PRICE-01**: Pricing page displays updated tiers with new prices and credit limits
- [ ] **PRICE-02**: Enterprise card shows "Contact Us" button opening a contact form
- [ ] **PRICE-03**: Contact form sends inquiry email to admin via Laravel Mail with rate limiting
- [ ] **PRICE-04**: Pricing page renders outside app layout (unauth) or inside app layout (auth)
- [ ] **PRICE-05**: Unauth pricing page logo navigates to landing page

### Auth & Loading

- [ ] **AUTH-01**: Global loading screen displays until auth state resolves — no flash of login buttons or locked sidebar
- [ ] **AUTH-02**: "Connection lost" errors replaced with "Fetching data..." loading indicators across all pages

### Dashboard & Visuals

- [ ] **DASH-01**: "Dashboard" renamed to "Threat Map" in sidebar, breadcrumb, and page title
- [ ] **DASH-02**: Category bar chart added to right panel alongside existing widgets
- [ ] **DASH-03**: Threat Database widget shows correct counts for email, URL, and crypto observable types
- [ ] **DASH-04**: Top logo/icon navigates to Threat Map (auth) or Landing page (unauth)

### Threat Search

- [ ] **SRCH-01**: Relationship tab D3 graph has zoom in/out button controls

### Threat News

- [ ] **NEWS-01**: Chart displays category-only distribution with labels on the side

### UI Polish

- [ ] **UI-01**: Settings profile form is middle-aligned on page
- [ ] **UI-02**: Breadcrumbs capitalized across all pages
- [ ] **UI-03**: Landing page animations are smooth with globe rendering on first load (no delay)

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Payments

- **PAY-01**: Real payment processing (Stripe/LemonSqueezy/Paddle) for Basic and Pro plans
- **PAY-02**: Invoice generation and billing history

### Admin

- **ADMIN-01**: Admin panel for user management
- **ADMIN-02**: Role-based access control

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real payment processing | No validated demand yet — plan selection is functional without billing |
| SAML/LDAP enterprise SSO | Premature without paying customers |
| CI/CD pipeline | Railway auto-deploys from GitHub, sufficient for now |
| Mobile app | Web-first approach |
| Email drip campaigns | Defer to marketing automation milestone |
| Per-feature gating beyond plan tier | Credit-only gating plus plan-level gating is sufficient |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PLAN-01 | — | Pending |
| PLAN-02 | — | Pending |
| PLAN-03 | — | Pending |
| PLAN-04 | — | Pending |
| PLAN-05 | — | Pending |
| PRICE-01 | — | Pending |
| PRICE-02 | — | Pending |
| PRICE-03 | — | Pending |
| PRICE-04 | — | Pending |
| PRICE-05 | — | Pending |
| AUTH-01 | — | Pending |
| AUTH-02 | — | Pending |
| DASH-01 | — | Pending |
| DASH-02 | — | Pending |
| DASH-03 | — | Pending |
| DASH-04 | — | Pending |
| SRCH-01 | — | Pending |
| NEWS-01 | — | Pending |
| UI-01 | — | Pending |
| UI-02 | — | Pending |
| UI-03 | — | Pending |

**Coverage:**
- v4.0 requirements: 21 total
- Mapped to phases: 0
- Unmapped: 21 ⚠️

---
*Requirements defined: 2026-04-10*
*Last updated: 2026-04-10 after initial definition*
