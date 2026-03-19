# Phase 20: Dashboard Page Rewrite - Research

**Researched:** 2026-03-19
**Domain:** React frontend rewrite -- replacing mock data with live API calls
**Confidence:** HIGH

## Summary

This phase is a frontend-only rewrite of `DashboardPage.jsx`. The backend endpoints already exist and are tested (Phase 18, Phase 19). The work involves: (1) replacing 4 mock data imports with `apiClient.get()` calls to 3 public dashboard endpoints + 1 auth-only threat-map endpoint, (2) adding 2 new bottom widgets (credit balance, recent searches) that require auth-gated rendering, (3) implementing client-side filtering of the indicators table by attack category chart clicks, and (4) cleaning up unused mock-data.js exports.

The existing codebase provides all the building blocks: `apiClient` for API calls, `useAuth()` for guest vs authenticated branching, `useChartJs` for Chart.js rendering, `useLeaflet` for the map, `CreditBadge` for credit display, and `fetchCredits()` for the credit API. No new libraries are needed.

**Primary recommendation:** Structure the rewrite as a single `DashboardPage.jsx` file using `useState`/`useEffect` for each independent API call, with partial failure handling (each widget independently shows loading/error states). Use existing patterns from ThreatSearchPage for guest CTAs.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Stat cards: Count only -- no deltas, sparklines, or trend data. Fixed 4 types: IPv4-Addr, Domain-Name, Hostname, X509-Certificate. Color mapping: IPv4 -> red, Domain-Name -> violet, Hostname -> cyan, X509-Certificate -> amber. "Live from OpenCTI" indicator on each card.
- Indicators table: Columns are Type badge, Value, Labels (chips), Date. 8 rows, no pagination. Client-side filtering by attack category bar click. Active filter chip with X to clear.
- Bottom widgets: 2 widgets spanning 2 columns each. Left: Credit balance with progress bar + reset time. Right: Recent searches (5 most recent) with query text + type badge. Guest users see sign-in CTA cards.
- Map widget: Data from /api/threat-map/snapshot. Simplified markers -- remove C2/APT/DDoS/Phishing filter buttons. Keep title + green live dot. Remove "Real-time" text and category filter chips.
- Quick Actions bar: Keep as-is.
- Backend stat types need update: Currently queries IPv4-Addr, Domain-Name, Url, Email-Addr but user wants IPv4-Addr, Domain-Name, Hostname, X509-Certificate.

### Claude's Discretion
- Loading/error states for each API call
- Exact spacing and typography adjustments
- How to handle partial API failures (e.g., stats load but map fails)
- Color palette for attack categories chart bars
- Whether to add auto-refresh polling (5-min interval matches backend cache TTL)

### Deferred Ideas (OUT OF SCOPE)
- Sparkline trend charts on stat cards (DASH-F01)
- Delta percentages ("vs last week") on stat cards (DASH-F02)
- "View full map" link on dashboard map to /threat-map page
- Quick search input on dashboard (DASH-F03)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-05 | Clicking an attack category filters the recent indicators table by that category | Chart.js onClick handler + useState for activeFilter + client-side array.filter on fetched indicators |
| WIDG-01 | User sees their remaining daily credit balance on dashboard | fetchCredits() API + CreditBadge component + progress bar widget + useAuth() guest gate |
| WIDG-02 | User sees their recent searches on dashboard | GET /api/search-history endpoint (auth-only) + useAuth() guest gate |
| CLEAN-01 | All mock data imports removed from DashboardPage | Remove THREAT_STATS, RECENT_IPS, ATTACK_CATEGORIES, THREAT_MAP_POINTS imports |
| CLEAN-02 | Unused mock data exports removed from mock-data.js | Remove THREAT_STATS, RECENT_IPS, ATTACK_CATEGORIES, THREAT_MAP_POINTS exports (no other files import them) |
</phase_requirements>

## Standard Stack

