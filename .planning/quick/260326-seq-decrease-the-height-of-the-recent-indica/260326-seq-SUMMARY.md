---
quick_id: 260326-seq
status: complete
---

# Quick Task 260326-seq: Decrease Recent Indicators table height

## Changes

**File:** `frontend/src/pages/DashboardPage.jsx`

1. Added fixed `height: 380px` to the 2-column grid container holding both cards
2. Made the Recent Indicators card a flex column with `overflow-hidden` so it respects the grid height
3. Wrapped the table content in a `flex-1 overflow-y-auto min-h-0` div for scrollable overflow
4. Header section marked as `shrink-0` so it stays visible while table scrolls

## Result

Both the "Recent Indicators" table and "Top Attack Categories" chart cards now render at the same 380px height. The indicators table scrolls vertically if content exceeds the available space.
