---
phase: 13-threat-news-ui-refresh
plan: 01
subsystem: ui
tags: [react, tailwind, pagination, inbox-layout]

requires:
  - phase: 12-threat-actors-ui-refresh
    provides: UI refresh pattern (row layout, inline pagination)
provides:
  - Threat News page with inbox-style row layout
  - Inline toolbar pagination (search + count + prev/next arrows)
  - Entity tag overflow capped at 3 with +N more
affects: [14-threat-search-backend, 15-threat-search-frontend]

tech-stack:
  added: []
  patterns: [inbox-row-layout, inline-toolbar-pagination]

key-files:
  created: []
  modified:
    - frontend/src/pages/ThreatNewsPage.jsx

key-decisions:
  - "Removed PaginationControls and SkeletonCard imports in favor of inline implementations"
  - "Hard-coded order: desc (no user-facing sort toggle)"

patterns-established:
  - "Inline toolbar pagination: search + count (en-dash format) + ChevronLeft/Right in one row"
  - "Row layout: border-b dividers, hover:bg-surface-2, truncated title, responsive tag hiding"

requirements-completed: [TN-01, TN-02, TN-03, TN-04]

duration: 4min
completed: 2026-03-17
---

# Phase 13 Plan 01: Threat News UI Refresh Summary

**Inbox-style row layout with inline toolbar pagination, no confidence badges or sort toggle**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-17T21:10:43Z
- **Completed:** 2026-03-17T21:14:49Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Transformed card grid to scannable inbox-style row layout with border-b dividers
- Consolidated search + pagination count + prev/next arrows into a single toolbar
- Removed all confidence-related code (constant, function, badges, filter dropdown)
- Removed sort toggle and hard-coded descending order

## Task Commits

Each task was committed atomically:

1. **Task 1: Strip confidence, sort toggle, and order param** - `e026136` (feat)
2. **Task 2: Transform card grid to row layout with inline toolbar pagination** - `95cc0a5` (feat)

## Files Created/Modified
- `frontend/src/pages/ThreatNewsPage.jsx` - Threat News page with row layout, inline toolbar pagination, no confidence

## Decisions Made
- Removed PaginationControls and SkeletonCard imports entirely (inline implementations are simpler for this page)
- Hard-coded order: 'desc' since sort toggle was removed per plan
- Entity tags hidden on mobile (hidden sm:flex) for responsive row layout

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Threat News page UI refresh complete
- Ready for Phase 14 (Threat Search Backend) and Phase 15 (Threat Search Frontend)

---
*Phase: 13-threat-news-ui-refresh*
*Completed: 2026-03-17*
