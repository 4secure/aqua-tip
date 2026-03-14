# Stack Research

**Domain:** OpenCTI GraphQL API integration into existing Laravel 12 backend
**Researched:** 2026-03-14
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Laravel HTTP Client (Illuminate\Http) | ships with Laravel 12 | GraphQL HTTP transport | Already used for DarkWebProviderService; wraps Guzzle; supports `->withToken()`, `->retry()`, `->timeout()`, JSON POST bodies. Zero new dependencies needed. |
| Raw GraphQL query strings | N/A | Query construction | OpenCTI's GraphQL schema uses relay-style pagination with `FilterGroup` input types. Hand-written query strings are simpler, more readable, and easier to maintain than a PHP query-builder abstraction for a fixed set of 4 queries. |
| Laravel config/services.php | ships with Laravel 12 | OpenCTI credentials | Follows existing pattern (`services.dark_web.*`). Store `OPENCTI_URL` and `OPENCTI_TOKEN` in `.env`, read via `config('services.opencti.*')`. |

### Supporting Libraries

**No new Composer packages required.** The entire integration can be built with Laravel's built-in HTTP client.

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `illuminate/http` | included in Laravel 12 | HTTP client for GraphQL POST requests | Every OpenCTI API call |
| `illuminate/cache` | included in Laravel 12 | Response caching | Cache threat actors, reports, countries (slow-changing data) |
| `illuminate/support` | included in Laravel 12 | Collection transforms, data normalization | Transforming GraphQL responses into frontend-ready format |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| OpenCTI GraphiQL playground | Query exploration and testing | Access at `http://192.168.251.20:8080/public/graphql` to discover schema, test queries, verify filter syntax |
| Pest 3.8 (existing) | Testing OpenCTI service | Mock HTTP responses with `Http::fake()` -- no external dependency needed |

## Zero New Dependencies

This is the key finding: **do not install a GraphQL client library.** Here is why:

1. **Laravel's HTTP client already handles everything**: `Http::withToken($token)->post($url, ['query' => $graphql, 'variables' => $vars])` is all that is needed for a GraphQL POST request.

2. **The project has exactly 4 fixed queries** (observables, intrusion sets, reports, locations). There is no dynamic query-building requirement that would justify a query-builder library.

3. **The existing DarkWebProviderService already establishes the pattern**: service class, config-driven credentials, `Http` facade, timeout/retry, response normalization. The OpenCTI service should follow the identical pattern.

4. **PHP GraphQL client libraries add unnecessary abstraction**:
   - `gmostafa/php-graphql-client` (v1.13): Last updated 2021, adds Guzzle dependency that Laravel already provides. Query-builder syntax is more verbose than raw query strings for fixed queries.
   - `softonic/graphql-client`: Adds OAuth2 abstraction unnecessary for Bearer token auth.
   - `bendeckdavid/graphql-client`: Minimal wrapper that adds nothing over `Http::post()`.

## OpenCTI GraphQL API Reference

### Authentication

```php
Http::withToken(config('services.opencti.token'))
    ->post(config('services.opencti.url'), [
        'query' => $graphqlQuery,
        'variables' => $variables,
    ]);
```

Headers sent: `Authorization: Bearer {token}`, `Content-Type: application/json`

### Query Patterns (from pycti source analysis)

**1. IP Search -- StixCyberObservables**
```graphql
query StixCyberObservables(
    $types: [String]
    $search: String
    $first: Int
    $after: ID
    $orderBy: StixCyberObservablesOrdering
    $orderMode: OrderingMode
    $filters: FilterGroup
) {
    stixCyberObservables(
        types: $types
        search: $search
        first: $first
        after: $after
        orderBy: $orderBy
        orderMode: $orderMode
        filters: $filters
    ) {
        edges {
            node {
                id
                entity_type
                observable_value
                ... on IPv4Addr { value }
                ... on IPv6Addr { value }
                ... on DomainName { value }
                indicators { edges { node { id name pattern } } }
            }
        }
        pageInfo {
            startCursor endCursor hasNextPage hasPreviousPage globalCount
        }
    }
}
```

