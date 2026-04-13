# Roadmap: AQUA TIP

## Milestones

- ✅ **v1.0 Authentication System** — Phases 1-6 (shipped 2026-03-14)
- ✅ **v1.1 PostgreSQL & Railway** — Phases 7-7 (shipped 2026-03-14)
- ✅ **v2.0 OpenCTI Integration** — Phases 8-11 (shipped 2026-03-16)
- ✅ **v2.1 Threat Search & UI Refresh** — Phases 12-17 (shipped 2026-03-18)
- ✅ **v2.2 Live Dashboard & Search History** — Phases 18-21 (shipped 2026-03-20)
- ✅ **v3.0 Onboarding, Trial & Plans** — Phases 22-26 (shipped 2026-03-25)
- ✅ **v3.1 Font & UI Polish** — Phases 27-29 (shipped 2026-03-27)
- ✅ **v3.2 App Layout Page Tweaks** — Phases 30-36 (shipped 2026-04-05)
- ✅ **v3.3 Threat Map Dashboard** — Phases 37-40 (shipped 2026-04-06)
- 🚧 **v4.0 Plan Overhaul & UX Polish** — Phases 41-46 (in progress)
- 🚧 **v5.0 Security Hardening** — Phases 47-51 (in progress)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

<details>
<summary>✅ v1.0 Authentication System (Phases 1-6) — SHIPPED 2026-03-14</summary>

See `.planning/milestones/v1.0-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.1 PostgreSQL & Railway (Phase 7) — SHIPPED 2026-03-14</summary>

See `.planning/milestones/v1.1-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v2.0 OpenCTI Integration (Phases 8-11) — SHIPPED 2026-03-16</summary>

See `.planning/milestones/v2.0-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v2.1 Threat Search & UI Refresh (Phases 12-17) — SHIPPED 2026-03-18</summary>

See `.planning/milestones/v2.1-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v2.2 Live Dashboard & Search History (Phases 18-21) — SHIPPED 2026-03-20</summary>

See `.planning/milestones/v2.2-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v3.0 Onboarding, Trial & Plans (Phases 22-26) — SHIPPED 2026-03-25</summary>

See `.planning/milestones/v3.0-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v3.1 Font & UI Polish (Phases 27-29) — SHIPPED 2026-03-27</summary>

See `.planning/milestones/v3.1-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v3.2 App Layout Page Tweaks (Phases 30-36) — SHIPPED 2026-04-05</summary>

- [x] Phase 30: Quick Wins (2 plans) — completed 2026-03-28
- [x] Phase 31: Auto-Refresh Infrastructure (1 plan) — completed 2026-03-29
- [x] Phase 32: Date-Based News Browsing (2 plans) — completed 2026-03-29
- [x] Phase 33: Category Distribution Chart (1 plan) — completed 2026-03-30
- [x] Phase 34: Enriched Threat Actor Modal (3 plans) — completed 2026-03-31
- [x] Phase 35: Functional Settings Page (2 plans) — completed 2026-03-31
- [x] Phase 36: Verification & Documentation Sync (1 plan) — completed 2026-04-04

See `.planning/milestones/v3.2-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v3.3 Threat Map Dashboard (Phases 37-40) — SHIPPED 2026-04-06</summary>

- [x] Phase 37: Map Route Foundation (1/1 plans) — completed 2026-04-05
- [x] Phase 38: Overlay Panel Components (2/2 plans) — completed 2026-04-05
- [x] Phase 39: Peek-on-Hover Behavior (1/1 plans) — completed 2026-04-06
- [x] Phase 40: Cleanup & Verification (1/1 plans) — completed 2026-04-06

See `.planning/milestones/v3.3-ROADMAP.md` for full details.

</details>

### 🚧 v4.0 Plan Overhaul & UX Polish (In Progress)

**Milestone Goal:** Restructure subscription plans with new pricing/credits, add feature gating for free-tier users, fix auth loading flash, and polish UI across all pages.

