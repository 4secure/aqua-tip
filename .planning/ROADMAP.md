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
- ✅ **v4.0 Plan Overhaul & UX Polish** — Phases 41-42 (shipped 2026-04-11)
- ✅ **v5.0 Security Hardening** — Phases 47-51 (shipped 2026-04-13)
- ✅ **v5.1 Threat Map Enhancements** — Phases 52-53 (shipped 2026-04-13)
- [ ] **v6.0 Feature Gating & UX Polish** — Phases 54-58

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

<details>
<summary>✅ v4.0 Plan Overhaul & UX Polish (Phases 41-42) — SHIPPED 2026-04-11</summary>

**Milestone Goal:** Restructure subscription plans with new pricing/credits and fix auth loading flash.

- [x] Phase 41: Plan Data Restructure (2/2 plans) — completed 2026-04-10
- [x] Phase 42: Auth Loading & Data States (2/2 plans) — completed 2026-04-11

**What shipped:**
- Plan tier values restructured (Free=5, Basic=30, Pro=100, Enterprise=500 credits)
- price_cents nullable for Enterprise (Contact Us signal)
- Credit sync migration for existing users to new limits
- Branded loading screen until auth state resolves
- "Fetching data..." indicators replace misleading "Connection lost" errors

**Deferred to future milestone (not started):**
- Feature gating (free plan restricted to threat search only)
- Pricing page update with new tiers and enterprise contact form
- Settings alignment, breadcrumb capitalization, landing page animations
- IOC display for email/URL/crypto types
- Relationship graph zoom controls
- Trial plan credit configuration

</details>

<details>
<summary>✅ v5.0 Security Hardening (Phases 47-51) — SHIPPED 2026-04-13</summary>

**Milestone Goal:** Fix all critical, high, and medium security vulnerabilities.

- [x] Phase 47: Infrastructure Hardening (2/2 plans) — completed 2026-04-11
- [x] Phase 48: API Security (3/3 plans) — completed 2026-04-11
- [x] Phase 49: Auth & Session Hardening (1/1 plans) — completed 2026-04-13
- [x] Phase 50: Frontend Security (2/2 plans) — completed 2026-04-13
- [x] Phase 51: Email, DNS & Final Hardening (2/2 plans) — completed 2026-04-13

**What shipped:**
- Nginx path traversal blocking, FastCGI lockdown, security headers
- Debug route removal, IDOR fix, rate limiting on search/credit endpoints
- Error sanitization, raw OpenCTI data stripped from responses
- Secure cookies, shortened token expiry, user enumeration fix
- OAuth error whitelist, redirect URL validation, DOMPurify fix
- Leaflet CSS bundled locally, SMTP TLS verification, HTTPS geolocation
- SPF/DKIM/DMARC DNS records documented

</details>

<details>
<summary>✅ v5.1 Threat Map Enhancements (Phases 52-53) — SHIPPED 2026-04-13</summary>

**Milestone Goal:** Rename dashboard to Threat Map and add attack category visualization.

- [x] Phase 52: Rename Dashboard to Threat Map (1/1 plans) — completed 2026-04-13
- [x] Phase 53: Attack Category Bar Chart (1/1 plans) — completed 2026-04-13

**What shipped:**
- /threat-map as canonical route, /dashboard redirects
- Sidebar nav shows Threat Map label with map icon
- Sidebar logo links to /threat-map inside app layout
- Topbar breadcrumb maps /threat-map to "Threat Map"
- Horizontal bar chart (AttackCategoryChart) for attack category distribution
- Categories data fetching in RightOverlayPanel from /api/dashboard/categories

</details>

### v6.0 Feature Gating & UX Polish (Phases 54-58)

**Milestone Goal:** Complete all deferred features and fixes -- feature gating, pricing integration, UI polish, observable display, and relationship graph controls.

- [x] **Phase 54: Feature Gating** - Free plan restricted to threat search only via backend middleware and frontend guards (completed 2026-04-13)
- [x] **Phase 55: Pricing & Enterprise** - Auth-aware pricing layout and enterprise contact email (completed 2026-04-14)
- [ ] **Phase 56: Observable Display** - Email, URL, and crypto types render properly in threat search results
- [ ] **Phase 57: UI Polish** - Settings centering and landing page globe/animation fixes
- [ ] **Phase 58: D3 Graph Controls** - Zoom in/out button controls on relationship graph

