# Phase 15: Frontend Threat Search + Route Migration - Research

**Researched:** 2026-03-18
**Domain:** React frontend -- page rename, API client update, route migration, UI text changes
**Confidence:** HIGH

## Summary

This phase is a straightforward rename-and-rewire operation. The existing `IpSearchPage.jsx` (697 lines) becomes `ThreatSearchPage.jsx`, the API client file is renamed, the route changes from `/ip-search` to `/threat-search`, and all references across 8 files are updated. The only net-new UI element is a detected-type pill badge in the result header.

The backend (`ThreatSearchService`) already returns `query` and `detected_type` fields in its response. The current frontend references `result.ip` in multiple places -- this must change to `result.query`. No new dependencies are needed. The existing `Navigate` component from `react-router-dom` is already used throughout the codebase for redirects.

**Primary recommendation:** Execute as file renames (git mv) followed by find-and-replace updates across 8 files, plus one new badge component in the result header.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- No type selector dropdown -- SRCH-03 dropped entirely
- Backend searches OpenCTI by value only and returns `detected_type` from the response -- no frontend type filtering needed
- Only the detected type badge (SRCH-04) remains: a colored pill badge next to the query value in result header
- Detected type shown as a pill badge next to the searched query value (e.g., `185.220.101.34 [IPv4-Addr]`)
- Score ring and threat level label always shown for all observable types
- Geo section conditionally rendered only when `result.geo` is non-null
- D3 graph title changed from "IP Relationship Graph" to "Relationship Graph"
- `centerIp` prop renamed to reflect it now holds any query value
- Page title: "Threat Search"
- Subtitle: "Search IPs, domains, URLs, emails, and file hashes"
- Placeholder: `e.g., 185.220.101.34, example.com, d41d8cd98f00b204e9800998ecf8427e`
- No-result message: "No threats found for {query}" (generic, no type annotation)
- Rename `IpSearchPage.jsx` to `ThreatSearchPage.jsx` (git rename detection)
- Rename `api/ip-search.js` to `api/threat-search.js`, update endpoint to `/api/threat-search`
- Add `<Navigate to="/threat-search" replace />` route for `/ip-search` in App.jsx
- Update all 8 files referencing `/ip-search`
- Sidebar nav label: "Threat Search" (was "IP Search")
- All landing page CTA text updated to say "Threat Search"

### Claude's Discretion
- Exact pill badge color mapping per detected_type
- D3 graph legend chip labels (currently IP/Malware/Threat Actor/Attack Pattern -- may need update)
- Component internal variable naming (centerIp -> centerQuery or similar)
- Whether to update the 422 validation error message wording

### Deferred Ideas (OUT OF SCOPE)
- SRCH-03 may be revisited if backend adds type-specific filtering in the future
- REQUIREMENTS.md should be updated to mark SRCH-03 as dropped/obsolete
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SRCH-03 | User can manually override detected type via dropdown | DROPPED per user decision -- no implementation needed |
| SRCH-04 | Results display detected type badge in header | Backend returns `detected_type` field; badge color mapping documented below |
| ROUTE-01 | `/ip-search` renamed to `/threat-search` across entire codebase | All 8 files identified with exact line references below |
| ROUTE-02 | All navigation links and landing page CTAs updated | Exact locations documented: Sidebar, Topbar, LandingPage (4 CTAs), LandingScroll (4 CTAs), DashboardPage (2 links) |
</phase_requirements>

## Standard Stack

No new dependencies. This phase uses only what already exists:

### Core (existing)
| Library | Version | Purpose | Already Used |
|---------|---------|---------|--------------|
| react | ^19.2.4 | Component framework | Yes |
| react-router-dom | ^7.13.1 | Routing + `Navigate` redirect | Yes |
| d3 | (dynamic import) | Relationship graph | Yes |
| lucide-react | existing | Icons | Yes |

### No New Packages
Zero new dependencies -- confirmed by project decision (STATE.md): "Zero new dependencies -- existing stack handles all v2.1 requirements."

## Architecture Patterns

### File Rename Strategy

Use `git mv` for rename detection in git history:
```bash
git mv frontend/src/pages/IpSearchPage.jsx frontend/src/pages/ThreatSearchPage.jsx
git mv frontend/src/api/ip-search.js frontend/src/api/threat-search.js
```

Then update internal contents of both files.

