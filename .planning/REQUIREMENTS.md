# Requirements: AQUA TIP Authentication System

**Defined:** 2026-03-12
**Core Value:** Users can securely sign up, log in, and access the platform — with rate-limited IOC search for guests (1/day) and authenticated users (10/day).

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Backend Infrastructure

- [x] **INFRA-01**: Laravel 12 backend scaffolded in `backend/` directory with Sanctum and Socialite installed
- [x] **INFRA-02**: MySQL database created with users table migration (name, email, password, OAuth provider fields)
- [x] **INFRA-03**: CORS configured to allow Vite dev server origin (localhost:5173)
- [x] **INFRA-04**: Sanctum SPA cookie-based authentication configured (session driver, CSRF cookie endpoint, stateful domains)

### Authentication

- [x] **AUTH-01**: User can sign up with email and password (bcrypt hashed)
- [x] **AUTH-02**: User can log in with email and password
- [x] **AUTH-03**: User can sign in with Google OAuth via Socialite
- [x] **AUTH-04**: User can sign in with GitHub OAuth via Socialite
- [x] **AUTH-05**: User receives email verification link after signup and must verify before accessing protected routes
- [x] **AUTH-06**: User session persists across browser refresh (cookie-based, 7-day expiry)
- [x] **AUTH-07**: User can log out and session is destroyed server-side
- [x] **AUTH-08**: Password strength enforced: minimum 8 characters, mixed case + number
- [x] **AUTH-09**: User can reset password via email link

### Rate Limiting

- [ ] **RATE-01**: Guest users (not signed in) limited to 1 IOC lookup per day, keyed by IP address
- [ ] **RATE-02**: Signed-in users limited to 10 IOC lookups per day, keyed by user ID
- [ ] **RATE-03**: Rate limit counters reset at midnight UTC
- [ ] **RATE-04**: When guest hits rate limit, show "Sign in for more lookups" upgrade CTA
- [ ] **RATE-05**: When signed-in user hits rate limit, show "Daily limit reached" message

### Frontend Auth

- [ ] **FEND-01**: Auth context/provider wrapping the React app with login state, user data, loading state
- [ ] **FEND-02**: Standalone sign-up page with Google, GitHub, and email/password form options
- [ ] **FEND-03**: Standalone login page with Google, GitHub, and email/password form options
- [ ] **FEND-04**: `/` (Landing Page) is always publicly accessible
- [ ] **FEND-05**: `/ioc-search` is publicly accessible but rate-limited (1/day guest, 10/day signed-in)
- [ ] **FEND-06**: All other routes require authentication, redirect to login if unauthenticated
- [ ] **FEND-07**: Auth pages match existing dark theme (glassmorphism cards, violet/cyan accents, Syne + JetBrains Mono fonts)
- [ ] **FEND-08**: Email verification pending state shown to users who haven't verified yet

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Security Enhancements

- **SEC-01**: Account lockout after 5 failed login attempts for 15 minutes
- **SEC-02**: Two-factor authentication via TOTP (authenticator app)
- **SEC-03**: Login audit log (IP, timestamp, method, success/fail)
- **SEC-04**: Session activity display (active sessions with revoke)

### Platform Features

- **PLAT-01**: API key generation for programmatic access
- **PLAT-02**: Role-based access control (admin, analyst, viewer)
- **PLAT-03**: Remember me / extended session option (30-day)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Magic link / passwordless login | OAuth already reduces password friction; unnecessary complexity |
| SMS-based 2FA | SIM swapping attacks make SMS 2FA insecure; TOTP only when 2FA is added |
| Admin panel / user management | No multi-tenant or team features yet; manage via DB in v1 |
| SAML/LDAP enterprise SSO | Premature without paying customers; use WorkOS when needed |
| Username-based login | Email is canonical identity; usernames create confusion |
| CAPTCHA on login | Account lockout is more effective and less annoying |
| Additional OAuth providers | Google + GitHub covers 95%+ of security practitioner audience |
| OpenCTI / real data integration | Keep mock data for now; auth-only milestone |
| Real IP lookup API | Only enforce rate limit on existing mock search |
| Mobile app auth | Web-first, mobile later |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| INFRA-03 | Phase 1 | Complete |
| INFRA-04 | Phase 1 | Complete |
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 2 | Complete |
| AUTH-04 | Phase 2 | Complete |
| AUTH-05 | Phase 2 | Complete |
| AUTH-06 | Phase 1 | Complete |
| AUTH-07 | Phase 1 | Complete |
| AUTH-08 | Phase 1 | Complete |
| AUTH-09 | Phase 2 | Complete |
| RATE-01 | Phase 3 | Pending |
| RATE-02 | Phase 3 | Pending |
| RATE-03 | Phase 3 | Pending |
| RATE-04 | Phase 5 | Pending |
| RATE-05 | Phase 5 | Pending |
| FEND-01 | Phase 4 | Pending |
| FEND-02 | Phase 4 | Pending |
| FEND-03 | Phase 4 | Pending |
| FEND-04 | Phase 4 | Pending |
| FEND-05 | Phase 5 | Pending |
| FEND-06 | Phase 4 | Pending |
| FEND-07 | Phase 4 | Pending |
| FEND-08 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0

---
*Requirements defined: 2026-03-12*
*Last updated: 2026-03-12 after 02-01-PLAN.md completion*
