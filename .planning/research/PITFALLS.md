# Pitfalls Research

**Domain:** Adding auto-refresh, date filtering, time-series charts, enriched modals, and functional settings to existing React + Laravel + OpenCTI threat intelligence platform
**Project:** AQUA TIP v3.2 -- App Layout Page Tweaks
**Researched:** 2026-03-28
**Confidence:** HIGH (based on direct codebase analysis of all affected files, existing patterns, and established React/Chart.js/D3 knowledge)

---

## Critical Pitfalls

### Pitfall 1: setInterval Stale Closure in Auto-Refresh

**What goes wrong:**
The 5-min auto-refresh `setInterval` captures stale closures over filter state. When users change date filters or category filters between refresh cycles, the interval callback fires with the old filter values, fetching wrong data and silently replacing the user's filtered view with unfiltered results.

**Why it happens:**
The existing DashboardPage.jsx (lines 432-443) already uses `setInterval` but with no dependencies -- it always fetches the same three endpoints with no parameters. Adding date-based filtering to Threat News means the interval callback must reference the current date/category state, but `setInterval` captures the closure at creation time. This is the most common React interval bug.

**How to avoid:**
Use a `useRef` to hold current filter values, and read from the ref inside the interval callback. The ref approach keeps the interval stable while always reading current values:
```jsx
const filtersRef = useRef({ date, category });
useEffect(() => { filtersRef.current = { date, category }; }, [date, category]);
useEffect(() => {
  const id = setInterval(() => {
    fetchNews(filtersRef.current);  // always reads current values
  }, 5 * 60 * 1000);
  return () => clearInterval(id);
}, []);  // stable interval, no stale closure
```

**Warning signs:**
After changing a date filter, the page reverts to showing all-dates data after 5 minutes. Users see a "flash" of different data periodically.

**Phase to address:**
Threat News phase (date filtering + auto-refresh must be implemented together). Build a reusable `useAutoRefresh` hook here for reuse on Threat Actors.

---

### Pitfall 2: useChartJs Hook Destroys and Recreates Chart on Every Data Change

**What goes wrong:**
The existing `useChartJs` hook (lines 10-17 of `useChartJs.js`) uses `[config]` as its sole useEffect dependency. Any new config object reference triggers full chart destruction and recreation -- visible as flickering, loss of animation state, and tooltip disappearance mid-hover.

**Why it happens:**
The current hook works fine for static charts (SettingsPage uses `useMemo(() => ..., [])` with empty deps). But the new time-series chart for Threat News needs dynamic data (date-filtered category counts). Every date filter change creates a new config object, triggering destroy+recreate. JavaScript reference equality means `{} !== {}` even with identical contents.

**How to avoid:**
Chart.js supports in-place data updates via `chart.data = newData; chart.update()`. Either modify `useChartJs` to accept separate static config and dynamic data, or create a new `useTimeSeriesChart` hook:
```jsx
useEffect(() => {
  if (!chartRef.current) {
    chartRef.current = new Chart(canvas, initialConfig);
  } else {
    chartRef.current.data = newData;
    chartRef.current.update('none'); // skip animation on data swap
  }
}, [dataVersion]); // only react to data changes, not full config
```
The existing static charts (Dashboard AttackChart, SettingsPage UsageChart) can continue using the current hook unchanged.

**Warning signs:**
Chart flickers on filter change. Tooltips disappear mid-hover. Animation replays from scratch on every data update instead of smoothly transitioning.

**Phase to address:**
Threat News phase (time-series chart implementation). Must decide on hook strategy before building the chart.

---

### Pitfall 3: D3 Force Graph Nodes Cluster at Origin (0,0)

**What goes wrong:**
The existing ThreatSearchPage.jsx D3 force graph (lines 105-147) has a known node positioning bug (explicitly listed in v3.2 targets). Nodes pile up at the top-left corner or overlap the center node on initial render.

