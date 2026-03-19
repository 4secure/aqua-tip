# Phase 20: Dashboard Page Rewrite - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace all mock data in DashboardPage.jsx with live API calls to Phase 18 backend endpoints. Add credit balance and recent searches widgets. Remove all mock-data.js imports and unused exports. Zero mock data remaining.

</domain>

<decisions>
## Implementation Decisions

### Stat cards
- Count only — no deltas, sparklines, or trend data (historical snapshots don't exist yet)
- Each card shows: category label, observable count, "Live from OpenCTI" indicator
- Fixed set of 4 types: IPv4-Addr, Domain-Name, Hostname, X509-Certificate
- Note: Backend currently queries IPv4-Addr, Domain-Name, Url, Email-Addr — needs update to match user's chosen set (Hostname + X509-Certificate instead of Url + Email-Addr)
- 4-column grid layout (same as current)
- Color mapping: IPv4 → red, Domain-Name → violet, Hostname → cyan, X509-Certificate → amber

### Indicators table + category filter
- Columns: Type badge, Value, Labels (as chips), Date
- 8 rows, no pagination — dashboard is a summary view
- Clicking a bar in the attack categories chart filters the indicators table to that label
- Active filter shows as a chip with X above the table to clear
- Clicking the same bar again also clears the filter
- Client-side filtering of the 8 fetched indicators (no re-fetch on filter)

### Bottom widgets replacement
- 2 widgets spanning 2 columns each (replacing 4 fictional 1-col widgets)
- Left widget: Credit balance — remaining/limit with progress bar, reset time
- Right widget: Recent searches — list of 5 most recent with query text + type badge
- Guest users (unauthenticated): Show sign-in CTA cards in place of both widgets ("Sign in to track credits" / "Sign in to see search history")
- Uses existing CreditBadge component and fetchCredits API function

### Map widget
- Data from /api/threat-map/snapshot endpoint (replacing THREAT_MAP_POINTS mock)
- Simplified markers — remove C2/APT/DDoS/Phishing filter buttons from header
- Keep "Global Threat Map" title + green live dot indicator
- Remove "Real-time" text label and category filter chips
- Keep existing useLeaflet hook for rendering

### Quick Actions bar
- Keep as-is (already links to real pages, no mock data)

### Claude's Discretion
- Loading/error states for each API call
- Exact spacing and typography adjustments
- How to handle partial API failures (e.g., stats load but map fails)
- Color palette for attack categories chart bars (no longer from mock data)
- Whether to add auto-refresh polling (5-min interval matches backend cache TTL)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Backend API endpoints
- `backend/app/Services/DashboardService.php` — getCounts(), getIndicators(), getCategories() return shapes
- `backend/routes/api.php` lines 83-85 — Public dashboard routes: /dashboard/counts, /dashboard/indicators, /dashboard/categories
- `backend/routes/api.php` line 66 — Public /threat-map/snapshot endpoint
- `backend/routes/api.php` line 70 — Auth-only /search-history endpoint

### Frontend (existing code to modify)
- `frontend/src/pages/DashboardPage.jsx` — Current page with all mock data (full rewrite target)
- `frontend/src/data/mock-data.js` — THREAT_STATS, RECENT_IPS, ATTACK_CATEGORIES, THREAT_MAP_POINTS exports to remove
- `frontend/src/components/shared/CreditBadge.jsx` — Reusable credit badge component
- `frontend/src/api/dark-web.js` — fetchCredits() function
- `frontend/src/api/threat-search.js` — Re-exports fetchCredits()

### Requirements
- `.planning/REQUIREMENTS.md` — DASH-05, WIDG-01, WIDG-02, CLEAN-01, CLEAN-02

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CreditBadge` component (`components/shared/CreditBadge.jsx`): Takes remaining + limit props, renders colored chip
- `fetchCredits()` API function (`api/dark-web.js`): GET /api/credits — returns credit balance
- `useChartJs` hook (`hooks/useChartJs.js`): Chart.js lazy loader, used by current AttackChart
- `useLeaflet` hook (`hooks/useLeaflet.js`): Leaflet lazy loader with marker support
- `apiClient` (`api/client.js`): Cookie-based fetch wrapper with Sanctum CSRF support
- `useAuth` context (`contexts/AuthContext.js`): Provides user auth state for guest vs authenticated branching
- `Icon` component (`data/icons.jsx`): Lucide icon wrapper used throughout dashboard

### Established Patterns
- API calls use `apiClient.get()` / `apiClient.post()` from `api/client.js`
- Credit-gated pages check `useAuth()` for auth state and show guest CTAs
- Chart.js configs are memoized with `useMemo` and rendered via `useChartJs` hook
- Glass card pattern: `className="glass-card p-5"` for all card containers
- Type badge colors: existing `TYPE_BADGE_COLORS` map in ThreatSearchPage.jsx

### Integration Points
- DashboardPage is mounted at `/` route inside AppLayout (sidebar + topbar)
- mock-data.js exports used by DashboardPage: THREAT_STATS, RECENT_IPS, ATTACK_CATEGORIES, THREAT_MAP_POINTS
- After cleanup, check if any other pages still import removed mock-data exports

</code_context>

<specifics>
## Specific Ideas

- Stat cards should feel clean and honest — just the count, no fake trend data
- Bottom widgets as 2-col-each layout (credit left, searches right) instead of 4 narrow cards
- Guest CTA pattern should match existing Threat Search page guest experience

</specifics>

<deferred>
## Deferred Ideas

- Sparkline trend charts on stat cards (DASH-F01) — requires historical snapshot infrastructure
- Delta percentages ("vs last week") on stat cards (DASH-F02) — requires historical data
- "View full map" link on dashboard map to /threat-map page
- Quick search input on dashboard (DASH-F03)

</deferred>

---

*Phase: 20-dashboard-page-rewrite*
*Context gathered: 2026-03-19*
