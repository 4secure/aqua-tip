# Milestones

## v3.3 Threat Map Dashboard (Shipped: 2026-04-06)

**Phases completed:** 4 phases, 5 plans
**Timeline:** 2 days (2026-04-05 → 2026-04-06)
**Requirements:** 12/12 complete
**Files modified:** 61 (+7,066 / -3,217 lines)
**Git range:** `3e7eeef` → `8596523` (54 commits)

**Key accomplishments:**

1. Threat map relocated to `/dashboard` with `/threat-map` redirect for backward compatibility; sidebar simplified to single Dashboard entry
2. Shared `dashboard-config.js` module extracting STAT_CARD_CONFIG, TYPE_BADGE_COLORS, and formatRelativeTime for cross-component reuse
3. Left/Right overlay panels with glassmorphism over Leaflet map, with 5-handler event isolation and unified PanelToggle for simultaneous collapse/expand
4. Peek-on-hover interaction with 10px glassmorphism edge slivers, 150ms entry / 250ms exit delays, unified hover-zone wrappers, and independent per-panel reveal
5. localStorage-persisted toggle state under `aqua-tip:panels-collapsed` with try/catch fallback for unavailable storage
6. Dead code cleanup — DashboardPage and 9 other orphans deleted, STAT_COLOR_MAP orphan export removed, ThreatSearchPage consolidated onto shared config, grep audit zero stale refs, Vite build verified

See `.planning/milestones/v3.3-ROADMAP.md` and `.planning/milestones/v3.3-REQUIREMENTS.md` for full details.

---

## v3.2 App Layout Page Tweaks (Shipped: 2026-04-05)

**Phases completed:** 7 phases, 12 plans, 19 tasks
**Timeline:** 8 days (2026-03-28 → 2026-04-05)
**Requirements:** 16/16 complete
**Files modified:** 82 (+12,630 / -435 lines)

**Key accomplishments:**

1. Dashboard expanded to 7 observable stat cards with "Threat Database" heading and "100 Latest Attacks" map label
2. Reusable visibility-aware useAutoRefresh hook powering silent 5-min updates on Threat News and Threat Actors
3. Date-based threat news browsing with calendar dropdown, timezone-aware UTC filtering, replacing pagination
4. Stacked area category distribution chart with hourly bucketing and click-to-filter on Threat News
5. Enriched threat actor modal with TTPs (MITRE ATT&CK grouped), tools, campaigns, and targeted sectors via fetch-on-open
6. Functional settings page with real profile data, editing, and AuthContext sync

---

## v3.1 Font & UI Polish (Shipped: 2026-03-27)

**Phases completed:** 3 phases, 3 plans, 5 tasks
**Timeline:** 3 days (2026-03-25 → 2026-03-27)

**Key accomplishments:**

- Outfit font foundation — consolidated 4 font tokens to 2 (sans + mono), Google Fonts loads Outfit 100-900 + JetBrains Mono
- Bulk font migration — zero legacy Syne/Space Grotesk/Inter references across 33 files
- Violet pill plan chip in topbar with conditional Upgrade button (hidden for Enterprise users)
- Notification dead code removal, Pricing tab removed from sidebar
- Landing page content fixes, links, and standalone public pages (phase 29)

---

## v3.0 Onboarding, Trial & Subscription Plans (Shipped: 2026-03-25)

**Phases completed:** 5 phases, 10 plans, 21 tasks

**Key accomplishments:**

- Plans table with 4 subscription tiers (Free/Basic/Pro/Enterprise) and User model plan FK + profile columns
- Data migration resets all users to 30-day trial and pre-creates credit rows; UserResource onboarding check switched from name/phone heuristic to onboarding_completed_at timestamp
- Shared CreditResolver service with plan-aware credit limits, trial expiry auto-downgrade, and pending downgrade support
- Plan listing, upgrade/downgrade selection, and expanded UserResource with plan/trial/pending state
- Expanded OnboardingController with timezone (required, IANA via timezone:all), organization (nullable), and role (nullable) validation and storage, with 11 Pest tests covering all scenarios
- Enhanced Get Started page with timezone auto-detect, searchable country phone input with SVG flags, organization field, and role dropdown with "Other" reveal
- 4-card pricing page with plan comparison, violet-highlighted Pro card, enterprise mailto, confirmation modal with credit/price diff, and sidebar navigation
- useFormatDate hook with Intl.DateTimeFormat timezone formatting, TrialBanner with 3-tier urgency escalation, and CreditBadge extended with plan name in sidebar
- Replaced all 5 inline formatDate functions with useFormatDate hook for timezone-aware rendering, and added plan-tier-specific credit exhaustion messages with upgrade CTAs linking to /pricing
- Removed RawTab debug component, its tab entry, render conditional, and unused Code icon import from ThreatSearchPage.jsx

---

## v2.2 Live Dashboard & Search History (Shipped: 2026-03-20)

