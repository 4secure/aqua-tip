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

- [ ] **Phase 41: Plan Data Restructure** - Update plan seeder, credit limits, and sync existing users to new tier values
- [ ] **Phase 42: Auth Loading & Data States** - Fix auth FOUC with global loading gate, replace connection errors with loading indicators
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
**Plans**: TBD

### Phase 42: Auth Loading & Data States
**Goal**: Users never see a flash of unauthenticated UI or misleading "connection lost" errors during page load
**Depends on**: Phase 41
**Requirements**: AUTH-01, AUTH-02
**Success Criteria** (what must be TRUE):
  1. A branded loading screen (logo + spinner) displays until auth state fully resolves on every page
  2. No flash of login buttons, locked sidebar, or wrong gating state occurs during initial load
  3. Pages that fetch data show "Fetching data..." indicators instead of "Connection lost" errors while loading
**Plans**: TBD

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
**Plans**: TBD

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
| 41. Plan Data Restructure | 0/TBD | Not started | - |
| 42. Auth Loading & Data States | 0/TBD | Not started | - |
| 43. Feature Gating | 0/TBD | Not started | - |
| 44. Pricing & Contact | 0/TBD | Not started | - |
| 45. Dashboard & Visualization Improvements | 0/TBD | Not started | - |
| 46. UI Polish | 0/TBD | Not started | - |

**Cumulative:** 40 phases, 70 plans across 9 milestones in 25 days