**Why it happens:**
D3's `forceSimulation` initializes node positions to (0,0) if `x` and `y` are not pre-set on data objects. The current code (line 105-109) creates the simulation without assigning initial positions. `forceCenter` shifts the center of mass but does not spread nodes apart. With `forceManyBody` strength of -400, nodes eventually separate after many simulation ticks, but the initial visual state is chaotic.

**How to avoid:**
Pre-assign initial positions in a circle around the center before starting the simulation:
```jsx
nodes.forEach((node, i) => {
  if (node.id === centerQuery) {
    node.x = width / 2;
    node.y = height / 2;
    node.fx = width / 2; // pin center node
    node.fy = height / 2;
  } else {
    const angle = (2 * Math.PI * i) / (nodes.length - 1);
    node.x = width / 2 + 120 * Math.cos(angle);
    node.y = height / 2 + 120 * Math.sin(angle);
  }
});
```
Also clamp node positions to the SVG bounds in the tick handler to prevent escape.

**Warning signs:**
Nodes visually "explode" from top-left on load. Nodes overlap each other. Nodes escape the visible SVG area.

**Phase to address:**
Threat Search bug fix phase.

---

### Pitfall 4: OpenCTI N+1 Queries in Enriched Threat Actor Modal

**What goes wrong:**
Enriching threat actor modals with TTPs, tools, targeted sectors, and campaigns requires additional OpenCTI GraphQL queries per actor. If each relation type is fetched separately (4 queries per modal open), or if the page pre-fetches enrichment for all 24 visible actors on load, the OpenCTI instance gets hammered and responses slow dramatically.

**Why it happens:**
OpenCTI's GraphQL schema nests relationships behind `stixCoreRelationships` edges, and different entity types (AttackPattern, Tool, Identity-sector, Campaign) require different filter parameters. Developers naturally write one query per entity type. Combined with the 15-second timeout on `OpenCtiService` (line 38), slow queries cascade into visible timeouts.

**How to avoid:**
Fetch enrichment lazily (only on modal open, not for all cards). Use a single GraphQL query with aliased fields to fetch all relation types in one round-trip:
```graphql
query ($id: String!) {
  intrusionSet(id: $id) {
    id name description
    ttps: stixCoreRelationships(relationship_type: "uses", toTypes: ["Attack-Pattern"], first: 20) {
      edges { node { to { ... on AttackPattern { name x_mitre_id } } } }
    }
    tools: stixCoreRelationships(relationship_type: "uses", toTypes: ["Tool"], first: 15) {
      edges { node { to { ... on Tool { name } } } }
    }
    sectors: stixCoreRelationships(relationship_type: "targets", toTypes: ["Identity"], first: 15) {
      edges { node { to { ... on Identity { name identity_class } } } }
    }
    campaigns: stixCoreRelationships(relationship_type: "attributed-to", fromTypes: ["Campaign"], first: 10) {
      edges { node { from { ... on Campaign { name first_seen last_seen } } } }
    }
  }
}
```
Cache enrichment per actor ID for 15 minutes (matching actor list cache TTL). Limit each alias with `first: N` to prevent massive payloads for heavily-mapped APT groups.

**Warning signs:**
Modal takes 3+ seconds to open. OpenCTI logs show burst of queries on each modal click. Timeout errors during high-traffic periods.

**Phase to address:**
Threat Actors enrichment phase. Backend service method must use the single-query aliased pattern from the start.

---

### Pitfall 5: Auth Context Not Updated After Settings/Profile Save

**What goes wrong:**
The Settings/Profile page saves user data (name, timezone, organization, role) to the backend, but the `AuthContext` still holds the stale user object. The sidebar initials, topbar plan chip, and `useFormatDate` hook (which reads `user.timezone` from context) all display stale data until full page refresh.

**Why it happens:**
The current AuthContext (lines 36-48) only updates the user object on login/register via `fetchCurrentUser()`. There is no `refreshUser` or `updateUser` method exposed in the context value (line 55). The Settings page has no mechanism to signal "user data changed" to the context.

