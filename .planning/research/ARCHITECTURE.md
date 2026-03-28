# Architecture Patterns

**Domain:** App layout page tweaks -- date filtering, auto-refresh, enriched modals, time-series charts, settings page (v3.2)
**Researched:** 2026-03-28
**Confidence:** HIGH (based on direct codebase analysis of existing patterns and OpenCTI GraphQL capabilities)

## Existing Architecture Snapshot

### Current Data Flow (relevant to v3.2)

```
Frontend Pages                     API Layer                          Backend Services              OpenCTI
+-----------------+    GET /api/   +------------------+   GraphQL    +-------------------+   POST   +----------+
| DashboardPage   | ------------> | DashboardCtrl    | ----------> | DashboardService  | -------> | GraphQL  |
| ThreatNewsPage  | ------------> | ThreatNewsCtrl   | ----------> | ThreatNewsService | -------> | endpoint |
| ThreatActorsPage| ------------> | ThreatActorCtrl  | ----------> | ThreatActorService| -------> |          |
| ThreatMapPage   | ------------> | ThreatMapCtrl    | ----------> | ThreatMapService  | -------> |          |
| SettingsPage    |               |                  |             |                   |          |          |
+-----------------+               +------------------+             +-------------------+          +----------+
                                                                         |
                                                                    Cache::remember
                                                                   (5-15 min TTL)
```

### Current Caching Strategy

| Endpoint | TTL | Strategy |
|----------|-----|----------|
| Dashboard counts | 5 min | Manual get/put with stale fallback |
| Dashboard indicators | 5 min | Manual get/put with stale fallback |
| Dashboard categories | 5 min | Manual get/put with stale fallback |
| Threat actors | 15 min | Cache::remember per param hash |
| Threat news | 5 min | Cache::remember per param hash |
| Threat map snapshot | 15 min | Cache::remember |
| Geo lookups | 1 hour | Cache::remember per IP |

### Current Frontend Data Fetching Pattern

All pages use the same pattern:
1. `useState` for data, loading, error
2. `useEffect` with `cancelled` flag for cleanup
3. `apiClient.get()` with query string params
4. Independent widget loading (no global spinner)

### Current AuthContext Shape

```js
{ user, loading, error, isAuthenticated, emailVerified, onboardingCompleted,
  userInitials, timezone, plan, trialActive, trialDaysLeft, login, register,
  logout, refreshUser }
```

### Current User Fields Available (from /api/user)

```
id, name, email, avatar_url, phone, timezone, organization, role,
email_verified, onboarding_completed, plan { id, name, slug, daily_credits },
trial_active, trial_days_left, trial_ends_at
```

---

## New Components Overview

| Component | Type | New/Modified | Purpose |
|-----------|------|--------------|---------|
| Date filter params on ThreatNews API | Backend | MODIFIED | Accept `published_after`, `published_before` date range filters |
| ThreatNews time-series endpoint | Backend | NEW | `GET /api/threat-news/chart` -- category distribution over time |
| ThreatActors enriched query | Backend | MODIFIED | Extend GraphQL to include TTPs, tools, campaigns |
| ThreatMap snapshot cap | Backend | MODIFIED | Already caps at 100 in `fetchSnapshot()` -- frontend label change only |
| Dashboard stat cards config | Frontend | MODIFIED | Expand from 4 to 7 entity types, add heading |
| Dashboard counts endpoint | Backend | MODIFIED | Add Email-Addr, Cryptocurrency-Wallet, Url counts |
| Settings/Profile page | Frontend | REWRITE | Replace mock data with real user data from AuthContext |
| Profile update endpoint | Backend | NEW | `PUT /api/profile` -- update name, phone, timezone, organization, role |
| Password change endpoint | Backend | NEW | `PUT /api/password` -- change password for email-registered users |
| `useAutoRefresh` hook | Frontend | NEW | Reusable interval-based refresh with visibility pause |
| Date range picker component | Frontend | NEW | Reusable date range selector for Threat News |
| Time-series chart component | Frontend | NEW | Category distribution over time (line/area chart) |

---

## Detailed Architecture Per Feature

### 1. Dashboard Stat Cards Expansion

**Current:** 4 cards (IPv4-Addr, Domain-Name, Hostname, X509-Certificate) from `DashboardService::fetchCounts()` which runs 4 sequential GraphQL queries.

