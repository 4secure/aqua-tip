# AQUA TIP — Threat Intelligence Platform

## What This Is

A threat intelligence platform with a React 19 + Vite 7 frontend (dark glassmorphism design) and a Laravel 12 PHP backend. The platform connects to a live OpenCTI instance for real threat data: universal Threat Search across all 9 observable types with auto-detection, Threat Actors listing intrusion sets in a dense card grid, Threat News listing reports in a scannable row layout with label-based category filtering, a live Threat Map with SSE streaming, and a live dashboard with real stats, indicators, attack categories, credit balance, and recent searches. Authentication supports email/password, Google OAuth, and GitHub OAuth with credit-based rate limiting. Users onboard with timezone, organization, and role fields. A subscription plan system (Free/Basic/Pro/Enterprise) with pricing page, trial countdown banners, and timezone-aware date rendering is fully built.

## Core Value

Users get real threat intelligence from OpenCTI — searchable across all observable types (IPs, domains, URLs, emails, file hashes, hostnames), threat actor profiles, intelligence reports with category filtering, a live geographic threat map, and a live dashboard with search history — all through a secure, credit-gated platform with subscription plan tiers.

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
- ✓ Enhanced onboarding with timezone (required IANA), organization, role fields — v3.0
- ✓ Custom PhoneNumberInput with SVG flag-icons and country auto-detection — v3.0
- ✓ SearchableDropdown and SimpleDropdown reusable components — v3.0
- ✓ AuthContext exposes user timezone — v3.0
- ✓ Plans table with 4 subscription tiers (Free/Basic/Pro/Enterprise) — v3.0
- ✓ CreditResolver service with plan-aware credit limits and trial enforcement — v3.0
- ✓ Plan listing and selection APIs (GET /api/plans, POST /api/plan) — v3.0
- ✓ Trial expiry auto-downgrade to Free tier — v3.0
- ✓ Pricing page with 4-card plan comparison layout and plan selection modal — v3.0
- ✓ Trial countdown/expiry banners with 3-tier urgency escalation — v3.0
- ✓ useFormatDate hook for timezone-aware date rendering across all pages — v3.0
- ✓ CreditBadge extended with plan name in sidebar — v3.0
- ✓ Plan-aware credit exhaustion messages with tier-specific upgrade CTAs — v3.0
- ✓ Outfit font for all headings and body text (replacing Syne, Space Grotesk, Inter) — v3.1
- ✓ JetBrains Mono retained for code/data displays — v3.1
- ✓ Google Fonts updated to load Outfit with weight range 100-900 — v3.1
- ✓ Pricing tab removed from sidebar navigation — v3.1
- ✓ Notification button removed from topbar — v3.1
- ✓ Plan chip displayed in topbar showing current plan name — v3.1
- ✓ Upgrade button beside plan chip, links to /pricing — v3.1
- ✓ Plan chip and upgrade button auth-gated — v3.1
- ✓ Landing page content, links, and standalone public pages fixed — v3.1
- ✓ Reusable useAutoRefresh hook with visibility-aware 5-min interval — v3.2
- ✓ Threat News silent auto-refresh every 5 minutes — v3.2
- ✓ Threat Actors silent auto-refresh every 5 minutes — v3.2
- ✓ Threat News date-based browsing with calendar dropdown (replaces pagination) — v3.2
- ✓ Backend date_start/date_end filtering with OpenCTI within operator — v3.2
- ✓ Timezone-aware UTC boundary computation for date filtering — v3.2
- ✓ Dashboard expanded to 7 stat cards with "Threat Database" heading — v3.2
- ✓ Threat Map capped to 100 IPs with "100 Latest Attacks" label — v3.2
- ✓ Dashboard Live label and pulsating dot removed — v3.2
- ✓ Category distribution stacked area chart on Threat News — v3.2
- ✓ Enriched threat actor modal with TTPs, tools, campaigns, targeted sectors — v3.2
- ✓ D3 graph node positioning fix and skeleton loading on Threat Search — v3.2
- ✓ Search bar topbar clearance fix for logged-out users — v3.2
- ✓ Functional settings page with real profile data and editing — v3.2
- ✓ AuthContext sync after profile save (no stale sidebar/topbar) — v3.2
- ✓ Threat map relocated to `/dashboard` with `/threat-map` redirect — v3.3
- ✓ DashboardPage.jsx removed entirely with grep-audited cleanup — v3.3
- ✓ Shared `dashboard-config.js` module for stat cards, badge colors, formatters — v3.3
- ✓ Left/Right overlay panels with glassmorphism over Leaflet map — v3.3
- ✓ PanelToggle for simultaneous collapse/expand of both overlay panels — v3.3
- ✓ Peek-on-hover edge slivers with independent left/right reveal — v3.3
- ✓ localStorage-persisted toggle state (`aqua-tip:panels-collapsed`) — v3.3
- ✓ Sidebar navigation simplified to single Dashboard link — v3.3
- ✓ Plan tier values restructured (Free=5, Basic=30, Pro=100, Enterprise=500 credits) — v4.0
- ✓ price_cents nullable for Enterprise (Contact Us signal) — v4.0
- ✓ Credit sync migration for existing users to new limits — v4.0
- ✓ PlanSeeder updated with new tier values and unified features — v4.0
- ✓ Migration SQL made driver-aware (pgsql + sqlite) — v4.0

