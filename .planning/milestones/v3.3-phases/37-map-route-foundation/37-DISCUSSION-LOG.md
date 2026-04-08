# Phase 37: Map Route Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 37-Map Route Foundation
**Areas discussed:** Route swap strategy, Redirect approach, Map viewport sizing, DashboardPage widgets fate

---

## Route Swap Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse ThreatMapPage | Route /dashboard directly to existing ThreatMapPage component. No duplication. | ✓ |
| Copy into new DashboardMapPage | Create new file as copy of ThreatMapPage for separate evolution path. | |
| Rename ThreatMapPage to DashboardPage | Rename file, replacing old one. Clean but unclear git history. | |

**User's choice:** Reuse ThreatMapPage (Recommended)
**Notes:** No code duplication needed — component already has all required functionality.

---

## Redirect Approach

| Option | Description | Selected |
|--------|-------------|----------|
| `<Navigate replace />` | React Router redirect, consistent with existing /ip-search pattern. | ✓ |
| Remove /threat-map route entirely | No redirect, 404 on /threat-map. Breaks bookmarks. | |
| Keep both routes rendering same component | Both URLs work, no redirect. Sidebar would still show two entries. | |

**User's choice:** `<Navigate replace />` (Recommended)
**Notes:** User initially selected "Remove route entirely" but changed answer to Navigate replace. Matches existing codebase pattern.

---

## Map Viewport Sizing

| Option | Description | Selected |
|--------|-------------|----------|
| Edge-to-edge | Map fills entire content area using -m-6 pattern. Maximum map real estate. | ✓ |
| Respect layout padding | Map inside AppLayout's p-6 padding. Consistent with other pages but wastes space. | |
| Full viewport behind topbar | Map extends under topbar with z-index layering. Most immersive but requires topbar changes. | |

**User's choice:** Edge-to-edge (Recommended)
**Notes:** Keeps existing ThreatMapPage sizing pattern. Good foundation for Phase 38 overlay panels.

---

## DashboardPage Widgets Fate

**User's choice:** Already decided in requirements — not discussed.
**Notes:** User pointed out this was already defined in REQUIREMENTS.md and ROADMAP.md. Phase 37 = map only with existing 5 widgets. Phase 38 = overlay panels for stats + indicators. Phase 40 = DashboardPage deletion.

---

## Claude's Discretion

None — all decisions made by user.

## Deferred Ideas

None — discussion stayed within phase scope.
