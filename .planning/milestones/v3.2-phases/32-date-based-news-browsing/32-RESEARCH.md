# Phase 32: Date-Based News Browsing - Research

**Researched:** 2026-03-29
**Domain:** React date UI + OpenCTI GraphQL date filtering + timezone conversion
**Confidence:** HIGH

## Summary

This phase replaces cursor-based pagination on the Threat News page with a date selector. The frontend computes UTC date boundaries from the user's IANA timezone and the selected local date, sends them to the backend, and the backend passes them through to OpenCTI's GraphQL FilterGroup using the `published` field. All pieces exist in the codebase already -- the main work is wiring them together and building the calendar dropdown UI.

OpenCTI's FilterGroup supports a `within` operator that accepts exactly two date values, making single-day filtering straightforward. The frontend already has timezone-aware date formatting (`useFormatDate`), URL state management (`useSearchParams`), and the glassmorphism dropdown pattern (`CategoryDropdown`). No new dependencies are needed.

**Primary recommendation:** Use OpenCTI's `within` operator on the `published` field with two UTC ISO 8601 timestamps computed from the selected local date. Build a custom calendar dropdown following the existing CategoryDropdown glassmorphism pattern. Remove all cursor/pagination state.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Custom glassmorphism calendar dropdown -- not a native `<input type="date">`. Matches the dark design system (bg-surface/60, border-border, backdrop-blur-sm).
- **D-02:** Placement: replaces the current pagination area (right side of toolbar, where prev/next buttons and counter are now).
- **D-03:** Prev/next day arrows (ChevronLeft/ChevronRight) flanking a calendar icon button that opens the full calendar picker.
- **D-04:** "Today" quick-action button appears when viewing a non-today date, allowing instant jump back to current date.
- **D-05:** Cursor-based pagination (prev/next buttons, cursor history, PAGE_SIZE) is fully removed from the Threat News page.
- **D-06:** All reports for the selected date are loaded in a single request -- no pagination within a date. Daily volume is manageable (tens to low hundreds of reports).
- **D-07:** Text search and category dropdown filter remain active in the toolbar, filtering within the selected date's results. All three dimensions (date + search + category) work together.
- **D-08:** Frontend computes the UTC date range from the selected date using the user's IANA timezone. Sends `start` and `end` UTC timestamps to the backend. Backend passes them through to the OpenCTI filter without conversion.
- **D-09:** For unauthenticated users (no timezone in AuthContext), default to the browser's timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- **D-10:** Selected date stored as query param `?date=2026-03-29` (YYYY-MM-DD format). Consistent with existing `?search=` and `?label=` params. No route changes needed.
- **D-11:** When no `?date` param is present, the page defaults to today's date (NEWS-02 requirement). URL stays clean for the default case.

### Claude's Discretion
- Calendar component internals (month navigation, year selection, animation)
- Backend query parameter naming (`start`/`end` vs `from`/`to` vs `date_start`/`date_end`)
- How to adapt `ThreatNewsService::list()` for date range filtering (new parameters vs new method)
- Whether to extract the calendar dropdown as a reusable component or keep it page-specific
- How auto-refresh (useAutoRefresh) interacts with date selection -- should it only refresh the currently selected date's data
- Empty state messaging when a date has no reports vs the generic "No reports available"

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NEWS-02 | User sees current date's threat news by default | D-11: default to today when no `?date` param; timezone computation via `useFormatDate` + AuthContext timezone |
| NEWS-03 | User can select a date to load that day's threat news (replaces pagination) | D-01 through D-06: calendar dropdown replaces pagination; OpenCTI `within` operator on `published` field; backend passes UTC start/end to FilterGroup |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 | UI framework | Already in project |
| react-router-dom | 7 | URL state via `useSearchParams` | Already in project, used for `?date` param |
| lucide-react | latest | Icons (ChevronLeft, ChevronRight, Calendar) | Already in project |
| Intl.DateTimeFormat | Browser built-in | Timezone-aware date computation | Zero-dependency, already used in `useFormatDate` |

