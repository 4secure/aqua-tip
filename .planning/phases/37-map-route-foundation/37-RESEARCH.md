# Phase 37: Map Route Foundation - Research

**Researched:** 2026-04-05
**Domain:** React Router route configuration, component reuse
**Confidence:** HIGH

## Summary

Phase 37 is a straightforward route-swap operation: point `/dashboard` at the existing `ThreatMapPage` component, add a redirect from `/threat-map` to `/dashboard`, and update sidebar navigation. No new components, no new libraries, no architectural changes. The entire phase touches 2 source files (`App.jsx` and `mock-data.js`) with approximately 10 lines changed total.

The codebase already contains the exact pattern needed: line 65 of `App.jsx` shows `<Navigate to="/threat-search" replace />` for the `/ip-search` redirect. This phase replicates that pattern for `/threat-map` to `/dashboard`.

**Primary recommendation:** This is a mechanical edit -- follow the existing redirect pattern in App.jsx, swap the route element, and update NAV_CATEGORIES. No research gaps.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Reuse the existing `ThreatMapPage` component directly for `/dashboard` -- no code duplication, no new file. The route in `App.jsx` points `/dashboard` to `ThreatMapPage`.
- **D-02:** Use `<Navigate to="/dashboard" replace />` for the `/threat-map` route. This matches the existing `/ip-search` to `/threat-search` redirect pattern already in `App.jsx`.
- **D-03:** Edge-to-edge map filling the entire content area, using the existing `-m-6` negative margin pattern from `ThreatMapPage` to negate `AppLayout` padding. Maximizes map real estate for Phase 38 overlay panels.
- **D-04:** Old DashboardPage widgets (stat cards, indicators table, attack chart, credits, recent searches, quick actions) are NOT carried into this phase. Phase 37 shows only the threat map with its existing 5 widgets. Phase 38 re-introduces stat cards + indicators as overlay panels. Phase 40 deletes `DashboardPage.jsx`.

### Claude's Discretion
No discretion areas identified -- all decisions are locked.

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LAYOUT-01 | User sees the threat map as the main page at `/dashboard` | D-01: Swap route element from `DashboardPage` to `ThreatMapPage` in App.jsx line 69 |
| LAYOUT-02 | User navigating to `/threat-map` is redirected to `/dashboard` | D-02: Add `<Navigate to="/dashboard" replace />` following existing pattern at line 65 |
| LAYOUT-03 | User sees existing map widgets preserved on the map | D-01 + D-03: ThreatMapPage already has all 5 widgets; no code changes to the component itself |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- No TypeScript -- all `.jsx`/`.js` files
- No tests exist in the project
- No linter/formatter configured
- React 19 + Vite 7 + React Router DOM 7
- Dark theme only with specific color tokens
- All data mocked in `data/mock-data.js`

## Standard Stack

No new libraries needed. This phase uses only what is already installed:

### Core (already in project)
| Library | Purpose | Relevant API |
|---------|---------|--------------|
| react-router-dom | Routing | `<Navigate to="..." replace />`, `<Route>` |

No installation commands needed.

## Architecture Patterns

### Current Route Structure (App.jsx)
```
<AppLayout>
  <ProtectedRoute>
    <Route path="/dashboard" element={<DashboardPage />} />    ← CHANGE TO ThreatMapPage
    <Route path="/threat-map" element={<ThreatMapPage />} />   ← CHANGE TO Navigate redirect
  </ProtectedRoute>
</AppLayout>
```

### Target Route Structure
```
<AppLayout>
  <ProtectedRoute>
    <Route path="/dashboard" element={<ThreatMapPage />} />
    <Route path="/threat-map" element={<Navigate to="/dashboard" replace />} />
  </ProtectedRoute>
</AppLayout>
```

### Existing Redirect Pattern (line 65 of App.jsx)
```jsx
<Route path="/ip-search" element={<Navigate to="/threat-search" replace />} />
```
This is the exact pattern to replicate.

### NAV_CATEGORIES Update (mock-data.js lines 135-157)
Current state has two separate entries:
- Overview > Dashboard (`/dashboard`)
- Monitoring > Threat Map (`/threat-map`)

Target: Remove the "Threat Map" entry from Monitoring since it now IS the dashboard. The "Dashboard" entry in Overview already points to `/dashboard` which will render the map.

