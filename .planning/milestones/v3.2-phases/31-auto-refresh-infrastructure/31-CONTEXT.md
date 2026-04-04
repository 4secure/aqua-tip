# Phase 31: Auto-Refresh Infrastructure - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Reusable `useAutoRefresh` hook that silently refreshes Threat News and Threat Actors page data every 5 minutes. Pauses when browser tab is hidden, resumes with immediate fetch on return. No visual indicators, no manual refresh controls.

</domain>

<decisions>
## Implementation Decisions

### Refresh Behavior
- **D-01:** Silent data swap — replace data in-place without resetting scroll position, pagination cursor, or active filters. Completely invisible to the user.
- **D-02:** No visual indicator of any kind — no "Updated X ago" timestamp, no fade transition, no flash. Fully silent.

### Hook Design
- **D-03:** Generic reusable hook: `useAutoRefresh(fetchFn, intervalMs)` — any page can consume it. Threat News and Threat Actors are the first two consumers.
- **D-04:** No manual refresh button exposed. The hook runs autonomously.

### Tab Visibility
- **D-05:** Pause the interval timer when `document.hidden` is true (visibilitychange API).
- **D-06:** Immediate refresh on tab return — fetch fresh data as soon as the tab becomes visible, then restart the 5-min interval from that point.

### Error Handling
- **D-07:** On background refresh failure, keep stale data visible and retry at the next scheduled interval. No error toast, banner, or indicator.

### Claude's Discretion
- Hook internal API shape (return value, callback signature) — as long as it's generic and reusable
- How to integrate with each page's existing `loadData` / `useCallback` pattern without breaking current behavior
- Whether the hook manages its own state or delegates to the consuming component

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Auto-Refresh Pattern
- `frontend/src/hooks/useThreatStream.js` — Existing visibility-based pause/resume pattern (lines 141-155) to follow as reference
- `frontend/src/pages/DashboardPage.jsx` — Existing basic setInterval auto-refresh (lines 430-444) for counts endpoint

### Target Pages
- `frontend/src/pages/ThreatNewsPage.jsx` — First consumer: uses `fetchThreatNews` + `loadData` useCallback pattern with cursor pagination and category filter state
- `frontend/src/pages/ThreatActorsPage.jsx` — Second consumer: uses `fetchThreatActors` + `loadData` useCallback pattern with cursor pagination and search state

### API Layer
- `frontend/src/api/threat-news.js` — `fetchThreatNews` function
- `frontend/src/api/threat-actors.js` — `fetchThreatActors` function

### Requirements
- `.planning/REQUIREMENTS.md` §Threat News — NEWS-01 (5-min auto-refresh)
- `.planning/REQUIREMENTS.md` §Threat Actors — ACTOR-02 (5-min auto-refresh)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useThreatStream` hook: Has a clean `visibilitychange` listener with disconnect-on-hide / reconnect-on-visible pattern — direct reference for the pause/resume logic
- Both target pages already have `loadData` as a `useCallback` — the hook can accept this as the fetch function

### Established Patterns
- Visibility handling: `document.addEventListener('visibilitychange', handler)` with cleanup in useEffect return
- Data fetching: `useCallback` wrapping async fetch with `cancelled` flag for cleanup
- Interval: `setInterval` + `clearInterval` in useEffect (DashboardPage lines 430-444)

### Integration Points
- New hook file: `frontend/src/hooks/useAutoRefresh.js`
- Threat News: wrap existing `loadData` callback with useAutoRefresh
- Threat Actors: wrap existing `loadData` callback with useAutoRefresh
- Both pages use `useSearchParams` for cursor-based pagination — refresh must not reset URL params

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 31-auto-refresh-infrastructure*
*Context gathered: 2026-03-29*
