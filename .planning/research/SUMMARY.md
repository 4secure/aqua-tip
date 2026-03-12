# Project Research Summary

**Project:** AQUA TIP - Threat Intelligence Platform (Authentication System)
**Domain:** SPA Authentication for Security/Threat Intelligence Platform
**Researched:** 2026-03-12
**Confidence:** HIGH

## Executive Summary

AQUA TIP is a threat intelligence platform with an existing React 19 + Vite frontend that needs a Laravel 12 backend with full authentication. The recommended approach is a cookie-based SPA authentication system using Laravel Sanctum (stateful session mode), Laravel Socialite for Google/GitHub OAuth, and PostgreSQL as the database. This is a well-documented architecture with first-party Laravel packages covering every requirement. The existing frontend already has routing, design system, and page structure in place -- the work is adding a Laravel API backend and wiring auth into the React app.

The critical architectural decision is to use Sanctum's **cookie-based session authentication** (not API tokens). This provides HttpOnly cookies immune to XSS, automatic CSRF protection, and is Sanctum's officially recommended mode for SPAs. The OAuth flow is the one exception: it uses full-page browser redirects through Laravel (not AJAX), with the callback setting a session cookie before redirecting back to the SPA. Rate limiting uses Laravel's built-in RateLimiter with dual keys (IP for guests, user ID for authenticated users).

The primary risks are configuration-related, not architectural. Sanctum requires three config values (stateful domains, session domain, CORS origin) in three different formats, and getting any one wrong produces cryptic 401/419 errors. OAuth redirect flows in SPA architectures need careful design to bridge the backend callback back to the frontend. Email verification links must be customized to redirect to the SPA, not the API. All of these are well-documented with known solutions -- the risk is in missing a detail, not in the approach itself.

## Key Findings

### Recommended Stack

The stack is entirely first-party Laravel packages plus the existing React frontend. No exotic dependencies are needed.

**Core technologies:**
- **Laravel 12** (PHP 8.3): Backend framework, already available in Laragon. Current release with support through Feb 2027.
- **Laravel Sanctum 4.x**: Cookie-based SPA authentication. Handles session cookies, CSRF tokens, and can also issue API tokens for future programmatic access.
- **Laravel Socialite 5.x**: OAuth integration for Google and GitHub. Handles the entire redirect/callback/user-hydration flow.
- **PostgreSQL 15+**: Primary database (user preference). Needs to be added to Laragon and pdo_pgsql extension enabled.
- **Axios 1.x**: HTTP client for the frontend. Critical because it auto-handles XSRF-TOKEN cookies that Sanctum requires -- the Fetch API does not do this automatically and causes frequent CSRF mismatch bugs.
- **React Context API**: Auth state management. No external state library needed for what is a single user object.

**Reconciliation note:** STACK.md recommends token-based Sanctum auth due to cross-origin dev concerns (different ports). ARCHITECTURE.md and PITFALLS.md both recommend cookie-based auth as more secure. The correct decision is **cookie-based**: localhost with different ports shares the same top-level domain, so cookies work if `SESSION_DOMAIN=localhost` is set explicitly. Cookie-based auth is strictly more secure (HttpOnly cookies vs. tokens in JS memory). Use cookie-based for the SPA; reserve token auth only for future API key generation (phase 2+).

### Expected Features

**Must have (table stakes):**
- Email/password registration and login with bcrypt hashing
- Google + GitHub OAuth via Socialite (GitHub is especially important for security-professional audience)
- Email verification (non-negotiable for a security platform)
- CSRF-protected session management via Sanctum cookies
- Tiered rate limiting: 1 IOC lookup/day for guests, 10/day for authenticated users
- Protected route guards with redirect to login
- Themed auth pages matching the existing dark glassmorphism design system
- Account lockout after 5 failed attempts (low effort, high security value)
- Password strength validation (min 8 chars, mixed case + number)

**Should have (near-term differentiators):**
- Password reset via email (low complexity, ship immediately after v1 stabilizes)
- Rate limit upgrade CTA (converts guests to registered users when limit is hit)
- API key generation for programmatic access (every TI platform offers this)
- Login audit log (IP, timestamp, method -- security professionals expect this)

**Defer (v2+):**
- TOTP two-factor authentication (high complexity, phase 3)
- Role-based access control (only needed when teams/multi-user scenarios emerge)
- Session activity display (depends on audit infrastructure)

**Explicitly avoid:**
- SMS-based 2FA (insecure, SIM swapping), magic links, CAPTCHA on login, SAML/LDAP, custom OAuth provider, username-based login

### Architecture Approach

The architecture is a standard SPA + API pattern: React frontend on Vite dev server (port 5173) communicates with Laravel API (port 8000) via cookie-authenticated HTTP requests. Auth state lives in a React Context that checks `/api/user` on mount, exposes login/logout/register methods, and uses a three-state model (loading/authenticated/unauthenticated) to prevent UI flicker. OAuth uses full-page navigation to Laravel web routes, not AJAX. Rate limiting is middleware on the IOC search endpoint only.

