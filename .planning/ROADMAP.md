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
- 🚧 **v3.3 Threat Map Dashboard** — Phases 37-40 (in progress)

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

### 🚧 v3.3 Threat Map Dashboard (In Progress)

**Milestone Goal:** Replace the dashboard with an enhanced threat map at /dashboard — existing map features preserved, new overlay panels for stats and indicators with toggle + peek-on-hover.

- [ ] **Phase 37: Map Route Foundation** — Threat map renders at /dashboard with all existing widgets preserved
- [ ] **Phase 38: Overlay Panel Components** — Stat cards and indicators overlay the map with toggle control
- [ ] **Phase 39: Peek-on-Hover Behavior** — Collapsed panels show edge slivers with independent hover reveal
- [ ] **Phase 40: Cleanup & Verification** — DashboardPage deleted, sidebar updated, zero dead references

## Phase Details

### Phase 37: Map Route Foundation
**Goal**: Users access the threat map as their main dashboard at /dashboard with all existing map features intact
**Depends on**: Phase 36
**Requirements**: LAYOUT-01, LAYOUT-02, LAYOUT-03
**Success Criteria** (what must be TRUE):
  1. User navigating to /dashboard sees a full-viewport threat map with live SSE feed, pulse markers, counters, donut, and countries widgets
  2. User navigating to /threat-map is redirected to /dashboard automatically
  3. All existing map interactions (click-to-pan feed entries, marker animations, connection status) work identically to the previous /threat-map page
**Plans:** 1 plan
Plans:
- [ ] 37-01-PLAN.md — Route swap, redirect, and sidebar nav update
**UI hint**: yes

### Phase 38: Overlay Panel Components
**Goal**: Users see threat database stats and recent indicators floating over the map with a toggle to collapse both panels
**Depends on**: Phase 37
**Requirements**: PANEL-01, PANEL-02, PANEL-03, TOGGLE-01
**Success Criteria** (what must be TRUE):
  1. User sees 7 threat database stat cards stacked vertically in a left overlay panel on top of the map
  2. User sees a scrollable recent indicators table in a right overlay panel on top of the map
  3. Both overlay panels have glassmorphism styling (semi-transparent background, backdrop blur, border) consistent with the design system
  4. User can click a single toggle button to collapse both panels simultaneously, and click again to expand them
  5. Clicks and scrolls inside overlay panels do not propagate to the map underneath
**Plans**: TBD
**UI hint**: yes

### Phase 39: Peek-on-Hover Behavior
**Goal**: Users can peek at collapsed panels by hovering edge slivers, with state persisted across refreshes
**Depends on**: Phase 38
**Requirements**: TOGGLE-02, TOGGLE-03, TOGGLE-04
**Success Criteria** (what must be TRUE):
  1. User sees a thin peek sliver at the left and right edges when panels are collapsed
  2. User hovering over the left peek sliver reveals only the left panel; hovering the right sliver reveals only the right panel
  3. User's toggle state (expanded or collapsed) persists across page refreshes via localStorage
**Plans**: TBD
**UI hint**: yes

### Phase 40: Cleanup & Verification
**Goal**: Dead code from the old dashboard is removed and navigation reflects the new structure
**Depends on**: Phase 39
**Requirements**: CLEAN-01, CLEAN-02
**Success Criteria** (what must be TRUE):
  1. DashboardPage.jsx file is deleted and no import or reference to it exists anywhere in the codebase
  2. Sidebar navigation shows a single "Dashboard" link pointing to /dashboard (no separate Dashboard and Threat Map entries)
  3. A grep audit of the codebase confirms zero references to deleted files, old routes, or stale page title mappings
**Plans**: TBD

## Progress

**Execution Order:** Phases execute in numeric order: 37 -> 38 -> 39 -> 40

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 37. Map Route Foundation | 0/1 | Not started | - |
| 38. Overlay Panel Components | 0/? | Not started | - |
| 39. Peek-on-Hover Behavior | 0/? | Not started | - |
| 40. Cleanup & Verification | 0/? | Not started | - |

**Cumulative:** 36 phases, 65 plans across 8 milestones in 23 days
