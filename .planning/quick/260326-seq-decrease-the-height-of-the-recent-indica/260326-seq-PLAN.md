---
quick_id: 260326-seq
description: Decrease Recent Indicators table height to match Top Attack Categories
tasks: 1
---

# Quick Plan: Match Recent Indicators height to Top Attack Categories

## Task 1: Constrain indicator card height and add table scroll

**Files:** `frontend/src/pages/DashboardPage.jsx`

**Action:**
The 2-column grid (line 511) has the Recent Indicators card (col-span-3) growing unconstrained due to 8 table rows, while Top Attack Categories (col-span-2) has a fixed 280px chart area. Fix by:

1. Add a fixed height to the grid row so both cards match
2. Make the indicators card content scrollable within the constrained height
3. Reduce displayed indicators from 8 to 5 rows to better fit the space

**Changes:**
- On the grid container (line 511): add a fixed height style matching the attack categories card natural height (~380px)
- On the indicators table wrapper: add `overflow-y-auto` and flex layout to fill available space
- Reduce `indicators.slice(0, 8)` to `indicators.slice(0, 5)` in IndicatorsTable

**Verify:** Both cards render at the same height visually. Table scrolls if content overflows.

**Done:** Cards are equal height in the dashboard grid.
