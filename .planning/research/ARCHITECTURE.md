# Architecture Patterns

**Domain:** OpenCTI Integration into Existing Laravel Proxy + React SPA
**Researched:** 2026-03-14

## Recommended Architecture

**Decision: Laravel proxies ALL OpenCTI GraphQL calls. Frontend never talks to OpenCTI directly.**

Rationale:
1. **Security** -- The OpenCTI Bearer token is a secret. Exposing it to the browser means any user can extract it and query the OpenCTI instance directly, bypassing credit gating entirely. The token belongs in backend `.env`, period.
2. **Consistency** -- The existing Dark Web integration already follows the "Laravel proxy" pattern (`DarkWebProviderService` + controller + `deduct-credit` middleware). Using the same pattern for OpenCTI means zero new architectural concepts.
3. **Credit gating** -- The `DeductCredit` middleware operates at the Laravel route level. If the frontend called OpenCTI directly, credits could not be enforced.
4. **Data normalization** -- OpenCTI's GraphQL returns deeply nested edge/node structures. Transforming these in the backend keeps the frontend API contract clean and stable even if the OpenCTI schema changes.
5. **Network topology** -- OpenCTI is at `192.168.251.20:8080` (private network). The frontend runs in the user's browser and likely cannot reach this IP. Laravel on the server can.

### System Diagram

```
Browser (React SPA)
    |
    | fetch (same-origin cookies, XSRF)
    v
Laravel API (public)
    |--- /api/ip/search          POST  [deduct-credit]
    |--- /api/threat-actors      GET   [auth:sanctum]
    |--- /api/threat-map         GET   [auth:sanctum]
    |--- /api/threat-news        GET   [auth:sanctum]
    |
    | Http::withToken() (server-to-server, Bearer)
    v
OpenCTI GraphQL API (private: 192.168.251.20:8080/graphql)
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `OpenCtiService` | Single service class; sends GraphQL queries to OpenCTI, returns normalized arrays | OpenCTI GraphQL API |
| `IpSearch\SearchController` | Accepts IP query, calls `OpenCtiService::searchObservable()`, returns JSON | `OpenCtiService`, `DeductCredit` middleware |
| `ThreatActors\IndexController` | Paginated list of intrusion sets from OpenCTI | `OpenCtiService` |
| `ThreatMap\IndexController` | Returns location-enriched threat data for Leaflet markers | `OpenCtiService` |
| `ThreatNews\IndexController` | Paginated list of reports from OpenCTI | `OpenCtiService` |
| `DeductCredit` middleware | Pre-deducts credits, refunds on failure (existing, unchanged) | `credits` table |
| React `apiClient` | Calls Laravel endpoints, handles 429 rate limit responses (existing) | Laravel API |
| React page components | Render data from Laravel responses, show loading/error states | `apiClient` |

## Data Flow

### IP Search (credit-gated, guests + auth)

```
1. User types IP in search box, clicks Search
2. Frontend POST /api/ip/search { query: "185.220.101.34" }
   - Sends XSRF token + session cookie
3. DeductCredit middleware:
   - Resolves credit (by user_id or IP)
   - Lazy resets if new day
   - Atomic decrement, returns 429 if exhausted
4. IpSearchController:
   - Validates input (IpSearchRequest: required string, valid IOC format)
   - Calls OpenCtiService::searchObservable($query, $type)
5. OpenCtiService:
   - Builds GraphQL query with FilterGroup
   - POST to OpenCTI with Bearer token
   - Normalizes response (flattens edges/nodes)
   - Returns clean array
6. Controller:
   - Logs to search_logs
   - Returns { data: {...}, credits: { remaining, limit, resets_at } }
7. On failure (OpenCTI down):
   - Controller catches exception
   - Refunds credit via DB::increment (existing pattern from DarkWeb\SearchController)
   - Returns 502 with "No credit deducted" message
```

### Threat Actors / Threat Map / Threat News (auth-only, no credit cost)

```
1. User navigates to /threat-actors
2. Frontend GET /api/threat-actors?page=1
3. auth:sanctum middleware verifies session
4. ThreatActorsController:
   - Calls OpenCtiService::listIntrusionSets(page, limit)
5. OpenCtiService:
   - Sends GraphQL query for intrusionSets with pagination
   - Normalizes response
6. Controller returns paginated JSON
```

**Credit gating decision:** Only IP Search costs credits (it is the core search feature with rate limiting for guests). Threat Actors, Threat Map, and Threat News are browse/read features available to all authenticated users at no credit cost. This matches the existing pattern where `/ioc/search` costs credits but browsing pages does not.

## Backend Service Design

### Single OpenCtiService (not one per feature)

Create ONE service class that encapsulates all OpenCTI communication. This mirrors how `DarkWebProviderService` handles all dark web API calls.

```php
// app/Services/OpenCtiService.php