**Major components:**
1. **Laravel Auth Controllers** (login, register, logout, OAuth redirect/callback, email verification) -- all backend auth logic
2. **React AuthContext + ProtectedRoute** -- frontend auth state, route guarding, session expiry handling
3. **React Auth Pages** (login, register, verify-email) -- standalone full-screen pages matching existing design system
4. **Laravel RateLimiter** -- dual-key rate limiting on IOC search endpoint with midnight UTC reset
5. **Configured Axios Instance** -- single HTTP client with withCredentials, withXSRFToken, base URL, and 401/419 interceptor

### Critical Pitfalls

1. **Sanctum config format mismatch** -- SANCTUM_STATEFUL_DOMAINS needs `hostname:port` (no scheme), SESSION_DOMAIN needs `hostname` (no port), CORS needs full origin (with scheme, no trailing slash). Getting any wrong produces cryptic 401/419 errors. Prevention: create an `.env` checklist and add a boot-time smoke test.

2. **Missing CSRF cookie request** -- Must call `GET /sanctum/csrf-cookie` before every login/register POST. Skipping this causes 419 errors that look like CORS issues. Prevention: wrap all auth API calls through a helper that calls csrf-cookie first.

3. **OAuth callback stranding user on backend** -- Socialite callback must redirect back to SPA URL, not render a Laravel response. Prevention: design the full redirect flow (SPA -> Laravel -> OAuth provider -> Laravel callback -> SPA) before writing code. Use `->stateless()` on Socialite calls.

4. **Email verification link pointing to API instead of SPA** -- Default VerifyEmail notification generates a backend URL. Prevention: override `VerifyEmail::createUrlUsing()` to generate a frontend URL with signed parameters.

5. **Auth context race condition on page load** -- Without a loading state, protected routes flash the login page before the auth check completes. Prevention: three-state auth context (loading/authenticated/unauthenticated) with a loading screen while checking.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Laravel Foundation + Sanctum Configuration
**Rationale:** Everything depends on a working Laravel project with correct Sanctum/CORS/session configuration. The #1 pitfall (config format mismatch) must be resolved here before any auth feature can work.
**Delivers:** Laravel 12 project scaffold, PostgreSQL connection, Sanctum cookie auth configured, CORS configured, database migrations (users with OAuth columns, sessions, cache tables), email/password register + login + logout API endpoints, email verification backend.
**Addresses features:** Email/password registration, session management, CSRF protection, password hashing, password strength validation.
**Avoids pitfalls:** #1 (Sanctum config), #2 (CSRF cookie), #9 (CORS credentials), #10 (Laragon routing).

### Phase 2: OAuth + Email Verification Redirect
**Rationale:** OAuth builds on the auth foundation and has its own redirect-flow complexity that must be solved before the frontend touches it. Email verification URL customization is also backend work.
**Delivers:** Google + GitHub OAuth via Socialite, account linking (existing email users can OAuth), email verification redirect to SPA, account lockout after failed attempts.
**Addresses features:** OAuth social login, email verification (SPA redirect), account lockout.
**Avoids pitfalls:** #3 (OAuth redirect stranding), #6 (verification link to API), #11 (OAuth token storage), #12 (account linking).

### Phase 3: Rate Limiting Backend
**Rationale:** Rate limiting is independent of auth UI but depends on the auth system distinguishing guests from users. Separate phase keeps it focused.
**Delivers:** Dual-key rate limiter (IP for guests, user ID for auth), IOC search endpoint with throttle middleware, rate limit headers (X-RateLimit-Remaining, Retry-After), midnight UTC reset.
**Addresses features:** Tiered rate limiting, rate limit headers.
**Avoids pitfalls:** #5 (IP spoofing -- configure TrustProxies), #13 (timezone bug -- set app timezone to UTC).

### Phase 4: Frontend Auth Integration
**Rationale:** Frontend cannot be built or tested without the backend running. This is the largest phase -- auth context, auth pages, route restructuring, and OAuth buttons all must land together.
**Delivers:** Axios configured instance, AuthContext provider (three-state), LoginPage, RegisterPage, VerifyEmailPage (all matching dark glassmorphism theme), ProtectedRoute wrapper, OAuth buttons, 401/419 response interceptor for session expiry.
**Addresses features:** Protected routes, themed auth pages, logout with session invalidation, CORS (frontend side).
**Avoids pitfalls:** #7 (auth context race condition), #8 (concurrent request race), #14 (design mismatch), #4 (token vs cookie -- cookie-first).