### Anti-Patterns to Avoid
- **Do NOT duplicate ThreatMapPage code** -- the route swap means the same component, same import, different route path
- **Do NOT delete DashboardPage.jsx** -- Phase 40 handles cleanup; this phase only removes it from route config and App.jsx imports
- **Do NOT modify ThreatMapPage.jsx** -- the component already handles edge-to-edge layout with `-m-6` and `calc(100vh - 60px)`

## Don't Hand-Roll

Not applicable -- this phase requires no library functionality, only route configuration edits.

## Common Pitfalls

### Pitfall 1: Forgetting to Remove the DashboardPage Import
**What goes wrong:** Leaving `import DashboardPage from './pages/DashboardPage'` in App.jsx after removing its route usage creates a dead import that Vite will tree-shake but is messy.
**How to avoid:** Remove the import line when removing the route element reference. Keep the file itself for Phase 40.

### Pitfall 2: Breaking the Sidebar Active State
**What goes wrong:** If `NAV_CATEGORIES` still has `/threat-map` as a nav href, the sidebar "Threat Map" link will redirect to `/dashboard` but may not highlight correctly as active.
**How to avoid:** Remove the Threat Map entry entirely from `NAV_CATEGORIES`. The Dashboard entry already points to `/dashboard`.

### Pitfall 3: Redirect Loop
**What goes wrong:** If both `/dashboard` and `/threat-map` redirect to each other.
**How to avoid:** Only `/threat-map` redirects. `/dashboard` renders `ThreatMapPage` directly.

### Pitfall 4: Stale Browser Cache
**What goes wrong:** Users with the old route bookmarked may not see the redirect if service worker caches the old route.
**How to avoid:** `replace` in `<Navigate replace />` ensures the browser history is clean. No service worker is configured in this project, so not a real concern.

## Code Examples

### App.jsx Changes (3 edits)

1. Remove DashboardPage import (line 10):
```jsx
// REMOVE: import DashboardPage from './pages/DashboardPage';
```

2. Change `/dashboard` route element (line 69):
```jsx
// FROM:
<Route path="/dashboard" element={<DashboardPage />} />
// TO:
<Route path="/dashboard" element={<ThreatMapPage />} />
```

3. Change `/threat-map` route to redirect (line 70):
```jsx
// FROM:
<Route path="/threat-map" element={<ThreatMapPage />} />
// TO:
<Route path="/threat-map" element={<Navigate to="/dashboard" replace />} />
```

### mock-data.js NAV_CATEGORIES Change

Remove the Threat Map entry from the Monitoring category:
```jsx
// FROM (lines 151-155):
{
  label: 'Monitoring',
  items: [
    { label: 'Threat Map', icon: 'globe', href: '/threat-map', public: false },
    { label: 'Dark Web', icon: 'incognito', href: '/dark-web', public: false },
  ],
},

// TO:
{
  label: 'Monitoring',
  items: [
    { label: 'Dark Web', icon: 'incognito', href: '/dark-web', public: false },
  ],
},
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None -- no test infrastructure exists |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LAYOUT-01 | `/dashboard` renders ThreatMapPage | manual | Open browser to `/dashboard`, verify map renders | N/A |
| LAYOUT-02 | `/threat-map` redirects to `/dashboard` | manual | Navigate to `/threat-map`, verify URL changes to `/dashboard` | N/A |
| LAYOUT-03 | All 5 map widgets visible | manual | Verify counters, countries, donut, feed, status widgets on `/dashboard` | N/A |

### Sampling Rate
- **Per task commit:** `cd frontend && npm run build` (verify no build errors)
- **Per wave merge:** Manual browser verification of all 3 requirements
- **Phase gate:** Build succeeds + manual verification of route swap and redirect

### Wave 0 Gaps
No test infrastructure exists and none is being added for this phase (CLAUDE.md confirms "No tests exist"). Verification is via build success and manual browser testing.

## Open Questions

None. This phase is fully specified with no ambiguity.

## Sources

### Primary (HIGH confidence)
- `frontend/src/App.jsx` -- Current route configuration, verified existing redirect pattern at line 65
- `frontend/src/pages/ThreatMapPage.jsx` -- 91-line self-contained component, verified all 5 widgets present
- `frontend/src/data/mock-data.js` -- NAV_CATEGORIES structure at lines 135-157
- `.planning/phases/37-map-route-foundation/37-CONTEXT.md` -- User decisions D-01 through D-04

### Secondary (MEDIUM confidence)
- None needed -- all information sourced from the codebase itself

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, uses existing react-router-dom
- Architecture: HIGH -- exact code changes identified from reading source files
- Pitfalls: HIGH -- straightforward route swap with well-understood edge cases

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable -- no external dependencies)
