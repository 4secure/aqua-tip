---
phase: 31-auto-refresh-infrastructure
plan: 01
subsystem: ui
tags: [react, hooks, auto-refresh, visibility-api, setInterval]

requires:
  - phase: 10-threat-actors-threat-news
    provides: ThreatNewsPage and ThreatActorsPage with loadData callbacks
provides:
  - useAutoRefresh reusable hook with visibility-aware interval
  - Silent 5-min auto-refresh on Threat News page
  - Silent 5-min auto-refresh on Threat Actors page
affects: [threat-news, threat-actors, dashboard]

tech-stack:
  added: []
  patterns: [visibility-aware-interval, silent-refresh-callback, ref-based-fetch]

key-files:
  created:
    - frontend/src/hooks/useAutoRefresh.js
  modified:
    - frontend/src/pages/ThreatNewsPage.jsx
    - frontend/src/pages/ThreatActorsPage.jsx

key-decisions:
  - "Separate silentRefresh callback per page instead of passing loadData to avoid setLoading flicker"
  - "Ref-based fetchFn storage to prevent interval restart on dependency changes"

patterns-established:
  - "Silent refresh pattern: separate callback mirroring loadData without loading/error state changes"
  - "useAutoRefresh hook: reusable visibility-aware interval for any page"

requirements-completed: [NEWS-01, ACTOR-02]

duration: 2min
completed: 2026-03-29
---

# Phase 31 Plan 01: Auto-Refresh Infrastructure Summary

**Reusable useAutoRefresh hook with visibility-aware 5-min silent refresh on Threat News and Threat Actors pages**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-28T23:01:34Z
- **Completed:** 2026-03-28T23:03:49Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created useAutoRefresh hook with ref-based fetchFn, visibility change handling, and silent error swallowing
- Integrated silent auto-refresh into ThreatNewsPage without any loading flicker
- Integrated silent auto-refresh into ThreatActorsPage without any loading flicker
- Production build passes with no errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useAutoRefresh hook** - `aeb9ef7` (feat)
2. **Task 2: Integrate useAutoRefresh into Threat News and Threat Actors pages** - `1f9085b` (feat)

## Files Created/Modified
- `frontend/src/hooks/useAutoRefresh.js` - Reusable visibility-aware auto-refresh hook (46 lines)
- `frontend/src/pages/ThreatNewsPage.jsx` - Added silentRefresh callback + useAutoRefresh integration
- `frontend/src/pages/ThreatActorsPage.jsx` - Added silentRefresh callback + useAutoRefresh integration

## Decisions Made
- Used separate silentRefresh callbacks per page (mirrors loadData minus setLoading/setError) to prevent skeleton loader flashing
- Stored fetchFn in a ref to avoid interval restarts when search params change

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- npm dependencies not installed in worktree, resolved with npm install before build verification

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- useAutoRefresh hook is reusable for any future page needing auto-refresh (Dashboard, Feeds, etc.)
- Both pages ready for additional enhancements (date filtering, category charts)

## Self-Check: PASSED

All files exist, all commits verified, production build succeeds.

---
*Phase: 31-auto-refresh-infrastructure*
*Completed: 2026-03-29*
