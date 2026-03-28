# Phase 32: Date-Based News Browsing - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Users browse threat news by selecting a specific date instead of paginating through results. The current cursor-based pagination is replaced with a custom calendar date picker. Date filtering is timezone-aware — the user's IANA timezone (or browser timezone for guests) determines which reports belong to a given day. Search and category filters continue to work alongside the date selector.

</domain>

<decisions>
## Implementation Decisions

### Date Selector UX
- **D-01:** Custom glassmorphism calendar dropdown — not a native `<input type="date">`. Matches the dark design system (bg-surface/60, border-border, backdrop-blur-sm).
- **D-02:** Placement: replaces the current pagination area (right side of toolbar, where prev/next buttons and counter are now).
- **D-03:** Prev/next day arrows (ChevronLeft/ChevronRight) flanking a calendar icon button that opens the full calendar picker.
- **D-04:** "Today" quick-action button appears when viewing a non-today date, allowing instant jump back to current date.

### Pagination Removal
- **D-05:** Cursor-based pagination (prev/next buttons, cursor history, PAGE_SIZE) is fully removed from the Threat News page.
- **D-06:** All reports for the selected date are loaded in a single request — no pagination within a date. Daily volume is manageable (tens to low hundreds of reports).
- **D-07:** Text search and category dropdown filter remain active in the toolbar, filtering within the selected date's results. All three dimensions (date + search + category) work together.

### Timezone Conversion
- **D-08:** Frontend computes the UTC date range from the selected date using the user's IANA timezone. Sends `start` and `end` UTC timestamps to the backend. Backend passes them through to the OpenCTI filter without conversion.
- **D-09:** For unauthenticated users (no timezone in AuthContext), default to the browser's timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.

### URL Structure
- **D-10:** Selected date stored as query param `?date=2026-03-29` (YYYY-MM-DD format). Consistent with existing `?search=` and `?label=` params. No route changes needed.
- **D-11:** When no `?date` param is present, the page defaults to today's date (NEWS-02 requirement). URL stays clean for the default case.

### Claude's Discretion
- Calendar component internals (month navigation, year selection, animation)
- Backend query parameter naming (`start`/`end` vs `from`/`to` vs `date_start`/`date_end`)
- How to adapt `ThreatNewsService::list()` for date range filtering (new parameters vs new method)
- Whether to extract the calendar dropdown as a reusable component or keep it page-specific
- How auto-refresh (useAutoRefresh) interacts with date selection — should it only refresh the currently selected date's data
- Empty state messaging when a date has no reports vs the generic "No reports available"

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Threat News — NEWS-02 (default to current date), NEWS-03 (date selector replaces pagination)

### Target Page
- `frontend/src/pages/ThreatNewsPage.jsx` — Current implementation with cursor pagination, CategoryDropdown, search, auto-refresh, ReportRow, ReportModal
- `frontend/src/api/threat-news.js` — `fetchThreatNews` and `fetchThreatNewsLabels` API functions

### Backend
- `backend/app/Services/ThreatNewsService.php` — GraphQL query with FilterGroup pattern, `published` field available for date range filtering
- `backend/app/Http/Controllers/ThreatNews/IndexController.php` — Current query params: after, search, confidence, label, sort, order

### Timezone & Date Formatting
- `frontend/src/hooks/useFormatDate.js` — Timezone-aware formatDate/formatTime using `Intl.DateTimeFormat` with user's IANA timezone from AuthContext
- `frontend/src/contexts/AuthContext.jsx` — Exposes `timezone` (IANA string or null for guests)

### Auto-Refresh
- `frontend/src/hooks/useAutoRefresh.js` — 5-min silent refresh hook already integrated on this page

### Prior Phase Context
- `.planning/phases/31-auto-refresh-infrastructure/31-CONTEXT.md` — D-01 (silent data swap), D-07 (keep stale on failure)

### Design System
- `frontend/src/pages/ThreatNewsPage.jsx` lines 41-151 — CategoryDropdown component as reference for glassmorphism dropdown pattern (bg-surface/90, border-border, backdrop-blur-md, rounded-xl)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CategoryDropdown` component (ThreatNewsPage lines 41-151): Glassmorphism dropdown with search, click-outside handling, animated chevron — pattern to follow for the calendar dropdown
- `useFormatDate` hook: Already provides timezone-aware date formatting, can be extended to compute date boundaries
- `useAutoRefresh` hook: Already integrated, needs to work with date-filtered fetches
- `CATEGORY_COLORS` array and `categoryColor` hash function: Stays as-is

### Established Patterns
- `useSearchParams` for URL state management (search, label, after params)
- `useCallback` wrapping async fetch with error handling
- Toolbar layout: flex row with search input (flex-1), dropdown (shrink-0), pagination area (shrink-0 min-w-[180px])
- Glassmorphism dropdowns: bg-surface/90 border border-border backdrop-blur-md rounded-xl shadow-2xl

### Integration Points
- Replace pagination state (`cursorHistory`, `after` param, `handleNext`/`handlePrevious`) with date state
- Add `?date` to `useSearchParams` management alongside `?search` and `?label`
- Add `start`/`end` UTC params to `fetchThreatNews` API function
- Add date range filter params to `ThreatNewsService::list()` and the GraphQL query's FilterGroup
- `silentRefresh` callback must include the current date's UTC range

</code_context>

<specifics>
## Specific Ideas

- Calendar dropdown should follow the same glassmorphism treatment as the existing CategoryDropdown (bg-surface/90, backdrop-blur-md, rounded-xl)
- Prev/next day arrows reuse the existing ChevronLeft/ChevronRight icon pattern from the current pagination buttons
- "Today" button should be subtle — small text link, not a prominent button

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 32-date-based-news-browsing*
*Context gathered: 2026-03-29*