**Phases completed:** 4 phases, 6 plans, 13 tasks
**Timeline:** 2 days (2026-03-18 → 2026-03-20)
**Requirements:** 15/15 complete
**Files modified:** 23 (+2,627 / -198 lines)

**Key accomplishments:**

1. DashboardService aggregating live OpenCTI stats (counts, indicators, categories) with stale-cache fallback
2. 19 Pest PHP tests covering all dashboard endpoints and cache behavior
3. Auth-only search history endpoint exposing recent queries with module filtering
4. Full DashboardPage rewrite with 6 live API integrations, auth-gated widgets, zero mock data
5. Search history section on ThreatSearchPage with type badges and click-to-prefill
6. Category-click filtering on indicators table with server-side label queries

---

## v2.1 Threat Search & UI Refresh (Shipped: 2026-03-18)

**Phases completed:** 6 phases, 8 plans
**Timeline:** 2 days (2026-03-17 → 2026-03-19)
**Requirements:** 18/18 complete
**Files modified:** 35 (+3,219 / -390 lines)

**Key accomplishments:**

1. Threat Actors UI refresh — 4-col dense card grid, removed descriptions, clean subheading without "OpenCTI"
2. Threat News UI refresh — row-based layout replacing card grid, entity tags, inline pagination, no confidence
3. Backend search generalization — ThreatSearchService supporting all 9 observable types (IPv4/IPv6/Domain/URL/Email/MD5/SHA-1/SHA-256/Hostname) with auto-detection
4. Frontend Threat Search — unified search page with detected-type badge, route migration from /ip-search to /threat-search
5. Threat Actors UX polish — removed motivation filter and sort toggle, added inline pagination toolbar matching Threat News pattern
6. Threat News UX polish — label-based category chips from OpenCTI, dynamic category filter dropdown, date-first column

---

## v2.0 OpenCTI Integration (Shipped: 2026-03-16)

**Phases completed:** 4 phases, 9 plans
**Timeline:** 3 days (2026-03-14 → 2026-03-16)
**Requirements:** 24/24 complete

**Key accomplishments:**

1. OpenCTI service layer with GraphQL proxy, Bearer token auth, 15s timeout + 2x retry, server-side caching
2. IP Search integration — real threat data from OpenCTI observables with geo enrichment, credit gating, and refund on failure
3. Threat Actors page — paginated intrusion sets with detail modals, search, sort, targeted countries/sectors
4. Threat News page — paginated reports with entity chip filtering, confidence levels, related entities
5. Live Threat Map — SSE streaming from OpenCTI, pulse-and-fade markers, real-time counters, click-to-pan feed
6. Code review hardening — lazy MaxMind init, exception message leak fix, SSE spec compliance, 5-min runtime guard

---

## v1.1 PostgreSQL Migration & Railway Deployment (Shipped: 2026-03-14)

**Phases completed:** 2 phases, 4 plans
**Timeline:** 1 day (2026-03-13 → 2026-03-14)
**Git range:** `0287625..44811f8` — 10 source files changed, +79/-14 lines

**Key accomplishments:**

1. Switched Laravel from MySQL to PostgreSQL — config, 6 migration fixes for cross-database compatibility
2. All 92 Pest tests (309 assertions) pass on both SQLite and PostgreSQL without modification
3. Dockerfile fixed for PostgreSQL (pdo_pgsql + libpq-dev), startup script with auto-migration
4. Backend deployed to Railway with PostgreSQL addon, migrations auto-run on deploy
5. Frontend SPA deployed to Railway with Express static server
6. Both services live at public `.up.railway.app` domains

---

## v1.0 Authentication System (Shipped: 2026-03-14)

**Phases completed:** 6 phases, 13 plans
**Lines of code:** ~5,490 JS/JSX + ~7,684 PHP = ~13,174 LOC
**Timeline:** 2 days (2026-03-13 → 2026-03-14)

**Key accomplishments:**

1. Laravel 12 backend with Sanctum SPA cookie-based auth (register, login, logout, 19 Pest tests)
2. Google + GitHub OAuth via Socialite, email verification with 6-digit code + signed link, password reset
3. Credit-based rate limiting — 1/day guests (IP), 10/day auth (user ID) — lazy midnight UTC reset, 24 tests
4. Frontend auth integration — AuthContext, 3-step route guards, login/signup/verify/onboard pages
5. Layout redesign — collapsible glassmorphism sidebar, auth-aware nav, mobile responsive drawer
6. Dark Web breach search — Laravel proxy to provider API, credit gating, BreachCard + CreditBadge components

### Known Gaps

| ID | Description | Notes |
|----|-------------|-------|
| RATE-04 | Guest "Sign in for more lookups" CTA | Backend sends is_guest in 429 but no frontend reads it |
| RATE-05 | Signed-in "Daily limit reached" for IOC search | Works on Dark Web page only, missing for IOC search |
| FEND-05 | /ip-search publicly accessible + rate-limited | Route is public but search button has no API integration |

These will be addressed in a future milestone.

---