### Supporting
No new libraries required. The calendar dropdown is built from scratch using the same patterns as `CategoryDropdown`.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom calendar | react-day-picker | Adds ~15KB dependency for a single-use calendar; custom matches glassmorphism design system perfectly |
| Custom calendar | date-fns + date picker lib | Overkill -- only need month grid generation which is ~20 lines of code |
| Intl API for TZ | dayjs/luxon | Already using Intl throughout; adding a date library for two timezone conversions is unnecessary |

## Architecture Patterns

### Recommended Approach

```
Frontend                          Backend                    OpenCTI
--------                          -------                    -------
User picks date (local)
  |
  v
Compute UTC boundaries:
  start = startOfDay(date, tz)
  end   = startOfDay(date+1, tz)
  |
  v
GET /api/threat-news
  ?date_start=2026-03-29T...Z
  &date_end=2026-03-30T...Z     --> Add to FilterGroup  --> published within [start, end)
  &search=...                       as `within` filter
  &label=...
```

### Pattern 1: UTC Boundary Computation from Local Date
**What:** Convert a YYYY-MM-DD local date + IANA timezone into two UTC ISO 8601 timestamps representing the start and end of that day in the user's timezone.
**When to use:** Every time the selected date changes or the page loads with a `?date` param.
**Example:**
```javascript
// Source: Browser Intl API + Date constructor
function getDateBoundariesUtc(localDateStr, timezone) {
  // localDateStr = "2026-03-29", timezone = "Asia/Manila"
  // Create a Date at midnight in the user's timezone
  // Using Intl to find the UTC offset for that timezone at that date
  const parts = localDateStr.split('-').map(Number);
  const year = parts[0], month = parts[1], day = parts[2];

  // Create formatter that outputs UTC components for a given timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });

  // Approach: use a temporary Date, format in target TZ, compute offset
  // Simpler: construct date string with timezone and let Date parse it
  // Most reliable: iterate to find the UTC instant that corresponds to
  // midnight in the target timezone

  // Practical approach using toLocaleString round-trip:
  function midnightInTz(y, m, d, tz) {
    // Start with a guess: UTC midnight on that date
    const guess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
    // Format that guess in the target timezone
    const inTz = new Date(guess.toLocaleString('en-US', { timeZone: tz }));
    // Difference = offset
    const offset = guess.getTime() - inTz.getTime();
    return new Date(guess.getTime() + offset);
  }

  const start = midnightInTz(year, month, day, timezone);
  const end = midnightInTz(year, month, day + 1, timezone);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}
```

### Pattern 2: Calendar Grid Generation
**What:** Generate a 6-row x 7-column grid of day numbers for a given month, including leading/trailing days from adjacent months.
**When to use:** Rendering the month view in the calendar dropdown.
**Example:**
```javascript
function getCalendarGrid(year, month) {
  // month is 0-indexed (0 = January)
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const grid = [];
  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    grid.push({ day: daysInPrevMonth - i, current: false });
  }
  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    grid.push({ day: d, current: true });
  }
  // Next month leading days (fill to 42 = 6 rows)
  const remaining = 42 - grid.length;
  for (let d = 1; d <= remaining; d++) {
    grid.push({ day: d, current: false });
  }
  return grid;
}
```

### Pattern 3: OpenCTI `within` Filter for Date Range
**What:** Use OpenCTI's FilterGroup `within` operator to filter reports by `published` date within a UTC range.
**When to use:** Backend receives `date_start` and `date_end` query params.
**Example:**
```php
// Source: https://docs.opencti.io/latest/reference/filters/
// The "within" operator accepts exactly two values [from, to]
$filterItems[] = [
    'key' => 'published',
    'values' => [$dateStart, $dateEnd],
    'operator' => 'within',
    'mode' => 'or',
];
```

### Anti-Patterns to Avoid
- **Client-side date filtering:** Never fetch all reports and filter by date on the frontend. Always filter server-side via OpenCTI GraphQL.
- **Using `new Date(localDateStr)` without timezone:** `new Date("2026-03-29")` parses as UTC midnight, not the user's local midnight. Always compute boundaries with the user's IANA timezone.
- **Hardcoding timezone offset:** Timezone offsets change with DST. Always use IANA timezone names and let the browser compute the offset for the specific date.
- **Mutating URL params object:** Use `new URLSearchParams(prev)` pattern (already established in codebase) to create a new params object.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timezone offset lookup | Manual UTC offset table | `Intl.DateTimeFormat` with `timeZone` option | DST rules change; browser has up-to-date IANA database |
| Date formatting | Custom date string formatting | `useFormatDate` hook (already exists) | Consistent formatting across the app |
| Click-outside detection | Custom event listener | Follow `CategoryDropdown` pattern (already exists) | Proven pattern with proper cleanup |

