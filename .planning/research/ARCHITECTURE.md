# Architecture Patterns

**Domain:** Threat Intelligence Platform -- Universal Search & UI Refresh
**Researched:** 2026-03-17
**Confidence:** HIGH (based on existing codebase analysis + OpenCTI GraphQL documentation)

## Current Architecture Snapshot

```
Frontend (React 19 + Vite 7)               Backend (Laravel 12)
------------------------------              --------------------------------
IpSearchPage.jsx                            POST /api/ip-search
  -> api/ip-search.js                         -> IpSearchRequest (validates IP)
  -> searchIpAddress({ query })               -> deduct-credit middleware
                                              -> IpSearchService.search()
                                                -> OpenCtiService.query() [GraphQL]
                                                -> ip-api.com [geo enrichment]
                                              -> SearchLog::create()

ThreatActorsPage.jsx                        GET /api/threat-actors
  -> api/threat-actors.js                     -> ThreatActorService.list()
  -> fetchThreatActors(params)                  -> OpenCtiService.query() [GraphQL]
                                                -> Cache::remember(15min)

ThreatNewsPage.jsx                          GET /api/threat-news
  -> api/threat-news.js                       -> ThreatNewsService.list()
  -> fetchThreatNews(params)                    -> OpenCtiService.query() [GraphQL]
                                                -> Cache::remember(5min)
```

**Key observations:**
- `OpenCtiService` is a thin GraphQL client (Bearer auth, 15s timeout, 2x retry)
- Each domain has its own Service class holding GraphQL queries + normalization
- IP Search is credit-gated; Threat Actors and News are not (browse pages)
- IP Search validates input as strict IP address (`'ip'` rule in FormRequest)
- Frontend API layer is thin wrappers around `apiClient.post/get`

## Recommended Architecture for v2.1

### Decision: One Unified Search Endpoint

**Recommendation:** Single `POST /api/threat-search` endpoint replacing `POST /api/ip-search`.

**Why unified over type-specific:**

| Factor | Unified Endpoint | Type-Specific Endpoints |
|--------|-----------------|------------------------|
| Frontend complexity | One API call, route switch | Multiple endpoints, frontend must pick |
| Backend routing | One controller, one service | 8+ controllers for each observable type |
| Credit gating | Single middleware attachment | Duplicate middleware on each route |
| Validation | One FormRequest with type-aware rules | Separate FormRequests per type |
| Caching | Single cache key strategy | Fragmented cache management |
| OpenCTI query | Same `stixCyberObservables` query, just different `entity_type` filter | Same query duplicated across services |

The OpenCTI `stixCyberObservables` GraphQL query already accepts `entity_type` as a filter. The existing `IpSearchService.queryObservable()` already filters by `['IPv4-Addr', 'IPv6-Addr']`. Expanding this to accept any observable type is a parameter change, not an architecture change.

### Component Boundaries

| Component | Responsibility | Status | Communicates With |
|-----------|---------------|--------|-------------------|
| `ThreatSearchService` | Query OpenCTI for any observable type, normalize results | **NEW** (replaces `IpSearchService`) | `OpenCtiService`, ip-api.com |
| `ThreatSearchRequest` | Validate query + type parameter | **NEW** (replaces `IpSearchRequest`) | Laravel validation |
| `ThreatSearchController` | Handle HTTP, credit refund, search logging | **NEW** (replaces `IpSearch\SearchController`) | `ThreatSearchService`, `SearchLog` |
| `OpenCtiService` | Execute raw GraphQL queries | **UNCHANGED** | OpenCTI instance |
| `ThreatActorService` | List intrusion sets | **UNCHANGED** | `OpenCtiService` |
| `ThreatNewsService` | List reports | **UNCHANGED** | `OpenCtiService` |
| `ThreatSearchPage.jsx` | Universal search UI with type selector | **NEW** (replaces `IpSearchPage.jsx`) | `api/threat-search.js` |
| `ThreatActorsPage.jsx` | Browse threat actors (UI refresh) | **MODIFIED** (layout changes only) | `api/threat-actors.js` |
| `ThreatNewsPage.jsx` | Browse threat news (UI refresh) | **MODIFIED** (layout changes only) | `api/threat-news.js` |

### Data Flow: Universal Threat Search

