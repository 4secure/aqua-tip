# Phase 30: Quick Wins - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 30-quick-wins
**Areas discussed:** Stat card grid layout, Color assignments for new cards, Search loading indicator, Map label placement

---

## Stat Card Grid Layout

| Option | Description | Selected |
|--------|-------------|----------|
| 4 + 3 rows | First row: 4 cards, second row: 3 cards left-aligned | |
| Responsive wrap | All 7 cards in flex-wrap, auto-size to fill | |
| 4 + 3 centered | First row: 4 cards, second row: 3 cards centered | ✓ |

**User's choice:** 4 + 3 centered
**Notes:** Second row cards same width as first row — no stretching.

### Follow-up: Card Sizing

| Option | Description | Selected |
|--------|-------------|----------|
| Same width | Second row cards identical width to first row | ✓ |
| Stretch to fill | Second row cards stretch wider to span full row | |

**User's choice:** Same width

---

## Color Assignments for New Cards

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse existing colors | Email=amber, Crypto Wallet=green, URL=violet | ✓ |
| Match TYPE_BADGE_COLORS | Use same colors from TYPE_BADGE_COLORS mapping | |
| You decide | Claude picks based on visual balance | |

**User's choice:** Reuse existing colors
**Notes:** Some cards will share colors (Email+Certificate=amber, URL+Domain=violet), distinguished by labels.

---

## Search Loading Indicator

| Option | Description | Selected |
|--------|-------------|----------|
| Pulsing skeleton cards | Skeleton placeholders matching DashboardPage pattern | ✓ |
| Centered spinner + text | Circular spinner with "Searching..." text | |
| Progress bar under search | Indeterminate progress bar under search input | |

**User's choice:** Pulsing skeleton cards
**Notes:** Matches existing animate-pulse skeleton pattern used in DashboardPage.

---

## Map Label Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard mini-map only | Replace dashboard heading, leave ThreatMapPage unchanged | |
| Both pages | Add label on both dashboard and full ThreatMapPage | ✓ |
| You decide | Claude determines best placement | |

**User's choice:** Both pages

### Follow-up: Full Map Page Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Replace 'Live Feed' label | Change text in ThreatMapFeed | |
| Add as separate label | Keep Live Feed, add secondary label | |
| You decide | Claude picks best placement | |

**User's choice:** In place of "Active Threats" counter in ThreatMapCounters
**Notes:** User specified replacing the "Active Threats" counter label specifically, not the Live Feed.

---

## Claude's Discretion

- "Threat Database" heading style
- D3 graph node positioning fix approach
- Search bar z-index fix for logged-out overlap

## Deferred Ideas

None
