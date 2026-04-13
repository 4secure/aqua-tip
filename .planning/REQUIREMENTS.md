# Requirements: AQUA TIP

**Defined:** 2026-04-10
**Core Value:** Real threat intelligence from OpenCTI — searchable across all observable types through a secure, credit-gated platform with subscription plan tiers.

## v4.0 Requirements

Requirements for Plan Overhaul & UX Polish milestone. Each maps to roadmap phases.

### Plans & Credits

- [x] **PLAN-01**: Plan seeder creates 4 tiers: Free (5 credits/day), Basic ($10, 30/day), Pro ($29, 50/day), Enterprise (contact us)
- [x] **PLAN-02**: Trial period grants 10 credits/day for 30 days with all features
- [x] **PLAN-03**: Credit sync migration updates existing users' credit limits to match new plan values
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
- [x] **DASH-02**: Category bar chart added to right panel alongside existing widgets
- [ ] **DASH-03**: Threat Database widget shows correct counts for email, URL, and crypto observable types
- [ ] **DASH-04**: Top logo/icon navigates to Threat Map (auth) or Landing page (unauth)

### Threat Search

- [ ] **SRCH-01**: Relationship tab D3 graph has zoom in/out button controls

### Threat News

- [x] **NEWS-01**: Chart displays category-only distribution with labels on the side

### UI Polish

- [ ] **UI-01**: Settings profile form is middle-aligned on page
- [ ] **UI-02**: Breadcrumbs capitalized across all pages
- [ ] **UI-03**: Landing page animations are smooth with globe rendering on first load (no delay)

## v5.0 Requirements

Requirements for Security Hardening release. Each maps to roadmap phases.

### Infrastructure (INFRA)

- [ ] **INFRA-01**: Nginx rejects all requests containing `..` path sequences (returns 403)
- [ ] **INFRA-02**: Nginx restricts fastcgi_script_name to /index.php only
- [ ] **INFRA-03**: Nginx hides server version header (server_tokens off)
- [ ] **INFRA-04**: Nginx restricts HTTP methods to GET, POST, PUT, DELETE, OPTIONS, PATCH
- [ ] **INFRA-05**: Nginx adds HSTS header (max-age=31536000, includeSubDomains)
- [ ] **INFRA-06**: Nginx client_max_body_size reduced from 20M to 2M (no file uploads exist)
- [ ] **INFRA-07**: Content-Security-Policy header configured for API backend
- [ ] **INFRA-08**: Debug routes /my-ip and /debug-opencti removed from routes/web.php

### API Security (API)

- [ ] **API-01**: Dark-web task status endpoint validates user ownership (IDOR fix)
- [x] **API-02**: Rate limiting middleware on /ip-search, /threat-search, /credits (30/min)
- [ ] **API-03**: EnrichmentController returns generic error, logs OpenCTI details server-side
- [ ] **API-04**: HealthController returns generic 503 on failure, logs details server-side
- [ ] **API-05**: Raw OpenCTI observable data removed from search API responses
- [x] **API-06**: Rate limiting on OAuth redirect endpoint
- [x] **API-07**: Rate limiting on email verification resend (per-day cap)

### Authentication & Session (AUTH — v5.0)

- [ ] **AUTH-01**: SESSION_SECURE_COOKIE defaults to true in config/session.php
- [ ] **AUTH-02**: Sanctum token expiration shortened from 7 days to 24 hours
- [ ] **AUTH-03**: All existing tokens invalidated on password reset
- [ ] **AUTH-04**: Forgot-password returns uniform response regardless of email/provider status
- [ ] **AUTH-05**: Session cookie name changed to non-descriptive value

### Frontend Security (FRONT)

- [ ] **FRONT-01**: OAuth error parameter whitelisted to known error codes on LoginPage
- [ ] **FRONT-02**: OAuth redirect URL validated against allowed provider domains before redirect
- [ ] **FRONT-03**: DOMPurify config removes target from ALLOWED_ATTR, enforces rel=noopener noreferrer via hook
- [ ] **FRONT-04**: External Leaflet CSS bundled locally (eliminates CDN dependency and SRI need)
- [x] **FRONT-05**: Google Tag Manager gated behind consent check (GDPR compliance)

### Email & DNS (EMAIL)

- [ ] **EMAIL-01**: SMTP MAIL_VERIFY_PEER enabled in production environment
- [ ] **EMAIL-02**: Geolocation API calls switched from HTTP to HTTPS
- [x] **EMAIL-03**: SPF/DKIM/DMARC DNS record configurations documented for tip.aquasecure.ai and api.tip.aquasecure.ai

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
| PLAN-01 | Phase 41 | Complete |
| PLAN-02 | Phase 41 | Complete |
| PLAN-03 | Phase 41 | Complete |
| PLAN-04 | Phase 43 | Pending |
| PLAN-05 | Phase 43 | Pending |
| PRICE-01 | Phase 44 | Pending |
| PRICE-02 | Phase 44 | Pending |
| PRICE-03 | Phase 44 | Pending |
| PRICE-04 | Phase 44 | Pending |
| PRICE-05 | Phase 44 | Pending |
| AUTH-01 | Phase 42 | Pending |
| AUTH-02 | Phase 42 | Pending |
| DASH-01 | Phase 45 | Pending |
| DASH-02 | Phase 45 | Complete |
| DASH-03 | Phase 45 | Pending |
| DASH-04 | Phase 45 | Pending |
| SRCH-01 | Phase 45 | Pending |
| NEWS-01 | Phase 45 | Complete |
| UI-01 | Phase 46 | Pending |
| UI-02 | Phase 46 | Pending |
| UI-03 | Phase 46 | Pending |

| INFRA-01 | Phase 47 | Pending |
| INFRA-02 | Phase 47 | Pending |
| INFRA-03 | Phase 47 | Pending |
| INFRA-04 | Phase 47 | Pending |
| INFRA-05 | Phase 47 | Pending |
| INFRA-06 | Phase 47 | Pending |
| INFRA-07 | Phase 47 | Pending |
| INFRA-08 | Phase 47 | Pending |
| API-01 | Phase 48 | Pending |
| API-02 | Phase 48 | Complete |
| API-03 | Phase 48 | Pending |
| API-04 | Phase 48 | Pending |
| API-05 | Phase 48 | Pending |
| API-06 | Phase 48 | Complete |
| API-07 | Phase 48 | Complete |
| AUTH-01 | Phase 49 | Pending |
| AUTH-02 | Phase 49 | Pending |
| AUTH-03 | Phase 49 | Pending |
| AUTH-04 | Phase 49 | Pending |
| AUTH-05 | Phase 49 | Pending |
| FRONT-01 | Phase 50 | Pending |
| FRONT-02 | Phase 50 | Pending |
| FRONT-03 | Phase 50 | Pending |
| FRONT-04 | Phase 50 | Pending |
| FRONT-05 | Phase 50 | Complete |
| EMAIL-01 | Phase 51 | Pending |
| EMAIL-02 | Phase 51 | Pending |
| EMAIL-03 | Phase 51 | Complete |

**Coverage:**
- v4.0 requirements: 21 total (3 complete, 18 pending)
- v5.0 requirements: 28 total (0 complete, 28 pending)
- Total: 49 requirements mapped to phases
- Unmapped: 0

---
*Requirements defined: 2026-04-10*
*Last updated: 2026-04-10 after roadmap creation*
