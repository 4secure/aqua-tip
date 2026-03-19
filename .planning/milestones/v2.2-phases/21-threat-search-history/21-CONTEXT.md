# Phase 21: Threat Search History - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Display recent searches on the Threat Search page when no search result is active, with search type badges and click-to-rerun. History is fetched from the Phase 19 backend endpoint (`/api/search-history`). This phase adds frontend-only changes to ThreatSearchPage.jsx.

</domain>

<decisions>
## Implementation Decisions

### History placement & layout
- History section appears as a separate glass card **below the search bar card** when no search result is active
- Show **10 entries** (more generous than dashboard's 5 since this is the dedicated search page)
- **Row list** style matching the dashboard's RecentSearchesWidget — each row shows: query text, type badge (colored), relative time
- Header: "Recent Searches" with clock icon — consistent with dashboard widget

### Click-to-rerun behavior
- Clicking a history entry **pre-fills the search input** but does NOT auto-execute the search
- After pre-fill, **focus moves to the search input** so user can press Enter or edit first
- Page **scrolls to top** (search bar) after pre-fill, important since 10 items may push entries below fold

### Guest vs auth states
- **Guest users (unauthenticated):** Show a sign-in CTA glass card where history would be — "Sign in to track your search history" with link to login. Matches Phase 20 dashboard guest CTA pattern.
- **Authenticated users with zero history:** Show encouraging empty state — "No searches yet — try searching an IP, domain, or hash above"
- **Authenticated users with history:** Show the history list (up to 10 entries)

### Transition between states
- History section **only shows on initial page load** (fresh navigation to `/threat-search`)
- Once a search is performed, results replace history for the rest of that page session
- **No clear/reset button** — history reappears on next navigation to the page
- **Fetch once on mount** — no re-fetch after searches. New searches appear in history on next page visit.

### Claude's Discretion
- Loading skeleton design for history fetch
- Error state if history API fails
- Exact spacing between search card and history card
- Whether to extract a shared API function for search history or inline the apiClient call

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Backend API
- `backend/routes/api.php` line 69 — Auth-only `/api/search-history` endpoint (GET, requires auth:sanctum)
- `backend/app/Http/Controllers/SearchHistory/IndexController.php` — Returns user's recent searches (query, type, module, timestamp)

### Frontend (existing code to modify)
- `frontend/src/pages/ThreatSearchPage.jsx` — Target page, currently ~725 lines, no idle/empty state
- `frontend/src/pages/DashboardPage.jsx` lines 252-310 — `RecentSearchesWidget` component with type badges (reference implementation)
- `frontend/src/api/client.js` — `apiClient` for API calls
- `frontend/src/api/threat-search.js` — `searchThreat()` and `fetchCredits()` functions
- `frontend/src/contexts/AuthContext.js` — `useAuth()` for guest vs authenticated branching

### Design patterns
- `frontend/src/components/shared/CreditBadge.jsx` — Reusable credit badge (already used on ThreatSearchPage)
- `frontend/src/pages/DashboardPage.jsx` lines 420-435 — Guest CTA card pattern for unauthenticated users

### Requirements
- `.planning/REQUIREMENTS.md` — HIST-03, HIST-04, HIST-05

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RecentSearchesWidget` in DashboardPage: Reference for row list layout + type badges — can extract or replicate pattern
- `TYPE_BADGE_COLORS` map: Exists in both DashboardPage.jsx and ThreatSearchPage.jsx — same color mapping
- `formatRelativeTime()` in DashboardPage: Converts timestamps to "5m ago" format — can extract or replicate
- `apiClient.get('/api/search-history')`: Already called in DashboardPage — same endpoint, same response shape

### Established Patterns
- Glass card: `className="glass-card p-5"` for all card containers
- Loading skeletons: Pulse animation divs (`animate-pulse`) used in dashboard widgets
- Guest CTA: Glass card with icon + message + Link to `/login` — used in dashboard credit and search widgets
- Type badges: Colored pill with `TYPE_BADGE_COLORS[type]` background and text colors

### Integration Points
- ThreatSearchPage already uses `useAuth()` — can branch on `isAuthenticated`
- Search input `query` state and `handleSearch()` already exist — pre-fill sets `setQuery(entry.query)`
- History section is conditionally rendered: `result === null` (no active search result)

</code_context>

<specifics>
## Specific Ideas

- Row list style should match the dashboard RecentSearchesWidget for visual consistency across pages
- Guest CTA should follow the same glassmorphism pattern used on the dashboard
- Pre-fill + focus + scroll-to-top gives a smooth "I was looking at this before" experience without spending a credit

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 21-threat-search-history*
*Context gathered: 2026-03-20*
