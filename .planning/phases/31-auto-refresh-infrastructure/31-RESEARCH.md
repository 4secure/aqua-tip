# Phase 31: Auto-Refresh Infrastructure - Research

**Researched:** 2026-03-29
**Domain:** React hooks, Page Visibility API, interval-based polling
**Confidence:** HIGH

## Summary

This phase requires a single reusable React hook (`useAutoRefresh`) that silently re-fetches data on a 5-minute interval, pauses when the browser tab is hidden, and resumes with an immediate fetch when the tab becomes visible. No new dependencies are needed -- the entire implementation uses built-in browser APIs (`setInterval`, `document.visibilitychange`) and standard React patterns (`useEffect`, `useRef`, `useCallback`) already used throughout the codebase.

The two target pages (ThreatNewsPage and ThreatActorsPage) both follow an identical pattern: a `loadData` useCallback that fetches data and updates component state. The hook needs to call this function on a timer without interfering with the page's existing scroll position, pagination cursor (URL search params), or filter state.

**Primary recommendation:** Build `useAutoRefresh(fetchFn, intervalMs)` as a pure side-effect hook that calls the provided function on a timer. It does not manage data state -- it delegates entirely to the consuming component's existing `loadData` callback.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Silent data swap -- replace data in-place without resetting scroll position, pagination cursor, or active filters. Completely invisible to the user.
- **D-02:** No visual indicator of any kind -- no "Updated X ago" timestamp, no fade transition, no flash. Fully silent.
- **D-03:** Generic reusable hook: `useAutoRefresh(fetchFn, intervalMs)` -- any page can consume it. Threat News and Threat Actors are the first two consumers.
- **D-04:** No manual refresh button exposed. The hook runs autonomously.
- **D-05:** Pause the interval timer when `document.hidden` is true (visibilitychange API).
- **D-06:** Immediate refresh on tab return -- fetch fresh data as soon as the tab becomes visible, then restart the 5-min interval from that point.
- **D-07:** On background refresh failure, keep stale data visible and retry at the next scheduled interval. No error toast, banner, or indicator.

### Claude's Discretion
- Hook internal API shape (return value, callback signature) -- as long as it's generic and reusable
- How to integrate with each page's existing `loadData` / `useCallback` pattern without breaking current behavior
- Whether the hook manages its own state or delegates to the consuming component

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NEWS-01 | Threat news page auto-refreshes every 5 minutes silently | useAutoRefresh hook consuming ThreatNewsPage's existing `loadData` callback |
| ACTOR-02 | Threat actors page auto-refreshes every 5 minutes silently | useAutoRefresh hook consuming ThreatActorsPage's existing `loadData` callback |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **No TypeScript** -- all files are `.jsx`/`.js`
- **No tests exist** -- no test infrastructure to maintain
- **No linter/formatter** -- no pre-commit checks
- **React 19** + **Vite 7** (ESM)
- **Immutability patterns** required (from global coding rules)
- **File size** < 800 lines, functions < 50 lines
- **Error handling** -- handle errors explicitly, never silently swallow (but D-07 says keep stale data on background failure, which is explicit handling)

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 | Hook implementation (useEffect, useRef, useCallback) | Already in project |

### Supporting
No additional libraries needed. This phase uses only browser built-in APIs:
- `document.addEventListener('visibilitychange', ...)` -- Page Visibility API
- `document.hidden` -- boolean for tab visibility state
- `setInterval` / `clearInterval` -- timer management

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom hook | react-query/TanStack Query | Massive overkill for 2 polling consumers; adds dependency; project has no data-fetching library |
| setInterval | setTimeout chain | setTimeout is slightly more resilient to drift but interval is simpler and matches existing DashboardPage pattern |

## Architecture Patterns

### New File
```
frontend/src/hooks/
  useAutoRefresh.js    # NEW -- the reusable hook
```

### Pattern: Side-Effect-Only Hook (Recommended)

The hook should NOT manage data state. It only manages the timer and visibility lifecycle. The consuming component owns its data via its existing `loadData` callback.

**Why:** Both target pages already have `loadData` as a `useCallback` that sets `items`, `pagination`, `loading`, and `error` state. If the hook tried to manage data state, it would duplicate and conflict with this existing pattern. Keeping the hook as a pure timer means zero refactoring of page internals.

**Hook signature:**
```javascript
useAutoRefresh(fetchFn, intervalMs)
```