## Current Milestone: v5.0 Security Hardening

**Goal:** Fix all critical, high, and medium security vulnerabilities identified in comprehensive audit — covering confirmed LFI, debug route removal, API protection, error disclosure, security headers, frontend XSS/redirect vectors, and infrastructure hardening.

**Target features:**
- Nginx path traversal blocking (confirmed LFI serving /etc/passwd)
- Remove unauthenticated debug routes (/my-ip, /debug-opencti)
- IDOR fix on dark-web task status endpoint
- Rate limiting on search endpoints
- Sanitize OpenCTI error messages leaked to users
- Security headers: HSTS, CSP, SRI
- Session cookie secure default
- OAuth error whitelist and redirect URL validation
- DOMPurify tab-nabbing fix
- SMTP TLS verification
- User enumeration fix on forgot-password
- HTTPS for geolocation calls
- Remove raw OpenCTI data from responses
- SPF/DKIM/DMARC DNS records

### Active

- [ ] Nginx blocks all path traversal (.. sequences) before reaching PHP
- [ ] Debug routes /my-ip and /debug-opencti removed
- [ ] Dark-web task status validates user ownership (IDOR fix)
- [ ] Rate limiting on /ip-search, /threat-search, /credits endpoints
- [ ] OpenCTI error messages sanitized in EnrichmentController and HealthController
- [ ] HSTS header added to SecurityHeaders middleware
- [ ] CSP header configured for backend and frontend
- [x] SESSION_SECURE_COOKIE defaults to true — Phase 49
- [x] OAuth error parameter whitelisted on LoginPage — Phase 50
- [x] OAuth redirect URLs validated against allowed provider domains — Phase 50
- [x] DOMPurify target attribute removed, rel=noopener noreferrer enforced — Phase 50
- [x] SMTP MAIL_VERIFY_PEER enabled in production — Phase 51
- [x] Leaflet CSS bundled locally from node_modules (no CDN dependency) — Phase 50
- [x] Forgot-password returns uniform response (no user/provider enumeration) — Phase 49
- [x] Geolocation calls use HTTPS instead of HTTP (ipapi.co) — Phase 51
- [ ] Raw OpenCTI data removed from search API responses
- [x] Sanctum token expiration shortened, tokens invalidated on password reset — Phase 49
- [ ] Nginx hardened: server version hidden, HTTP methods restricted
- [x] SPF/DKIM/DMARC DNS records documented — Phase 51

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
- Real payment processing (Stripe/LemonSqueezy/Paddle) — no validated demand yet
- Per-feature gating (Dark Web for Pro only, etc.) — credit-only gating is simpler
- Role-based access control — requires admin panel, invitation system, team management
- Email drip campaigns for trial — defer to marketing automation milestone

## Context