## Phase Details

### Phase 54: Feature Gating
**Goal**: Free plan users can only access threat search; all other features require a paid plan
**Depends on**: Nothing (first phase of v6.0; builds on v4.0 plan infrastructure)
**Requirements**: GATE-01, GATE-02, GATE-03
**Success Criteria** (what must be TRUE):
  1. PlanSeeder features list for free plan shows only "threat search" (not "all features")
  2. Free plan user hitting /api/threat-actors, /api/threat-news, /api/threat-map/*, or /api/dark-web/* receives a 403 with upgrade message
  3. Free plan user navigating to gated pages in the frontend sees an upgrade CTA instead of page content
  4. Paid plan users (Basic/Pro/Enterprise) access all features without restriction
**Plans**: 1 plan
Plans:
- [x] 54-01-PLAN.md — Update free plan features list and verify gating
**UI hint**: yes

### Phase 55: Pricing & Enterprise
**Goal**: Users see a contextually appropriate pricing page and can contact sales for enterprise plans
**Depends on**: Phase 54 (gated users need upgrade path)
**Requirements**: PRICE-01, PRICE-02, PRICE-03, PRICE-04
**Success Criteria** (what must be TRUE):
  1. Authenticated user viewing /pricing sees it inside the app layout with sidebar
  2. Unauthenticated user viewing /pricing sees a standalone page without sidebar
  3. Enterprise "Contact Us" form submits successfully and triggers an email notification to the admin
  4. Unauthenticated user on the pricing page can click the topbar logo/icon to return to the landing page
**Plans**: 2 plans
Plans:
- [x] 55-01-PLAN.md — Enterprise contact backend (controller, mailable, route)
- [x] 55-02-PLAN.md — Dual routing for pricing page and contact modal wiring
**UI hint**: yes

### Phase 56: Observable Display
**Goal**: Users searching for email addresses, URLs, or cryptocurrency observables see properly formatted results
**Depends on**: Nothing (independent of gating; works on existing threat search)
**Requirements**: OBS-01, OBS-02, OBS-03
**Success Criteria** (what must be TRUE):
  1. Searching for an email address displays a formatted email observable with appropriate icon/styling
  2. Searching for a URL displays a clickable link that opens in a new tab
  3. Searching for a cryptocurrency address displays a formatted crypto observable with appropriate labeling
**Plans**: 1 plan
Plans:
- [ ] 54-01-PLAN.md — Update free plan features list and verify gating
**UI hint**: yes

### Phase 57: UI Polish
**Goal**: Settings page and landing page deliver a polished, glitch-free experience
**Depends on**: Nothing (independent CSS/animation fixes)
**Requirements**: UI-01, UI-02, UI-03
**Success Criteria** (what must be TRUE):
  1. Settings page profile form is horizontally centered with consistent max-width
  2. Landing page globe renders immediately on first mount without waiting for scroll
  3. Landing page scroll animations play smoothly with no visible jank or delayed renders
**Plans**: 1 plan
Plans:
- [ ] 54-01-PLAN.md — Update free plan features list and verify gating
**UI hint**: yes

### Phase 58: D3 Graph Controls
**Goal**: Users can control zoom level on the threat search relationship graph via visible buttons
**Depends on**: Nothing (independent D3 enhancement)
**Requirements**: D3-01, D3-02
**Success Criteria** (what must be TRUE):
  1. User can click a zoom-in button to magnify the relationship graph
  2. User can click a zoom-out button to reduce the relationship graph
  3. Zoom controls are visible and accessible alongside the graph canvas
**Plans**: 1 plan
Plans:
- [ ] 54-01-PLAN.md — Update free plan features list and verify gating
**UI hint**: yes

## Progress

**Cumulative:** 53 phases, 76 plans across 12 milestones in 31 days

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 54. Feature Gating | 1/1 | Complete    | 2026-04-14 |
| 55. Pricing & Enterprise | 2/2 | Complete   | 2026-04-14 |
| 56. Observable Display | 0/? | Not started | - |
| 57. UI Polish | 0/? | Not started | - |
| 58. D3 Graph Controls | 0/? | Not started | - |