### Redirect Pattern (established in codebase)

The project already uses `Navigate` for redirects in `GuestRoute.jsx`, `ProtectedRoute.jsx`, etc. The same pattern applies:

```jsx
import { Navigate } from 'react-router-dom';

// In App.jsx Routes:
<Route path="/ip-search" element={<Navigate to="/threat-search" replace />} />
```

### Backend Response Field Mapping

**Critical change:** The backend `ThreatSearchService` returns `query` instead of `ip`:

| Old field (IpSearch) | New field (ThreatSearch) | Used in frontend |
|---------------------|------------------------|-----------------|
| `result.ip` | `result.query` | Result header display, D3Graph center node, no-result message |
| (did not exist) | `result.detected_type` | New pill badge (SRCH-04) |

All other fields (`found`, `score`, `labels`, `geo`, `relationships`, `indicators`, `sightings`, `notes`, `external_references`, `raw`) remain identical.

### Detected Type Badge Color Mapping (Claude's Discretion)

Recommended color mapping using existing design tokens:

```jsx
const TYPE_BADGE_COLORS = {
  'IPv4-Addr':     { bg: '#FF3B5C25', text: '#FF3B5C' },   // red
  'IPv6-Addr':     { bg: '#FF3B5C25', text: '#FF3B5C' },   // red
  'Domain-Name':   { bg: '#00E5FF25', text: '#00E5FF' },   // cyan
  'Url':           { bg: '#7A44E425', text: '#7A44E4' },   // violet
  'Email-Addr':    { bg: '#FFB02025', text: '#FFB020' },   // amber
  'StixFile':      { bg: '#00C48C25', text: '#00C48C' },   // green (hashes)
  'Hostname':      { bg: '#9B6BF725', text: '#9B6BF7' },   // violet-light
};
```

These colors align with the existing `ENTITY_COLORS` mapping used in the D3 graph and the project design tokens from `tailwind.config.js`.

### D3 Graph Generalization

Current D3Graph component hardcodes IP-specific logic:
- Line 27: `function D3Graph({ relationships, centerIp })` -- rename prop to `centerQuery`
- Line 44: `nodeMap.set(centerIp, { id: centerIp, type: 'IPv4-Addr', ... })` -- type should come from `detected_type`, not hardcoded
- Lines 49-51: `isCenterEntity` check assumes IPv4/IPv6 -- generalize to match any entity with matching `observable_value` or `name`
- Line 660: Title "IP Relationship Graph" -- change to "Relationship Graph"
- Lines 662-665: Legend chips currently show IP/Malware/Threat Actor/Attack Pattern -- consider making dynamic based on node types present, or keep static with updated first chip label

