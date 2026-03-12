# AQUA TIP — Authentication System

## What This Is

A user authentication system for AQUA TIP (Threat Intelligence Platform), an existing React 19 + Vite 7 frontend with 12 pages, a dark glassmorphism design, and all-mock data. This milestone adds a Laravel PHP backend with Google OAuth, GitHub OAuth, and email/password authentication, plus JWT-based session management and IP-based rate limiting on IOC searches.

## Core Value

Users can securely sign up, log in, and access the platform — with rate-limited IOC search for guests (1/day) and authenticated users (10/day).

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Laravel backend with Sanctum SPA authentication
- [ ] Google OAuth sign-in via Laravel Socialite
- [ ] GitHub OAuth sign-in via Laravel Socialite
- [ ] Email/password registration with hashed passwords
- [ ] Email verification required before access (click email link)
- [ ] JWT/Sanctum token-based sessions, 7-day expiry
- [ ] IP-based rate limiting: 1 IOC lookup/day for guests, 10/day for signed-in users
- [ ] Rate limit resets at midnight UTC
- [ ] Rate limit counts stored per IP (guests) and per user ID (signed-in)
- [ ] CORS configured for Vite dev server origin
- [ ] Standalone sign-up page (Google, GitHub, email/password)
- [ ] Standalone login page (Google, GitHub, email/password)
- [ ] Auth context/provider wrapping the React app
- [ ] Route protection: `/` always public, `/ioc-search` public but rate-limited, all others require auth
- [ ] Redirect unauthenticated users to login page
- [ ] Rate limit hit shows upgrade CTA ("Sign in for more lookups" for guests, "Limit reached" for signed-in)
- [ ] Auth pages match existing dark theme (glassmorphism, violet/cyan accents, Syne + JetBrains Mono fonts)

### Out of Scope

- OpenCTI API or real data source integration — keep mock data for now
- Actual IP lookup API integration — only enforce rate limit on existing mock search
- Admin panel or user management dashboard — future milestone
- Password-less / magic link login — not needed for v1
- Two-factor authentication (2FA) — future enhancement
- Mobile app or responsive auth — web only for now

## Context

- Frontend is fully built: 12 pages, React Router DOM 7, Tailwind dark theme, Framer Motion animations
- No backend exists yet — `backend/` directory is empty
- All data currently mocked in `frontend/src/data/mock-data.js`
- Laragon local environment: PHP, Composer, MySQL all available
- OAuth credentials will use placeholder `.env` values initially — real keys set up after implementation
- Design tokens defined in `tailwind.config.js`: primary (#0A0B10), surface (#0F1117), violet (#7A44E4), cyan (#00E5FF)
- Fonts: Syne (display), Space Grotesk (headings), JetBrains Mono (body/data), Inter (general body)

## Constraints

- **Tech stack**: Laravel PHP backend, MySQL database, Sanctum for SPA auth, Socialite for OAuth
- **No TypeScript**: All frontend files are `.jsx`/`.js`
- **Session duration**: 7-day token expiry
- **Rate limit storage**: Database-backed (per IP for guests, per user ID for authenticated)
- **Environment**: Laragon (PHP/Composer/MySQL locally available)
- **Auth pages**: Standalone full-screen pages (no sidebar), matching existing design system

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Laravel + Sanctum over Node.js/Express | User preference for PHP/Laravel ecosystem | — Pending |
| MySQL over PostgreSQL/MongoDB | Simplest with Laragon + Laravel default | — Pending |
| Email verification required | Security-first approach for a threat intel platform | — Pending |
| 7-day session expiry | Balanced security vs convenience | — Pending |
| Standalone auth pages (not modals) | Cleaner UX, consistent with landing page pattern | — Pending |
| Upgrade CTA on rate limit | Encourages sign-up, better UX than plain block | — Pending |

---
*Last updated: 2026-03-12 after initialization*
