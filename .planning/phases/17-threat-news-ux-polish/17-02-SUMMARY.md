---
phase: 17-threat-news-ux-polish
plan: 02
subsystem: ui
tags: [react, threat-news, category-chips, label-filter, date-column]

requires:
  - phase: 17-threat-news-ux-polish-01
    provides: Backend label param support and /api/threat-news/labels endpoint
provides:
  - Category chips from OpenCTI labels with hash-based color mapping
  - Category dropdown filter synced with chip clicks via label URL param
  - Date-first column layout with time sub-detail
affects: []

tech-stack:
  added: []
  patterns: [hash-based deterministic color mapping for category chips]

key-files:
  created: []
  modified:
    - frontend/src/api/threat-news.js
    - frontend/src/pages/ThreatNewsPage.jsx

key-decisions:
  - "Hash-based categoryColor for deterministic chip colors without backend color dependency"
  - "Single label URL param syncs both dropdown and chip clicks"

patterns-established:
  - "Hash-based color mapping: deterministic color from string value using CATEGORY_COLORS array"

requirements-completed: [SC-1, SC-2, SC-3]

duration: 2min
completed: 2026-03-18
---

# Phase 17 Plan 02: Threat News UX Polish Summary

**Category chips from OpenCTI labels with dropdown filter, date-first column layout, and chip-dropdown sync via label URL param**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-18T19:42:10Z
- **Completed:** 2026-03-18T19:44:17Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Replaced entity chips with category chips using hash-based deterministic color mapping from labels data
- Added category dropdown filter populated from /api/threat-news/labels endpoint
- Moved date column to first position with 24h time sub-detail
- Synced chip clicks and dropdown selection via single `label` URL param
- Detail modal shows all category chips without overflow cap

## Task Commits

Each task was committed atomically:

1. **Task 1: Update API client** - `f949fc7` (feat)
2. **Task 2: Rewrite ThreatNewsPage** - `a7aa996` (feat)

## Files Created/Modified
- `frontend/src/api/threat-news.js` - Added label param support and fetchThreatNewsLabels function
- `frontend/src/pages/ThreatNewsPage.jsx` - Category chips, dropdown filter, date-first layout, all entity code removed

## Decisions Made
- Hash-based categoryColor for deterministic chip colors without relying on backend color field
- Single label URL param syncs both dropdown and chip clicks (same pattern as entity was, but cleaner)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Threat News page now displays categories from OpenCTI labels
- Category dropdown and chip clicks are fully synced
- No further plans in phase 17

---
*Phase: 17-threat-news-ux-polish*
*Completed: 2026-03-18*