### Core (already installed -- no new dependencies)
| Library | Purpose | Why Standard |
|---------|---------|--------------|
| React 19 | Component framework | Already in project |
| Chart.js (auto) | Bar chart for attack categories | Already used via useChartJs hook |
| Leaflet | Threat map rendering | Already used via useLeaflet hook |
| apiClient | API calls with CSRF/cookie auth | Project's established fetch wrapper |

### Supporting (already available)
| Library | Purpose | When to Use |
|---------|---------|-------------|
| CreditBadge | Display remaining/limit chip | Credit balance widget |
| useAuth() | Auth state + isAuthenticated | Guest vs authenticated branching |
| useChartJs | Chart.js lazy instantiation | Attack categories bar chart |
| useLeaflet | Leaflet map with markers | Threat map widget |
| fetchCredits() | GET /api/credits | Credit balance data |
| Lucide React (Icon) | Icon components | UI icons throughout dashboard |

**Installation:** None required -- all dependencies already installed.

## Architecture Patterns

### API Response Shapes (verified from backend controllers)

**GET /api/dashboard/counts** (public, no auth):
```json
{
  "data": [
    { "entity_type": "IPv4-Addr", "label": "IP Addresses", "count": 14283 },
    { "entity_type": "Domain-Name", "label": "Domains", "count": 8741 }
  ]
}
```
Note: Backend currently returns IPv4-Addr, Domain-Name, Url, Email-Addr. The CONTEXT.md notes this needs updating to IPv4-Addr, Domain-Name, Hostname, X509-Certificate. This is a backend change that should be a task in this phase.

**GET /api/dashboard/indicators** (public, no auth):
```json
{
  "data": [
    {
      "id": "abc123",
      "value": "185.220.101.34",
      "entity_type": "IPv4-Addr",
      "score": 95,
      "created_at": "2026-03-19T10:00:00Z"
    }
  ]
}
```
Note: The indicators endpoint returns 10 items. The CONTEXT.md says show 8 rows -- slice to 8 on the frontend. Indicators do NOT include labels in the current response. For DASH-05 (filtering by category label), the indicators endpoint needs to also return `labels` (objectLabel values). This is a backend gap.

**GET /api/dashboard/categories** (public, no auth):
```json
{
  "data": [
    { "label": "Phishing", "count": 4521 },
    { "label": "Ransomware", "count": 2834 }
  ]
}
```

**GET /api/threat-map/snapshot** (auth-only via Sanctum):
```json
{
  "data": {
    "events": [
      {
        "id": "evt-abc",
        "type": "C2",
        "color": "red",
        "ip": "185.220.101.34",
        "entity_type": "IPv4-Addr",
        "timestamp": "2026-03-19T10:00:00Z",
        "message": "185.220.101.34",
        "lat": 55.75,
        "lng": 37.62,
        "city": "Moscow",
        "country": "Russia",
        "countryCode": "RU"
      }
    ],
    "counters": { "threats": 100, "countries": 15, "types": 8 }
  }
}
```
Note: This endpoint requires auth (Route is inside auth:sanctum group). Guest users will get 401. The dashboard map should gracefully handle this -- show empty map or a "sign in" prompt.

**GET /api/credits** (public, no auth):
```json
{
  "remaining": 8,
  "limit": 10,
  "resets_at": "2026-03-20T00:00:00+00:00",
  "is_guest": false
}
```

**GET /api/search-history** (auth-only):
```json
{
  "data": [
    { "id": 1, "query": "185.220.101.34", "type": "IPv4-Addr", "module": "threat-search", "created_at": "2026-03-19T10:00:00Z" }
  ],
  "meta": { "total": 5, "limit": 20 }
}
```

### Recommended Component Structure

Keep everything in a single `DashboardPage.jsx` file with extracted sub-components:

```
DashboardPage.jsx (main)
  - StatCard (inline component)
  - AttackChart (inline component, updated for onClick)
  - IndicatorsTable (inline component, receives filter prop)
  - CreditWidget (inline component)
  - RecentSearchesWidget (inline component)
  - GuestCta (inline component for sign-in cards)
```