**Change:** Expand to 7 cards by adding Email-Addr, Cryptocurrency-Wallet, Url.

**Backend modification** (`DashboardService::fetchCounts()`):

```php
// Add 3 more entity types to the $entityTypes array
$entityTypes = [
    'IPv4-Addr'              => 'IP Addresses',
    'Domain-Name'            => 'Domains',
    'Hostname'               => 'Hostnames',
    'X509-Certificate'       => 'Certificates',
    'Email-Addr'             => 'Emails',         // NEW
    'Cryptocurrency-Wallet'  => 'Crypto Wallets', // NEW
    'Url'                    => 'URLs',            // NEW
];
```

**Performance concern:** Currently runs N sequential GraphQL queries. Going from 4 to 7 means 7 round trips. Consider batching into a single aliased query:

```graphql
query {
  ipv4: stixCyberObservables(filters: $ipv4Filter, first: 1) { pageInfo { globalCount } }
  domains: stixCyberObservables(filters: $domainFilter, first: 1) { pageInfo { globalCount } }
  # ... etc
}
```

This is a single HTTP request returning all 7 counts. OpenCTI GraphQL supports aliased queries.

**Frontend modification** (`DashboardPage.jsx`):

```js
// Expand STAT_CARD_CONFIG to 7 entries
const STAT_CARD_CONFIG = [
  { entity_type: 'IPv4-Addr', label: 'IP Addresses', color: 'red' },
  { entity_type: 'Domain-Name', label: 'Domains', color: 'violet' },
  { entity_type: 'Hostname', label: 'Hostnames', color: 'cyan' },
  { entity_type: 'X509-Certificate', label: 'Certificates', color: 'amber' },
  { entity_type: 'Email-Addr', label: 'Emails', color: 'green' },           // NEW
  { entity_type: 'Cryptocurrency-Wallet', label: 'Crypto Wallets', color: 'amber' },  // NEW
  { entity_type: 'Url', label: 'URLs', color: 'violet' },                   // NEW
];

// Add STAT_COLOR_MAP entries for green
```

**Grid change:** `grid-cols-4` becomes a responsive layout for 7 cards. Use `grid-cols-4 lg:grid-cols-7` or keep 4-col with a second row. Recommendation: 7-col on desktop, 4-col on medium, wraps naturally.

**Additional UI changes:**
- Add "Threat Database" heading above stat cards
- Remove `live-dot` and "Live" label from stat cards (keep on map only)

### 2. Threat Map Cap and Label

**Current state of ThreatMapService::fetchSnapshot():**
- Already fetches `first: 100` observables (line 351 of ThreatMapService.php)
- Already ordered by `created_at desc`
- Frontend `useThreatStream.js` caps at `MAX_EVENTS = 50` for SSE events

**Changes needed:**
- Frontend label change only: Replace "Active Threats" with "100 Latest Attacks" in `ThreatMapCounters.jsx`
- No backend change needed -- snapshot already caps at 100
- Consider increasing `MAX_EVENTS` in `useThreatStream.js` from 50 to 100 to match snapshot

### 3. Threat News: Date-Based Filtering

**Current filtering:** search (text), label (category), cursor pagination.

**New filtering:** Add `published_after` and `published_before` date range filters.

**Backend: ThreatNewsService modification**

Add date range parameters to `list()` method:

```php
public function list(
    int $first = 20,
    ?string $after = null,
    ?string $search = null,
    ?string $confidence = null,
    ?string $labelId = null,
    ?string $publishedAfter = null,    // NEW: ISO-8601 date
    ?string $publishedBefore = null,   // NEW: ISO-8601 date
    string $orderBy = 'published',
    string $orderMode = 'desc',
): array
```

OpenCTI `FilterGroup` supports date range on `published` field:

```php
if ($publishedAfter) {
    $filterItems[] = [
        'key'      => 'published',
        'values'   => [$publishedAfter],
        'operator' => 'gt',
        'mode'     => 'or',
    ];
}
if ($publishedBefore) {
    $filterItems[] = [
        'key'      => 'published',
        'values'   => [$publishedBefore],
        'operator' => 'lt',
        'mode'     => 'or',
    ];
}
```

**Backend: ThreatNewsController modification**

Accept new query params:

