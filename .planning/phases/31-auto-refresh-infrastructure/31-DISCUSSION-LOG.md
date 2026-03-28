# Phase 31: Auto-Refresh Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 31-auto-refresh-infrastructure
**Areas discussed:** Refresh behavior, Hook design, Tab visibility, Error handling

---

## Refresh Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Silent data swap | Replace data in-place without resetting scroll, cursor, or filters | ✓ |
| Refresh only at page 1 | Only auto-refresh when on first page, skip if paginated deeper | |
| Show 'new data available' banner | Twitter-style banner, user clicks to load | |

**User's choice:** Silent data swap
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| No indicator | Completely silent, no visual cue | ✓ |
| Last updated timestamp | Small "Updated 2m ago" text | |
| Brief fade transition | Subtle opacity fade on new data | |

**User's choice:** Initially selected "Last updated timestamp", then revised to no indicator at all
**Notes:** User explicitly requested removing the "last updated" label — wants fully silent refresh with zero visual feedback

---

## Hook Design

| Option | Description | Selected |
|--------|-------------|----------|
| No manual refresh | Only automatic 5-min interval | ✓ |
| Manual refresh button | Hook returns triggerRefresh, pages render refresh icon | |
| You decide | Claude picks | |

**User's choice:** No manual refresh
**Notes:** User also confirmed removing "last updated at" label in this answer

| Option | Description | Selected |
|--------|-------------|----------|
| Generic hook | useAutoRefresh(fetchFn, intervalMs) — reusable for any page | ✓ |
| Page-specific | Bake refresh logic into each page's useEffect | |

**User's choice:** Generic hook
**Notes:** None

---

## Tab Visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Immediate refresh on return | Fetch fresh data when tab visible, restart interval | ✓ |
| Wait for next interval | Resume timer only, data stays stale until next tick | |
| You decide | Claude picks based on useThreatStream pattern | |

**User's choice:** Immediate refresh on return
**Notes:** None

---

## Error Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Keep stale data, retry next interval | Silently keep old data, try again at next 5-min tick | ✓ |
| Show subtle error indicator | Small warning icon indicating data may be stale | |
| You decide | Claude picks | |

**User's choice:** Keep stale data, retry next interval
**Notes:** None

---

## Claude's Discretion

- Hook internal API shape and return value
- Integration approach with each page's existing loadData/useCallback pattern
- Whether hook manages its own state or delegates to consuming component

## Deferred Ideas

None
