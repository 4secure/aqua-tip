# Phase 15: Frontend Threat Search + Route Migration - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Users search any observable type from a unified Threat Search page at the new `/threat-search` route. All `/ip-search` references across the codebase are migrated. Old `/ip-search` route redirects to `/threat-search`. The backend endpoint (`POST /api/threat-search`) already exists from Phase 14.

</domain>

<decisions>
## Implementation Decisions

### Type selector
- No type selector dropdown -- dropped entirely (SRCH-03 obsolete)
- Backend searches OpenCTI by value only and returns `detected_type` from the response -- no frontend type filtering needed
- Only the detected type badge (SRCH-04) remains: a colored pill badge next to the query value in result header

### Result header & badge
- Detected type shown as a pill badge next to the searched query value (e.g., `185.220.101.34 [IPv4-Addr]`)
- Score ring and threat level label always shown for all observable types (score comes from `x_opencti_score`, not geo)
- Geo section conditionally rendered only when `result.geo` is non-null (already the case for IP types only)
- D3 graph title changed from "IP Relationship Graph" to "Relationship Graph" (generic)
- `centerIp` prop renamed to reflect it now holds any query value, not just IPs

### Search input
- Page title: "Threat Search"
- Subtitle: "Search IPs, domains, URLs, emails, and file hashes"
- Placeholder: `e.g., 185.220.101.34, example.com, d41d8cd98f00b204e9800998ecf8427e`
- No-result message: "No threats found for {query}" (generic, no type annotation)

### Route migration
- Rename `IpSearchPage.jsx` to `ThreatSearchPage.jsx` (git rename detection)
- Rename `api/ip-search.js` to `api/threat-search.js`, update endpoint to `/api/threat-search`
- Add `<Navigate to="/threat-search" replace />` route for `/ip-search` in App.jsx
- Update all 8 files referencing `/ip-search`:
  - `App.jsx` -- route + import rename
  - `Topbar.jsx` -- route label mapping
  - `LandingScroll.jsx` -- 4 CTA links + text
  - `LandingPage.jsx` -- 4 CTA links + text
  - `DashboardPage.jsx` -- link + label
  - `mock-data.js` -- sidebar nav item label + href
- Sidebar nav label: "Threat Search" (was "IP Search")
- All landing page CTA text updated to say "Threat Search"

### Claude's Discretion
- Exact pill badge color mapping per detected_type
- D3 graph legend chip labels (currently IP/Malware/Threat Actor/Attack Pattern -- may need update)
- Component internal variable naming (centerIp -> centerQuery or similar)
- Whether to update the 422 validation error message wording

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Frontend files to modify
- `frontend/src/pages/IpSearchPage.jsx` -- Main file to rename + adapt (697 lines, contains D3Graph, all tabs, search logic)
- `frontend/src/api/ip-search.js` -- API client to rename + update endpoint
- `frontend/src/App.jsx` -- Route definition + import to update, add redirect
- `frontend/src/components/layout/Topbar.jsx` -- Route label mapping
- `frontend/src/components/landing/LandingScroll.jsx` -- 4 CTA links referencing /ip-search
- `frontend/src/pages/LandingPage.jsx` -- 4 CTA links referencing /ip-search
- `frontend/src/pages/DashboardPage.jsx` -- IP Search link + label
- `frontend/src/data/mock-data.js` -- Sidebar nav item (label + href)

### Backend response shape (read-only reference)
- `backend/app/Services/ThreatSearchService.php` -- Response fields: `query`, `detected_type`, `found`, `score`, `geo` (null for non-IP), `labels`, `relationships`, `indicators`, `sightings`, `notes`, `external_references`, `raw`

### Requirements
- `.planning/REQUIREMENTS.md` -- SRCH-03 (dropped), SRCH-04, ROUTE-01, ROUTE-02

### Phase 14 context
- `.planning/phases/14-backend-search-generalization/14-CONTEXT.md` -- Backend decisions that inform frontend adaptation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `D3Graph` component: Fully reusable, just needs prop rename (centerIp -> centerQuery) and title change
- `CreditBadge` component: Works unchanged -- credits system is type-agnostic
- All tab components (`SummaryTab`, `ExternalRefsTab`, `IndicatorsTab`, `SightingsTab`, `NotesTab`, `RawTab`): Work for all observable types already
- `useAuth` hook: Unchanged, credit exhaustion CTAs work the same

### Established Patterns
- API client pattern in `api/` directory: `apiClient.post('/api/endpoint', { query })`
- Score ring SVG with dynamic color based on threat level thresholds
- Conditional geo rendering already gated on `result.geo` existence
- Tab bar dynamically built from result data presence

### Integration Points
- `App.jsx` route definitions -- add redirect + rename route
- `mock-data.js` sidebar nav items -- update label + href
- Landing page CTAs in two files -- update all Link `to` props + button text
- Topbar route-to-label mapping object

</code_context>

<specifics>
## Specific Ideas

- User explicitly confirmed SRCH-03 (type selector) is unnecessary because backend searches all types regardless -- no frontend type filtering serves any purpose
- Clean rename strategy preferred: rename files in place for git history, not create-new-delete-old
- "Threat Search" naming consistent across page title, sidebar nav, and all CTAs

</specifics>

<deferred>
## Deferred Ideas

- SRCH-03 may be revisited if backend adds type-specific filtering in the future
- REQUIREMENTS.md should be updated to mark SRCH-03 as dropped/obsolete

</deferred>

---

*Phase: 15-frontend-threat-search-route-migration*
*Context gathered: 2026-03-18*