```
User enters "185.220.101.34" with type "Auto-detect"
  |
  v
ThreatSearchPage.jsx
  -> POST /api/threat-search { query: "185.220.101.34", type: "auto" }
  |
  v
ThreatSearchRequest (validation)
  -> type: required, in:[auto,ipv4,ipv6,domain,url,email,file-md5,file-sha1,file-sha256]
  -> query: required, string, max:512
  -> type-conditional validation (if type=ipv4, validate IP; if type=auto, detect)
  |
  v
deduct-credit middleware
  |
  v
ThreatSearchController
  -> ThreatSearchService.search(query, type)
     |
     +--> detectType(query) if type=auto
     |      -> regex patterns: IP, domain, URL, email, hash lengths
     |
     +--> resolveEntityTypes(type)
     |      -> 'ipv4' => ['IPv4-Addr']
     |      -> 'ipv6' => ['IPv6-Addr']
     |      -> 'domain' => ['Domain-Name']
     |      -> 'url' => ['Url']
     |      -> 'email' => ['Email-Addr']
     |      -> 'file-md5' => ['StixFile']  (filter by hashes.MD5)
     |      -> 'file-sha1' => ['StixFile'] (filter by hashes.SHA-1)
     |      -> 'file-sha256' => ['StixFile'] (filter by hashes.SHA-256)
     |      -> 'auto' => detected types
     |
     +--> queryObservable(query, entityTypes)
     |      -> Same stixCyberObservables GraphQL query
     |      -> entity_type filter uses resolved types
     |
     +--> enrichResult(observable, detectedType)
     |      -> IP types: geo enrichment via ip-api.com
     |      -> Domain: WHOIS-like data (future, not v2.1)
     |      -> Others: no enrichment needed
     |
     +--> queryRelationships(observableId)  [existing logic, unchanged]
     +--> queryIndicators(observableId)     [existing logic, unchanged]
     +--> querySightings(observableId)      [existing logic, unchanged]
     +--> queryNotes(observableId)          [existing logic, unchanged]
     |
     +--> buildResponse(...)
            -> Polymorphic: includes type-specific fields
            -> Always includes: observable_type, query, found, score, labels,
               relationships, indicators, sightings, notes, external_references
            -> Conditionally includes: geo (IP only)
  |
  v
Response JSON -> ThreatSearchPage.jsx renders type-appropriate UI
```

### Observable Type Registry

Define a single source of truth for supported types. Backend validation, frontend type selector, and auto-detection all reference this registry.

**Backend: `ThreatSearchService::OBSERVABLE_TYPES`**

```php
private const OBSERVABLE_TYPES = [
    'ipv4'        => ['entity_types' => ['IPv4-Addr'],    'label' => 'IPv4 Address',   'enrichable' => true],
    'ipv6'        => ['entity_types' => ['IPv6-Addr'],    'label' => 'IPv6 Address',   'enrichable' => true],
    'domain'      => ['entity_types' => ['Domain-Name'],  'label' => 'Domain Name',    'enrichable' => false],
    'url'         => ['entity_types' => ['Url'],          'label' => 'URL',            'enrichable' => false],
    'email'       => ['entity_types' => ['Email-Addr'],   'label' => 'Email Address',  'enrichable' => false],
    'file-md5'    => ['entity_types' => ['StixFile'],     'label' => 'File (MD5)',     'enrichable' => false],
    'file-sha1'   => ['entity_types' => ['StixFile'],     'label' => 'File (SHA-1)',   'enrichable' => false],
    'file-sha256' => ['entity_types' => ['StixFile'],     'label' => 'File (SHA-256)', 'enrichable' => false],
];
```

**Frontend: `SEARCH_TYPES` constant**

```javascript
export const SEARCH_TYPES = [
  { value: 'auto',        label: 'Auto-detect',    placeholder: 'Enter IP, domain, URL, email, or file hash...' },
  { value: 'ipv4',        label: 'IPv4 Address',   placeholder: 'e.g. 185.220.101.34' },
  { value: 'ipv6',        label: 'IPv6 Address',   placeholder: 'e.g. 2001:db8::1' },
  { value: 'domain',      label: 'Domain Name',    placeholder: 'e.g. evil-domain.com' },
  { value: 'url',         label: 'URL',            placeholder: 'e.g. https://malicious.site/payload' },
  { value: 'email',       label: 'Email Address',  placeholder: 'e.g. attacker@phishing.com' },
  { value: 'file-md5',    label: 'File (MD5)',     placeholder: 'e.g. d41d8cd98f00b204e9800998ecf8427e' },
  { value: 'file-sha1',   label: 'File (SHA-1)',   placeholder: 'e.g. da39a3ee5e6b4b0d3255bfef95601890afd80709' },
  { value: 'file-sha256', label: 'File (SHA-256)', placeholder: 'e.g. e3b0c44298fc1c149afbf4c8996fb924...' },
];
```