## Common Pitfalls

### Pitfall 1: DST Boundary Dates
**What goes wrong:** A day near a DST transition has 23 or 25 hours. If you assume all days are exactly 24 hours (86400000ms), the computed end boundary will be off by 1 hour.
**Why it happens:** Adding 86400000ms to a midnight timestamp doesn't account for DST spring-forward or fall-back.
**How to avoid:** Compute start of "next day" independently using `Date(year, month, day+1)` in the target timezone rather than adding 24 hours to the start.
**Warning signs:** Reports from late evening (in user's timezone) appearing on the wrong date.

### Pitfall 2: `first` Parameter Too Small
**What goes wrong:** If the `first` parameter in the GraphQL query is still set to 20 (PAGE_SIZE), days with more than 20 reports will silently truncate.
**Why it happens:** The current code hardcodes `first: 20` from the pagination era.
**How to avoid:** Per D-06, load all reports for a day. Set `first` to a large value (e.g., 500) since daily volume is tens to low hundreds. The backend `list()` method's `$first` parameter must be updated.
**Warning signs:** Report count seems capped, "has_next" is true but no pagination exists.

### Pitfall 3: Cache Key Collision
**What goes wrong:** The backend cache key is computed from `func_get_args()`. Adding new parameters changes the key structure, but old cached entries with the old key format may still be served for requests without date params.
**Why it happens:** The cache key is an MD5 of all arguments. When new parameters are added with null defaults, the key changes structure.
**How to avoid:** This is actually safe because `func_get_args()` will include the new parameters (even if null), producing a different hash from old cache entries. No action needed, but verify by testing.
**Warning signs:** Stale data appearing after deployment.

### Pitfall 4: Removing Pagination Breaks Auto-Refresh
**What goes wrong:** The `silentRefresh` callback currently depends on `after` (cursor) state. After removing cursor state, the callback must use date boundaries instead.
**Why it happens:** The `silentRefresh` callback's dependency array includes `after`, `search`, `label`. When `after` is removed and replaced with date boundaries, the callback must be updated.
**How to avoid:** Replace `after` with computed date boundaries in the `silentRefresh` callback's params and dependency array.
**Warning signs:** Auto-refresh fetches all reports instead of the selected date's reports.

### Pitfall 5: Date Param vs Today Default
**What goes wrong:** When no `?date` param exists, the page should show today's news. But "today" changes at midnight in the user's timezone. If the page is open across midnight, "today" becomes stale.
**Why it happens:** The default date is computed once on mount but the user's "today" shifts at midnight.
**How to avoid:** Auto-refresh already runs every 5 minutes. When the selected date is "today" (no explicit `?date` param), recompute "today" on each refresh. If the date has changed, update the fetch boundaries.
**Warning signs:** Reports from "yesterday" still showing after midnight.

## Code Examples

### UTC Boundary Computation (Recommended Implementation)
```javascript
// Source: Browser Intl API
// Compute UTC start/end of a local date in a given timezone
function getUtcBoundaries(dateStr, timezone) {
  // dateStr: "2026-03-29", timezone: "Asia/Manila" (UTC+8)
  // Manila midnight = 2026-03-28T16:00:00Z
  // Manila next midnight = 2026-03-29T16:00:00Z
  const [year, month, day] = dateStr.split('-').map(Number);

  function toUtcMidnight(y, m, d, tz) {
    // Create a guess at UTC midnight
    const guess = new Date(Date.UTC(y, m - 1, d));
    // Find what time that is in the target timezone
    const tzStr = guess.toLocaleString('en-US', { timeZone: tz });
    const tzDate = new Date(tzStr);
    // Compute the offset and adjust
    const diff = guess.getTime() - tzDate.getTime();
    return new Date(guess.getTime() + diff);
  }

  const start = toUtcMidnight(year, month, day, timezone);
  const end = toUtcMidnight(year, month, day + 1, timezone);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}
```

### Today's Date in User's Timezone
```javascript
// Get today's date string (YYYY-MM-DD) in the user's timezone
function getTodayStr(timezone) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return parts; // "2026-03-29" (en-CA gives YYYY-MM-DD format)
}
```

### Backend FilterGroup Addition
```php
// Add to ThreatNewsService::executeQuery()
if ($dateStart && $dateEnd) {
    $filterItems[] = [
        'key' => 'published',
        'values' => [$dateStart, $dateEnd],
        'operator' => 'within',
        'mode' => 'or',
    ];
}
```

### URL State Management
```javascript
// Reading date from URL with today as default
const dateParam = searchParams.get('date');
const effectiveDate = dateParam || getTodayStr(timezone);

// Writing date to URL (only when not today)
const handleDateChange = useCallback((newDate) => {
  const today = getTodayStr(timezone);
  setSearchParams((prev) => {
    const next = new URLSearchParams(prev);
    if (newDate === today) {
      next.delete('date');
    } else {
      next.set('date', newDate);
    }
    return next;
  });
}, [timezone, setSearchParams]);
```

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
| NEWS-02 | Default to current date's news | manual | Visual verification in browser | N/A |
| NEWS-03 | Date selector loads selected day's news | manual | Visual verification in browser | N/A |

### Sampling Rate
- **Per task commit:** Manual browser verification (no test infrastructure)
- **Per wave merge:** Manual browser verification
- **Phase gate:** Visual verification of all 4 success criteria

### Wave 0 Gaps
No test infrastructure exists in this project. Per CLAUDE.md: "No tests exist" and "No linter/formatter configured." Setting up test infrastructure is out of scope for this phase.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| OpenCTI `gte`+`lte` two filters | `within` operator (single filter, two values) | OpenCTI 5.12+ | Cleaner FilterGroup -- one filter instead of two |
| `Temporal` API for timezone math | `Intl.DateTimeFormat` + `toLocaleString` round-trip | Temporal still Stage 3 as of 2026 | Intl is the only reliable zero-dependency option |

## Open Questions

1. **`within` operator inclusivity**
   - What we know: OpenCTI docs show `within` accepts two values [from, to]. The operator filters for dates within that range.
   - What's unclear: Whether `within` is inclusive on both ends (`>=` start AND `<=` end) or exclusive on the end (`>=` start AND `<` end). If inclusive on both ends, a report published at exactly midnight UTC could appear in two adjacent days for UTC-based users.
   - Recommendation: Use `start = startOfDay(date)` and `end = startOfDay(date+1)`. If `within` is inclusive on both, the overlap is only at the exact millisecond boundary, which is negligible. Test with real data to verify.

2. **Maximum reports per day**
   - What we know: D-06 states "tens to low hundreds." Setting `first: 500` should cover all cases.
   - What's unclear: Whether any exceptional day could exceed 500 reports.
   - Recommendation: Use `first: 500` and log a warning if `has_next` is true (meaning truncation occurred). This is a monitoring concern, not a blocking issue.

## Sources

### Primary (HIGH confidence)
- [OpenCTI Filters Documentation](https://docs.opencti.io/latest/reference/filters/) -- FilterGroup structure, `within` operator, date filter syntax
- Project codebase -- ThreatNewsService.php, ThreatNewsPage.jsx, useFormatDate.js, AuthContext.jsx, IndexController.php

### Secondary (MEDIUM confidence)
- [OpenCTI GitHub - Filter Migration Docs](https://docs.opencti.io/latest/deployment/breaking-changes/5.12-filters/) -- FilterGroup format confirmation
- [MDN Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat) -- timezone handling via Intl API

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all tools already in project
- Architecture: HIGH -- OpenCTI `within` operator verified in official docs, Intl timezone approach proven in existing codebase
- Pitfalls: HIGH -- DST, pagination removal, and cache concerns are well-understood from similar implementations

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable -- no fast-moving dependencies)
