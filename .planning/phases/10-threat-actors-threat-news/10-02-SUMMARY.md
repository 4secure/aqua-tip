---
phase: 10-threat-actors-threat-news
plan: 02
subsystem: ui
tags: [react, framer-motion, glassmorphism, pagination, threat-actors, threat-news, opencti]

# Dependency graph
requires:
  - phase: 10-threat-actors-threat-news/01
    provides: "Backend API endpoints for threat actors and threat news"
  - phase: 08-foundation-opencti-service
    provides: "OpenCTI service layer and apiClient"
provides:
  - "ThreatActorsPage with card grid, search, filters, detail modal, pagination"
  - "ThreatNewsPage with card grid, search, confidence filter, entity chip filtering, pagination"
  - "Reusable PaginationControls and SkeletonCard shared components"
affects: [threat-map, future-detail-pages]

# Tech tracking
tech-stack:
  added: []
  patterns: [detail-modal-pattern, entity-chip-filtering, cursor-pagination-ui, skeleton-loading]

key-files:
  created:
    - frontend/src/api/threat-actors.js
    - frontend/src/api/threat-news.js
    - frontend/src/components/shared/PaginationControls.jsx
    - frontend/src/components/shared/SkeletonCard.jsx
  modified:
    - frontend/src/pages/ThreatActorsPage.jsx
    - frontend/src/pages/ThreatNewsPage.jsx

key-decisions:
  - "Detail modal instead of inline expand for better UX on dense card grids"
  - "21 cards per page (7 rows of 3) for visual balance on xl screens"
  - "Removed sophistication field -- not available in OpenCTI IntrusionSet schema"
  - "Added modified date, targeted countries and sectors from OpenCTI relationships"
  - "Sort toggle defaults to newest first on threat actors page"
  - "relationship_type must be string not array in OpenCTI GraphQL filters"

patterns-established:
  - "Detail modal pattern: click card opens modal overlay with full details, shared across browse pages"
  - "Entity chip color-coding: violet=actors, red=malware, cyan=indicators, amber=attack-patterns"
  - "Skeleton loading: SkeletonCard component with configurable count for consistent loading states"
  - "Cursor pagination UI: PaginationControls with Showing X-Y of N display"

requirements-completed: [TACT-01, TACT-02, TACT-03, TACT-04, TNEWS-01, TNEWS-02, TNEWS-03, TNEWS-04]

# Metrics
duration: ~45min
completed: 2026-03-15
---

# Phase 10 Plan 02: Threat Actors & News Frontend Summary

**Responsive card grid pages for threat actors and threat news with search, filters, detail modals, entity chip filtering, and cursor-based pagination consuming live OpenCTI data**

## Performance

- **Duration:** ~45 min (across multiple sessions with checkpoint verification)
- **Tasks:** 3 (2 auto + 1 checkpoint)
- **Files created:** 4
- **Files modified:** 2
- **Post-checkpoint fixes:** 6 additional commits

## Accomplishments
- ThreatActorsPage with glassmorphism card grid, search, motivation filter, sort toggle, and detail modal showing aliases, goals, targeted countries/sectors, and external references
- ThreatNewsPage with card grid, confidence filter, sort toggle, color-coded entity chips with overflow, entity-click filtering, and detail modal
- Reusable PaginationControls (Prev/Next with count display) and SkeletonCard (animated loading placeholders) shared components
- Both pages use URL search params for shareable/bookmarkable filter state
- Proper loading (skeleton cards), error (red banner with retry), and empty states on both pages

## Task Commits

Each task was committed atomically:

1. **Task 1: Shared components + API modules + ThreatActorsPage** - `0708189` (feat)
2. **Task 2: ThreatNewsPage with entity chip filtering** - `e09e76d` (feat)
3. **Task 3: Visual verification checkpoint** - approved by user

**Post-checkpoint fixes and enhancements:**
- `95fd2a6` - fix: remove sophistication field (not in OpenCTI schema)
- `8a01f43` - feat: change page size from 20 to 21 cards
- `da74686` - feat: replace card expand with detail modal
- `66835a8` - feat: add modified date, targeted countries and sectors
- `095b80d` - fix: use string for relationship_type in GraphQL query
- `8758e4e` - feat: add sort toggle to threat actors page

## Files Created/Modified
- `frontend/src/api/threat-actors.js` - API client for threat actors endpoint with cursor pagination params
- `frontend/src/api/threat-news.js` - API client for threat news endpoint with search, confidence, sort params
- `frontend/src/components/shared/PaginationControls.jsx` - Reusable Prev/Next pagination with "Showing X-Y of N" display
- `frontend/src/components/shared/SkeletonCard.jsx` - Animated skeleton loading cards with configurable count
- `frontend/src/pages/ThreatActorsPage.jsx` - Full threat actors browse page with cards, filters, detail modal, pagination
- `frontend/src/pages/ThreatNewsPage.jsx` - Full threat news browse page with cards, entity chips, filters, detail modal, pagination

## Decisions Made
- **Detail modal over inline expand:** Replaced inline card expansion with a full detail modal overlay for better UX when cards contain dense information (targeted countries, sectors, external references)
- **21 cards per page:** Changed from default 20 to 21 for visual grid balance (7 rows of 3 on xl screens)
- **Removed sophistication field:** OpenCTI IntrusionSet schema does not include sophistication; removed from UI and filters
- **Added targeted countries and sectors:** Fetched from OpenCTI relationship data to enrich threat actor cards
- **Sort toggle on threat actors:** Added sort by modified date (newest first default) for better discoverability
- **GraphQL relationship_type as string:** OpenCTI expects relationship_type as a string value, not an array, in filter definitions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed sophistication field from UI**
- **Found during:** Task 1 (post-checkpoint verification)
- **Issue:** OpenCTI IntrusionSet schema does not have a sophistication field; queries returned null
- **Fix:** Removed sophistication filter dropdown and badge from ThreatActorsPage
- **Files modified:** frontend/src/pages/ThreatActorsPage.jsx
- **Committed in:** 95fd2a6

**2. [Rule 1 - Bug] Fixed relationship_type format in GraphQL query**
- **Found during:** Post-checkpoint testing
- **Issue:** relationship_type was passed as array but OpenCTI expects a string value
- **Fix:** Changed to string format in the GraphQL filter definition
- **Files modified:** backend/app/Services/ThreatActorService.php
- **Committed in:** 095b80d

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for correct OpenCTI data retrieval. 4 additional enhancements (modal, page size, sort, extra fields) were user-requested improvements during checkpoint review.

## Issues Encountered
None beyond the auto-fixed items above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 10 complete -- both API and frontend for threat actors and threat news are fully functional
- Phase 11 (Threat Map) can proceed independently (depends only on Phase 8 foundation)
- Shared components (PaginationControls, SkeletonCard) available for reuse in Phase 11

---
*Phase: 10-threat-actors-threat-news*
*Completed: 2026-03-15*