### Auto-Detection Logic

```php
private function detectType(string $query): string
{
    // IPv4
    if (filter_var($query, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
        return 'ipv4';
    }
    // IPv6
    if (filter_var($query, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
        return 'ipv6';
    }
    // URL (must check before domain since URLs contain domains)
    if (filter_var($query, FILTER_VALIDATE_URL)) {
        return 'url';
    }
    // Email
    if (filter_var($query, FILTER_VALIDATE_EMAIL)) {
        return 'email';
    }
    // File hashes by length
    if (preg_match('/^[a-fA-F0-9]{32}$/', $query)) {
        return 'file-md5';
    }
    if (preg_match('/^[a-fA-F0-9]{40}$/', $query)) {
        return 'file-sha1';
    }
    if (preg_match('/^[a-fA-F0-9]{64}$/', $query)) {
        return 'file-sha256';
    }
    // Domain (fallback: contains dot, no spaces)
    if (preg_match('/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/', $query)) {
        return 'domain';
    }

    return 'domain'; // safe fallback -- OpenCTI will return empty if not found
}
```

### File Hash Search: Special GraphQL Handling

File observables in OpenCTI use `StixFile` entity type with nested hash fields. The GraphQL filter for hashes differs from the value-based filter used for other observables.

```php
// For non-file types:
'filters' => [
    ['key' => 'value', 'values' => [$query], 'operator' => 'eq', 'mode' => 'or'],
    ['key' => 'entity_type', 'values' => $entityTypes, 'operator' => 'eq', 'mode' => 'or'],
]

// For file hash types:
'filters' => [
    ['key' => 'hashes.MD5', 'values' => [$query], 'operator' => 'eq', 'mode' => 'or'],
    ['key' => 'entity_type', 'values' => ['StixFile'], 'operator' => 'eq', 'mode' => 'or'],
]
// (Replace 'hashes.MD5' with 'hashes.SHA-1' or 'hashes.SHA-256' accordingly)
```

**Confidence: MEDIUM** -- Hash filter key syntax (`hashes.MD5` vs `hashes_MD5`) must be verified against the live OpenCTI GraphQL playground. The exact key format varies between OpenCTI versions.

## Frontend Architecture: Result Type Rendering

### Strategy: Polymorphic Result Card with Type-Specific Sections

The search results page should use a single `ThreatSearchPage.jsx` that renders type-appropriate content based on `result.observable_type` from the API response.

**Do NOT create separate result pages per type.** The result structure from OpenCTI is 90% identical across observable types (score, labels, relationships, indicators, sightings, notes, external references). Only the "summary" tab differs.

```
ThreatSearchPage.jsx
  |
  +-- SearchHeader (type selector dropdown + query input + credit badge)
  |     -> Type dropdown changes placeholder text
  |     -> Submit calls POST /api/threat-search { query, type }
  |
  +-- ResultSummaryCard (score ring, threat level, stats)
  |     -> Same component for all types
  |     -> Shows observable_type badge
  |
  +-- TabBar (dynamic tabs based on result data, same as current)
  |
  +-- Tab: Summary
  |     +-- SummaryTab (existing, works for all types)
  |     +-- GeoSection (conditional: only for IP types)
  |           -> Renders geo enrichment data
  |           -> Hidden for non-IP results
  |
  +-- Tab: Relations -> D3Graph (existing, works for all types)
  +-- Tab: External Refs -> ExternalRefsTab (existing)
  +-- Tab: Indicators -> IndicatorsTab (existing)
  +-- Tab: Sightings -> SightingsTab (existing)
  +-- Tab: Notes -> NotesTab (existing)
  +-- Tab: Raw -> RawTab (existing)
```

**Key insight:** The existing tab components (`D3Graph`, `IndicatorsTab`, `SightingsTab`, `NotesTab`, `ExternalRefsTab`, `RawTab`) from `IpSearchPage.jsx` already work with any observable type because they consume normalized relationship/indicator/sighting data structures -- not IP-specific data. They can be extracted to shared components and reused directly.

### Component Extraction Plan

The current `IpSearchPage.jsx` (697 lines) is a monolith with all tab components inline. The refactor should extract reusable pieces.