```php
$validated = $request->validate([
    'after'            => 'nullable|string',
    'search'           => 'nullable|string|max:255',
    'label'            => 'nullable|string',
    'published_after'  => 'nullable|date',
    'published_before' => 'nullable|date',
    'sort'             => 'nullable|in:published,name',
    'order'            => 'nullable|in:asc,desc',
]);
```

**Frontend: ThreatNewsPage modifications**

Replace cursor-based pagination with date-based infinite scroll or date selector:

```
Current flow: pagination toolbar with prev/next cursors
New flow:     date range selector replaces pagination
              - Default: last 7 days
              - Presets: Today, 7 days, 30 days, 90 days, Custom range
              - Load all items within date range (may need higher first limit)
```

**Data flow:**

```
DateRangeSelector (state: {from, to})
    |
    v
ThreatNewsPage (passes published_after, published_before to API)
    |
    v
GET /api/threat-news?published_after=2026-03-21&published_before=2026-03-28
    |
    v
ThreatNewsService -> OpenCTI GraphQL with date FilterGroup
```

**API module change** (`threat-news.js`):

```js
export function fetchThreatNews({ after, search, label, published_after, published_before, sort, order } = {}) {
    const params = new URLSearchParams();
    if (published_after) params.set('published_after', published_after);
    if (published_before) params.set('published_before', published_before);
    // ... existing params
}
```

### 4. Threat News: Category Distribution Time-Series Chart

**New endpoint:** `GET /api/threat-news/chart?days=30`

Returns daily category counts for a time-series chart.

**Backend: New method on ThreatNewsService**

```php
public function categoryTimeSeries(int $days = 30): array
{
    // Fetch reports from last N days with labels
    // Group by day + label
    // Return: { dates: [...], series: { "Malware": [...], "Phishing": [...] } }
}
```

**GraphQL approach:**
1. Query reports with `published` filter (gt: N days ago), fetch `first: 500` with `objectLabel`
2. Server-side aggregation: bucket by date, count labels per bucket
3. Cache for 5 min (same as news)

**Response shape:**

```json
{
    "dates": ["2026-03-01", "2026-03-02", "..."],
    "series": [
        { "label": "Malware", "data": [5, 3, 8, ...] },
        { "label": "Phishing", "data": [2, 1, 4, ...] }
    ]
}
```

**Frontend: Time-series chart in ThreatNewsPage**

Use existing `useChartJs` hook with Chart.js line chart:

```js
const chartConfig = {
    type: 'line',
    data: {
        labels: dates,
        datasets: series.map(s => ({
            label: s.label,
            data: s.data,
            borderColor: categoryColor(s.label),
            fill: false,
            tension: 0.3,
        })),
    },
};
```

Place above the report list, below the toolbar. Collapsible panel recommended (glass-card with toggle).

### 5. Threat News: Auto-Refresh

**Pattern:** 5-minute interval refresh using a reusable hook.

**New hook: `useAutoRefresh.js`**

```js
export function useAutoRefresh(callback, intervalMs = 300000) {
    useEffect(() => {
        // Skip when tab is hidden (save resources)
        let timer = null;

        function tick() {
            if (!document.hidden) callback();
        }

        timer = setInterval(tick, intervalMs);
        return () => clearInterval(timer);
    }, [callback, intervalMs]);
}
```

**Integration in ThreatNewsPage:**

```js
useAutoRefresh(loadData, 5 * 60 * 1000);
```

**Note:** Dashboard already has auto-refresh (lines 431-444 of DashboardPage.jsx). The new hook extracts this pattern for reuse across ThreatNews and ThreatActors pages.

### 6. Threat Actors: Enriched Modal

**Current GraphQL query fields per actor:**
- id, name, description, aliases, primary_motivation, resource_level, modified, goals
- targetedCountries (via stixCoreRelationships targets -> Country)
- targetedSectors (via stixCoreRelationships targets -> Sector)
- externalReferences

**New fields needed for enriched modal:**

```graphql
# TTPs (Attack Patterns used by this actor)
usedTTPs: stixCoreRelationships(
    relationship_type: "uses"
    toTypes: ["Attack-Pattern"]
    first: 20
) {
    edges {
        node {
            to {
                ... on AttackPattern {
                    id
                    name
                    x_mitre_id
                }
            }
        }
    }
}

# Tools used
usedTools: stixCoreRelationships(
    relationship_type: "uses"
    toTypes: ["Tool"]
    first: 20
) {
    edges {
        node {
            to {
                ... on Tool {
                    id
                    name
                }
            }
        }
    }
}

# Campaigns
campaigns: stixCoreRelationships(
    relationship_type: "attributed-to"
    fromTypes: ["Campaign"]
    first: 10
) {
    edges {
        node {
            from {
                ... on Campaign {
                    id
                    name
                    first_seen
                    last_seen
                }
            }
        }
    }
}
```