Recommended legend update:
```jsx
<span className="chip-red text-[10px]">Observable</span>  // was "IP"
<span className="chip-violet text-[10px]">Malware</span>
<span className="chip-amber text-[10px]">Threat Actor</span>
<span className="chip-cyan text-[10px]">Attack Pattern</span>
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Route redirect | Custom redirect logic | `<Navigate to="/threat-search" replace />` | Already used in codebase, handles replace properly |
| Observable type detection | Frontend regex matching | Backend `detected_type` field | Backend already does this (Phase 14) |
| Color mapping | Dynamic color generation | Static lookup object | Finite set of 9 types, all known in advance |

## Common Pitfalls

### Pitfall 1: Missing `result.ip` to `result.query` Migration
**What goes wrong:** Frontend renders `undefined` in result header and D3 graph because it still reads `result.ip` but backend sends `result.query`.
**Why it happens:** Easy to rename the file and routes but forget the response field mapping changed.
**How to avoid:** Search for every `result.ip` reference in the renamed file and replace with `result.query`. There are at least 6 occurrences: result header display (line 595), no-result message (line 630), D3Graph key prop (line 669), D3Graph centerIp prop (line 671), and stat count display.
**Warning signs:** Search results show query value as "undefined" or blank.

### Pitfall 2: D3 Graph Hardcoded IPv4 Type
**What goes wrong:** Center node always renders as IPv4-Addr type regardless of actual observable.
**Why it happens:** Line 44 hardcodes `type: 'IPv4-Addr'` for the center node.
**How to avoid:** Pass `detected_type` from the result to D3Graph and use it for the center node's type. This also fixes the color of the center node circle.
**Warning signs:** Center node always shows red (IPv4 color) even for domains or URLs.

### Pitfall 3: D3 Graph `isCenterEntity` Check Too Narrow
**What goes wrong:** For non-IP observables, the center entity appears twice in the graph -- once from the hardcoded center node and once from the relationship data.
**Why it happens:** Lines 49-51 only match IPv4-Addr/IPv6-Addr entity types for deduplication.
**How to avoid:** Generalize the check: match any entity whose `observable_value` or `name` equals the query value, regardless of entity type.
**Warning signs:** Duplicate nodes in the relationship graph for non-IP searches.

### Pitfall 4: Incomplete CTA Text Updates
**What goes wrong:** Some landing page buttons still say "IP" related text after route update.
**Why it happens:** LandingPage.jsx has CTAs in the navbar (1), hero section via LandingScroll.jsx (2 desktop + 2 mobile), bottom CTA section (2), and footer (1). Easy to miss some.
**How to avoid:** Use the exact file list from CONTEXT.md. Grep for `/ip-search` after changes to verify zero remaining references.
**Warning signs:** Clicking a landing page button goes to `/threat-search` but button text still says "IP".

### Pitfall 5: Topbar Breadcrumb Shows Wrong Name
**What goes wrong:** Topbar shows "Dashboard" instead of "Threat Search" when on `/threat-search`.
**Why it happens:** `PAGE_NAMES` object in Topbar.jsx maps routes to display names. If `/threat-search` is not added (and `/ip-search` not updated), the fallback is "Dashboard".
**How to avoid:** Update the `PAGE_NAMES` object: change key from `/ip-search` to `/threat-search` with value `'Threat Search'`.

## Code Examples

### 1. Detected Type Pill Badge (SRCH-04)

Add inside the result header, next to the query value display (currently line 595):

```jsx
// In result header, replace:
//   <div className="font-heading font-semibold text-lg">{result.ip}</div>
// With:
<div className="font-heading font-semibold text-lg flex items-center gap-2">
  {result.query}
  {result.detected_type && (
    <span
      className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium"
      style={{
        backgroundColor: (TYPE_BADGE_COLORS[result.detected_type]?.bg || '#5A617325'),
        color: (TYPE_BADGE_COLORS[result.detected_type]?.text || '#5A6173'),
      }}
    >
      {result.detected_type}
    </span>
  )}
</div>
```

### 2. Generalized D3Graph Center Node

```jsx
function D3Graph({ relationships, centerQuery, detectedType }) {
  // ...
  nodeMap.set(centerQuery, { id: centerQuery, type: detectedType || 'unknown', label: centerQuery });

  // Generalized center entity detection:
  const isCenterEntity = (entity.name === centerQuery || entity.observable_value === centerQuery);
  // Remove the entity_type === 'IPv4-Addr' || 'IPv6-Addr' restriction
}
```

### 3. API Client Rename

```jsx
// threat-search.js (was ip-search.js)
import { apiClient } from './client';

export function searchThreat({ query }) {
  return apiClient.post('/api/threat-search', { query });
}

export { fetchCredits } from './dark-web';
```

### 4. Route Redirect in App.jsx

```jsx
import { Navigate } from 'react-router-dom';
import ThreatSearchPage from './pages/ThreatSearchPage';