```
frontend/src/
  components/
    threat-search/
      SearchHeader.jsx         -- NEW: type selector + query input + credit badge
      ResultSummaryCard.jsx    -- EXTRACTED from IpSearchPage: score ring + stats
      GeoSection.jsx           -- EXTRACTED from IpSearchPage: geo enrichment display
      D3Graph.jsx              -- EXTRACTED from IpSearchPage: force-directed graph
      IndicatorsTab.jsx        -- EXTRACTED from IpSearchPage
      SightingsTab.jsx         -- EXTRACTED from IpSearchPage
      NotesTab.jsx             -- EXTRACTED from IpSearchPage
      ExternalRefsTab.jsx      -- EXTRACTED from IpSearchPage
      RawTab.jsx               -- EXTRACTED from IpSearchPage
  pages/
    ThreatSearchPage.jsx       -- NEW: replaces IpSearchPage.jsx, composes above
```

### Threat Actors UI Refresh: Scope of Changes

Per milestone requirements: "4-col grid, no descriptions, clean subheading."

**Current:** 3-col grid (`grid-cols-1 md:grid-cols-2 xl:grid-cols-3`), cards show description, aliases, countries, sectors, motivation.

**Target changes in ThreatActorsPage.jsx:**

| Change | Current | New |
|--------|---------|-----|
| Grid columns | 3-col max | 4-col max (`xl:grid-cols-4`) |
| Card description | Shown with `line-clamp-3` | Remove from card (keep in modal) |
| Page subheading | "Browse known threat actor profiles from OpenCTI" | Cleaner/shorter text |
| Card height | Variable due to descriptions | More uniform without descriptions |

**Files modified:** `ThreatActorsPage.jsx` only. The `ThreatActorCard` sub-component is in the same file.

**No backend changes needed** -- the API response already includes all data, the frontend just hides description from cards.

### Threat News UI Refresh: Scope of Changes

Per milestone requirements: "row-based layout, tags, pagination on top, no confidence."

**Current:** 3-col card grid, confidence badge on each card, pagination at bottom.

**Target changes in ThreatNewsPage.jsx:**

| Change | Current | New |
|--------|---------|-----|
| Layout | 3-col card grid | Row-based list (single column) |
| Confidence | Badge on card + filter dropdown | Remove from card display, remove filter |
| Pagination | Bottom only | Top AND bottom |
| Tags | Entity chips on cards | Keep entity chips, possibly add report_type tags |
| Card style | Square cards with description | Horizontal row cards, denser layout |

**Files modified:** `ThreatNewsPage.jsx` only. The `ReportCard` sub-component is in the same file and will become a `ReportRow` component.

**No backend changes needed** -- same reasoning as Threat Actors.

## Route Migration Strategy

### Backend Routes

```php
// REMOVE:
Route::post('/ip-search', SearchController::class)->middleware('deduct-credit');

// ADD:
Route::post('/threat-search', ThreatSearchController::class)->middleware('deduct-credit');

// KEEP (backward compat, optional -- redirect or alias):
Route::post('/ip-search', fn (Request $r) => redirect()->route('threat-search'));
```

**Recommendation:** Add the new route, keep the old route as a simple redirect for 1 release cycle. The only consumer is the SPA frontend, so this can be removed quickly.

### Frontend Routes

```jsx
// REMOVE:
<Route path="/ip-search" element={<IpSearchPage />} />

// ADD:
<Route path="/threat-search" element={<ThreatSearchPage />} />

// REDIRECT (for bookmarks):
<Route path="/ip-search" element={<Navigate to="/threat-search" replace />} />
```

### Navigation Updates

Update in `mock-data.js` NAV_ITEMS:
```javascript
// FROM:
{ label: 'IP Search', icon: 'search', href: '/ip-search', public: true }
// TO:
{ label: 'Threat Search', icon: 'search', href: '/threat-search', public: true }
```

Update in `Topbar.jsx` page title map:
```javascript
// FROM:
'/ip-search': 'IP Search'
// TO:
'/threat-search': 'Threat Search'
```

## Patterns to Follow

### Pattern 1: Type-Aware Validation (Backend)

**What:** Single FormRequest that validates differently based on the `type` parameter.
**When:** Universal search endpoint receives different observable types.