**Architecture decision: Fetch-on-open vs Batch-in-list**

Two approaches:
1. **Batch-in-list:** Add TTPs/tools/campaigns to the existing list query (all actors in one request)
2. **Fetch-on-open:** Load enriched data when modal opens via separate API call

**Recommendation: Fetch-on-open** because:
- List query already includes relationships (countries, sectors, refs) -- adding TTPs/tools/campaigns per actor multiplies response size significantly (24 actors x 20 TTPs + 20 tools + 10 campaigns = enormous query)
- Most users click 1-3 modals, not all 24
- Modal can show a loading skeleton for 200-300ms while enrichment loads

**New endpoint:** `GET /api/threat-actors/{id}`

```php
// ThreatActorService::getDetail(string $id): array
// New method with enriched GraphQL query for a single actor
// Cache for 15 min per actor ID
```

**Frontend flow:**

```
User clicks actor card
  -> ThreatActorModal opens with basic data (already in list)
  -> useEffect fires GET /api/threat-actors/{actor.id}
  -> Modal enriches with TTPs, tools, campaigns (skeleton -> content)
```

**Frontend API addition** (`threat-actors.js`):

```js
export function fetchThreatActorDetail(id) {
    return apiClient.get(`/api/threat-actors/${encodeURIComponent(id)}`);
}
```

### 7. Threat Actors: Auto-Refresh

Same pattern as Threat News. Use `useAutoRefresh` hook:

```js
useAutoRefresh(loadData, 5 * 60 * 1000);
```

### 8. Settings/Profile Page Rewrite

**Current state:** Entirely mock data. Tabs: API Keys (mock), Webhooks (mock), Usage (random chart), Account (hardcoded "Acme Corp", "john.doe@acme.com").

**New state:** Two meaningful tabs -- Profile and Account.

**Tab structure:**

| Tab | Content | Data Source |
|-----|---------|-------------|
| Profile | Name, email (read-only), phone, timezone, organization, role, avatar | AuthContext user data |
| Account | Current plan + credits summary, change password, danger zone (future) | AuthContext + /api/credits |

**Profile tab -- editable fields:**

```
Name         [text input, pre-filled from user.name]
Email        [read-only, from user.email]
Phone        [PhoneNumberInput component, from user.phone]
Timezone     [SearchableDropdown, from user.timezone]
Organization [text input, from user.organization]
Role         [SimpleDropdown, from user.role]

[Save Changes] button -> PUT /api/profile
```

**New backend endpoint:** `PUT /api/profile`

```php
// app/Http/Controllers/Auth/ProfileController.php
class ProfileController extends Controller
{
    public function __invoke(Request $request): UserResource
    {
        $validated = $request->validate([
            'name'         => ['required', 'string', 'min:2', 'max:255'],
            'phone'        => ['nullable', 'string', 'min:5', 'max:20'],
            'timezone'     => ['nullable', 'string', 'timezone:all'],
            'organization' => ['nullable', 'string', 'max:255'],
            'role'         => ['nullable', 'string', Rule::in([...])],
        ]);

        $request->user()->update($validated);

        return new UserResource($request->user()->fresh());
    }
}
```

**Route:** Inside `auth:sanctum` group: `Route::put('/profile', ProfileController::class);`

**Account tab -- password change:**

Only for non-OAuth users (user.password is not null). OAuth users see "Managed by [Google/GitHub]" message.

**New backend endpoint:** `PUT /api/password`

```php
class PasswordController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password'         => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $request->user()->update([
            'password' => Hash::make($validated['password']),
        ]);

        return response()->json(['message' => 'Password updated']);
    }
}
```

**Frontend data flow:**