class OpenCtiService
{
    private string $baseUrl;
    private string $token;

    public function __construct()
    {
        $this->baseUrl = config('services.opencti.base_url');
        $this->token = config('services.opencti.token');
    }

    /**
     * IP Search: Query STIX Cyber Observables by value.
     */
    public function searchObservable(string $value, string $type): array
    {
        $query = <<<'GRAPHQL'
        query SearchObservables($filters: FilterGroup) {
            stixCyberObservables(filters: $filters, first: 25) {
                edges {
                    node {
                        id
                        entity_type
                        observable_value
                        x_opencti_score
                        x_opencti_description
                        created_at
                        objectLabel { id value color }
                        stixCoreRelationships(first: 20) {
                            edges {
                                node {
                                    relationship_type
                                    to {
                                        ... on IntrusionSet { name }
                                        ... on Malware { name }
                                    }
                                }
                            }
                        }
                        ... on IPv4Addr { value }
                        ... on IPv6Addr { value }
                        ... on DomainName { value }
                    }
                }
            }
        }
        GRAPHQL;

        $variables = [
            'filters' => [
                'mode' => 'and',
                'filters' => [
                    [
                        'key' => 'value',
                        'values' => [$value],
                        'operator' => 'eq',
                        'mode' => 'or',
                    ],
                ],
                'filterGroups' => [],
            ],
        ];

        $data = $this->execute($query, $variables);

        return $this->flattenEdges($data['stixCyberObservables'] ?? []);
    }

    /**
     * Threat Actors: List intrusion sets with cursor-based pagination.
     */
    public function listIntrusionSets(
        int $first = 25,
        ?string $after = null,
        ?string $search = null,
    ): array {
        // Query intrusionSets with edges/node pattern
        // Fields: id, name, description, aliases, first_seen, last_seen,
        //         objectLabel, externalReferences
        // Returns: { items: [...], pageInfo: { hasNextPage, endCursor, globalCount } }
    }

    /**
     * Threat News: List reports with cursor-based pagination.
     */
    public function listReports(int $first = 25, ?string $after = null): array
    {
        // Query reports ordered by published desc
        // Fields: id, name, description, published, report_types,
        //         createdBy { name }, objectLabel
        // Returns: { items: [...], pageInfo: { hasNextPage, endCursor, globalCount } }
    }

    /**
     * Threat Map: Get countries with associated threat counts.
     */
    public function getGeographicalThreats(): array
    {
        // Query locations filtered to entity_type: Country
        // Fields: id, name, latitude, longitude,
        //         stixCoreRelationships count for threat density
        // Returns: [{ name, lat, lng, threat_count }, ...]
    }

    /**
     * Execute a GraphQL query against OpenCTI.
     */
    private function execute(string $query, array $variables = []): array
    {
        $response = Http::withToken($this->token)
            ->timeout(15)
            ->retry(2, 500, fn (\Exception $e) => $e instanceof ConnectionException)
            ->post($this->baseUrl, [
                'query' => $query,
                'variables' => $variables,
            ]);

        $response->throw();

        $body = $response->json();

        if (!empty($body['errors'])) {
            throw new \RuntimeException(
                'OpenCTI GraphQL error: ' . ($body['errors'][0]['message'] ?? 'Unknown')
            );
        }

        return $body['data'] ?? [];
    }

    /**
     * Flatten GraphQL edges/node connection into a plain array.
     */
    private function flattenEdges(array $connection): array
    {
        return array_map(
            fn (array $edge) => $edge['node'],
            $connection['edges'] ?? []
        );
    }
}
```

### Config Addition

```php
// config/services.php -- add alongside existing 'dark_web' block:
'opencti' => [
    'base_url' => env('OPENCTI_URL', 'http://192.168.251.20:8080/graphql'),
    'token' => env('OPENCTI_TOKEN'),
],
```

### Controller Structure

Follow the existing single-action invokable controller pattern:

```
app/Http/Controllers/
    IpSearch/                    # Renamed from Ioc/
        SearchController.php     # POST /api/ip/search (modify existing)
    ThreatActors/                # NEW
        IndexController.php      # GET /api/threat-actors
    ThreatMap/                   # NEW
        IndexController.php      # GET /api/threat-map
    ThreatNews/                  # NEW
        IndexController.php      # GET /api/threat-news
```

### Route Structure

```php
// routes/api.php -- changes:

// REMOVE: Route::post('/ioc/search', SearchController::class)->middleware('deduct-credit');
// ADD:
Route::post('/ip/search', IpSearchController::class)->middleware('deduct-credit');

// ADD inside auth:sanctum group:
Route::middleware('auth:sanctum')->group(function () {
    // ... existing dark-web route ...

    Route::get('/threat-actors', ThreatActorsController::class);
    Route::get('/threat-map', ThreatMapController::class);
    Route::get('/threat-news', ThreatNewsController::class);
});
```

## Frontend API Layer

### New API Module

```
frontend/src/api/
    client.js       # Existing -- shared HTTP client
    dark-web.js     # Existing -- dark web + credits endpoints
    opencti.js      # NEW -- all OpenCTI-proxied endpoints
```

```javascript
// frontend/src/api/opencti.js

import { apiClient } from './client';

export function searchIp({ query }) {
  return apiClient.post('/api/ip/search', { query });
}

export function fetchThreatActors({ page = 1, search = '' } = {}) {
  const params = new URLSearchParams({ page, ...(search && { search }) });
  return apiClient.get(`/api/threat-actors?${params}`);
}

export function fetchThreatMap() {
  return apiClient.get('/api/threat-map');
}

export function fetchThreatNews({ page = 1 } = {}) {
  return apiClient.get(`/api/threat-news?page=${page}`);
}
```

### Frontend Page Changes

| Page | Current State | Change Required |
|------|---------------|-----------------|
| `IocSearchPage.jsx` (already renamed to `IpSearchPage.jsx` in imports) | Uses `MockThreatDataService` via POST `/api/ioc/search` | Wire to new POST `/api/ip/search`, handle real OpenCTI response shape, populate D3 graph with real relationships from `stixCoreRelationships` |
| `ThreatActorsPage.jsx` | Empty placeholder ("coming soon") | Full implementation: fetch from `/api/threat-actors`, render cards/table with intrusion set data (name, description, aliases, labels, first/last seen) |
| `ThreatMapPage.jsx` | Uses `THREAT_MAP_POINTS` mock data from `mock-data.js` | Replace mock markers with real geographical data from `/api/threat-map`, keep existing Leaflet setup and sidebar overlay UI |
| `ThreatNewsPage.jsx` | Empty placeholder ("coming soon") | Full implementation: fetch from `/api/threat-news`, render report cards with title, description, published date, author, labels |

## Patterns to Follow

### Pattern 1: Provider Service with Credit Refund

**What:** Controller wraps service call in try/catch; refunds credit on external API failure.
**When:** Any credit-gated endpoint that calls an external API.
**Why:** Already established in `DarkWeb\SearchController`. Users should not lose credits when OpenCTI is down.
**Source:** Existing `DarkWeb\SearchController.php` lines 18-32.

### Pattern 2: Single-Action Invokable Controllers

**What:** Each controller has one `__invoke()` method handling one endpoint.
**When:** Every new route.
**Why:** Already established across all existing controllers (`Ioc\SearchController`, `DarkWeb\SearchController`, `CreditStatusController`).

### Pattern 3: Normalized Response Envelope

**What:** All responses return `{ data: ..., credits?: ... }` shape.
**When:** Every endpoint.
**Why:** Frontend already expects this shape. Credit-gated endpoints include `credits` block; browse endpoints include only `data`.

### Pattern 4: Search Logging

**What:** Log every search to `search_logs` table with user_id, ip_address, module, query.
**When:** IP Search (the credit-gated feature).
**Why:** Already established in both `Ioc\SearchController` and `DarkWeb\SearchController`.

### Pattern 5: GraphQL Response Flattening

**What:** Transform OpenCTI's `{ edges: [{ node: {...} }] }` into flat arrays in the service layer.
**When:** Every OpenCTI service method.
**Why:** Frontend should not deal with GraphQL pagination structures. The service normalizes into `[{ id, name, ... }]` arrays.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Frontend Direct GraphQL Calls

**What:** React app sending GraphQL queries directly to OpenCTI.
**Why bad:** Exposes Bearer token to browser, bypasses credit gating, OpenCTI is on private network unreachable from browser.
**Instead:** All calls go through Laravel proxy.

### Anti-Pattern 2: Multiple Service Classes per Feature

**What:** `IpSearchService`, `ThreatActorService`, `ThreatMapService` each with their own HTTP client setup.
**Why bad:** Duplicates OpenCTI connection logic, token handling, error handling, retry config.
**Instead:** Single `OpenCtiService` with methods per feature. One `execute()` method, one token config.

### Anti-Pattern 3: Passing Raw GraphQL Responses to Frontend

**What:** Controller returns OpenCTI's nested `edges/node` structure unchanged.
**Why bad:** Couples frontend to OpenCTI's internal schema. Any OpenCTI upgrade that changes field names breaks the frontend.
**Instead:** Normalize in the service layer; define a stable response contract.

### Anti-Pattern 4: Credit-Gating Browse Pages

**What:** Charging credits for viewing Threat Actors list or Threat Map.
**Why bad:** These are read-only browsing features. Charging for browsing creates friction without value. Only targeted searches (IP lookup) should cost credits.
**Instead:** Use `auth:sanctum` (login required) without `deduct-credit` for browse pages.

### Anti-Pattern 5: Caching in Browser localStorage

**What:** Using localStorage/sessionStorage to cache threat intelligence data on the client.
**Why bad:** Threat intelligence data is sensitive. Caching it in the browser persists it beyond the session.
**Instead:** If caching is needed, use Laravel's `Cache::remember()` with short TTLs on the server side.

## OpenCTI GraphQL Query Reference

Based on OpenCTI documentation and community examples. **Confidence: MEDIUM** -- exact field names should be verified against the GraphQL playground at `http://192.168.251.20:8080/public/graphql` before implementation.

