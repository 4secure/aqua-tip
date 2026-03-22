# AQUA TIP — Threat Intelligence Platform

## What This Is

A threat intelligence platform with a React 19 + Vite 7 frontend (dark glassmorphism design) and a Laravel 12 PHP backend. The platform connects to a live OpenCTI instance for real threat data: universal Threat Search across all 9 observable types with auto-detection, Threat Actors listing intrusion sets in a dense card grid, Threat News listing reports in a scannable row layout with label-based category filtering, a live Threat Map with SSE streaming, and a live dashboard with real stats, indicators, attack categories, credit balance, and recent searches. Authentication supports email/password, Google OAuth, and GitHub OAuth with credit-based rate limiting.

## Core Value

Users get real threat intelligence from OpenCTI — searchable across all observable types (IPs, domains, URLs, emails, file hashes, hostnames), threat actor profiles, intelligence reports with category filtering, a live geographic threat map, and a live dashboard with search history — all through a secure, credit-gated platform.

## Requirements

### Validated

- ✓ Laravel backend with Sanctum SPA authentication — v1.0
- ✓ Google OAuth sign-in via Laravel Socialite — v1.0
- ✓ GitHub OAuth sign-in via Laravel Socialite — v1.0
- ✓ Email/password registration with hashed passwords — v1.0
- ✓ Email verification required before access — v1.0 (6-digit code + signed link)
- ✓ Cookie-based Sanctum sessions, 7-day expiry — v1.0
- ✓ Credit-based rate limiting: 1/day guests (IP), 10/day auth (user ID) — v1.0
- ✓ Rate limit resets at midnight UTC (lazy reset on access) — v1.0
- ✓ CORS configured for Vite dev server origin — v1.0
- ✓ Standalone sign-up page (Google, GitHub, email/password) — v1.0
- ✓ Standalone login page (Google, GitHub, email/password) — v1.0
- ✓ Auth context/provider wrapping the React app — v1.0
- ✓ Route protection with 3-step guard (auth → verified → onboarded) — v1.0
- ✓ Auth pages match dark theme (glassmorphism, violet/cyan accents) — v1.0
- ✓ Collapsible glassmorphism sidebar with auth-aware nav states — v1.0
- ✓ Dark Web breach search with credit gating and provider proxy — v1.0
- ✓ PostgreSQL database replacing MySQL — v1.1
- ✓ All migrations cross-database compatible (no MySQL-specific syntax) — v1.1
- ✓ 92 Pest tests pass on both SQLite and PostgreSQL — v1.1
- ✓ Backend deployed to Railway with PostgreSQL addon — v1.1
- ✓ Frontend SPA deployed to Railway with Express static server — v1.1
- ✓ Both services accessible via public Railway URLs — v1.1
- ✓ Production environment variables configured (APP_KEY, CORS, Sanctum) — v1.1
- ✓ Rename IOC Search to IP Search across codebase — v2.0
- ✓ OpenCTI service layer with GraphQL proxy and Bearer token auth — v2.0
- ✓ IP Search with real threat data from OpenCTI observables — v2.0
- ✓ IP Search geo enrichment (ASN, country, city, ISP) — v2.0
- ✓ IP Search relations tab with real STIX relationships — v2.0
- ✓ Credit gating with refund on OpenCTI API failure — v2.0
- ✓ Guest "Sign in for more lookups" CTA on credit exhaustion — v2.0
- ✓ Authenticated "Daily limit reached" message — v2.0
- ✓ Threat Actors page with paginated intrusion sets — v2.0
- ✓ Threat News page with paginated reports and entity filtering — v2.0
- ✓ Live Threat Map with SSE streaming from OpenCTI — v2.0
- ✓ Real-time pulse markers, counters, and live feed — v2.0
- ✓ Universal Threat Search for all 9 observable types with auto-detection — v2.1
- ✓ Detected observable type badge in search results — v2.1
- ✓ Route migration from /ip-search to /threat-search — v2.1
- ✓ Backend ThreatSearch service replacing IpSearch — v2.1
- ✓ Threat Actors 4-col dense card grid, no descriptions — v2.1
- ✓ Threat News row-based layout with inline pagination — v2.1
- ✓ Threat News label-based category chips and filter dropdown — v2.1
- ✓ Threat Actors inline pagination toolbar, no motivation filter — v2.1

- ✓ Dashboard populated with live OpenCTI data (stat cards, recent indicators, attack categories, threat map) — v2.2
- ✓ Credit balance and recent searches widgets on dashboard — v2.2
- ✓ Search history endpoint (stores query + type, auth-only retrieval) — v2.2
- ✓ Recent searches displayed on Threat Search page with click-to-prefill — v2.2
- ✓ All mock data removed from dashboard — v2.2

### Active

**Current Milestone: v3.0 Onboarding, Trial & Subscription Plans**

**Goal:** Expand onboarding with profile fields, enforce the 30-day trial with credit tiers, and build a subscription plan system with pricing page.

**Target features:**
- Enhanced onboarding (timezone, organization, role fields)
- Trial enforcement (30-day trial → Free tier on expiry)
- Subscription plan tiers (Free/Basic/Pro/Enterprise with escalating credits)
- Pricing page with plan selection (no real payment processing yet)
- Timezone-aware time display across the platform