```
SettingsPage
  |-- useAuth() -> user data for Profile tab
  |-- useState for form fields (initialized from user)
  |-- handleSave -> apiClient.put('/api/profile', formData)
  |-- on success -> refreshUser() to update AuthContext
  |
  |-- Account tab
  |     |-- Credits display from /api/credits (or inline from AuthContext)
  |     |-- Plan name from user.plan
  |     |-- Password change form (conditionally rendered for non-OAuth)
  |     |-- handlePasswordChange -> apiClient.put('/api/password', passwordData)
```

**Reusable components already available:**
- `PhoneNumberInput` (from GetStartedPage)
- `SearchableDropdown` (from GetStartedPage)
- `SimpleDropdown` (from GetStartedPage)
- `CreditBadge` (from shared components)

These should be extracted to `components/shared/` if not already there.

### 9. Threat Search Bug Fixes

Three bugs identified:

**a) Relation graph node positioning bug**
- D3 force simulation in `D3Graph` component (ThreatSearchPage.jsx)
- Nodes likely cluster or overlap due to force parameters
- Fix: Adjust `forceCollide`, `forceManyBody` strength, `forceCenter` positioning

**b) Search loader**
- Currently no proper loading state during search API call
- Fix: Add loading spinner/skeleton during `searchThreat()` execution

**c) Search bar z-index when logged out**
- The search bar in the topbar or page may be behind other elements for unauthenticated users
- Fix: Adjust z-index on the search container, likely in ThreatSearchPage or Topbar

These are CSS/component-level fixes, no architecture changes needed.

---

## Reusable Hook: useAutoRefresh

Extract from existing DashboardPage pattern:

```js
// hooks/useAutoRefresh.js
import { useEffect, useRef } from 'react';

export function useAutoRefresh(callback, intervalMs = 300000) {
    const callbackRef = useRef(callback);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        const timer = setInterval(() => {
            if (!document.hidden) {
                callbackRef.current();
            }
        }, intervalMs);

        return () => clearInterval(timer);
    }, [intervalMs]);
}
```

**Usage locations:**
1. ThreatNewsPage -- refresh reports every 5 min
2. ThreatActorsPage -- refresh actors every 5 min
3. DashboardPage -- refactor existing setInterval to use this hook

---

## Component Boundaries Summary

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `useAutoRefresh` hook | Manage periodic data refresh with visibility awareness | Any page's loadData callback |
| `DateRangeSelector` component | Date picker UI for filtering by date range | ThreatNewsPage state |
| `ThreatNewsService` (modified) | Date-filtered report listing + time-series aggregation | OpenCTI GraphQL, Cache |
| `ThreatActorService` (modified) | Enriched actor detail endpoint | OpenCTI GraphQL, Cache |
| `ProfileController` (new) | Update user profile fields | User model |
| `PasswordController` (new) | Change user password | User model, Hash |
| `SettingsPage` (rewritten) | Profile editing + account management | AuthContext, /api/profile, /api/password, /api/credits |
| `DashboardService` (modified) | Expanded entity type counts (4 -> 7) | OpenCTI GraphQL, Cache |
| `ThreatNewsChartController` (new) | Serve time-series category data | ThreatNewsService |

---

## New API Routes