All sub-components stay in the same file (current pattern -- the existing DashboardPage already defines Sparkline and AttackChart inline).

### Data Fetching Pattern

Each API call is independent. Use parallel `useEffect` calls:

```jsx
const [counts, setCounts] = useState(null);
const [countsError, setCountsError] = useState(null);
const [countsLoading, setCountsLoading] = useState(true);

useEffect(() => {
  let cancelled = false;
  setCountsLoading(true);
  apiClient.get('/api/dashboard/counts')
    .then(res => { if (!cancelled) { setCounts(res.data); setCountsLoading(false); } })
    .catch(err => { if (!cancelled) { setCountsError(err); setCountsLoading(false); } });
  return () => { cancelled = true; };
}, []);
```

Repeat for indicators, categories, map snapshot, credits, and search history. Each widget renders independently with its own loading/error state.

### Chart.js onClick for Category Filtering (DASH-05)

```jsx
function AttackChart({ categories, activeFilter, onFilterChange }) {
  const config = useMemo(() => ({
    type: 'bar',
    data: {
      labels: categories.map(c => c.label),
      datasets: [{ data: categories.map(c => c.count), /* ... */ }],
    },
    options: {
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          const clickedLabel = categories[index].label;
          // Toggle: if same label clicked again, clear filter
          onFilterChange(clickedLabel === activeFilter ? null : clickedLabel);
        }
      },
      // ... rest of options
    },
  }), [categories, activeFilter]);

  const ref = useChartJs(config);
  return <canvas ref={ref}></canvas>;
}
```

Important: The `useChartJs` hook destroys and recreates the chart when config changes (it uses `config` as the useEffect dependency). This means the chart will re-render when `activeFilter` changes, which is fine for visual highlighting but may cause a flash. Consider highlighting the active bar with different opacity.

### Client-Side Indicator Filtering

```jsx
const [activeFilter, setActiveFilter] = useState(null);

// indicators already fetched (10 items, show 8)
const displayedIndicators = useMemo(() => {
  const sliced = (indicators || []).slice(0, 8);
  if (!activeFilter) return sliced;
  return sliced.filter(ind =>
    (ind.labels || []).some(label => label === activeFilter)
  );
}, [indicators, activeFilter]);
```

### Guest vs Authenticated Branching

```jsx
const { isAuthenticated } = useAuth();

// Credit widget
{isAuthenticated ? (
  <CreditWidget credits={credits} />
) : (
  <GuestCta icon="coins" message="Sign in to track credits" />
)}

// Recent searches widget
{isAuthenticated ? (
  <RecentSearchesWidget searches={searches} />
) : (
  <GuestCta icon="clock" message="Sign in to see search history" />
)}
```

Follow the existing pattern from ThreatSearchPage lines 528-554 for CTA styling.

### Anti-Patterns to Avoid
- **Single loading state for all API calls:** Each widget should load independently. Don't block the entire dashboard on the slowest endpoint.
- **Re-fetching on filter change:** DASH-05 specifies client-side filtering. Don't make a new API call when user clicks a category bar.
- **Mutating fetched data:** Use spread/filter to create new arrays, never mutate the response in place.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| API calls with CSRF | Custom fetch wrapper | `apiClient.get()` from `api/client.js` | Handles CSRF tokens, credentials, error envelope |
| Credit display chip | Custom badge component | `CreditBadge` from `components/shared/` | Color-coded remaining/limit display already built |
| Chart rendering | Direct Chart.js instantiation | `useChartJs` hook | Handles lifecycle, cleanup, canvas ref |
| Map rendering | Direct Leaflet setup | `useLeaflet` hook | Handles tile layer, markers, popups, cleanup |
| Auth state | Custom auth check | `useAuth()` context | `isAuthenticated` boolean already available |
| Type badge colors | New color map | Reuse `TYPE_BADGE_COLORS` from ThreatSearchPage | Already maps entity_type -> {bg, text} for 7 types |