### Phase 5: Rate Limit UI + IOC Search Wiring
**Rationale:** Rate limit UI depends on both backend rate limiter (Phase 3) and frontend auth context (Phase 4). This is the integration point.
**Delivers:** IocSearchPage wired to `/api/ioc-search`, rate limit feedback (429 handling), guest-to-signup CTA when limit hit, remaining count display.
**Addresses features:** Rate limit upgrade CTA, IOC search integration.
**Avoids pitfalls:** None specific -- this phase is straightforward integration.

### Phase Ordering Rationale

- **Phases 1-3 are backend-only**, allowing the API to be tested independently with curl/Postman before the frontend touches it. This isolates debugging.
- **Phase 4 is the biggest risk** due to the number of interconnected frontend pieces (context, pages, routes, interceptors). It should be a single phase because these pieces depend on each other.
- **Phase 5 is low-risk** integration work that connects already-working backend and frontend pieces.
- OAuth (Phase 2) is separated from base auth (Phase 1) because the redirect flow is architecturally distinct and complex enough to warrant focused attention.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (OAuth):** The SPA-to-backend-to-provider-to-backend-to-SPA redirect flow has multiple design decisions (stateless Socialite, token-in-URL vs cookie, popup vs redirect). Needs phase-level research to nail the exact implementation.
- **Phase 4 (Frontend Auth):** Route restructuring in the existing app (which already has routing) needs careful analysis of current App.jsx to avoid breaking existing pages.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Laravel Foundation):** Extremely well-documented. Official docs + hundreds of tutorials cover every step.
- **Phase 3 (Rate Limiting):** Laravel's built-in RateLimiter is straightforward. The dual-key pattern is documented in official docs.
- **Phase 5 (Rate Limit UI):** Simple frontend integration -- read response headers, show/hide CTA.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All first-party Laravel packages. Versions verified on Packagist. PHP 8.3 and Composer confirmed in Laragon. |
| Features | HIGH | Feature set benchmarked against VirusTotal, Shodan, OTX. Table stakes are clear for security-platform audience. |
| Architecture | HIGH | Cookie-based Sanctum SPA auth is the officially recommended pattern. All flows documented in Laravel docs. |
| Pitfalls | HIGH | Every pitfall is sourced from official docs or well-known community reports. No speculative issues. |

**Overall confidence:** HIGH

### Gaps to Address

- **PostgreSQL in Laragon:** Not yet installed. Needs manual setup (Quick Add or manual download). Verify pdo_pgsql extension works before Phase 1 coding begins.
- **Cookie-based auth across ports:** STACK.md raised a valid concern about cookies across localhost ports. The solution (explicit `SESSION_DOMAIN=localhost`) is documented but should be verified in the actual Laragon + Vite setup as the very first task in Phase 1.
- **OAuth provider credentials:** Google Cloud Console and GitHub Developer Settings apps need to be created before Phase 2. This is a manual setup step, not a code task.
- **Email delivery in dev:** Using `MAIL_MAILER=log` for development means email verification links appear in Laravel log files, not actual email. This is fine for dev but the team should be aware.
- **Existing frontend routing:** App.jsx already has routing structure. Phase 4 must integrate auth routes without breaking existing pages. Needs careful analysis of current router config before implementation.

## Sources

### Primary (HIGH confidence)
- [Laravel Sanctum Docs (12.x)](https://laravel.com/docs/12.x/sanctum) -- SPA cookie auth, CSRF, token management
- [Laravel Socialite Docs (12.x)](https://laravel.com/docs/12.x/socialite) -- OAuth provider integration
- [Laravel Rate Limiting (12.x)](https://laravel.com/docs/12.x/rate-limiting) -- built-in RateLimiter, throttle middleware
- [Laravel Email Verification (12.x)](https://laravel.com/docs/12.x/verification) -- MustVerifyEmail, URL customization
- [Sanctum on Packagist](https://packagist.org/packages/laravel/sanctum) -- v4.3.1 compatibility
- [VirusTotal API Docs](https://docs.virustotal.com/reference/public-vs-premium-api) -- rate limit tier benchmarks

### Secondary (MEDIUM confidence)
- [Laravel SPA Auth: Common Mistakes](https://cdruc.com/laravel-spa-auth-extended) -- config pitfalls, CSRF flow
- [Laravel SPA OAuth with Socialite and Sanctum](https://dev.to/medilies/laravel-spa-oauth-using-github-socialite-and-sanctum-p8e) -- SPA OAuth redirect pattern
- [Cookie-based Auth with Sanctum](https://madewithlove.com/blog/cookie-based-authentication-with-laravel-sanctum/) -- implementation details
- [Axios XSRF handling](https://cdruc.com/axios-laravel) -- why Axios over Fetch for Sanctum
- [Adding PostgreSQL to Laragon](https://dev.to/dendihandian/adding-postgresql-to-laragon-2kde) -- setup guide
- [Token renewal race conditions](https://brainsandbeards.com/blog/2024-token-renewal-mutex/) -- concurrent request patterns

---
*Research completed: 2026-03-12*
*Ready for roadmap: yes*
