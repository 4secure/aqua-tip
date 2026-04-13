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

## Progress

**Cumulative:** 53 phases, 76 plans across 12 milestones in 31 days

All milestones shipped. Ready for next milestone.
