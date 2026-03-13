# Roadmap: AQUA TIP Authentication System

## Overview

This roadmap delivers a complete authentication system for AQUA TIP, a threat intelligence platform with an existing React 19 frontend. The work progresses from backend foundation (Laravel + Sanctum) through auth features (OAuth, email verification), rate limiting, frontend integration, and finally IOC search wiring with rate limit UI. Each phase delivers a testable, independent capability -- backend phases can be verified with curl/Postman before touching the frontend.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Laravel Foundation + Core Auth** - Laravel 12 backend with Sanctum SPA auth, email/password registration and login
- [ ] **Phase 2: OAuth + Email Verification** - Google and GitHub OAuth via Socialite, email verification flow, password reset
- [ ] **Phase 3: Rate Limiting Backend** - Dual-key rate limiting on IOC search endpoint (IP for guests, user ID for authenticated)
- [ ] **Phase 4: Frontend Auth Integration** - Auth context, login/signup pages, route protection, themed auth UI
- [ ] **Phase 5: Rate Limit UI + IOC Search Wiring** - IOC search connected to backend, rate limit feedback and upgrade CTAs

## Phase Details

### Phase 1: Laravel Foundation + Core Auth
**Goal**: A working Laravel 12 API that accepts email/password registration, login, and logout with Sanctum cookie-based sessions
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, AUTH-01, AUTH-02, AUTH-06, AUTH-07, AUTH-08
**Success Criteria** (what must be TRUE):
  1. A new user can register via POST /api/register with email and password, and the password is rejected if it fails strength rules (min 8 chars, mixed case + number)
  2. A registered user can log in via POST /api/login and receives a Sanctum session cookie that persists across requests
  3. An authenticated user can call GET /api/user and receive their profile data; an unauthenticated request returns 401
  4. An authenticated user can log out via POST /api/logout and the session is destroyed server-side
  5. The Vite dev server (localhost:5173) can make credentialed requests to the Laravel API (localhost:8000) without CORS errors
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Scaffold Laravel 12, install Sanctum/Socialite, configure SPA auth, CORS, migrations
- [x] 01-02-PLAN.md — Auth controllers (register/login/logout), API routes, comprehensive Pest test suite

### Phase 2: OAuth + Email Verification
**Goal**: Users can sign in with Google or GitHub accounts, and email-registered users must verify their email before accessing protected routes
**Depends on**: Phase 1
**Requirements**: AUTH-03, AUTH-04, AUTH-05, AUTH-09
**Success Criteria** (what must be TRUE):
  1. A user can initiate Google OAuth sign-in, complete the provider flow, and arrive back in the SPA with an active session
  2. A user can initiate GitHub OAuth sign-in, complete the provider flow, and arrive back in the SPA with an active session
  3. A user who registers with email/password receives a verification email and cannot access protected API routes until they click the verification link
  4. A user who has forgotten their password can request a reset link via email and set a new password
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — Email verification + password reset controllers, form requests, SPA URL customization, verified middleware enforcement
- [ ] 02-02-PLAN.md — Comprehensive Pest tests for OAuth, email verification, and password reset flows

### Phase 3: Rate Limiting Backend
**Goal**: The IOC search endpoint enforces per-day lookup limits -- 1/day for guests (by IP) and 10/day for authenticated users (by user ID), resetting at midnight UTC
**Depends on**: Phase 1
**Requirements**: RATE-01, RATE-02, RATE-03
**Success Criteria** (what must be TRUE):
  1. An unauthenticated request to the IOC search endpoint succeeds on the first call and returns 429 on the second call within the same day
  2. An authenticated request to the IOC search endpoint succeeds for 10 calls and returns 429 on the 11th call within the same day
  3. Rate limit counters reset after midnight UTC, allowing new lookups the next day
**Plans**: 2 plans

Plans:
- [ ] 03-01-PLAN.md — Database migrations, Credit model with lazy reset, DeductCredit middleware, IOC search + credit status endpoints
- [ ] 03-02-PLAN.md — Comprehensive Pest tests for guest/auth credit limits, midnight UTC reset, and IOC search behavior

### Phase 4: Frontend Auth Integration
**Goal**: The React frontend has auth-aware routing, themed login/signup pages, and an auth context that manages user session state
**Depends on**: Phase 1, Phase 2
**Requirements**: FEND-01, FEND-02, FEND-03, FEND-04, FEND-06, FEND-07, FEND-08
**Success Criteria** (what must be TRUE):
  1. The landing page (/) loads without authentication and all existing landing page functionality works unchanged
  2. Navigating to any protected route (e.g., /dashboard, /settings) while unauthenticated redirects to the login page
  3. A user can create an account on the signup page using email/password or OAuth buttons, and log in on the login page using the same methods
  4. Auth pages (login, signup, verify-email) use the existing dark theme with glassmorphism cards, violet/cyan accents, and the project's font stack
  5. A user who registered with email but has not verified sees a "check your email" pending state instead of accessing protected routes
**Plans**: 3 plans

Plans:
- [ ] 04-01-PLAN.md — Backend adjustments: fix route middleware, update UserResource, simplify registration, add verification code + onboarding endpoints
- [ ] 04-02-PLAN.md — Frontend core: API functions, AuthContext updates, route guards, App.jsx routing, RegisterPage simplification, LoginPage update, Sidebar avatar dropdown
- [ ] 04-03-PLAN.md — Frontend pages: VerifyEmailPage, GetStartedPage, ForgotPasswordPage, ResetPasswordPage, EULA/Privacy placeholder pages

### Phase 5: Rate Limit UI + IOC Search Wiring
**Goal**: The IOC search page connects to the backend endpoint, displays rate limit status, and shows contextual CTAs when limits are reached
**Depends on**: Phase 3, Phase 4
**Requirements**: FEND-05, RATE-04, RATE-05
**Success Criteria** (what must be TRUE):
  1. The IOC search page (/ioc-search) is accessible to both guests and authenticated users, with searches hitting the backend endpoint
  2. When a guest hits the rate limit, a "Sign in for more lookups" CTA is displayed prompting account creation
  3. When a signed-in user hits the rate limit, a "Daily limit reached" message is displayed with the reset time
**Plans**: TBD

Plans:
- [ ] 05-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5
(Note: Phase 3 depends only on Phase 1, so it could run in parallel with Phase 2 if desired)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Laravel Foundation + Core Auth | 2/2 | Complete | 2026-03-12 |
| 2. OAuth + Email Verification | 1/2 | In progress | - |
| 3. Rate Limiting Backend | 0/2 | Not started | - |
| 4. Frontend Auth Integration | 0/3 | Not started | - |
| 5. Rate Limit UI + IOC Search Wiring | 0/1 | Not started | - |