**How to avoid:**
Add a `refreshUser` method to AuthContext that re-fetches `/api/user` and updates state. Call it after successful profile save:
```jsx
// In AuthContext
const refreshUser = useCallback(async () => {
  const userData = await fetchCurrentUser();
  setUser(userData);
}, []);
// Add to value: { ...existing, refreshUser }
```
Do NOT do optimistic-only updates -- if the save fails server-side but context is already updated, timezone-dependent features render with wrong timezone. Always confirm save succeeded before updating context.

**Warning signs:**
User changes timezone in settings, but dates on dashboard still show old timezone. User changes name, sidebar initials still show old name until page reload.

**Phase to address:**
Settings/Profile phase. Must modify AuthContext before building the settings form.

---

### Pitfall 6: Date-Based Filtering Timezone Mismatch with OpenCTI

**What goes wrong:**
The date selector sends a date string (e.g., "2026-03-28") to the Laravel backend, which constructs a GraphQL date filter. But OpenCTI stores all timestamps in UTC. A user in Asia/Tokyo (UTC+9) filtering for "March 28" expects a different UTC range than a user in America/New_York (UTC-5). Without timezone conversion, reports appear under wrong dates.

**Why it happens:**
HTML `<input type="date">` produces bare date strings with no timezone. The backend receives "2026-03-28" and naively constructs `>= 2026-03-28T00:00:00Z` and `< 2026-03-29T00:00:00Z`. But "March 28 in Tokyo" starts at `2026-03-27T15:00:00Z`, not midnight UTC.

**How to avoid:**
The users table already stores IANA timezone from onboarding. Use it on the backend to convert date ranges:
```php
$tz = new DateTimeZone($request->user()?->timezone ?? 'UTC');
$start = new DateTime($date, $tz);
$end = (clone $start)->modify('+1 day');
$start->setTimezone(new DateTimeZone('UTC'));
$end->setTimezone(new DateTimeZone('UTC'));
// Use $start and $end as UTC ISO-8601 strings in the GraphQL filter
```
For unauthenticated users (dashboard is public), default to UTC -- consistent with the existing credit reset behavior.

**Warning signs:**
Reports dated "March 28" do not appear when filtering for March 28. Reports from adjacent days bleed into the filtered view. Noticeable for users in UTC+12 or UTC-12.

**Phase to address:**
Threat News date filtering phase. Must be part of the backend endpoint design, not patched after.

---

### Pitfall 7: Memory Leak from Unmounted Auto-Refresh Intervals

**What goes wrong:**
User navigates away from Threat News or Threat Actors while auto-refresh interval is active. If cleanup is missed, the interval continues firing API calls and calling `setState` on the unmounted component, causing React warnings and memory leaks over long sessions.

**Why it happens:**
The existing codebase correctly returns cleanup functions (e.g., DashboardPage line 443: `return () => clearInterval(interval)`). But when adding auto-refresh to two more pages, it is easy to forget cleanup in one, or have the interval stored in a ref that gets cleared in the wrong useEffect. Adding conditional logic (like "do not refresh while modal is open") creates more branches to miss.

**How to avoid:**
Create a reusable `useAutoRefresh(callback, intervalMs, enabled)` hook that encapsulates the interval + cleanup + ref pattern:
```jsx
function useAutoRefresh(callback, intervalMs, enabled = true) {
  const callbackRef = useRef(callback);
  useEffect(() => { callbackRef.current = callback; }, [callback]);
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => callbackRef.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}
```
Use `enabled: false` when a modal is open. Use this hook on both Threat News and Threat Actors.

**Warning signs:**
React console warnings about state updates on unmounted components. Network tab shows periodic requests after navigating away.

