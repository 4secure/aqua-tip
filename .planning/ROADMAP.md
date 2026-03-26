# Roadmap: AQUA TIP

## Milestones

- ✅ **v1.0 Authentication System** — Phases 1-5 (shipped 2026-03-14)
- ✅ **v1.1 PostgreSQL Migration & Railway Deployment** — Phases 6-7 (shipped 2026-03-14)
- ✅ **v2.0 OpenCTI Integration** — Phases 8-11 (shipped 2026-03-16)
- ✅ **v2.1 Threat Search & UI Refresh** — Phases 12-17 (shipped 2026-03-18)
- ✅ **v2.2 Live Dashboard & Search History** — Phases 18-21 (shipped 2026-03-20)
- ✅ **v3.0 Onboarding, Trial & Subscription Plans** — Phases 22-26 (shipped 2026-03-25)
- 🚧 **v3.1 Font & UI Polish** — Phases 27-28 (in progress)

## Phases

<details>
<summary>✅ v1.0 Authentication System (Phases 1-5) — SHIPPED 2026-03-14</summary>

- [x] Phase 1: Laravel Foundation + Core Auth (2/2 plans) — completed 2026-03-12
- [x] Phase 2: OAuth + Email Verification (2/2 plans) — completed 2026-03-13
- [x] Phase 3: Rate Limiting Backend (2/2 plans) — completed 2026-03-13
- [x] Phase 4: Frontend Auth Integration (3/3 plans) — completed 2026-03-13
- [x] Phase 4.1: Layout Redesign (2/2 plans) — completed 2026-03-13 (INSERTED)
- [x] Phase 5: Dark Web Search Backend + Frontend (2/2 plans) — completed 2026-03-13

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 PostgreSQL Migration & Railway Deployment (Phases 6-7) — SHIPPED 2026-03-14</summary>

- [x] Phase 6: PostgreSQL Migration (2/2 plans) — completed 2026-03-13
- [x] Phase 7: Railway Production Deployment (2/2 plans) — completed 2026-03-14

Full details: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v2.0 OpenCTI Integration (Phases 8-11) — SHIPPED 2026-03-16</summary>

- [x] Phase 8: Foundation & OpenCTI Service (2/2 plans) — completed 2026-03-14
- [x] Phase 9: IP Search Integration (3/3 plans) — completed 2026-03-15
- [x] Phase 10: Threat Actors & Threat News (2/2 plans) — completed 2026-03-15
- [x] Phase 11: Threat Map (2/2 plans) — completed 2026-03-15

Full details: `.planning/milestones/v2.0-ROADMAP.md`

</details>

<details>
<summary>✅ v2.1 Threat Search & UI Refresh (Phases 12-17) — SHIPPED 2026-03-18</summary>

- [x] Phase 12: Threat Actors UI Refresh (1/1 plans) — completed 2026-03-17
- [x] Phase 13: Threat News UI Refresh (1/1 plans) — completed 2026-03-17
- [x] Phase 14: Backend Search Generalization (2/2 plans) — completed 2026-03-18
- [x] Phase 15: Frontend Threat Search + Route Migration (1/1 plans) — completed 2026-03-18
- [x] Phase 16: Threat Actors UX Polish (1/1 plans) — completed 2026-03-18
- [x] Phase 17: Threat News UX Polish (2/2 plans) — completed 2026-03-18

Full details: `.planning/milestones/v2.1-ROADMAP.md`

</details>

<details>
<summary>✅ v2.2 Live Dashboard & Search History (Phases 18-21) — SHIPPED 2026-03-20</summary>

- [x] Phase 18: Dashboard Stats Backend (2/2 plans) — completed 2026-03-18
- [x] Phase 19: Search History Backend (1/1 plan) — completed 2026-03-18
- [x] Phase 20: Dashboard Page Rewrite (2/2 plans) — completed 2026-03-19
- [x] Phase 21: Threat Search History (1/1 plan) — completed 2026-03-19

Full details: `.planning/milestones/v2.2-ROADMAP.md`

</details>

<details>
<summary>✅ v3.0 Onboarding, Trial & Subscription Plans (Phases 22-26) — SHIPPED 2026-03-25</summary>

- [x] Phase 22: Schema & Data Foundation (2/2 plans) — completed 2026-03-20
- [x] Phase 23: CreditResolver & Plan-Aware Backend (2/2 plans) — completed 2026-03-22
- [x] Phase 24: Enhanced Onboarding (2/2 plans) — completed 2026-03-22
- [x] Phase 25: Pricing, Trial Banners & Timezone Display (3/3 plans) — completed 2026-03-24
- [x] Phase 26: Remove Raw Tab (1/1 plan) — completed 2026-03-24

Full details: `.planning/milestones/v3.0-ROADMAP.md`

</details>

### v3.1 Font & UI Polish (In Progress)

**Milestone Goal:** Switch to Outfit font and polish sidebar/topbar for a cleaner, more professional look.