## Common Pitfalls

### Pitfall 1: Threat Map Endpoint Requires Auth
**What goes wrong:** Dashboard map shows 401 error for guest users because `/api/threat-map/snapshot` is inside `auth:sanctum` middleware group.
**Why it happens:** Dashboard routes are public but the map endpoint was designed for authenticated use.
**How to avoid:** Either (a) move the snapshot route outside the auth group (backend change), or (b) handle 401 gracefully on frontend by showing an empty map with "Sign in for live threat data" overlay. Option (b) is safer since it preserves the existing API security boundary.
**Warning signs:** Map widget shows error state for all unauthenticated visitors.

### Pitfall 2: Indicators Endpoint Missing Labels
**What goes wrong:** DASH-05 requires filtering indicators by attack category label, but the current `getIndicators()` query does not fetch `objectLabel` from OpenCTI.
**Why it happens:** The indicators endpoint was built for display (value, type, score, date) before the filtering requirement was defined.
**How to avoid:** Add `objectLabel { value }` to the indicators GraphQL query and include `labels` in the response shape. This is a required backend change.
**Warning signs:** Filter by category does nothing because indicators have no label data.

### Pitfall 3: Backend Entity Types Don't Match User's Chosen Set
**What goes wrong:** Stat cards show Url and Email-Addr counts instead of Hostname and X509-Certificate.
**Why it happens:** `DashboardService::fetchCounts()` hard-codes `['IPv4-Addr' => 'IP Addresses', 'Domain-Name' => 'Domains', 'Url' => 'URLs', 'Email-Addr' => 'Email Addresses']`.
**How to avoid:** Update the `$entityTypes` map in `DashboardService::fetchCounts()` to match the user's decision: IPv4-Addr, Domain-Name, Hostname, X509-Certificate.
**Warning signs:** Dashboard stat cards show different categories than expected.

### Pitfall 4: useChartJs Recreates Chart on Config Change
**What goes wrong:** When `activeFilter` state changes and is included in the chart `useMemo` deps, the entire chart is destroyed and recreated, causing a visual flash.
**Why it happens:** `useChartJs` hook uses `config` as its useEffect dependency -- any new config object triggers chart destruction + recreation.
**How to avoid:** Two approaches: (a) store the chart instance ref and use `chart.update()` for highlighting, or (b) accept the flash since it's brief and user-initiated. Approach (b) is simpler and acceptable for a dashboard.
**Warning signs:** Chart flickers when clicking bars.

### Pitfall 5: Stale Closure in useEffect Cleanup
**What goes wrong:** API responses arrive after component unmounts, causing "set state on unmounted component" warnings.
**Why it happens:** Multiple parallel API calls with no cancellation.
**How to avoid:** Use a `cancelled` flag in each useEffect cleanup function. Check it before calling setState.
**Warning signs:** Console warnings about state updates on unmounted components.

## Code Examples

### Stat Card Component (verified pattern from existing code)
```jsx
function StatCard({ label, count, color, loading, error }) {
  const colorMap = {
    red: { bg: 'bg-red/10', text: 'text-red', border: 'border-red/20' },
    violet: { bg: 'bg-violet/10', text: 'text-violet', border: 'border-violet/20' },
    cyan: { bg: 'bg-cyan/10', text: 'text-cyan', border: 'border-cyan/20' },
    amber: { bg: 'bg-amber/10', text: 'text-amber', border: 'border-amber/20' },
  };
  const colors = colorMap[color] || colorMap.violet;

  return (
    <div className="glass-card p-5">
      <div className="text-xs text-text-muted mb-1">{label}</div>
      {loading ? (
        <div className="h-8 w-20 bg-surface-2 rounded animate-pulse" />
      ) : error ? (
        <div className="text-xs text-red">Failed to load</div>
      ) : (
        <>
          <div className="text-2xl font-heading font-bold text-text-primary mb-2">
            {count.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`live-dot live-dot-green`}></div>
            <span className="text-[10px] text-text-muted">Live from OpenCTI</span>
          </div>
        </>
      )}
    </div>
  );
}
```