**Phase to address:**
First page that implements auto-refresh. Build the hook once, reuse on the second page.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Raw `setInterval` instead of shared hook | Faster per-page | Duplicated cleanup logic, inconsistent behavior, stale closure bugs | Never -- the hook is 10 lines and prevents the #1 pitfall |
| Full Chart.js destroy/recreate on data change | Works with existing `useChartJs` hook | Flickering, poor UX, tooltip loss, animation replay | Only if chart type changes (line to bar), never for data-only updates |
| Separate HTTP call per relation type in enriched modal | Simpler to write | 4x slower modal load, hammers OpenCTI, timeout cascades | Never -- single aliased query is straightforward |
| Hardcoded UTC in date filter endpoint | Simpler backend | Wrong results for non-UTC users (majority of any global user base) | Only if all users are known to be UTC |
| Optimistic-only profile update (no server confirmation) | Instant UI feedback | UI lies if save fails; timezone-dependent features break silently | Never for timezone or critical fields; acceptable for cosmetic-only fields |
| Skipping `document.visibilityState` check in auto-refresh | Simpler interval logic | Wasteful API calls on hidden tabs from day one | Never -- 2 lines of code prevent unnecessary load |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| OpenCTI date filters | Using bare date strings ("2026-03-28") without timezone conversion | Convert user's local date to UTC start/end range using their IANA timezone |
| OpenCTI `stixCoreRelationships` | Assuming `to` always holds the related entity | Check both `from` and `to` -- direction depends on relationship type (e.g., "attributed-to" has Campaign in `from`, not `to`) |
| OpenCTI relationship queries | Separate query per relation type for enrichment | Single query with GraphQL aliases for all relation types + `first: N` limits |
| OpenCTI report `published` field | Treating it as OpenCTI ingestion date | `published` is the report's stated publication date; `created_at` is ingestion time -- filter on `published` for user-facing date selectors |
| OpenCTI label aggregation for chart | Client-side counting labels from loaded 20-item page | Server-side aggregation (e.g., `stixCoreObjectsDistribution`) -- client only sees current page, not the full dataset |
| Chart.js responsive sizing | Setting explicit width/height on canvas element | Use `responsive: true` + `maintainAspectRatio: false` and control size via parent container CSS |
| Laravel `Cache::remember` with OpenCTI | Default behavior deletes cache on exception | Already solved in codebase with manual get/put stale-cache pattern (Key Decision row) -- use same approach for new endpoints |
| D3 force simulation in React | Not stopping simulation on unmount | Current code correctly calls `simulation.stop(); svg.remove()` in cleanup -- preserve this pattern when fixing node positions |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Auto-refresh firing on background/hidden tabs | Unnecessary API calls, wasted bandwidth, server load from idle users | Check `document.visibilityState === 'visible'` before fetch; pause interval on `visibilitychange` event | Immediately -- wastes resources from day one |
| Time-series chart with 365+ data points + animations | Sluggish rendering, dropped frames, janky date range changes | Limit to 30-90 data points; aggregate by week/month for longer ranges; use `chart.update('none')` to skip animation on data swaps | >100 points with animation enabled |
| Pre-fetching enrichment for all 24 visible threat actor cards | Page load takes 15+ seconds, 24 GraphQL queries fire simultaneously | Fetch enrichment lazily only when modal opens; cache per actor ID | Always -- 24 parallel queries is never acceptable |
| Large enrichment payloads for heavily-mapped APT groups | Some groups have 200+ ATT&CK techniques; response exceeds 500KB | Add `first: 20` limit on each relationship alias in the GraphQL query | Any well-known APT group (APT28, APT29, Lazarus, etc.) |
| Sidebar collapse/expand triggering chart resize cascade | Charts briefly render at wrong size, then snap to correct size | Use `ResizeObserver` or Chart.js built-in resize handling; avoid forcing re-render on sidebar toggle | Every time user collapses/expands sidebar |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Settings endpoint accepting `plan_id`, `credits`, or `email_verified` fields | Privilege escalation -- user upgrades own plan or grants credits via crafted POST | Whitelist only updateable fields with `$request->only(['name', 'phone', 'timezone', 'organization', 'role'])` |
| Allowing email change without re-verification | Account takeover by changing email to attacker-controlled address | Either require current password + new email verification, or defer email editing entirely (simplest for v3.2) |
| Settings form CSRF gap if using raw fetch | Session hijacking via cross-site form submission | Already mitigated: `apiClient` reads XSRF-TOKEN cookie and sends it as header (client.js lines 17-19) |
| Exposing user timezone in public API responses | Minor information leak (timezone reveals approximate location) | Return timezone only in the authenticated user's own `/api/user` response, never in public endpoints |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Auto-refresh with no visual indicator | User confused when data silently changes while reading | Show subtle "Updated X seconds ago" timestamp; pulse briefly on refresh |
| Date picker resets on auto-refresh | User loses selected date every 5 minutes | Store date in URL params via `useSearchParams` (existing pattern in ThreatActorsPage) -- survives refresh and is shareable |
| Time-series chart with gaps for zero-count dates | Confusing gaps in the line -- user thinks data is missing | Fill date range with explicit zero-value data points; show zero on y-axis, not a gap |
| Modal blocks auto-refresh, data stale when closed | User closes modal to find outdated data underneath | Pause auto-refresh while modal is open (`useAutoRefresh` with `enabled: !modalOpen`); trigger immediate refresh on modal close |
| Settings save with no loading/success feedback | User unsure if save worked, clicks save repeatedly | Disable save button during request; show inline success toast; re-enable on completion or error |
| Profile form pre-filled with dummy/placeholder data from mock-data.js | User thinks placeholders are their actual data | The current SettingsPage imports `API_KEYS` from mock-data -- replace entirely with real user data from AuthContext. Show empty fields with placeholder text styling |
| Search bar z-index hidden behind other elements when logged out | User cannot access the primary search functionality | Ensure search bar has `z-index` above any overlapping elements (topbar, modals, dropdowns) |