**Return value:** None needed (fire-and-forget timer). Optionally could return `{ isActive }` for debugging, but D-02 says no visual indicators so there is no UI consumer for this.

### Pattern: Visibility-Aware Interval (from useThreatStream.js)

The project already has a visibility change pattern in `useThreatStream.js` (lines 141-155). The new hook follows the same structure:

```javascript
function handleVisibilityChange() {
  if (document.hidden) {
    // Pause -- clear interval
  } else {
    // Resume -- immediate fetch + restart interval
  }
}
```

### Pattern: Silent Background Fetch (from DashboardPage.jsx)

DashboardPage lines 430-444 show the existing auto-refresh pattern -- a simple `setInterval` that calls API methods and silently updates state, swallowing errors with `.catch(() => {})`. The new hook generalizes this.

### Critical Integration Detail: loadData Dependencies

Both pages define `loadData` with dependencies on URL search params (`after`, `search`, `label`). When these params change, `loadData` gets a new reference via `useCallback`. The hook MUST use a ref to track the latest `fetchFn` so the interval always calls the current version without restarting the timer on every param change.

```javascript
// Inside useAutoRefresh:
const fetchRef = useRef(fetchFn);
useEffect(() => {
  fetchRef.current = fetchFn;
}, [fetchFn]);

// Interval calls fetchRef.current, not fetchFn directly
```

This is the single most important implementation detail. Without it, changing a filter or paginating would restart the 5-minute timer.

### Anti-Patterns to Avoid
- **Passing fetchFn directly to setInterval callback:** The closure captures the initial fetchFn. When search params change, the interval would call stale fetch logic. Always use a ref.
- **Showing loading state during background refresh:** D-01 says invisible. The pages currently set `setLoading(true)` inside `loadData`. This means background refreshes will briefly show skeleton loaders -- a problem. The hook must call a version of fetch that does NOT set loading state. See "Common Pitfalls" below.
- **Restarting interval on every fetchFn change:** Would cause the 5-minute timer to reset every time the user types in search or paginates. Use ref pattern above.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Nothing | N/A | N/A | This is a ~40-line hook using only browser APIs. No libraries needed. |

## Common Pitfalls