### Out of Scope

- Full GraphQL proxy to OpenCTI — security risk, expose only curated endpoints
- STIX import/export — not needed for read-only TIP display
- Multi-source enrichment (VirusTotal, AbuseIPDB, Shodan) — OpenCTI is single source for now
- Real-time WebSocket push — SSE from Laravel is sufficient
- OpenCTI admin/connector management — manage via OpenCTI UI directly
- Mobile app — web-first approach
- Admin panel or user management dashboard — future milestone
- SAML/LDAP enterprise SSO — premature without paying customers
- CI/CD pipeline — Railway auto-deploys from GitHub, sufficient for now

## Context

Shipped v2.2 with ~20,000+ LOC (JS/JSX + PHP).
Tech stack: React 19, Vite 7, Tailwind CSS 3, Laravel 12, Sanctum, Socialite, PostgreSQL, OpenCTI.
21 phases (incl. 4.1), 40 plans completed across 5 milestones in 8 days.
111+ Pest tests covering auth, OAuth, email verification, rate limiting, dark web search, dashboard endpoints, search history.
Both services deployed to Railway (backend + frontend) with PostgreSQL addon.
OpenCTI instance at http://192.168.251.20:8080 provides live threat data via GraphQL and SSE.
Dashboard fully live with real OpenCTI stats, auth-gated credit/search widgets, and category filtering.

## Constraints

- **Tech stack**: Laravel PHP backend, PostgreSQL database, Sanctum for SPA auth, Socialite for OAuth
- **No TypeScript**: All frontend files are `.jsx`/`.js`
- **Session duration**: 7-day cookie-based sessions via database driver
- **Rate limit storage**: Database-backed credits table (per IP for guests, per user ID for authenticated)
- **Hosting**: Railway (backend container + frontend static server + PostgreSQL addon)
- **Environment**: Laragon (PHP/Composer/PostgreSQL locally available)
- **OpenCTI**: Private network (192.168.251.20) — works locally, requires tunneling for cloud

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Laravel + Sanctum over Node.js/Express | User preference for PHP/Laravel ecosystem | ✓ Good |
| Cookie-based Sanctum (not token-based) | More secure for SPA, auto CSRF | ✓ Good |
| Email verification with 6-digit code + signed link | Dual path: quick code or email link fallback | ✓ Good |
| Lazy midnight UTC credit reset | Reset on access, not scheduled task for all rows | ✓ Good |
| Race-safe credit deduction | Atomic UPDATE WHERE remaining > 0 | ✓ Good |
| Pest 3.8 test framework | Pest-syntax feature tests, good DX | ✓ Good |
| Credit refund on provider failure | DB increment, not middleware reversal | ✓ Good |
| PostgreSQL over MySQL | Railway provides PostgreSQL natively | ✓ Good |
| Railway for hosting | Simple container deployment, auto-deploys from GitHub | ✓ Good |
| OpenCTI proxy pattern | Laravel holds Bearer token, frontend never talks to OpenCTI directly | ✓ Good |
| Zero new deps for OpenCTI | Laravel HTTP client + raw GraphQL queries | ✓ Good |
| Server-side caching for browse pages | Threat actors 15min, news 5min, map snapshot 15min | ✓ Good |
| ip-api.com for geo enrichment | OpenCTI IPv4-Addr has no geo fields; free tier sufficient | ✓ Good |
| SSE relay (not WebSocket) | Simpler architecture, browser EventSource handles reconnect | ✓ Good |
| Lazy MaxMind Reader singleton | Avoid per-event Reader instantiation in hot SSE loop | ✓ Good |
| 5-min SSE max lifetime | Prevent zombie connections; frontend auto-reconnects | ✓ Good |
| Detail modals over inline expand | Better UX for dense card grids on threat actors/news | ✓ Good |
| Clean-break ThreatSearch service | New service vs modifying IpSearch — cleaner separation | ✓ Good |
| Zero new deps for v2.1 | Existing stack handles all search + UI requirements | ✓ Good |
| UI refreshes before search migration | Ship visual improvements first (phases 12-13), then backend+frontend (14-15) | ✓ Good |
| Label-based categories over related entities | OpenCTI objectLabel is purpose-built for categorization | ✓ Good |
| Inline pagination toolbar pattern | Consistent UX across Threat Actors and Threat News pages | ✓ Good |
| Manual Cache::get/put stale-cache | Preserve stale entries for OpenCTI fallback (Cache::remember deletes on failure) | ✓ Good |
| Public dashboard routes (no auth) | Support unauthenticated dashboard views | ✓ Good |
| select() field restriction | Simpler than API resource class for 5-field endpoint | ✓ Good |
| Silent invalid module filter | Better UX than 422 for frontend consumers | ✓ Good |
| Independent widget loading states | No global spinner — each widget loads independently | ✓ Good |
| Server-side category re-fetch | Client-side filtering insufficient — 10 loaded vs 500 aggregated | ✓ Good |
| Silent history fetch fallback | History is non-critical UI — errors return null, no error card | ✓ Good |

---
*Last updated: 2026-03-20 after v3.0 milestone start*
