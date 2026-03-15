---
phase: 11-threat-map
plan: 02
subsystem: ui
tags: [react, leaflet, sse, eventsource, chart.js, real-time, threat-map]

requires:
  - phase: 11-01
    provides: "ThreatMap backend endpoints (snapshot + SSE stream)"
provides:
  - "useThreatStream hook for EventSource + snapshot management"
  - "5 threat map sub-components (Counters, Countries, Donut, Feed, Status)"
  - "Refactored ThreatMapPage with live SSE data, pulse markers, click-to-pan"
  - "Pulse-and-fade CSS keyframe animations for map event markers"
affects: []

tech-stack:
  added: []
  patterns: [ref-based-chart-update, eventsource-hook, pulse-fade-markers, auto-scroll-pause]

key-files:
  created:
    - frontend/src/hooks/useThreatStream.js
    - frontend/src/components/threat-map/ThreatMapCounters.jsx
    - frontend/src/components/threat-map/ThreatMapCountries.jsx
    - frontend/src/components/threat-map/ThreatMapDonut.jsx
    - frontend/src/components/threat-map/ThreatMapFeed.jsx
    - frontend/src/components/threat-map/ThreatMapStatus.jsx
  modified:
    - frontend/src/pages/ThreatMapPage.jsx
    - frontend/src/styles/animations.css

key-decisions:
  - "Used apiClient (fetch-based) instead of axios for snapshot loading -- consistent with existing project API pattern"
  - "Ref-based chart update pattern for donut -- avoids chart destroy/recreate on each SSE event"
  - "EventSource URL uses BASE_URL directly since apiClient doesn't support SSE"
  - "Counters derived from event array rather than maintained separately for consistency"

patterns-established:
  - "EventSource hook pattern: snapshot on mount, SSE after load, auto-reconnect via browser"
  - "Pulse-and-fade marker pattern: L.divIcon + CSS animation + setTimeout removal"
  - "Auto-scroll pause/resume: track userScrolled state via scroll position"

requirements-completed: [TMAP-02, TMAP-03, TMAP-04, TMAP-05]

duration: 8min
completed: 2026-03-15
---

# Phase 11 Plan 02: Threat Map Frontend Summary

**Live threat map with SSE-driven pulse markers, real-time counters/charts, scrollable feed with click-to-pan, and connection status handling**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-15T02:43:07Z
- **Completed:** 2026-03-15T02:51:00Z
- **Tasks:** 2 auto + 1 checkpoint (pending)
- **Files modified:** 8

## Accomplishments
- useThreatStream hook managing snapshot + SSE with max 50 events, immutable state
- 5 extracted sub-components: Counters, Countries, Donut, Feed, Status
- ThreatMapPage refactored from hardcoded mock to live SSE data
- Pulse-and-fade CSS animations for 4 color variants plus highlight
- Removed all mock data and deferred time range controls

## Task Commits

Each task was committed atomically:

1. **Task 1: useThreatStream hook and CSS animations** - `9bd105b` (feat)
2. **Task 2: Sub-components and ThreatMapPage refactor** - `8ee8d35` (feat)
3. **Task 3: Verify live threat map end-to-end** - checkpoint (human-verify)

## Files Created/Modified
- `frontend/src/hooks/useThreatStream.js` - EventSource + snapshot hook with event/counter/connection state
- `frontend/src/components/threat-map/ThreatMapCounters.jsx` - 3 real-time counter cards with LIVE indicator
- `frontend/src/components/threat-map/ThreatMapCountries.jsx` - Top 5 source countries with flag emojis
- `frontend/src/components/threat-map/ThreatMapDonut.jsx` - Attack distribution doughnut chart with live updates
- `frontend/src/components/threat-map/ThreatMapFeed.jsx` - Scrollable live feed with auto-scroll and click-to-pan
- `frontend/src/components/threat-map/ThreatMapStatus.jsx` - Amber connection lost banner
- `frontend/src/pages/ThreatMapPage.jsx` - Refactored to use live data, pulse markers, all sub-components
- `frontend/src/styles/animations.css` - mapEventPulse keyframes and 5 color variant classes

## Decisions Made
- Used apiClient (fetch-based) for snapshot loading instead of axios -- consistent with project conventions
- Ref-based chart update for donut to avoid destroy/recreate on each SSE event
- EventSource URL constructed with BASE_URL directly since apiClient doesn't support SSE streaming
- Counter values derived from event array for consistency (server counters used only from initial snapshot)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used apiClient instead of axios for snapshot**
- **Found during:** Task 1 (useThreatStream hook)
- **Issue:** Plan specified axios but project uses custom apiClient (fetch-based), not axios
- **Fix:** Used `apiClient.get('/api/threat-map/snapshot')` matching project pattern
- **Files modified:** frontend/src/hooks/useThreatStream.js
- **Verification:** Build passes, import resolves correctly
- **Committed in:** 9bd105b (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix to match project conventions. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Threat map frontend complete with live SSE integration
- Awaiting human verification (Task 3 checkpoint) to confirm visual correctness
- Phase 11 will be fully complete after checkpoint approval

---
*Phase: 11-threat-map*
*Completed: 2026-03-15*