```php
class ThreatSearchRequest extends FormRequest
{
    public function rules(): array
    {
        $type = $this->input('type', 'auto');

        $rules = [
            'type' => ['required', 'string', Rule::in(array_merge(
                array_keys(ThreatSearchService::OBSERVABLE_TYPES),
                ['auto']
            ))],
            'query' => ['required', 'string', 'max:512'],
        ];

        // Type-specific validation
        if ($type === 'ipv4') {
            $rules['query'][] = 'ip';
        } elseif ($type === 'file-md5') {
            $rules['query'][] = 'regex:/^[a-fA-F0-9]{32}$/';
        } elseif ($type === 'file-sha1') {
            $rules['query'][] = 'regex:/^[a-fA-F0-9]{40}$/';
        } elseif ($type === 'file-sha256') {
            $rules['query'][] = 'regex:/^[a-fA-F0-9]{64}$/';
        }
        // 'auto' and others: accept any string, auto-detect handles it

        return $rules;
    }
}
```

### Pattern 2: Service Method Reuse via Composition

**What:** `ThreatSearchService` composes `OpenCtiService` the same way `IpSearchService` does, but parameterizes the entity type filter.
**When:** Building the new search service.

The relationship/indicator/sighting/notes queries from `IpSearchService` query by `observableId`, not by type. They can be copied verbatim into `ThreatSearchService` -- or better, the new service can extend or compose a shared base.

### Pattern 3: Conditional Geo Enrichment

**What:** Only call ip-api.com when the observable type is an IP address.
**When:** Building the unified search response.

