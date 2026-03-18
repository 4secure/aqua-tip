---
phase: 17-threat-news-ux-polish
plan: 01
subsystem: api
tags: [graphql, opencti, labels, laravel, caching]

requires:
  - phase: 12-threat-news-ui
    provides: ThreatNewsService with GraphQL reports query
provides:
  - objectLabel fragment in GraphQL query replacing objects fragment
  - Label filtering via ?label=<id> query param
  - GET /api/threat-news/labels endpoint with 15-min cache
affects: [17-02 frontend label dropdown, threat-news-ui]

tech-stack:
  added: []
  patterns: [incremental filter building for OpenCTI FilterGroup]

key-files:
  created:
    - backend/app/Http/Controllers/ThreatNews/LabelsController.php
  modified:
    - backend/app/Services/ThreatNewsService.php
    - backend/app/Http/Controllers/ThreatNews/IndexController.php
    - backend/routes/api.php

key-decisions:
  - "Incremental filter building pattern for combining confidence + label filters"
  - "15-minute cache TTL for labels (slower changing than reports)"

patterns-established:
  - "Incremental filter building: collect filterItems array, wrap in FilterGroup only if non-empty"

requirements-completed: [SC-1, SC-2]

duration: 2min
completed: 2026-03-18
---

# Phase 17 Plan 01: Threat News Backend Labels Summary

**OpenCTI objectLabel fragment replaces related entities, with label filtering and new /labels endpoint**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-18T19:37:27Z
- **Completed:** 2026-03-18T19:39:29Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Replaced objects(first:20) GraphQL fragment with objectLabel for cleaner label-based categorization
- Added label ID filtering via FilterGroup with incremental filter building pattern
- Created LabelsController and GET /api/threat-news/labels endpoint with 15-min cache

## Task Commits

Each task was committed atomically:

1. **Task 1: Update ThreatNewsService** - `1578adc` (feat)
2. **Task 2: IndexController + LabelsController + route** - `0360719` (feat)

## Files Created/Modified
- `backend/app/Services/ThreatNewsService.php` - Replaced objects with objectLabel, added flattenLabels, labels(), executeLabelsQuery(), incremental filter building
- `backend/app/Http/Controllers/ThreatNews/IndexController.php` - Added label query param extraction
- `backend/app/Http/Controllers/ThreatNews/LabelsController.php` - New controller for labels endpoint
- `backend/routes/api.php` - Registered /threat-news/labels route

## Decisions Made
- Used incremental filter building (collect items, wrap in FilterGroup only if non-empty) instead of nested conditionals
- 15-minute cache TTL for labels (longer than 5-min reports cache since labels change less frequently)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend labels API ready for frontend category dropdown implementation
- Response shape changed: `labels` array replaces `related_entities` -- frontend must update accordingly

---
*Phase: 17-threat-news-ux-polish*
*Completed: 2026-03-18*