```php
// Public (no auth required)
// None new

// Inside auth:sanctum group
Route::put('/profile', ProfileController::class);
Route::put('/password', PasswordController::class);
Route::get('/threat-actors/{id}', ThreatActorDetailController::class);
Route::get('/threat-news/chart', ThreatNewsChartController::class);
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client-Side Date Filtering

**What:** Fetch all reports, then filter by date in JavaScript.
**Why bad:** OpenCTI may have thousands of reports. Transferring all to filter client-side wastes bandwidth and memory. The 5-min server cache becomes useless since each date range is unique.
**Instead:** Pass date range to backend, let OpenCTI filter via GraphQL FilterGroup, cache per param hash (existing pattern).

### Anti-Pattern 2: Batch-Loading All Enrichment in Actor List

**What:** Adding TTPs, tools, campaigns to the actors list query for all 24 actors.
**Why bad:** Multiplies GraphQL payload (24 actors x 50+ relationships each). Response time increases from ~500ms to potentially 5+ seconds. Most modal data is never viewed.
**Instead:** Fetch-on-open pattern. Load enriched data for a single actor when the modal opens. Show skeleton in modal for 200-300ms.

### Anti-Pattern 3: Separate SSE Stream for Auto-Refresh

**What:** Using Server-Sent Events for Threat News and Threat Actors auto-refresh.
**Why bad:** SSE is justified for Threat Map (truly real-time, continuous events). News and actors update infrequently (hourly at most). SSE connections consume server resources and have 5-min lifetime limits already imposed.
**Instead:** Simple `setInterval` polling every 5 minutes. The server-side cache (5 min for news) means most polls return cached data instantly.

### Anti-Pattern 4: Building Full Settings Infrastructure

**What:** API Keys, Webhooks, Usage analytics, 2FA toggle -- features that don't exist on the backend.
**Why bad:** Current SettingsPage has mock API keys and webhooks that are purely decorative. Building backend infrastructure for features with zero demand is premature.
**Instead:** Profile + Account tabs only. Remove mock API Keys, Webhooks, and Usage tabs entirely. Add them back when backend support exists.

### Anti-Pattern 5: Client-Side Time-Series Aggregation

**What:** Fetching all reports with dates, then bucketing by day in JavaScript.
**Why bad:** Same as client-side date filtering -- requires transferring potentially thousands of records. Aggregation is compute-intensive in the browser.
**Instead:** Server-side aggregation in `ThreatNewsService::categoryTimeSeries()`. Cache the result. Send only the aggregated dates + counts to the frontend.

---

## Modified Files Inventory

### Backend -- Modified

| File | Change | Risk |
|------|--------|------|
| `app/Services/DashboardService.php` | Add 3 entity types to `fetchCounts()`, batch into single aliased query | LOW |
| `app/Services/ThreatNewsService.php` | Add `publishedAfter`/`publishedBefore` params, add `categoryTimeSeries()` | MEDIUM |
| `app/Services/ThreatActorService.php` | Add `getDetail()` method with enriched GraphQL | LOW |
| `app/Http/Controllers/ThreatNews/IndexController.php` | Accept date range query params | LOW |
| `routes/api.php` | Add PUT /profile, PUT /password, GET /threat-actors/{id}, GET /threat-news/chart | LOW |

### Backend -- New

| File | Purpose |
|------|---------|
| `app/Http/Controllers/Auth/ProfileController.php` | Update user profile (PUT /api/profile) |
| `app/Http/Controllers/Auth/PasswordController.php` | Change password (PUT /api/password) |
| `app/Http/Controllers/ThreatActor/DetailController.php` | Single actor enriched detail |
| `app/Http/Controllers/ThreatNews/ChartController.php` | Time-series category chart data |

### Frontend -- Modified

| File | Change | Risk |
|------|--------|------|
| `src/pages/DashboardPage.jsx` | Expand stat cards to 7, add "Threat Database" heading, remove Live dots | LOW |
| `src/pages/ThreatNewsPage.jsx` | Add date range selector, category chart, auto-refresh, remove pagination | MEDIUM |
| `src/pages/ThreatActorsPage.jsx` | Add auto-refresh, enrich modal with fetch-on-open detail | LOW |
| `src/pages/ThreatMapPage.jsx` | Label change only ("100 Latest Attacks") | LOW |
| `src/pages/SettingsPage.jsx` | Full rewrite: real user data, Profile + Account tabs | HIGH (complete rewrite) |
| `src/pages/ThreatSearchPage.jsx` | Bug fixes (D3 nodes, loader, z-index) | LOW |
| `src/api/threat-news.js` | Add date range params, chart fetch function | LOW |
| `src/api/threat-actors.js` | Add `fetchThreatActorDetail(id)` | LOW |
| `src/components/threat-map/ThreatMapCounters.jsx` | Label text change | LOW |

### Frontend -- New

| File | Purpose |
|------|---------|
| `src/hooks/useAutoRefresh.js` | Reusable interval refresh hook with visibility pause |
| `src/api/profile.js` | `updateProfile()` and `changePassword()` API functions |
| `src/components/shared/DateRangeSelector.jsx` | Date range picker with presets |

---

## Suggested Build Order

Ordered by dependencies: backend endpoints first, then frontend consumers. Independent features in parallel where possible.

```
Phase 1: Simple Backend Changes (no new endpoints, low risk)
  1. DashboardService: expand entity types to 7, batch aliased query
  2. DashboardPage: expand stat cards, add heading, remove Live dots
  3. ThreatMapCounters: label change to "100 Latest Attacks"
  => Quick wins, testable immediately

