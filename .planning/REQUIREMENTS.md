# Requirements: AQUA TIP v6.0

**Defined:** 2026-04-14
**Core Value:** Real threat intelligence from OpenCTI — searchable across all observable types through a secure, credit-gated platform with subscription plan tiers.

## v6.0 Requirements

Requirements for Feature Gating & UX Polish milestone.

### Feature Gating

- [x] **GATE-01**: Free plan seeder features list reflects "threat search only" restriction (not "all features")
- [x] **GATE-02**: Backend FeatureGate middleware blocks free plan users from non-search routes (threat-map, dark-web, threat-actors, threat-news)
- [x] **GATE-03**: Frontend route guards show UpgradeCTA for gated pages when user is on free plan

### Pricing & Enterprise

- [ ] **PRICE-01**: Pricing page renders inside AppLayout (with sidebar) when user is authenticated
- [ ] **PRICE-02**: Pricing page renders standalone (no sidebar) when user is unauthenticated
- [ ] **PRICE-03**: Enterprise contact form submits to backend endpoint and sends email notification
- [ ] **PRICE-04**: Topbar icon navigates to landing page when viewing pricing as unauthenticated user

### Observable Display

- [ ] **OBS-01**: Email observable type renders with formatted display in threat search results
- [ ] **OBS-02**: URL observable type renders with clickable link in threat search results
- [ ] **OBS-03**: Cryptocurrency observable type renders with formatted display in threat search results

### UI Polish

- [ ] **UI-01**: Settings page profile form is horizontally centered on the page
- [ ] **UI-02**: Landing page globe renders immediately on first mount (no scroll trigger delay)
- [ ] **UI-03**: Landing page animations are smooth with no jank or delayed renders

### D3 Relationship Graph

- [ ] **D3-01**: User can zoom in on relationship graph via button control
- [ ] **D3-02**: User can zoom out on relationship graph via button control

## Future Requirements

Deferred to future milestones. Tracked but not in current roadmap.

- **PAY-01**: Real payment processing integration (Stripe/LemonSqueezy)
- **ADMIN-01**: Admin panel for user management
- **SSO-01**: SAML/LDAP enterprise SSO
- **CICD-01**: CI/CD pipeline beyond Railway auto-deploy

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real payment processing | No validated demand yet — contact form sufficient |
| Per-feature gating (Dark Web Pro only) | Credit-only gating is simpler; binary free/paid split |
| Role-based access control | Requires admin panel, invitation system |
| Breadcrumb capitalization | Already implemented — PAGE_NAMES map has correct casing |
| Trial credits (10/day) | Already implemented — CreditResolver::TRIAL_DAILY_LIMIT = 10 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| GATE-01 | Phase 54 | Complete |
| GATE-02 | Phase 54 | Complete |
| GATE-03 | Phase 54 | Complete |
| PRICE-01 | Phase 55 | Pending |
| PRICE-02 | Phase 55 | Pending |
| PRICE-03 | Phase 55 | Pending |
| PRICE-04 | Phase 55 | Pending |
| OBS-01 | Phase 56 | Pending |
| OBS-02 | Phase 56 | Pending |
| OBS-03 | Phase 56 | Pending |
| UI-01 | Phase 57 | Pending |
| UI-02 | Phase 57 | Pending |
| UI-03 | Phase 57 | Pending |
| D3-01 | Phase 58 | Pending |
| D3-02 | Phase 58 | Pending |

**Coverage:**
- v6.0 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0

---
*Requirements defined: 2026-04-14*
*Last updated: 2026-04-14 after roadmap creation*