Shipped v3.3 with ~37,000+ LOC (JS/JSX + PHP).
Tech stack: React 19, Vite 7, Tailwind CSS 3, Framer Motion, Laravel 12, Sanctum, Socialite, PostgreSQL, OpenCTI.
42 phases, 74 plans completed across 10 milestones in 25 days.
Phase 50 complete — frontend security hardened: OAuth XSS/redirect, DOMPurify tab-nabbing, Leaflet CDN elimination, GTM consent gating.
Phase 51 complete — SMTP TLS verification enabled, geolocation migrated to HTTPS ipapi.co, DNS anti-spoofing records documented.
140+ Pest tests covering auth, OAuth, email verification, rate limiting, dark web search, dashboard endpoints, search history, credit resolution, plan APIs, onboarding validation.
Both services deployed to Railway (backend + frontend) with PostgreSQL addon.
OpenCTI instance at http://192.168.251.20:8080 provides live threat data via GraphQL and SSE.
v4.0 introduces first feature-gated tier (Free = threat search only) and auth-aware layout routing for pricing page.
v5.0 comprehensive security audit revealed confirmed LFI (path traversal serving /etc/passwd), unauthenticated debug routes, IDOR, missing rate limiting, error message leakage, and missing security headers.

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
| Zero new deps for v3.0 | Existing stack covers all onboarding, trial, and plan requirements | ✓ Good |
| CreditResolver extraction before plan logic | Prevent duplication pitfall in credit system | ✓ Good |
| Fresh 30-day trial via data migration | Prevent instant downgrade for existing users | ✓ Good |
| nullOnDelete FK for plans | Deleting a plan nullifies user association instead of cascading | ✓ Good |
| updateOrCreate seeder pattern | Safe re-runs in production without duplicates | ✓ Good |
| Query builder over raw SQL in migrations | Cross-DB compatibility for data migrations | ✓ Good |
| Enterprise plan excluded via validation rule | in:free,basic,pro for simplicity | ✓ Good |
| Native Intl.DateTimeFormat for timezone | Zero-dependency timezone formatting | ✓ Good |
| sessionStorage for banner dismiss | Resets per browser session, no server round-trip | ✓ Good |
| Pricing page as public route | Accessible without auth for marketing | ✓ Good |
| Hook per component for useFormatDate | Independent calls, not prop drilling | ✓ Good |
| Consolidated 4 font tokens to 2 (sans + mono) | Simpler system, Outfit handles all weights | ✓ Good |
| Bulk sed replacement for font migration | 123 occurrences across 33 files, fast and thorough | ✓ Good |
| Violet pill plan chip in topbar | Consistent design system usage (bg-violet/10) | ✓ Good |
| Full notification dead code removal | No notification system exists, clean slate | ✓ Good |
| Reusable useAutoRefresh hook pattern | Generic hook with visibility-aware interval, pages add silent refresh callbacks | ✓ Good |
| Flexbox justify-center for 4+3 stat card layout | Simpler than CSS grid for variable-count centered rows | ✓ Good |
| Separate silentRefresh callbacks per page | Avoids setLoading flicker during auto-refresh | ✓ Good |
| OpenCTI `within` operator for date range filtering | Native OpenCTI filter on published field, no post-filter | ✓ Good |
| Client-side hourly bucketing for category chart | 6-color hex palette, stacked area chart with click-to-filter | ✓ Good |
| Concrete GraphQL type fragments for enrichment | Solves OpenCTI polymorphic union field resolution | ✓ Good |
| Hardcoded MITRE ATT&CK kill chain order | Deterministic tactic grouping with "other" fallback | ✓ Good |
| Mirror onboarding validation for profile update | Consistent validation rules between onboarding and settings | ✓ Good |
| useRef initialValues for dirty-checking | Effective role comparison prevents false-positive saves | ✓ Good |
| Route swap without deleting DashboardPage in Phase 37 | Keep revert-safe; Phase 40 handles deletion | ✓ Good |
| Shared `dashboard-config.js` in `frontend/src/data/` | Cross-component reuse of stat config, badges, formatters | ✓ Good |
| Overlay panel pattern: motion.div + AnimatePresence + event isolation | Leaflet-compatible absolute-positioned panels with 5-handler stopPropagation | ✓ Good |
| Unified hover-zone wrapper for sliver+panel | Prevents flicker from hover-gap transition | ✓ Good |
| localStorage-backed useState with try/catch | Handle storage unavailability gracefully | ✓ Good |
| Deletion-then-audit cleanup pattern | Delete orphans first, grep audit confirms zero stale refs | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-13 after Phase 53 threat-news-bar-chart completed — "Top Attack Categories" horizontal bar chart added to Threat Map right overlay panel, fetching from /api/dashboard/categories with dark-theme Chart.js styling*