**2. Threat Actors -- IntrusionSets**
```graphql
query IntrusionSets(
    $first: Int
    $after: ID
    $orderBy: IntrusionSetsOrdering
    $orderMode: OrderingMode
    $filters: FilterGroup
    $search: String
) {
    intrusionSets(
        first: $first after: $after
        orderBy: $orderBy orderMode: $orderMode
        filters: $filters search: $search
    ) {
        edges {
            node {
                id name description aliases
                first_seen last_seen goals
                resource_level primary_motivation
                confidence created modified
                createdBy { ... on Identity { id name } }
                objectLabel { id value color }
                objectMarking { id definition }
            }
        }
        pageInfo { endCursor hasNextPage globalCount }
    }
}
```

**3. Threat News -- Reports**
```graphql
query Reports(
    $first: Int
    $after: ID
    $orderBy: ReportsOrdering
    $orderMode: OrderingMode
    $filters: FilterGroup
    $search: String
) {
    reports(
        first: $first after: $after
        orderBy: $orderBy orderMode: $orderMode
        filters: $filters search: $search
    ) {
        edges {
            node {
                id name description
                report_types published confidence
                createdBy { ... on Identity { id name } }
                objectLabel { id value color }
                objectMarking { id definition }
            }
        }
        pageInfo { endCursor hasNextPage globalCount }
    }
}
```

**4. Threat Map -- Countries/Locations**
```graphql
query Countries(
    $first: Int
    $after: ID
    $orderBy: LocationsOrdering
    $orderMode: OrderingMode
    $filters: FilterGroup
) {
    countries(
        first: $first after: $after
        orderBy: $orderBy orderMode: $orderMode
        filters: $filters
    ) {
        edges {
            node {
                id name description
                latitude longitude
                x_opencti_aliases
            }
        }
        pageInfo { endCursor hasNextPage globalCount }
    }
}
```

### Filter Structure (FilterGroup)

```json
{
    "mode": "and",
    "filters": [
        {
            "key": ["value"],
            "values": ["8.8.8.8"],
            "operator": "eq",
            "mode": "or"
        }
    ],
    "filterGroups": []
}
```

Operators: `eq`, `not_eq`, `contains`, `search`, `gt`, `gte`, `lt`, `lte`, `nil`, `not_nil`, `within`

### Pagination (Relay-style)

All queries use cursor-based pagination:
- `first: 25` -- page size
- `after: "cursor-string"` -- next page cursor
- Response includes `pageInfo.endCursor`, `pageInfo.hasNextPage`, `pageInfo.globalCount`

## Service Architecture Pattern

Follow the existing `DarkWebProviderService` pattern exactly:

```
config/services.php          -- Add 'opencti' key with url + token
.env                         -- OPENCTI_URL, OPENCTI_TOKEN
app/Services/OpenCtiService.php  -- Single service class, 4 public methods
app/Http/Controllers/         -- One controller per feature (or extend existing)
routes/api.php               -- New routes under existing auth/rate-limit middleware
```

### Config Addition (services.php)

```php
'opencti' => [
    'url' => env('OPENCTI_URL', 'http://192.168.251.20:8080/graphql'),
    'token' => env('OPENCTI_TOKEN'),
    'timeout' => env('OPENCTI_TIMEOUT', 15),
],
```

### Service Pattern