```php
$geo = null;
if (in_array($detectedType, ['ipv4', 'ipv6'])) {
    $geo = $this->fetchGeoFromIpApi($query);
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Separate Search Page Per Observable Type

**What:** Creating `DomainSearchPage.jsx`, `HashSearchPage.jsx`, etc.
**Why bad:** 90% duplicated UI code. The tab system, result display, and credit logic are identical. Only the summary section varies slightly (geo for IPs, nothing special for others).
**Instead:** One `ThreatSearchPage.jsx` with conditional rendering for the summary tab's geo section.

### Anti-Pattern 2: Frontend Type Detection

**What:** Auto-detecting observable type in the frontend and sending to different endpoints.
**Why bad:** Validation and detection logic gets duplicated. The backend must validate anyway for security.
**Instead:** Send `type: "auto"` to the backend. Let the backend auto-detect and return `detected_type` in the response so the frontend can display it.

### Anti-Pattern 3: Modifying OpenCtiService for Type-Specific Logic

**What:** Adding observable-type-aware methods to `OpenCtiService`.
**Why bad:** `OpenCtiService` is intentionally a thin GraphQL client. Type-specific logic belongs in domain services.
**Instead:** Keep `OpenCtiService.query()` generic. Put all type-awareness in `ThreatSearchService`.

### Anti-Pattern 4: Breaking IpSearchPage.jsx Incrementally

**What:** Trying to modify `IpSearchPage.jsx` in-place to add type support.
**Why bad:** The 697-line monolith is hard to modify safely. Adding type logic to it makes it worse.
**Instead:** Create new `ThreatSearchPage.jsx` from extracted components + new search header. Delete `IpSearchPage.jsx` when the new page is done.

## Suggested Build Order

The build order considers dependencies between components and minimizes risk of breaking existing functionality.

### Phase 1: Backend -- New Search Service + Endpoint (no frontend changes)

1. **Create `ThreatSearchService`** -- copy + adapt from `IpSearchService`
   - Add type registry constant
   - Add auto-detection logic
   - Parameterize `queryObservable()` to accept entity types
   - Conditional geo enrichment
   - All relationship/indicator/sighting/notes queries carry over unchanged
2. **Create `ThreatSearchRequest`** -- type-aware validation
3. **Create `ThreatSearchController`** -- same pattern as `IpSearch\SearchController`
4. **Register route** `POST /api/threat-search` with `deduct-credit` middleware
5. **Keep old route** `POST /api/ip-search` working (backward compat)
6. **Test** -- verify IP search still works through new endpoint, test domain/hash/email types

**Why first:** Backend must exist before frontend can call it. Old frontend keeps working on old endpoint.

### Phase 2: Frontend -- Extract Components from IpSearchPage

1. **Extract** `D3Graph`, `IndicatorsTab`, `SightingsTab`, `NotesTab`, `ExternalRefsTab`, `RawTab`, `SummaryTab`, `GeoSection` into `components/threat-search/`
2. **Extract** helper functions (`threatLevel`, `scoreRingColor`, `formatDate`, `countryFlag`) into a shared utils file
3. **Verify** `IpSearchPage.jsx` still works using the extracted components (import from new locations)

**Why second:** De-risks the new page build. If extraction breaks something, old page is the canary.

### Phase 3: Frontend -- New ThreatSearchPage

1. **Create** `ThreatSearchPage.jsx` composing extracted components
2. **Create** `SearchHeader.jsx` with type selector dropdown
3. **Create** `api/threat-search.js` calling `POST /api/threat-search`
4. **Add route** `/threat-search` in `App.jsx`
5. **Add redirect** `/ip-search` -> `/threat-search`
6. **Update** NAV_ITEMS, Topbar title map, landing page CTAs
7. **Remove** old `IpSearchPage.jsx` and `api/ip-search.js`

**Why third:** Depends on both backend (Phase 1) and extracted components (Phase 2).

### Phase 4: UI Refresh -- Threat Actors

1. **Modify** `ThreatActorsPage.jsx`:
   - Change grid to 4 columns (`xl:grid-cols-4`)
   - Remove description from `ThreatActorCard`
   - Update page subheading
2. **No backend changes**

**Why fourth:** Independent of search work. Can be done in parallel with Phase 3 if desired.

### Phase 5: UI Refresh -- Threat News

1. **Modify** `ThreatNewsPage.jsx`:
   - Convert card grid to row-based list layout
   - Remove confidence badge from cards and confidence filter dropdown
   - Add pagination controls at top (duplicate existing `PaginationControls`)
   - Add report_type tags to row items
2. **No backend changes**

**Why fifth:** Independent of search work and threat actors refresh. Can be done in parallel with Phase 4.

### Phase 6: Cleanup

1. **Remove** old backend route `POST /api/ip-search` (if redirect was added)
2. **Remove** `IpSearchService.php`, `IpSearchRequest.php`, `IpSearch\SearchController.php`
3. **Update** `SearchLog` module column: `ip_search` -> `threat_search`
4. **Remove** old `api/ip-search.js`
5. **Update** any remaining references in CLAUDE.md, comments, etc.

## Scalability Considerations

| Concern | Current (v2.0) | v2.1 Impact | At Scale |
|---------|----------------|-------------|----------|
| OpenCTI query load | 1 observable type per search | Same -- one query, different filter | No change |
| Cache keys | `ip_search:{md5}` | `threat_search:{type}:{md5}` -- more granular | Fine, cache eviction handles it |
| Credit consumption | 1 credit per IP search | 1 credit per any search | Same model |
| Response size | IP results + geo | Same structure, geo conditional | No change |
| Frontend bundle | IpSearchPage (697 LOC monolith) | Smaller extracted components, tree-shakeable | Better |

## Integration Points Summary

| Integration | Type | Direction | Notes |
|-------------|------|-----------|-------|
| `ThreatSearchService` -> `OpenCtiService` | Service composition | Backend internal | Reuses existing `query()` method |
| `ThreatSearchService` -> ip-api.com | HTTP call | Backend -> external | Only for IP types, existing logic |
| `ThreatSearchController` -> `deduct-credit` middleware | Middleware | Backend internal | Same middleware, new route |
| `ThreatSearchPage` -> `api/threat-search.js` | API call | Frontend -> Backend | New API module |
| `App.jsx` routes -> `ThreatSearchPage` | Route | Frontend internal | Replace + redirect |
| `NAV_ITEMS` -> Sidebar | Data | Frontend internal | Label + href change |
| `Topbar` title map | Data | Frontend internal | Key change |
| Landing page CTAs | Links | Frontend internal | href change from `/ip-search` to `/threat-search` |

## Sources

- OpenCTI Data Model documentation: [https://docs.opencti.io/latest/usage/data-model/](https://docs.opencti.io/latest/usage/data-model/)
- OpenCTI GraphQL API reference: [https://docs.opencti.io/latest/reference/api/](https://docs.opencti.io/latest/reference/api/)
- OpenCTI GraphQL playground documentation: [https://docs.opencti.io/latest/development/api-usage/](https://docs.opencti.io/latest/development/api-usage/)
- OpenCTI Python client observable types: [https://github.com/OpenCTI-Platform/client-python/blob/master/pycti/entities/opencti_stix_cyber_observable.py](https://github.com/OpenCTI-Platform/client-python/blob/master/pycti/entities/opencti_stix_cyber_observable.py)
- Existing codebase analysis (all files referenced inline)