### Filter Structure (FilterGroup)

All OpenCTI queries use the same filter pattern:

```json
{
  "mode": "and",
  "filters": [
    { "key": "field_name", "values": ["value"], "operator": "eq", "mode": "or" }
  ],
  "filterGroups": []
}
```

Operators: `eq`, `not_eq`, `nil`, `not_nil`, `gt`, `gte`, `lt`, `lte`, `contains`, `search`.

### Searching Observables (IP Search)

```graphql
query SearchObservables($filters: FilterGroup) {
  stixCyberObservables(filters: $filters, first: 25) {
    edges {
      node {
        id
        entity_type
        observable_value
        x_opencti_score
        created_at
        objectLabel { id value color }
        ... on IPv4Addr { value }
        ... on IPv6Addr { value }
        ... on DomainName { value }
      }
    }
  }
}
```

### Listing Intrusion Sets (Threat Actors)

```graphql
query IntrusionSets($first: Int, $after: ID, $search: String) {
  intrusionSets(first: $first, after: $after, search: $search, orderBy: name, orderMode: asc) {
    edges {
      node {
        id
        name
        description
        aliases
        first_seen
        last_seen
        objectLabel { id value color }
        externalReferences { edges { node { url source_name } } }
      }
    }
    pageInfo { hasNextPage endCursor globalCount }
  }
}
```

### Listing Reports (Threat News)

```graphql
query Reports($first: Int, $after: ID) {
  reports(first: $first, after: $after, orderBy: published, orderMode: desc) {
    edges {
      node {
        id
        name
        description
        published
        report_types
        createdBy { ... on Organization { name } ... on Individual { name } }
        objectLabel { id value color }
      }
    }
    pageInfo { hasNextPage endCursor globalCount }
  }
}
```

### Geographical Data (Threat Map)

```graphql
query Countries {
  locations(
    filters: {
      mode: and
      filters: [{ key: "entity_type", values: ["Country"], operator: eq, mode: or }]
      filterGroups: []
    }
    first: 200
  ) {
    edges {
      node {
        id
        name
        latitude
        longitude
        x_opencti_aliases
        stixCoreRelationships(first: 0) {
          pageInfo { globalCount }
        }
      }
    }
  }
}
```

The `stixCoreRelationships` count per country provides threat density for map marker sizing (replaces the mock `attacks` field in `THREAT_MAP_POINTS`).

## Caching Strategy

Server-side caching recommended for browse pages (not for search):

| Endpoint | Cache TTL | Rationale |
|----------|-----------|-----------|
| IP Search | No cache | Results must be fresh; each costs a credit |
| Threat Actors | 15 minutes | Intrusion set data changes infrequently |
| Threat Map | 15 minutes | Geographic aggregates are stable |
| Threat News | 5 minutes | Reports update more frequently |

```php
// In controller (controller decides cache policy, not service)
$data = Cache::remember("threat-actors:page:{$page}", 900, function () use ($page) {
    return app(OpenCtiService::class)->listIntrusionSets(first: 25, after: $after);
});
```

## Suggested Build Order

Build in this order to minimize risk and validate the OpenCTI connection early:

1. **OpenCtiService + config** -- Create the service class with `execute()` and one method (`searchObservable`). Add config to `services.php`. Add env vars. Verify OpenCTI connectivity with a simple test.
2. **IP Search backend** -- Rename `Ioc\SearchController` to `IpSearch\SearchController`, swap `MockThreatDataService` for `OpenCtiService`, update route from `/ioc/search` to `/ip/search`, rename FormRequest.
3. **IP Search frontend** -- Wire `IpSearchPage` to the new endpoint, handle real response shape, populate D3 graph with real relationships.
4. **Rate limit CTAs** -- Wire RATE-04 (guest: "Sign in for more lookups") and RATE-05 (auth: "Daily limit reached") in the frontend IP search page. Backend already returns the correct 429 response with `is_guest` flag.
5. **Threat Actors backend + frontend** -- New `IndexController`, new `OpenCtiService::listIntrusionSets()`, full page implementation replacing placeholder.
6. **Threat News backend + frontend** -- New `IndexController`, new `OpenCtiService::listReports()`, full page implementation replacing placeholder.
7. **Threat Map backend + frontend** -- New `IndexController`, new `OpenCtiService::getGeographicalThreats()`, replace mock markers with real data. Most complex due to geographic data transformation.

**Rationale:** IP Search is highest-risk (replaces existing mock with real API, has credit gating complexity, validates the entire OpenCTI integration pattern). Building it first proves the architecture works. Threat Actors and News are simpler (new pages from scratch, no credit gating). Threat Map is last because geographic data from OpenCTI may require the most normalization.

## Files Changed vs Created

### Modified (existing files)

| File | Change |
|------|--------|
| `backend/config/services.php` | Add `opencti` config block |
| `backend/routes/api.php` | Add 3 new GET routes, change `/ioc/search` to `/ip/search` |
| `backend/.env` / `.env.example` | Add `OPENCTI_URL`, `OPENCTI_TOKEN` |
| `frontend/src/pages/IocSearchPage.jsx` | Rename file, wire to real API, handle OpenCTI response shape |
| `frontend/src/pages/ThreatMapPage.jsx` | Replace `THREAT_MAP_POINTS` mock with API call to `/api/threat-map` |
| `frontend/src/pages/ThreatActorsPage.jsx` | Full implementation replacing placeholder |
| `frontend/src/pages/ThreatNewsPage.jsx` | Full implementation replacing placeholder |
| `frontend/src/App.jsx` | Update import if filename changes |

### Created (new files)

| File | Purpose |
|------|---------|
| `backend/app/Services/OpenCtiService.php` | Central OpenCTI GraphQL client with all query methods |
| `backend/app/Http/Controllers/IpSearch/SearchController.php` | IP search endpoint (moved from `Ioc/`) |
| `backend/app/Http/Controllers/ThreatActors/IndexController.php` | Threat actors list endpoint |
| `backend/app/Http/Controllers/ThreatMap/IndexController.php` | Threat map data endpoint |
| `backend/app/Http/Controllers/ThreatNews/IndexController.php` | Threat news list endpoint |
| `backend/app/Http/Requests/IpSearchRequest.php` | Validation for IP search (renamed from `IocSearchRequest`) |
| `frontend/src/api/opencti.js` | API module for all OpenCTI-proxied endpoints |

### Removed / Superseded

| File | Reason |
|------|--------|
| `backend/app/Services/MockThreatDataService.php` | Replaced by real OpenCTI data via `OpenCtiService` |
| `backend/app/Http/Controllers/Ioc/SearchController.php` | Moved to `IpSearch/SearchController.php` |
| `backend/app/Http/Requests/IocSearchRequest.php` | Renamed to `IpSearchRequest.php` |

## Sources

- [OpenCTI GraphQL API Documentation](https://docs.opencti.io/latest/reference/api/) -- HIGH confidence
- [OpenCTI GraphQL Playground Guide](https://docs.opencti.io/latest/development/api-usage/) -- HIGH confidence
- [OpenCTI Filter Reference](https://docs.opencti.io/latest/reference/filters/) -- HIGH confidence, FilterGroup structure verified
- [OpenCTI Data Model](https://docs.opencti.io/latest/usage/data-model/) -- HIGH confidence, STIX entity types
- [OpenCTI Locations Framework](https://docs.opencti.io/latest/usage/exploring-locations/) -- MEDIUM confidence, geographic entity types confirmed
- [OpenCTI GitHub Issue #8963](https://github.com/OpenCTI-Platform/opencti/issues/8963) -- HIGH confidence, real-world GraphQL query examples
- [OpenCTI GraphQL Schema (GitHub)](https://github.com/OpenCTI-Platform/opencti/blob/master/opencti-platform/opencti-graphql/config/schema/opencti.graphql) -- HIGH confidence, authoritative schema definition
- Existing codebase patterns: `DarkWebProviderService.php`, `DarkWeb\SearchController.php`, `DeductCredit.php` -- established architecture
