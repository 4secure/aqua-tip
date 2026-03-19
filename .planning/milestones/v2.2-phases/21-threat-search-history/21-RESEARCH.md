# Phase 21: Threat Search History - Research

**Researched:** 2026-03-20
**Domain:** React frontend -- conditional UI rendering, API integration, UX state management
**Confidence:** HIGH

## Summary

Phase 21 is a frontend-only change to `ThreatSearchPage.jsx`. The backend endpoint (`GET /api/search-history`) already exists (Phase 19) and returns `{ data: [...], meta: { total, limit } }` with fields `id, query, type, module, created_at`. The DashboardPage already calls this endpoint and renders results with `RecentSearchesWidget` -- this phase replicates a similar pattern on the Threat Search page with 10 entries instead of 5, click-to-prefill (not auto-execute), and guest/empty states.

The implementation is straightforward: add a `useEffect` to fetch history on mount (auth-only), add conditional rendering below the search card when `result === null`, and wire click handlers to prefill the search input. All UI patterns (glass cards, type badges, loading skeletons, guest CTAs) already exist in the codebase. The `TYPE_BADGE_COLORS` map is already defined in ThreatSearchPage.jsx.

**Primary recommendation:** Add history state + fetch logic to ThreatSearchPage, render a history section below the search card when no result is active, following DashboardPage patterns exactly.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- History section appears as a separate glass card **below the search bar card** when no search result is active
- Show **10 entries** (more generous than dashboard's 5 since this is the dedicated search page)
- **Row list** style matching the dashboard's RecentSearchesWidget -- each row shows: query text, type badge (colored), relative time
- Header: "Recent Searches" with clock icon -- consistent with dashboard widget
- Clicking a history entry **pre-fills the search input** but does NOT auto-execute the search
- After pre-fill, **focus moves to the search input** so user can press Enter or edit first
- Page **scrolls to top** (search bar) after pre-fill
- **Guest users (unauthenticated):** Show a sign-in CTA glass card where history would be
- **Authenticated users with zero history:** Show encouraging empty state
- **Authenticated users with history:** Show the history list (up to 10 entries)
- History section **only shows on initial page load** (fresh navigation to `/threat-search`)
- Once a search is performed, results replace history for the rest of that page session
- **No clear/reset button** -- history reappears on next navigation to the page
- **Fetch once on mount** -- no re-fetch after searches

### Claude's Discretion
- Loading skeleton design for history fetch
- Error state if history API fails
- Exact spacing between search card and history card
- Whether to extract a shared API function for search history or inline the apiClient call

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HIST-03 | Recent searches displayed on Threat Search page when no search is active | History section renders when `result === null` and `isAuthenticated`; fetched via `apiClient.get('/api/search-history')` on mount |
| HIST-04 | Clicking a recent search re-runs the query on Threat Search page | Click handler calls `setQuery(entry.query)`, focuses input via `inputRef.current.focus()`, scrolls to top |
| HIST-05 | Search type badge (IP, Domain, Hash, etc.) shown next to each history entry | `TYPE_BADGE_COLORS` map already exists in ThreatSearchPage.jsx; same badge rendering as DashboardPage |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Purpose | Why Standard |
|---------|---------|--------------|
| React 19 | Component rendering, hooks | Already used across entire frontend |
| apiClient (custom) | API calls with CSRF + credentials | Standard HTTP client in this project |
| useAuth (custom context) | Auth state check | Already imported in ThreatSearchPage |
| Lucide React | Icons (Clock, LogIn) | Already imported in ThreatSearchPage |

### No New Dependencies
This phase requires zero new packages. Everything needed is already in the project.

## Architecture Patterns

### Target File Structure
```
frontend/src/pages/
  ThreatSearchPage.jsx    # MODIFIED -- add history section (~50-70 lines of new code)
```

Single file modification. No new files needed unless extracting `formatRelativeTime` to a shared util (optional, Claude's discretion).

### Pattern 1: Conditional History Rendering
**What:** Show history section only when `result === null` (no active search)
**When to use:** Idle state on the Threat Search page

The existing page structure:
```jsx
<div className="space-y-6">
  {/* Search Header card -- always visible */}
  <div className="glass-card p-6">...</div>

  {/* Error states */}
  {error?.status === 502 && (...)}
  {error?.status === 422 && (...)}

  {/* Results -- shown when result !== null */}
  {result !== null && (<>...</>)}

  {/* NEW: History section -- shown when result === null */}
  {result === null && (<HistorySection />)}
</div>
```

### Pattern 2: Auth-Gated Fetch on Mount
**What:** Fetch search history only for authenticated users, once on mount
**When to use:** When page loads and user is authenticated

Reference from DashboardPage (lines 422-432):
```jsx
useEffect(() => {
  if (!isAuthenticated) return;
  let cancelled = false;
  setHistoryLoading(true);
  apiClient.get('/api/search-history')
    .then(res => { if (!cancelled) { setHistory(res.data); setHistoryError(null); } })
    .catch(err => { if (!cancelled) setHistoryError(err); })
    .finally(() => { if (!cancelled) setHistoryLoading(false); });
  return () => { cancelled = true; };
}, [isAuthenticated]);
```

### Pattern 3: Click-to-Prefill with Focus + Scroll
**What:** Clicking a history entry prefills the search input, focuses it, and scrolls to top
**When to use:** User clicks any history row

```jsx
// Add ref to search input
const inputRef = useRef(null);

function handleHistoryClick(entry) {
  setQuery(entry.query);
  inputRef.current?.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
```

### Pattern 4: Three-State Rendering (Guest / Empty / Data)
**What:** Branch rendering based on auth state and data availability
**When to use:** History section rendering

```jsx
{result === null && (
  !isAuthenticated ? (
    <GuestHistoryCta />
  ) : historyLoading ? (
    <HistoryLoadingSkeleton />
  ) : historyError ? (
    <HistoryErrorState />
  ) : history.length === 0 ? (
    <HistoryEmptyState />
  ) : (
    <HistoryList items={history} onSelect={handleHistoryClick} />
  )
)}
```

### Anti-Patterns to Avoid
- **Auto-executing on click:** User decision is pre-fill only, not auto-search. Do NOT call `handleSearch()` on click.
- **Re-fetching after search:** User decision is fetch-once-on-mount. Do NOT re-fetch history after a search completes.
- **Extracting to separate file:** The page is ~725 lines. Adding ~50-70 lines of inline sub-components keeps it under 800 lines. Only extract if it goes over 800.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Relative time formatting | Custom time formatter | Copy `formatRelativeTime()` from DashboardPage | Identical logic, already tested in production |
| Type badge colors | New color map | Use existing `TYPE_BADGE_COLORS` already in ThreatSearchPage | Same map, same values |
| API client | fetch wrapper | Use `apiClient.get()` from `../api/client` | Handles CSRF, credentials, error shaping |
| Auth check | Manual token check | Use `useAuth().isAuthenticated` | Already imported in the file |

## Common Pitfalls

### Pitfall 1: Race Condition on Unmount
**What goes wrong:** Component unmounts while fetch is in-flight, causing state update on unmounted component
**Why it happens:** Navigation away before API responds
**How to avoid:** Use `cancelled` flag pattern (same as DashboardPage)
**Warning signs:** React warning about state update on unmounted component

### Pitfall 2: Missing `inputRef` on Search Input
**What goes wrong:** `inputRef.current` is null when trying to focus
**Why it happens:** Ref not attached to the input element
**How to avoid:** Add `ref={inputRef}` to the existing `<input>` element in the search card
**Warning signs:** Click on history entry does nothing visually

### Pitfall 3: History Visible During Search Results
**What goes wrong:** History section flashes or stays visible when results are loading
**Why it happens:** `result` is still `null` during loading state
**How to avoid:** Gate on `result === null && !loading` or accept that history hides once `result` is set (which happens after loading completes). Since `result` starts as `null` and only changes after search completes, this is already correct -- but verify `loading` state doesn't cause flicker.
**Warning signs:** History card visible below search results

### Pitfall 4: Scroll-to-Top Not Working
**What goes wrong:** `window.scrollTo` doesn't scroll because page is within a scrollable container (AppLayout)
**Why it happens:** The main scroll container may not be `window` but a layout wrapper div
**How to avoid:** Check if AppLayout uses `overflow-auto` on a wrapper. If so, scroll that element instead of `window`.
**Warning signs:** Clicking history entry doesn't scroll up

## Code Examples

### API Response Shape (from IndexController.php)
```json
{
  "data": [
    {
      "id": 42,
      "query": "185.220.101.34",
      "type": "IPv4-Addr",
      "module": "threat_search",
      "created_at": "2026-03-20T10:30:00.000000Z"
    }
  ],
  "meta": {
    "total": 5,
    "limit": 20
  }
}
```

The backend returns up to 20 items. The frontend should slice to 10 (`items.slice(0, 10)`).

### Existing formatRelativeTime (from DashboardPage lines 40-53)
```jsx
function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  // ... continues with day formatting
}
```

### Existing Guest CTA Pattern (from DashboardPage lines 313-323)
```jsx
function GuestCta({ icon, message }) {
  return (
    <div className="glass-card p-5 flex flex-col items-center justify-center text-center py-8">
      <div className="w-12 h-12 rounded-xl bg-violet/10 flex items-center justify-center text-violet mb-4">
        <Icon name={icon} />
      </div>
      <p className="text-sm text-text-secondary mb-4 font-mono">{message}</p>
      <Link to="/login" className="btn-primary text-sm">Sign In</Link>
    </div>
  );
}
```

Note: ThreatSearchPage uses Lucide icons directly (e.g., `<Clock />`) rather than the `<Icon name="..." />` helper from `data/icons.jsx`. The history section should use Lucide icons to stay consistent with the rest of the page.

### Existing RecentSearchesWidget Row Pattern (from DashboardPage lines 289-305)
```jsx
<div key={s.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-border/30 last:border-0">
  <span className="font-mono text-xs text-text-primary truncate max-w-[160px]">{s.query}</span>
  <div className="flex items-center gap-2 shrink-0">
    <span
      className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold"
      style={{ backgroundColor: badge.bg, color: badge.text }}
    >
      {s.type}
    </span>
    <span className="text-[10px] text-text-muted">{formatRelativeTime(s.created_at)}</span>
  </div>
</div>
```

For the Threat Search page version: make each row clickable (`cursor-pointer`, `hover:bg-surface-2/50`), and widen `max-w` since the Threat Search page has more horizontal space than the dashboard widget.

## State of the Art

No new approaches needed. This phase uses established React patterns already present in the codebase.

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Mock data only | Real API (Phase 19) | Phase 19 | History comes from `/api/search-history` endpoint |
| No idle state on search page | History in idle state | This phase | Users see recent searches when page loads |

## Open Questions

1. **Scroll container for scroll-to-top**
   - What we know: AppLayout wraps page content; `window.scrollTo` may not work if layout uses internal scrolling
   - What's unclear: Whether the main scroll target is `window` or a wrapper div
   - Recommendation: Try `window.scrollTo` first; if it doesn't work, find the scroll container in AppLayout and use `element.scrollTo` or `scrollIntoView` on the search card

2. **Shared `formatRelativeTime` utility**
   - What we know: Function is defined locally in DashboardPage.jsx, will be duplicated in ThreatSearchPage
   - What's unclear: Whether to extract to a shared utils file now or accept duplication
   - Recommendation: Accept duplication for this phase (two usages). Extract later if a third consumer appears. This keeps the phase change minimal.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None -- no tests exist in this project (per CLAUDE.md) |
| Config file | none |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HIST-03 | History displays when no search active | manual-only | Visual verification on `/threat-search` | N/A |
| HIST-04 | Click history entry prefills search | manual-only | Click entry, verify input populated | N/A |
| HIST-05 | Type badge shown per entry | manual-only | Visual verification of badge colors | N/A |

### Sampling Rate
- **Per task commit:** Manual browser test -- navigate to `/threat-search`, verify history loads
- **Per wave merge:** Full manual walkthrough of all 3 states (guest, empty, with data)
- **Phase gate:** All 3 requirements verified visually in browser

### Wave 0 Gaps
No test infrastructure exists in this project. All validation is manual.

## Sources

### Primary (HIGH confidence)
- `frontend/src/pages/ThreatSearchPage.jsx` -- current page implementation (725 lines)
- `frontend/src/pages/DashboardPage.jsx` -- RecentSearchesWidget reference (lines 252-311)
- `backend/app/Http/Controllers/SearchHistory/IndexController.php` -- API response shape
- `frontend/src/api/client.js` -- apiClient interface
- `.planning/phases/21-threat-search-history/21-CONTEXT.md` -- user decisions

### Secondary (MEDIUM confidence)
- None needed -- all sources are project code

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in use, no new dependencies
- Architecture: HIGH -- direct replication of existing DashboardPage patterns
- Pitfalls: HIGH -- common React patterns, well-understood edge cases

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable -- frontend-only changes to existing patterns)