### Guest CTA Card (matches ThreatSearchPage pattern)
```jsx
function GuestCta({ icon, message }) {
  return (
    <div className="glass-card p-5 flex flex-col items-center justify-center gap-3 text-center">
      <div className="w-10 h-10 rounded-lg bg-violet/10 flex items-center justify-center text-violet">
        <Icon name={icon} />
      </div>
      <p className="text-sm font-mono text-text-secondary">{message}</p>
      <Link to="/login" className="btn-primary text-sm">Sign In</Link>
    </div>
  );
}
```

### Auto-Refresh Pattern (5-min interval matching backend cache TTL)
```jsx
useEffect(() => {
  const interval = setInterval(() => {
    // Re-fetch all public endpoints silently (no loading state)
    apiClient.get('/api/dashboard/counts').then(res => setCounts(res.data)).catch(() => {});
    apiClient.get('/api/dashboard/indicators').then(res => setIndicators(res.data)).catch(() => {});
    apiClient.get('/api/dashboard/categories').then(res => setCategories(res.data)).catch(() => {});
  }, 5 * 60 * 1000); // 5 minutes

  return () => clearInterval(interval);
}, []);
```

### TYPE_BADGE_COLORS Reference (from ThreatSearchPage.jsx)
```jsx
const TYPE_BADGE_COLORS = {
  'IPv4-Addr':     { bg: '#FF3B5C25', text: '#FF3B5C' },
  'IPv6-Addr':     { bg: '#FF3B5C25', text: '#FF3B5C' },
  'Domain-Name':   { bg: '#00E5FF25', text: '#00E5FF' },
  'Url':           { bg: '#7A44E425', text: '#7A44E4' },
  'Email-Addr':    { bg: '#FFB02025', text: '#FFB020' },
  'StixFile':      { bg: '#00C48C25', text: '#00C48C' },
  'Hostname':      { bg: '#9B6BF725', text: '#9B6BF7' },
  'X509-Certificate': { bg: '#FFB02025', text: '#FFB020' },
};
```
Note: X509-Certificate is not in the existing map. Add it with amber color per user decision.