// Inside <Routes>:
<Route path="/threat-search" element={<ThreatSearchPage />} />
<Route path="/ip-search" element={<Navigate to="/threat-search" replace />} />
```

## Complete File Change Inventory

### Files to RENAME (2)
| From | To |
|------|----|
| `frontend/src/pages/IpSearchPage.jsx` | `frontend/src/pages/ThreatSearchPage.jsx` |
| `frontend/src/api/ip-search.js` | `frontend/src/api/threat-search.js` |

### Files to MODIFY (8 total, including the 2 renamed files)

| File | Changes |
|------|---------|
| `ThreatSearchPage.jsx` (renamed) | Export name `IpSearchPage` -> `ThreatSearchPage`; import from `../api/threat-search`; `searchIpAddress` -> `searchThreat`; `result.ip` -> `result.query` (6+ occurrences); page title/subtitle/placeholder text; add detected_type badge; D3Graph prop rename + generalize center node; graph title + legend; no-result message |
| `threat-search.js` (renamed) | Function name `searchIpAddress` -> `searchThreat`; endpoint `/api/ip-search` -> `/api/threat-search` |
| `App.jsx` | Import rename `IpSearchPage` -> `ThreatSearchPage` from new path; route `/ip-search` -> `/threat-search`; add redirect route; add `Navigate` import |
| `Topbar.jsx` | `PAGE_NAMES` key `/ip-search` -> `/threat-search`, value `'IP Search'` -> `'Threat Search'` |
| `LandingScroll.jsx` | 4 `Link to="/ip-search"` -> `Link to="/threat-search"` (2 desktop + 2 mobile) |
| `LandingPage.jsx` | 4 `Link to="/ip-search"` -> `Link to="/threat-search"` (navbar CTA, bottom section x2, footer) |
| `DashboardPage.jsx` | 2 links: `to="/ip-search"` -> `to="/threat-search"`, label "IP Search" -> "Threat Search" (line 174) |
| `mock-data.js` | Sidebar nav item (line 195): `label: 'IP Search'` -> `'Threat Search'`, `href: '/ip-search'` -> `'/threat-search'` |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `result.ip` field | `result.query` field | Phase 14 (backend) | Frontend must use `result.query` for display |
| IP-only search | All observable types | Phase 14 (backend) | Frontend text must be generic, not IP-specific |
| `/api/ip-search` endpoint | `/api/threat-search` endpoint | Phase 14 (backend) | API client must point to new endpoint |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None (no tests exist per CLAUDE.md) |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SRCH-03 | DROPPED | N/A | N/A | N/A |
| SRCH-04 | Detected type badge renders in result header | manual-only | Visual inspection after search | N/A |
| ROUTE-01 | `/threat-search` loads ThreatSearchPage, `/ip-search` redirects | manual-only | Navigate to both URLs in browser | N/A |
| ROUTE-02 | All nav links and CTAs point to `/threat-search` | manual-only | Click every CTA on landing page + sidebar + dashboard | N/A |

**Manual-only justification:** Project has no test infrastructure (no test framework, no test files, no test scripts). Setting up a test framework is out of scope for this phase.

### Sampling Rate
- **Per task commit:** Manual browser verification (load `/threat-search`, click CTAs)
- **Per wave merge:** `npm run build` (zero warnings/errors)
- **Phase gate:** Build succeeds + all routes verified manually

### Wave 0 Gaps
- No test infrastructure exists. Not in scope for this phase.
- Build verification: `cd frontend && npm run build` -- must complete with zero errors.

### Verification Grep Commands
After all changes, these greps should return ZERO results:
```bash
grep -r "ip-search" frontend/src/
grep -r "IpSearch" frontend/src/
grep -r "searchIpAddress" frontend/src/
grep -r "IP Search" frontend/src/  # except possibly mock data comments
grep -r "result\.ip" frontend/src/pages/ThreatSearchPage.jsx
```

## Open Questions

1. **D3 Graph Legend Chips**
   - What we know: Currently shows IP/Malware/Threat Actor/Attack Pattern as static chips
   - What's unclear: Whether to make dynamic based on actual node types, or just rename "IP" to "Observable"
   - Recommendation: Rename "IP" to "Observable" (simplest, matches all types). Dynamic generation is over-engineering for this phase.

2. **422 Error Message Wording**
   - What we know: Currently says "Invalid IP address" (set by backend). The new backend `ThreatSearchRequest` likely has updated validation messages.
   - What's unclear: Exact validation message from new backend
   - Recommendation: Frontend already displays `err.message` from backend response. If backend sends generic message, no frontend change needed. If it still says "Invalid IP", the fix is backend-side (out of scope).

## Sources

### Primary (HIGH confidence)
- Direct code inspection of all 8 affected frontend files (read via Read tool)
- `backend/app/Services/ThreatSearchService.php` -- response shape with `query` and `detected_type` fields
- `15-CONTEXT.md` -- user decisions and canonical file references
- `REQUIREMENTS.md` -- SRCH-03, SRCH-04, ROUTE-01, ROUTE-02 definitions

### Secondary (MEDIUM confidence)
- React Router DOM v7 `Navigate` component behavior -- verified by existing usage in 5+ files in this codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all existing code inspected
- Architecture: HIGH - all 8 files read, every change location identified with line numbers
- Pitfalls: HIGH - derived from direct code analysis of field naming differences and hardcoded assumptions

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable -- no external dependencies changing)