## "Looks Done But Isn't" Checklist

- [ ] **Auto-refresh:** Verify interval pauses when browser tab is hidden (check `document.visibilityState`)
- [ ] **Auto-refresh:** Verify no React warnings in console after navigating away from page with active interval
- [ ] **Auto-refresh:** Verify refresh pauses while enrichment modal or any modal is open
- [ ] **Date filter:** Verify chart shows zero (not a gap) for dates with no reports
- [ ] **Date filter:** Verify a user in UTC+9 sees correct reports for their selected date (test with timezone-shifted user)
- [ ] **Date filter:** Verify date selection persists in URL params and survives browser refresh
- [ ] **Time-series chart:** Verify chart does not flicker on data change (uses in-place update, not destroy/recreate)
- [ ] **Time-series chart:** Verify chart resizes correctly when sidebar collapses/expands
- [ ] **Enriched modal:** Verify skeleton/spinner shows while enrichment data loads (not just a blank modal)
- [ ] **Enriched modal:** Verify graceful fallback when OpenCTI enrichment query fails or times out
- [ ] **Enriched modal:** Verify relationship direction is correct (Campaign in `from` for "attributed-to", AttackPattern in `to` for "uses")
- [ ] **D3 force graph:** Verify nodes start in visible positions (not clustered at 0,0)
- [ ] **D3 force graph:** Verify nodes do not escape visible SVG boundaries
- [ ] **Settings page:** Verify sidebar and topbar reflect saved changes without page reload (AuthContext synced)
- [ ] **Settings page:** Verify server-side validation errors display inline on the form
- [ ] **Settings page:** Verify OAuth users cannot change email (managed by provider)
- [ ] **Settings page:** Verify ALL mock data imports removed -- no `mock-data.js` usage remains
- [ ] **Dashboard stat cards:** Verify 7 cards render without layout breakage on narrow screens
- [ ] **Threat Map:** Verify old markers are cleared when capping to 100 latest (no accumulation)

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Stale closure in auto-refresh | LOW | Replace raw setInterval with useRef-based `useAutoRefresh` hook; 15 min per page |
| Chart flickering from full recreate | MEDIUM | Modify or create new chart hook supporting in-place updates; test all existing chart usages still work |
| N+1 OpenCTI queries for enrichment | MEDIUM | Rewrite as single aliased query in ThreatActorService; update cache key; ~1 hour |
| Timezone mismatch in date filter | LOW | Add timezone param to endpoint; Carbon/DateTime conversion in service; 30 min |
| Auth context not syncing after save | LOW | Add `refreshUser` to AuthContext; call after save; 15 min if designed upfront |
| D3 nodes at origin | LOW | Add initial circular position assignment; 20 min |
| Memory leak from intervals | MEDIUM if discovered late | Build `useAutoRefresh` hook; audit all setInterval usages; refactor DashboardPage too for consistency |
| Settings page still using mock data | LOW | Remove imports, wire to AuthContext + new profile API; 30-60 min |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Stale closure in auto-refresh | Threat News (first auto-refresh page) | Change date filter, wait 5 min, confirm data matches current filter |
| Chart destroy/recreate flickering | Threat News (time-series chart) | Change date range 5 times rapidly, confirm no flash/flicker |
| D3 node positioning at origin | Threat Search bug fixes | Load search with 10+ relationships, confirm nodes start spread out |
| N+1 OpenCTI enrichment queries | Threat Actors enrichment | Open modal, check Network tab shows exactly 1 additional request |
| Auth context stale after save | Settings/Profile (modify AuthContext first) | Save timezone change, navigate to dashboard, confirm dates use new timezone |
| Timezone mismatch in date filter | Threat News date filtering (backend endpoint) | Set user timezone to UTC+12, filter for today, confirm only today's reports |
| Memory leak from intervals | Threat News (build useAutoRefresh hook first) | Navigate away, check Network tab for absence of periodic requests |
| Background tab wasted requests | Threat News or Threat Actors (first auto-refresh) | Switch to another browser tab, verify no API calls during 5-min interval |
| Settings page mock data | Settings/Profile phase | Grep for `mock-data` imports in SettingsPage -- must be zero |
| Dashboard 7 stat cards layout | Dashboard stat card expansion | Resize browser to 1024px width, verify cards wrap gracefully |