```php
class OpenCtiService
{
    public function searchObservables(string $query, int $first = 25, ?string $after = null): array
    public function listIntrusionSets(int $first = 25, ?string $after = null, ?string $search = null): array
    public function listReports(int $first = 25, ?string $after = null, ?string $search = null): array
    public function listCountries(int $first = 250): array

    private function execute(string $query, array $variables = []): array
    private function normalizeEdges(array $data): array
}
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Laravel HTTP Client (raw queries) | `gmostafa/php-graphql-client` | If you had 20+ dynamic queries with variable field selection -- the query builder would help. Not the case here with 4 fixed queries. |
| Raw GraphQL strings | `softonic/graphql-client` | If you needed OAuth2 token refresh for the API. OpenCTI uses static Bearer tokens, so this is unnecessary. |
| Single `OpenCtiService` class | Separate service per entity | If each entity needed complex business logic. For proxy-and-normalize, one service is cleaner. |
| Server-side caching (Laravel Cache) | No caching | Never. Intrusion sets and countries change infrequently. Cache them for 15-60 minutes to reduce load on the local OpenCTI instance. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `rebing/graphql-laravel` | This is for **building** a GraphQL server in Laravel, not for **consuming** an external GraphQL API. Wrong tool entirely. | Laravel HTTP Client |
| `lighthouse-php.com` | Same as above -- it is a GraphQL server framework, not a client. | Laravel HTTP Client |
| Any PHP GraphQL client library | Adds a dependency for something Laravel's HTTP client does in one line. The project has 4 fixed queries. | `Http::withToken()->post()` |
| `apollo-client` or frontend GraphQL client | The React frontend should NOT talk to OpenCTI directly. All requests must go through Laravel for credit gating, auth, and rate limiting. | Backend proxy via Laravel API endpoints |
| OpenCTI Python SDK (`pycti`) | Would require a Python sidecar service, complicating deployment. | Port the query patterns to PHP using Laravel HTTP Client |

## Stack Patterns

**For IP Search (real-time, user-initiated):**
- No caching -- each search deducts a credit, must return fresh results
- 15-second timeout (OpenCTI can be slow on complex observable searches)
- Retry once on connection failure

**For Threat Actors / Threat News (browsing, list views):**
- Cache for 15 minutes using `Cache::remember()`
- Higher page sizes (25-50 items)
- Background refresh not needed at current scale

**For Threat Map (geographical data):**
- Cache for 60 minutes -- country data rarely changes
- Fetch all countries in one request (typically < 200)
- No pagination needed on frontend -- load full dataset

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Laravel 12 HTTP Client | PHP 8.2+ | Already in use. Guzzle 7.x bundled. |
| OpenCTI GraphQL API | OpenCTI 5.x / 6.x | FilterGroup syntax is stable since 5.x. Verify exact version on target instance. |

## Frontend Considerations (no new npm packages)

The React frontend already has everything it needs:
- **Axios** (existing) -- for API calls to Laravel backend
- **React Router** (existing) -- routes for threat actors, threat news pages
- **Leaflet** (existing) -- for threat map with country data
- **Chart.js** (existing) -- for any dashboard visualizations

No new frontend dependencies are required. The frontend consumes Laravel API endpoints, not OpenCTI directly.

## Environment Variables to Add

```bash
# .env
OPENCTI_URL=http://192.168.251.20:8080/graphql
OPENCTI_TOKEN=your-opencti-api-token-here
OPENCTI_TIMEOUT=15
```

## Installation

```bash
# No new packages needed. Just add environment variables:
# Backend .env
echo "OPENCTI_URL=http://192.168.251.20:8080/graphql" >> .env
echo "OPENCTI_TOKEN=" >> .env
echo "OPENCTI_TIMEOUT=15" >> .env
```

## Sources

- [OpenCTI GraphQL API Documentation](https://docs.opencti.io/latest/reference/api/) -- API overview and authentication (HIGH confidence)
- [OpenCTI GraphQL Playground Documentation](https://docs.opencti.io/latest/development/api-usage/) -- Query exploration guide (HIGH confidence)
- [OpenCTI Filters Documentation](https://docs.opencti.io/latest/reference/filters/) -- FilterGroup structure, operators (HIGH confidence)
- [OpenCTI pycti stix_cyber_observable.py](https://github.com/OpenCTI-Platform/client-python/blob/master/pycti/entities/opencti_stix_cyber_observable.py) -- Query structure reference (HIGH confidence)
- [OpenCTI pycti intrusion_set.py](https://github.com/OpenCTI-Platform/client-python/blob/master/pycti/entities/opencti_intrusion_set.py) -- IntrusionSets query fields (HIGH confidence)
- [OpenCTI pycti report.py](https://github.com/OpenCTI-Platform/client-python/blob/master/pycti/entities/opencti_report.py) -- Reports query fields (HIGH confidence)
- [OpenCTI Locations Documentation](https://docs.opencti.io/latest/usage/exploring-locations/) -- Geographic entity types (HIGH confidence)
- [OpenCTI GraphQL Schema](https://github.com/OpenCTI-Platform/opencti/blob/master/opencti-platform/opencti-graphql/config/schema/opencti.graphql) -- Full schema reference (HIGH confidence)
- [gmostafa/php-graphql-client on Packagist](https://packagist.org/packages/gmostafa/php-graphql-client) -- Version/compatibility check, rejected (MEDIUM confidence)
- [Softonic GraphQL Client](https://github.com/softonic/graphql-client) -- Evaluated and rejected (MEDIUM confidence)
- Existing `DarkWebProviderService.php` in codebase -- Established service pattern (HIGH confidence)

---
*Stack research for: OpenCTI GraphQL integration into AQUA TIP*
*Researched: 2026-03-14*