### Attack Categories Chart Color Palette
Since categories come from OpenCTI labels dynamically, assign colors from a fixed palette:
```jsx
const CATEGORY_COLORS = [
  '#FF3B5C', // red
  '#7A44E4', // violet
  '#00E5FF', // cyan
  '#FFB020', // amber
  '#00C48C', // green
  '#9B6BF7', // light violet
];

// Assign by index (top 6 categories always)
const barColors = categories.map((_, i) => CATEGORY_COLORS[i % CATEGORY_COLORS.length]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Mock data imports | Live API calls | This phase | Zero mock data in dashboard |
| 4 fictional bottom widgets | 2 real widgets (credits + searches) | This phase | Authentic user data |
| Fake deltas + sparklines | Count-only stat cards | This phase | Honest display (no fake trends) |
| C2/APT/DDoS/Phishing map filters | Simplified map (no filters) | This phase | Cleaner map UI |

## Open Questions

1. **Threat map endpoint auth requirement**
   - What we know: `/api/threat-map/snapshot` is inside `auth:sanctum` group. Dashboard is public.
   - What's unclear: Should we move the endpoint to public, or handle 401 gracefully on frontend?
   - Recommendation: Handle 401 gracefully on frontend (empty map for guests). Moving the endpoint to public would require a security review of the data it exposes.

2. **Indicators missing labels for DASH-05 filtering**
   - What we know: `getIndicators()` does not fetch `objectLabel`. Categories filtering requires labels on each indicator.
   - What's unclear: Should we add labels to the existing endpoint or create a new one?
   - Recommendation: Add `objectLabel { value }` to the existing `fetchIndicators()` GraphQL query and include `labels: array_map(fn($l) => $l['value'], $edge['node']['objectLabel'] ?? [])` in the response. Minimal backend change.

3. **Backend entity types mismatch**
   - What we know: Backend hard-codes Url + Email-Addr; user wants Hostname + X509-Certificate.
   - What's unclear: None -- this is a straightforward config change.
   - Recommendation: Update `DashboardService::fetchCounts()` entity type map. Single-line changes.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | PHPUnit 11 (backend), none (frontend) |
| Config file | `backend/phpunit.xml` |
| Quick run command | `cd backend && php artisan test --filter=Dashboard` |
| Full suite command | `cd backend && php artisan test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-05 | Category click filters indicators table | manual-only | N/A (no frontend test framework) | N/A |
| WIDG-01 | Credit balance widget displays for auth users | manual-only | N/A (no frontend test framework) | N/A |
| WIDG-02 | Recent searches widget displays for auth users | manual-only | N/A (no frontend test framework) | N/A |
| CLEAN-01 | No mock imports in DashboardPage | unit (grep) | `grep -c "mock-data" frontend/src/pages/DashboardPage.jsx` (expect 0) | N/A |
| CLEAN-02 | Unused exports removed from mock-data.js | unit (grep) | `grep -c "THREAT_STATS\|RECENT_IPS\|ATTACK_CATEGORIES\|THREAT_MAP_POINTS" frontend/src/data/mock-data.js` (expect 0) | N/A |
| BACKEND | Updated entity types in DashboardService | unit | `cd backend && php artisan test --filter=DashboardService` | Wave 0 |
| BACKEND | Labels included in indicators response | feature | `cd backend && php artisan test --filter=DashboardIndicators` | Wave 0 |

### Sampling Rate
- **Per task commit:** `grep -c "mock-data" frontend/src/pages/DashboardPage.jsx` + visual check
- **Per wave merge:** `cd backend && php artisan test --filter=Dashboard`
- **Phase gate:** Full backend suite green + manual visual verification of all 5 requirements

### Wave 0 Gaps
- [ ] Backend test for updated entity types (Hostname, X509-Certificate) in DashboardService
- [ ] Backend test for labels field in indicators response
- [ ] No frontend test infrastructure exists (documented in CLAUDE.md: "No tests exist") -- frontend verification is manual

## Sources

### Primary (HIGH confidence)
- `backend/app/Services/DashboardService.php` -- verified getCounts(), getIndicators(), getCategories() return shapes
- `backend/app/Http/Controllers/Dashboard/*.php` -- verified response envelope format `{ data: [...] }`
- `backend/app/Http/Controllers/ThreatMap/SnapshotController.php` -- verified snapshot response shape
- `backend/app/Http/Controllers/SearchHistory/IndexController.php` -- verified search history response shape
- `backend/app/Http/Controllers/Credit/CreditStatusController.php` -- verified credit response shape
- `backend/routes/api.php` -- verified route auth requirements (dashboard public, map auth, search-history auth)
- `frontend/src/pages/DashboardPage.jsx` -- current mock implementation (full rewrite target)
- `frontend/src/data/mock-data.js` -- verified which exports are dashboard-only
- `frontend/src/pages/ThreatSearchPage.jsx` -- verified guest CTA pattern and TYPE_BADGE_COLORS map
- `frontend/src/hooks/useChartJs.js` -- verified chart lifecycle (destroy on config change)
- `frontend/src/hooks/useLeaflet.js` -- verified marker rendering pattern
- `frontend/src/contexts/AuthContext.jsx` -- verified useAuth() provides isAuthenticated

### Secondary (MEDIUM confidence)
- Chart.js onClick callback API -- based on Chart.js standard API (onClick on options receives event + elements array)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in project, no new deps
- Architecture: HIGH -- all API shapes verified from backend source code
- Pitfalls: HIGH -- identified from direct code reading (auth requirements, missing labels, entity type mismatch)

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable -- no external dependencies changing)