## Sources

- Direct codebase analysis: `frontend/src/pages/DashboardPage.jsx` lines 430-444 (existing auto-refresh pattern with setInterval)
- Direct codebase analysis: `frontend/src/hooks/useChartJs.js` lines 1-18 (chart hook with config-reference dependency)
- Direct codebase analysis: `frontend/src/pages/ThreatSearchPage.jsx` lines 105-147 (D3 force simulation without initial positions)
- Direct codebase analysis: `frontend/src/contexts/AuthContext.jsx` lines 55-68 (no refreshUser method)
- Direct codebase analysis: `backend/app/Services/OpenCtiService.php` line 38 (15s timeout, 2 retries)
- Direct codebase analysis: `backend/app/Services/ThreatActorService.php` (15-min cache, GraphQL query structure)
- Direct codebase analysis: `backend/app/Services/ThreatNewsService.php` (5-min cache, label-based filtering)
- Direct codebase analysis: `frontend/src/pages/SettingsPage.jsx` lines 1-4 (imports mock-data.js, no real API calls)
- Direct codebase analysis: `frontend/src/api/client.js` (XSRF token handling, credentials: include)
- React documentation: useEffect cleanup for intervals and subscriptions
- Chart.js documentation: `chart.update()` for in-place data mutations vs destroy/recreate
- D3 force simulation documentation: initial node positioning and boundary clamping
- All findings are HIGH confidence based on direct code inspection of the existing system

---
*Pitfalls research for: AQUA TIP v3.2 -- App Layout Page Tweaks*
*Researched: 2026-03-28*