- [x] **Phase 41: Plan Data Restructure** - Update plan seeder, credit limits, and sync existing users to new tier values (completed 2026-04-10)
- [x] **Phase 42: Auth Loading & Data States** - Fix auth FOUC with global loading gate, replace connection errors with loading indicators (completed 2026-04-11)
- [ ] **Phase 43: Feature Gating** - Restrict free plan to threat search only with backend middleware and frontend route guards
- [ ] **Phase 44: Pricing & Contact** - Update pricing page with new tiers, enterprise contact form, auth-aware routing
- [ ] **Phase 45: Dashboard & Visualization Improvements** - Rename to Threat Map, add category bar chart, fix observable counts, chart and zoom improvements
- [ ] **Phase 46: UI Polish** - Settings alignment, breadcrumb capitalization, landing page animations, top icon navigation

## Phase Details

### Phase 41: Plan Data Restructure
**Goal**: Users have correct plan tiers with accurate credit limits reflecting the new pricing structure
**Depends on**: Phase 40
**Requirements**: PLAN-01, PLAN-02, PLAN-03
**Success Criteria** (what must be TRUE):
  1. Plans table contains 4 tiers: Free (5/day), Basic ($10, 30/day), Pro ($29, 50/day), Enterprise (contact us)
  2. Trial period grants 10 credits/day for 30 days with access to all features
  3. Existing users' credit limits are updated to match their plan's new daily limit without waiting for midnight reset
**Plans:** 2/2 plans complete

Plans:
- [x] 41-01-PLAN.md — Migration + seeder update (schema, plan values, credit sync)
- [x] 41-02-PLAN.md — Test updates and verification

### Phase 42: Auth Loading & Data States
**Goal**: Users never see a flash of unauthenticated UI or misleading "connection lost" errors during page load
**Depends on**: Phase 41
**Requirements**: AUTH-01, AUTH-02
**Success Criteria** (what must be TRUE):
  1. A branded loading screen (logo + spinner) displays until auth state fully resolves on every page
  2. No flash of login buttons, locked sidebar, or wrong gating state occurs during initial load
  3. Pages that fetch data show "Fetching data..." indicators instead of "Connection lost" errors while loading
**Plans:** 2/2 plans complete

Plans:
- [x] 42-01-PLAN.md -- Branded loading screen + auth gate (LoadingScreen, AppLayout, ProtectedRoute, GuestRoute)
- [x] 42-02-PLAN.md -- Error-to-loading replacements (ThreatMapStatus, RightOverlayPanel)

### Phase 43: Feature Gating
**Goal**: Free-plan users can only access Threat Search while other pages show upgrade prompts, enforced on both frontend and backend
**Depends on**: Phase 41, Phase 42
**Requirements**: PLAN-04, PLAN-05
**Success Criteria** (what must be TRUE):
  1. Free-plan users can access Threat Search normally
  2. Free-plan users see an upgrade CTA instead of content when navigating to gated pages (Threat Map, Threat News, Threat Actors, etc.)
  3. Sidebar shows lock icons on pages the user's plan cannot access
  4. Backend middleware rejects API calls to gated endpoints from free-plan users with a 403 and upgrade message
  5. Basic, Pro, and Enterprise users access all pages without restriction
**Plans:** 2 plans

Plans:
- [ ] 43-01-PLAN.md — Backend FeatureGate middleware + route protection + tests
- [ ] 43-02-PLAN.md — Frontend useFeatureAccess hook, UpgradeCTA, FeatureGatedRoute, sidebar locks

### Phase 44: Pricing & Contact
**Goal**: Users can view updated pricing tiers and enterprise prospects can submit a contact inquiry via email
**Depends on**: Phase 41, Phase 43
**Requirements**: PRICE-01, PRICE-02, PRICE-03, PRICE-04, PRICE-05
**Success Criteria** (what must be TRUE):
  1. Pricing page displays the 4 updated tiers with correct prices and credit limits
  2. Enterprise card shows a "Contact Us" button that opens a contact form
  3. Submitting the contact form sends an inquiry email to the admin
  4. Unauthenticated users see pricing as a standalone page; authenticated users see it inside the app layout with sidebar
  5. Logo on the standalone pricing page navigates to the landing page