### Pitfall 1: Loading Flicker During Background Refresh
**What goes wrong:** Both `loadData` callbacks call `setLoading(true)` at the start. When the hook calls `loadData` in the background, the page briefly shows skeleton loaders, resetting the visible content.
**Why it happens:** The existing `loadData` was designed for user-initiated fetches where a loading indicator is expected.
**How to avoid:** Two options (Claude's discretion per CONTEXT.md):
  - **Option A (Recommended):** Create a separate silent fetch function in each page that updates `items`/`pagination` without touching `loading` state. Pass this to useAutoRefresh instead of `loadData`.
  - **Option B:** Add an `options.silent` parameter to the hook that the page can check via a ref before setting loading state. More coupled.
**Warning signs:** Seeing skeleton loaders appear every 5 minutes.

### Pitfall 2: Scroll Position Reset
**What goes wrong:** React re-renders on state change could cause scroll position to jump if the DOM structure changes significantly.
**Why it happens:** If the new data has different items, React reconciles the list and may cause layout shifts.
**How to avoid:** Since both pages use `items.map()` with `key={item.id}`, React's reconciliation should handle this gracefully as long as the list container is not conditionally rendered based on `loading` state. The silent fetch (Pitfall 1 fix) handles this -- by never setting `loading=true`, the `{!loading && items.length > 0 && ...}` conditional stays stable.
**Warning signs:** Page jumping to top after refresh.

### Pitfall 3: Pagination Cursor Desync
**What goes wrong:** If the user is on page 3 and the backend data changes, the cursor-based pagination may return different results than expected.
**Why it happens:** Cursor pagination relies on server-side ordering. New items can shift the cursor window.
**How to avoid:** The refresh should use the CURRENT search params (including `after` cursor). The ref pattern ensures this automatically -- `loadData` already reads from `searchParams`.
**Warning signs:** Duplicate or missing items after a refresh.

### Pitfall 4: Multiple Intervals After Hot Module Reload (Dev Only)
**What goes wrong:** During development with Vite HMR, effect cleanup may not run correctly, leading to stacked intervals.
**Why it happens:** HMR can sometimes skip cleanup functions.
**How to avoid:** Store interval ID in a ref and always `clearInterval` before creating a new one. Standard practice, just don't forget it.
**Warning signs:** Fetch frequency increasing over time during development.

### Pitfall 5: Race Condition on Tab Return
**What goes wrong:** User returns to tab, immediate fetch fires, but a previous interval callback also fires simultaneously.
**Why it happens:** The interval and visibility handler are separate event sources.
**How to avoid:** Clear the interval BEFORE the immediate fetch on tab return, then restart it after. The visibility handler should: (1) clear interval, (2) fetch immediately, (3) start new interval.
**Warning signs:** Double-fetching on tab return.

## Code Examples

### useAutoRefresh Hook (Complete Implementation Pattern)

```javascript
// Source: Derived from existing patterns in useThreatStream.js + DashboardPage.jsx
import { useEffect, useRef } from 'react';

export function useAutoRefresh(fetchFn, intervalMs = 5 * 60 * 1000) {
  const fetchRef = useRef(fetchFn);

  // Always point to latest fetch function without restarting timer
  useEffect(() => {
    fetchRef.current = fetchFn;
  }, [fetchFn]);

  useEffect(() => {
    let intervalId = null;

    function startInterval() {
      // Clear any existing interval first
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        fetchRef.current().catch(() => {
          // D-07: Silently swallow -- keep stale data, retry next interval
        });
      }, intervalMs);
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        // Pause timer
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      } else {
        // Immediate fetch on return, then restart interval
        fetchRef.current().catch(() => {});
        startInterval();
      }
    }

    // Start the interval (first fetch is the page's own useEffect)
    startInterval();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [intervalMs]);
}
```

### Page Integration Pattern (ThreatNewsPage Example)

```javascript
// Inside ThreatNewsPage component, after existing loadData:

// Silent version that does not set loading state
const silentRefresh = useCallback(async () => {
  try {
    const params = { sort: 'published', order: 'desc' };
    if (after) params.after = after;
    if (search) params.search = search;
    if (label) params.label = label;

    const response = await fetchThreatNews(params);
    const data = response.data || response;
    setItems(data.items || []);
    setPagination(data.pagination || null);
  } catch {
    // D-07: Keep stale data, no error indicator
  }
}, [after, search, label]);

useAutoRefresh(silentRefresh, 5 * 60 * 1000);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| setInterval polling | TanStack Query refetchInterval | 2023+ | Not applicable -- project has no data-fetching library and adding one is overkill |
| Manual visibility handling | usePageVisibility hooks from libraries | 2024+ | Not needed -- 3 lines of code vs adding a dependency |

The project's approach (manual setInterval + visibilitychange) is perfectly standard for a project without a data-fetching layer. No migration needed.

## Open Questions

1. **Should silentRefresh skip fetching when loading is already true?**
   - What we know: If the user manually triggers loadData (e.g., via retry button or filter change), and the interval fires simultaneously, both would run.
   - What's unclear: Whether this causes issues or just wastes a network request.
   - Recommendation: Add a `loadingRef` guard in the page -- if `loading` is true, skip the silent refresh. Low priority since it is a harmless race.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None -- no tests exist in this project (per CLAUDE.md) |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NEWS-01 | Threat News auto-refreshes every 5 min silently | manual | Visual verification in browser | N/A |
| ACTOR-02 | Threat Actors auto-refreshes every 5 min silently | manual | Visual verification in browser | N/A |

### Sampling Rate
- **Per task commit:** Manual browser verification (open page, wait or simulate visibility change)
- **Per wave merge:** `npm run build` to verify no build errors
- **Phase gate:** Visual verification of all 3 success criteria

### Wave 0 Gaps
None -- no test infrastructure exists or is expected for this project.

## Sources

### Primary (HIGH confidence)
- `frontend/src/hooks/useThreatStream.js` -- Existing visibility change pattern (lines 141-155)
- `frontend/src/pages/DashboardPage.jsx` -- Existing setInterval auto-refresh (lines 430-444)
- `frontend/src/pages/ThreatNewsPage.jsx` -- Target consumer, loadData pattern (lines 178-203)
- `frontend/src/pages/ThreatActorsPage.jsx` -- Target consumer, loadData pattern (lines 25-49)

### Secondary (MEDIUM confidence)
- MDN Page Visibility API -- `document.hidden` and `visibilitychange` event are well-supported across all modern browsers

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, uses existing project patterns
- Architecture: HIGH -- both target pages follow identical patterns, integration path is clear
- Pitfalls: HIGH -- loading flicker is the primary risk, well-understood with clear mitigation

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable -- browser APIs and React hooks do not change quickly)