- [x] **Phase 27: Outfit Font Migration** - Replace Syne, Space Grotesk, and Inter with Outfit across all pages (completed 2026-03-25)
- [x] **Phase 28: Sidebar & Topbar Polish** - Remove clutter, add plan chip and upgrade button to topbar (completed 2026-03-26)

## Phase Details

### Phase 27: Outfit Font Migration
**Goal**: All text renders in Outfit (headings, body, UI) with JetBrains Mono preserved for code/data
**Depends on**: Nothing (standalone change)
**Requirements**: TYPO-01, TYPO-02, TYPO-03, TYPO-04
**Success Criteria** (what must be TRUE):
  1. All headings across every page render in Outfit (no Syne or Space Grotesk visible)
  2. All body and UI text renders in Outfit (no Inter visible)
  3. Code blocks, data tables, and monospace displays still render in JetBrains Mono
  4. Google Fonts link in index.html loads Outfit with correct weight range and no longer loads Syne, Space Grotesk, or Inter
**Plans**: 2 plans
Plans:
- [x] 27-01-PLAN.md — Font config foundation (Google Fonts, Tailwind, base CSS)
- [x] 27-02-PLAN.md — Bulk class replacement, hardcoded fixes, docs update
**UI hint**: yes

### Phase 28: Sidebar & Topbar Polish
**Goal**: Sidebar and topbar are decluttered with plan visibility added to the topbar
**Depends on**: Phase 27
**Requirements**: SIDE-01, TOP-01, TOP-02, TOP-03, TOP-04
**Success Criteria** (what must be TRUE):
  1. Pricing tab no longer appears in sidebar navigation
  2. Notification bell button no longer appears in topbar
  3. Authenticated user sees their current plan name as a chip in the topbar
  4. "Upgrade" button appears beside the plan chip and navigates to /pricing when clicked
  5. Plan chip and upgrade button are not visible to unauthenticated users
**Plans**: 1 plan
Plans:
- [x] 28-01-PLAN.md — Restyle plan chip, conditional Upgrade, notification dead code cleanup
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 27 → 28

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Laravel Foundation + Core Auth | v1.0 | 2/2 | Complete | 2026-03-12 |
| 2. OAuth + Email Verification | v1.0 | 2/2 | Complete | 2026-03-13 |
| 3. Rate Limiting Backend | v1.0 | 2/2 | Complete | 2026-03-13 |
| 4. Frontend Auth Integration | v1.0 | 3/3 | Complete | 2026-03-13 |
| 4.1. Layout Redesign | v1.0 | 2/2 | Complete | 2026-03-13 |
| 5. Dark Web Search | v1.0 | 2/2 | Complete | 2026-03-13 |
| 6. PostgreSQL Migration | v1.1 | 2/2 | Complete | 2026-03-13 |
| 7. Railway Production Deployment | v1.1 | 2/2 | Complete | 2026-03-14 |
| 8. Foundation & OpenCTI Service | v2.0 | 2/2 | Complete | 2026-03-14 |
| 9. IP Search Integration | v2.0 | 3/3 | Complete | 2026-03-15 |
| 10. Threat Actors & Threat News | v2.0 | 2/2 | Complete | 2026-03-15 |
| 11. Threat Map | v2.0 | 2/2 | Complete | 2026-03-15 |
| 12. Threat Actors UI Refresh | v2.1 | 1/1 | Complete | 2026-03-17 |
| 13. Threat News UI Refresh | v2.1 | 1/1 | Complete | 2026-03-17 |
| 14. Backend Search Generalization | v2.1 | 2/2 | Complete | 2026-03-18 |
| 15. Frontend Threat Search + Route Migration | v2.1 | 1/1 | Complete | 2026-03-18 |
| 16. Threat Actors UX Polish | v2.1 | 1/1 | Complete | 2026-03-18 |
| 17. Threat News UX Polish | v2.1 | 2/2 | Complete | 2026-03-18 |
| 18. Dashboard Stats Backend | v2.2 | 2/2 | Complete | 2026-03-18 |
| 19. Search History Backend | v2.2 | 1/1 | Complete | 2026-03-18 |
| 20. Dashboard Page Rewrite | v2.2 | 2/2 | Complete | 2026-03-19 |
| 21. Threat Search History | v2.2 | 1/1 | Complete | 2026-03-19 |
| 22. Schema & Data Foundation | v3.0 | 2/2 | Complete | 2026-03-20 |
| 23. CreditResolver & Plan-Aware Backend | v3.0 | 2/2 | Complete | 2026-03-22 |
| 24. Enhanced Onboarding | v3.0 | 2/2 | Complete | 2026-03-22 |
| 25. Pricing, Trial Banners & Timezone Display | v3.0 | 3/3 | Complete | 2026-03-24 |
| 26. Remove Raw Tab | v3.0 | 1/1 | Complete | 2026-03-24 |
| 27. Outfit Font Migration | v3.1 | 2/2 | Complete    | 2026-03-25 |
| 28. Sidebar & Topbar Polish | v3.1 | 1/1 | Complete   | 2026-03-26 |