**Plans**: TBD
**UI hint**: yes

### Phase 45: Dashboard & Visualization Improvements
**Goal**: Users see "Threat Map" branding, accurate observable counts, improved charts, and zoom controls on relationship graphs
**Depends on**: Phase 41
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, NEWS-01, SRCH-01
**Success Criteria** (what must be TRUE):
  1. "Dashboard" is renamed to "Threat Map" in sidebar, breadcrumb, and page title
  2. Right panel contains a category bar chart showing attack type distribution
  3. Threat Database widget displays correct counts for email, URL, and cryptocurrency observable types
  4. Top logo/icon navigates to Threat Map for authenticated users and Landing page for unauthenticated users
  5. Threat News chart shows category-only distribution with labels on the side
  6. Relationship tab D3 graph has zoom in/out button controls that work alongside node dragging
**Plans**: TBD
**UI hint**: yes

### Phase 46: UI Polish
**Goal**: Visual consistency and smooth interactions across settings, breadcrumbs, and landing page
**Depends on**: Nothing (independent)
**Requirements**: UI-01, UI-02, UI-03
**Success Criteria** (what must be TRUE):
  1. Settings profile form is vertically centered on the page
  2. Breadcrumbs display capitalized text on all pages
  3. Landing page globe renders immediately on first load with smooth scroll-driven animations (no delay or pop-in)
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 41 → 42 → 43 → 44 → 45 → 46

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 41. Plan Data Restructure | 2/2 | Complete    | 2026-04-10 |
| 42. Auth Loading & Data States | 2/2 | Complete    | 2026-04-11 |
| 43. Feature Gating | 0/2 | Not started | - |
| 44. Pricing & Contact | 0/TBD | Not started | - |
| 45. Dashboard & Visualization Improvements | 0/TBD | Not started | - |
| 46. UI Polish | 0/TBD | Not started | - |

**Security Hardening (v5.0):**

- [x] **Phase 47: Infrastructure Hardening** - Block LFI, remove debug routes, lock down Nginx, add security headers (completed 2026-04-11)
- [x] **Phase 48: API Security** - Fix IDOR, add rate limiting, sanitize error responses, strip raw data (completed 2026-04-11)
- [ ] **Phase 49: Auth & Session Hardening** - Secure cookies, shorten tokens, fix enumeration, harden password reset
- [ ] **Phase 50: Frontend Security** - Whitelist OAuth errors, validate redirects, fix DOMPurify, bundle Leaflet CSS, gate GTM
- [ ] **Phase 51: Email, DNS & Final Hardening** - Enable SMTP TLS, switch to HTTPS geo calls, document DNS records

### Phase 47: Infrastructure Hardening
**Goal**: The platform's Nginx layer blocks all path traversal attacks, exposes no debug endpoints, and enforces security headers on every response
**Depends on**: Nothing (first phase -- critical vulnerabilities)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07, INFRA-08
**Success Criteria** (what must be TRUE):
  1. Requesting any URL containing `..` returns 403 Forbidden (confirmed LFI patched)
  2. Nginx only passes `/index.php` to PHP-FPM -- no arbitrary script execution
  3. Server version header is absent from all responses and only GET/POST/PUT/DELETE/OPTIONS/PATCH methods are accepted
  4. HSTS header with max-age=31536000 and includeSubDomains appears on every response
  5. Content-Security-Policy header is present on API responses, and request body size is capped at 2M
**Plans:** 2/2 plans complete

Plans:
- [x] 47-01-PLAN.md — Nginx security hardening (path traversal, FastCGI lockdown, headers, method restriction)
- [x] 47-02-PLAN.md — Debug route removal from web.php