Phase 2: Auto-Refresh Hook + Integration (reusable pattern)
  4. Create useAutoRefresh hook
  5. Integrate into ThreatNewsPage
  6. Integrate into ThreatActorsPage
  7. Refactor DashboardPage to use the hook
  => Pattern established, 3 pages improved

Phase 3: Date-Based Filtering for Threat News (backend + frontend)
  8. ThreatNewsService: add date range params to list()
  9. ThreatNewsController: accept published_after, published_before
  10. Frontend: DateRangeSelector component
  11. ThreatNewsPage: integrate date selector, replace pagination
  => News page date filtering complete

Phase 4: Threat News Category Chart (depends on Phase 3 backend pattern)
  12. ThreatNewsService: add categoryTimeSeries() method
  13. ThreatNewsChartController: new endpoint
  14. ThreatNewsPage: add time-series chart component
  => News page fully enhanced

Phase 5: Enriched Threat Actor Modal (independent, parallel-safe with Phase 3-4)
  15. ThreatActorService: add getDetail() with enriched GraphQL
  16. ThreatActorDetailController: new endpoint
  17. Frontend: fetchThreatActorDetail(id) API function
  18. ThreatActorModal: fetch-on-open enrichment with loading skeleton
  => Actor modals enriched with TTPs, tools, campaigns

Phase 6: Settings/Profile Page (independent, parallel-safe)
  19. ProfileController: PUT /api/profile endpoint
  20. PasswordController: PUT /api/password endpoint
  21. Frontend: api/profile.js module
  22. SettingsPage: full rewrite with Profile + Account tabs
  => Settings page functional with real data

Phase 7: Threat Search Bug Fixes (independent, any time)
  23. D3 force simulation parameter tuning
  24. Search loading state during API call
  25. Z-index fix for logged-out search bar
  => Bug fixes complete
```

**Why this order:**
- Phase 1 is pure config changes with zero risk, delivers visible progress
- Phase 2 creates the reusable hook before needing it in Phases 3-5
- Phases 3-4 are sequential (chart depends on backend date filtering pattern)
- Phases 5, 6, 7 are independent and can be parallelized with Phases 3-4
- Settings page (Phase 6) has no dependencies on other features
- Bug fixes (Phase 7) are isolated and can be done anytime

---

## Scalability Considerations

| Concern | Current (100 users) | At 10K users | At 100K users |
|---------|---------------------|--------------|---------------|
| Dashboard counts (7 queries) | Batch into 1 aliased query, 5-min cache | Same | Same (cached) |
| Time-series aggregation | Server-side, 500 reports, 5-min cache | Same | Increase cache TTL to 15 min |
| Enriched actor detail | Per-actor cache, 15 min | Same | Same (read-heavy, cache effective) |
| Auto-refresh polling | 5 min interval, cache absorbs | Same | Same (cache hit rate > 99%) |
| Profile updates | Direct DB update | Same | Same (rare operation) |
| Date-range news queries | Cache per param hash | Cache may fragment heavily | Consider LRU eviction, limit date ranges |

---

## Sources

- Direct codebase analysis: `backend/app/Services/DashboardService.php` (current counts query pattern)
- Direct codebase analysis: `backend/app/Services/ThreatNewsService.php` (current filtering, GraphQL FilterGroup pattern)
- Direct codebase analysis: `backend/app/Services/ThreatActorService.php` (current GraphQL relationships pattern)
- Direct codebase analysis: `backend/app/Services/ThreatMapService.php` (snapshot already caps at 100)
- Direct codebase analysis: `frontend/src/pages/DashboardPage.jsx` (existing auto-refresh pattern, stat cards)
- Direct codebase analysis: `frontend/src/pages/ThreatNewsPage.jsx` (current filtering, pagination)
- Direct codebase analysis: `frontend/src/pages/ThreatActorsPage.jsx` (current modal, data loading)
- Direct codebase analysis: `frontend/src/pages/SettingsPage.jsx` (mock data to replace)
- Direct codebase analysis: `frontend/src/contexts/AuthContext.jsx` (user data shape)
- Direct codebase analysis: `backend/routes/api.php` (current route structure)
- Direct codebase analysis: `frontend/src/hooks/useThreatStream.js` (visibility-aware pattern)
- OpenCTI GraphQL FilterGroup pattern verified from existing service implementations (HIGH confidence)
- All recommendations build on verified patterns in the existing codebase (HIGH confidence)