### Phase 48: API Security
**Goal**: API endpoints are protected against unauthorized access, abuse, and information leakage
**Depends on**: Phase 47
**Requirements**: API-01, API-02, API-03, API-04, API-05, API-06, API-07
**Success Criteria** (what must be TRUE):
  1. Dark-web task status endpoint returns 403 when accessed by a user who does not own the task (IDOR fixed)
  2. Search and credit endpoints return 429 after 30 requests per minute from same source
  3. OpenCTI failures return a generic "Service unavailable" message -- no internal URLs, stack traces, or provider details in response body
  4. Search API responses contain only curated fields -- no raw OpenCTI observable payloads
  5. OAuth redirect and email verification resend endpoints are rate-limited
**Plans**: 3 plans

Plans:
- [x] 48-01-PLAN.md — IDOR fix: dark-web task ownership table and status endpoint enforcement
- [x] 48-02-PLAN.md — Rate limiting: search/credit, OAuth redirect, email verification endpoints
- [x] 48-03-PLAN.md — Error sanitization and response stripping for OpenCTI data

### Phase 49: Auth & Session Hardening
**Goal**: Authentication and session management follow security best practices with no information leakage
**Depends on**: Phase 47
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. Session cookie has Secure flag set and uses a non-descriptive cookie name
  2. Sanctum tokens expire after 24 hours (not 7 days) and all tokens are invalidated on password reset
  3. Forgot-password endpoint returns identical response regardless of whether email exists or which OAuth provider was used
**Plans**: TBD

### Phase 50: Frontend Security
**Goal**: Frontend code does not expose users to XSS, open redirect, or tab-nabbing attacks
**Depends on**: Phase 48, Phase 49
**Requirements**: FRONT-01, FRONT-02, FRONT-03, FRONT-04, FRONT-05
**Success Criteria** (what must be TRUE):
  1. OAuth error parameter on login page only renders known error codes -- arbitrary strings are ignored
  2. OAuth redirect URLs are validated against an allowlist of provider domains before browser navigation
  3. DOMPurify-sanitized HTML never contains target="_blank" without rel="noopener noreferrer"
  4. Leaflet CSS is served from local bundle -- no external CDN requests for map styles
  5. Google Tag Manager script only loads after user consent is confirmed
**Plans**: TBD
**UI hint**: yes

### Phase 51: Email, DNS & Final Hardening
**Goal**: Email transport is encrypted, external API calls use HTTPS, and DNS records prevent email spoofing
**Depends on**: Phase 47
**Requirements**: EMAIL-01, EMAIL-02, EMAIL-03
**Success Criteria** (what must be TRUE):
  1. SMTP connections verify peer TLS certificates in production (MAIL_VERIFY_PEER enabled)
  2. All geolocation API calls use HTTPS -- no plaintext HTTP requests to ip-api.com or similar
  3. SPF, DKIM, and DMARC DNS record configurations are documented with exact values for tip.aquasecure.ai
**Plans**: TBD

### Security Hardening Progress

**Execution Order:**
Phases execute in numeric order: 47 → 48 → 49 → 50 → 51
(Phases 48 and 49 can run in parallel after 47; Phase 50 depends on both 48 and 49)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 47. Infrastructure Hardening | 2/2 | Complete    | 2026-04-11 |
| 48. API Security | 3/3 | Complete    | 2026-04-11 |
| 49. Auth & Session Hardening | 0/0 | Not started | - |
| 50. Frontend Security | 1/2 | In Progress|  |
| 51. Email, DNS & Final Hardening | 0/0 | Not started | - |

**Cumulative:** 45 phases, 72 plans across 10 milestones in 25 days

### Phase 52: Rename Dashboard to Threat Map, fix top icon routing to Threat Map inside app

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 51
**Plans:** 1/2 plans executed

Plans:
- [ ] TBD (run /gsd:plan-phase 52 to break down)

### Phase 53: Threat News bar chart with categories and side labels

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 52
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 53 to break down)

### Phase 54: IOC display for email, URL, crypto types and relationship graph zoom controls

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 53
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 54 to break down)

### Phase 55: Profile settings center alignment, pricing dual routing, and pricing contact email backend

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 54
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 55 to break down)

### Phase 56: Trial plan 10 credits per day configuration

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 55
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 56 to break down)
