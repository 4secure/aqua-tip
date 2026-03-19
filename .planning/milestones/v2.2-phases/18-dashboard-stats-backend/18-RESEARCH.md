# Phase 18: Dashboard Stats Backend - Research

**Researched:** 2026-03-19
**Domain:** Laravel backend + OpenCTI GraphQL aggregation
**Confidence:** HIGH

## Summary

Phase 18 adds three public API endpoints that aggregate OpenCTI observable data for the dashboard: entity type counts, recent observables, and label-based category distribution. The codebase already has all the building blocks -- OpenCtiService for GraphQL queries, Cache::remember with TTL patterns, invokable controllers, and public route registration. No new packages are needed.

The critical finding is that OpenCTI's GraphQL schema does **not** provide a dedicated distribution/aggregation query for stixCyberObservables (unlike stixCoreObjects which have `stixCoreObjectsDistribution`). Instead, counts must be obtained using `pageInfo.globalCount` from filtered queries with `first: 0` (or `first: 1`), and category distribution requires fetching observables with their `objectLabel` fields and aggregating server-side in PHP.

**Primary recommendation:** Build a single DashboardService with three public methods, each making targeted GraphQL queries and caching results for 5 minutes. Use `pageInfo.globalCount` for type counts, a standard list query for recent observables, and a label-frequency aggregation computed in PHP from fetched data.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 4 stat cards showing total observable counts by entity type: IPv4-Addr, Domain-Name, Url, Email-Addr
- Raw count only -- no deltas, sparklines, or historical comparisons
- Each card returns: entity type label + total count from OpenCTI
- 10 most recent observables across all observable types (not limited to STIX Indicator entities)
- Fields per row: observable value, entity_type, OpenCTI score, created date
- Sorted by created date descending (most recent first)
- Category distribution from OpenCTI objectLabel counts (same approach as Threat News category chips)
- Return top 6 labels by count
- Each entry: label name + observable count
- Separate endpoints per widget (3 routes):
  - `GET /api/dashboard/counts` -- 4 observable type counts
  - `GET /api/dashboard/indicators` -- 10 recent observables
  - `GET /api/dashboard/categories` -- top 6 label distribution
- All public (no auth required) -- aggregate data, no credit cost
- 5-minute cache TTL for all three endpoints
- Stale-cache fallback when OpenCTI is unreachable (return last cached response)
- No new endpoint for threat map -- existing `GET /api/threat-map/snapshot` already provides DASH-04

### Claude's Discretion
- Exact GraphQL queries for observable counts and label aggregation
- Stale-cache implementation strategy (Cache::remember vs manual get/put)
- Error handling granularity for individual endpoint failures
- DashboardService internal method organization
- Response envelope structure (consistent with existing patterns)

### Deferred Ideas (OUT OF SCOPE)
- Delta percentages ("vs last week") on stat cards -- requires historical snapshot infrastructure (DASH-F01, DASH-F02)
- Sparkline trend charts -- requires historical data storage (DASH-F01)
- Quick search input on dashboard (DASH-F03)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | User sees live observable count stat cards from OpenCTI | `pageInfo.globalCount` from filtered `stixCyberObservables` queries per entity type |
| DASH-02 | User sees recent indicators table with real observables | `stixCyberObservables` list query with `first: 10`, ordered by `created_at desc` |
| DASH-03 | User sees attack categories bar chart from OpenCTI label distribution | Fetch observables with `objectLabel`, aggregate label frequencies in PHP, return top 6 |
| DASH-04 | User sees threat map widget using existing snapshot endpoint | No new work -- existing `GET /api/threat-map/snapshot` already serves this (confirmed in ThreatMapService) |
| DASH-06 | Dashboard auto-refreshes stats every 5 minutes | 5-min cache TTL aligns with frontend polling; endpoints are stateless GET -- frontend polls freely |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Laravel Framework | ^12.0 | Application framework | Already in composer.json |
| Illuminate Cache | (bundled) | Response caching with TTL | Used by all existing services |
| OpenCtiService | (internal) | GraphQL proxy with retry | Existing 85-line service, fully reusable |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Pest PHP | ^3.8 | Testing framework | Already installed, used for all feature/unit tests |
| Mockery | ^1.6 | Service mocking | Already installed, used in existing tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `pageInfo.globalCount` for counts | `stixCoreObjectsDistribution` | Distribution query exists for core objects but NOT for cyber observables -- globalCount is the only option |
| PHP-side label aggregation | OpenCTI distribution endpoint | No distribution query exists for SCOs; PHP aggregation is the only path |
| Single combined endpoint | 3 separate endpoints | Separate endpoints allow independent caching, parallel frontend fetches, and partial failure tolerance |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
backend/app/
  Services/
    DashboardService.php         # NEW: 3 public methods for counts, indicators, categories
  Http/Controllers/Dashboard/
    CountsController.php         # NEW: Invokable, GET /api/dashboard/counts
    IndicatorsController.php     # NEW: Invokable, GET /api/dashboard/indicators
    CategoriesController.php     # NEW: Invokable, GET /api/dashboard/categories
backend/tests/
  Feature/Dashboard/
    CountsTest.php               # NEW: Feature tests for counts endpoint
    IndicatorsTest.php           # NEW: Feature tests for indicators endpoint
    CategoriesTest.php           # NEW: Feature tests for categories endpoint
  Unit/Services/
    DashboardServiceTest.php     # NEW: Unit tests for service methods
```

### Pattern 1: globalCount for Type Counts (DASH-01)
**What:** Use `stixCyberObservables` with entity_type filter and `first: 1` to get `pageInfo.globalCount` without fetching actual data.
**When to use:** When you need total counts per observable type.
**Example:**
```php
// Source: Adapted from existing IpSearchService + ThreatMapService patterns
$graphql = <<<'GRAPHQL'
query ($filters: FilterGroup) {
    stixCyberObservables(filters: $filters, first: 1) {
        pageInfo {
            globalCount
        }
    }
}
GRAPHQL;

$variables = [
    'filters' => [
        'mode' => 'and',
        'filters' => [
            [
                'key' => 'entity_type',
                'values' => ['IPv4-Addr'],
                'operator' => 'eq',
                'mode' => 'or',
            ],
        ],
        'filterGroups' => [],
    ],
];

$data = $this->openCti->query($graphql, $variables);
$count = $data['stixCyberObservables']['pageInfo']['globalCount'] ?? 0;
```

### Pattern 2: Recent Observables List (DASH-02)
**What:** Standard list query for 10 most recent observables across all types.
**When to use:** For the recent indicators table.
**Example:**
```php
// Source: Adapted from ThreatMapService::fetchSnapshot pattern
$graphql = <<<'GRAPHQL'
{
    stixCyberObservables(first: 10, orderBy: created_at, orderMode: desc) {
        edges {
            node {
                id
                entity_type
                observable_value
                x_opencti_score
                created_at
            }
        }
    }
}
GRAPHQL;
```

### Pattern 3: Label Distribution via PHP Aggregation (DASH-03)
**What:** Fetch recent observables with objectLabel, count label frequencies in PHP, return top 6.
**When to use:** For the attack categories bar chart.
**Example:**
```php
// Fetch observables with labels (larger batch for better distribution)
$graphql = <<<'GRAPHQL'
{
    stixCyberObservables(first: 500, orderBy: created_at, orderMode: desc) {
        edges {
            node {
                objectLabel {
                    value
                }
            }
        }
    }
}
GRAPHQL;

// Aggregate in PHP
$labelCounts = [];
foreach ($edges as $edge) {
    foreach ($edge['node']['objectLabel'] ?? [] as $label) {
        $name = $label['value'] ?? '';
        if ($name !== '') {
            $labelCounts[$name] = ($labelCounts[$name] ?? 0) + 1;
        }
    }
}
arsort($labelCounts);
$top6 = array_slice($labelCounts, 0, 6, true);

return array_map(
    fn (string $name, int $count) => ['label' => $name, 'count' => $count],
    array_keys($top6),
    array_values($top6),
);
```

### Pattern 4: Stale-Cache Fallback
**What:** Manual get/put with try/catch around OpenCTI call -- return stale data on failure.
**When to use:** All three dashboard endpoints.
**Example:**
```php
// Source: Recommended approach -- manual cache for stale fallback
public function getCounts(): array
{
    $cacheKey = 'dashboard_counts';
    $cached = Cache::get($cacheKey);

    try {
        $fresh = $this->fetchCounts();
        Cache::put($cacheKey, $fresh, now()->addMinutes(5));
        return $fresh;
    } catch (OpenCtiConnectionException) {
        if ($cached !== null) {
            return $cached; // Stale fallback
        }
        throw new OpenCtiConnectionException('OpenCTI unavailable and no cached data');
    }
}
```

### Pattern 5: Invokable Controller (existing project pattern)
**What:** Single-action controller with `__invoke()` method.
**When to use:** Each dashboard endpoint gets its own invokable controller.
**Example:**
```php
// Source: Existing SnapshotController pattern
class CountsController extends Controller
{
    public function __invoke(): JsonResponse
    {
        try {
            $counts = app(DashboardService::class)->getCounts();
        } catch (OpenCtiConnectionException) {
            return response()->json([
                'message' => 'Unable to load dashboard counts. Please try again.',
            ], 502);
        }

        return response()->json(['data' => $counts]);
    }
}
```

### Anti-Patterns to Avoid
- **Single monolith endpoint returning all stats:** Prevents independent caching and partial failure recovery. Keep 3 separate endpoints.
- **Using Cache::remember for stale fallback:** `Cache::remember` deletes expired entries -- stale fallback requires manual `Cache::get` + `Cache::put`.
- **Fetching full observable data for counts:** Only need `pageInfo.globalCount` -- use `first: 1` to minimize payload.
- **Running 4 sequential GraphQL queries for counts:** Could batch, but sequential is simpler and each query is fast (< 100ms). If latency is an issue, use `Http::pool` in a future optimization.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GraphQL proxy | Custom HTTP client | OpenCtiService | Already handles auth, retry, error parsing |
| Cache with TTL | Custom file-based cache | Laravel Cache facade | Battle-tested, supports multiple drivers |
| Service injection | Manual instantiation | Laravel DI container | Constructor injection via type hints |
| Response formatting | Inconsistent JSON | `response()->json(['data' => ...])` | Consistent envelope pattern used across all controllers |

## Common Pitfalls

### Pitfall 1: Cache::remember Does Not Support Stale Fallback
**What goes wrong:** Using `Cache::remember()` with 5-min TTL means after expiry, if OpenCTI is down, there is no cached data to fall back to.
**Why it happens:** `Cache::remember` only returns cached value if it exists and is not expired.
**How to avoid:** Use manual `Cache::get()` + `Cache::put()` pattern. Read cache first, attempt fresh fetch, write to cache on success, return stale on failure.
**Warning signs:** 502 errors on dashboard when OpenCTI has a brief outage.

### Pitfall 2: No Distribution Query for stixCyberObservables
**What goes wrong:** Assuming OpenCTI has a `stixCyberObservablesDistribution` query (like it does for stixCoreObjects).
**Why it happens:** Other STIX types have distribution queries, but cyber observables do not.
**How to avoid:** Use `pageInfo.globalCount` for counts and PHP-side aggregation for label distribution.
**Warning signs:** GraphQL errors about unknown fields/queries.

### Pitfall 3: Public Routes Placed Inside Auth Middleware Group
**What goes wrong:** Dashboard endpoints return 401 for unauthenticated users.
**Why it happens:** Copy-pasting route registration from existing auth-required routes.
**How to avoid:** Register dashboard routes OUTSIDE the `auth:sanctum` middleware group, similar to how `POST /ip-search` and `POST /threat-search` are registered at the bottom of api.php.
**Warning signs:** Frontend polling gets 401 responses.

### Pitfall 4: Large Payload for Category Distribution
**What goes wrong:** Fetching 500 observables just for label counting is wasteful on bandwidth.
**Why it happens:** No server-side aggregation query exists.
**How to avoid:** Only request the `objectLabel { value }` field (minimal node selection). The 500-observable batch gives a representative distribution without being excessive. Consider reducing to 200 if OpenCTI instance is small.
**Warning signs:** Slow response times on `/api/dashboard/categories`.

### Pitfall 5: Threat Map Snapshot Requires Auth
**What goes wrong:** DASH-04 says "existing snapshot endpoint" but that endpoint is behind `auth:sanctum`.
**Why it happens:** `/api/threat-map/snapshot` is currently inside the auth middleware group.
**How to avoid:** For Phase 18, document that the existing endpoint works for authenticated dashboard users. If public access is needed, it would be a separate route change (but the context says frontend rewrite is Phase 20).
**Warning signs:** None for Phase 18 -- this is a Phase 20 consideration.

## Code Examples

### DashboardService Constructor (follow existing pattern)
```php
// Source: Matches ThreatActorService, ThreatNewsService, ThreatMapService
class DashboardService
{
    public function __construct(
        private readonly OpenCtiService $openCti,
    ) {}
}
```

### Route Registration (public, no auth)
```php
// Source: Follows pattern of ip-search/threat-search public routes in api.php
// Dashboard stats (public, no auth, no credit gating)
Route::get('/dashboard/counts', DashboardCountsController::class);
Route::get('/dashboard/indicators', DashboardIndicatorsController::class);
Route::get('/dashboard/categories', DashboardCategoriesController::class);
```

### Response Envelope (consistent with SnapshotController)
```php
// Counts response
return response()->json([
    'data' => [
        ['entity_type' => 'IPv4-Addr', 'label' => 'IP Addresses', 'count' => 1234],
        ['entity_type' => 'Domain-Name', 'label' => 'Domains', 'count' => 567],
        ['entity_type' => 'Url', 'label' => 'URLs', 'count' => 890],
        ['entity_type' => 'Email-Addr', 'label' => 'Email Addresses', 'count' => 123],
    ],
]);

// Indicators response
return response()->json([
    'data' => [
        [
            'id' => 'abc-123',
            'value' => '192.168.1.1',
            'entity_type' => 'IPv4-Addr',
            'score' => 75,
            'created_at' => '2026-03-19T10:00:00Z',
        ],
        // ... 9 more
    ],
]);

// Categories response
return response()->json([
    'data' => [
        ['label' => 'malware', 'count' => 250],
        ['label' => 'phishing', 'count' => 180],
        // ... up to 6
    ],
]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded mock data in frontend | Live OpenCTI data via API | Phase 18 (now) | Dashboard shows real threat intel |
| Single combined stats endpoint | 3 separate cached endpoints | Phase 18 design decision | Independent caching + partial failure tolerance |
| Cache::remember for everything | Manual get/put for stale fallback | Phase 18 pattern | Dashboard stays usable during OpenCTI outages |

## Open Questions

1. **Optimal batch size for category distribution**
   - What we know: Need to fetch observables with labels and aggregate in PHP. 500 is a reasonable sample.
   - What's unclear: How many observables the production OpenCTI instance has. If < 200, fetching 500 will just return all of them (harmless).
   - Recommendation: Start with 500, validate during implementation against live data. Reduce if response time > 2 seconds.

2. **OpenCTI aggregation query syntax validation**
   - What we know: `pageInfo.globalCount` is documented and the schema confirms `globalCount: Int!` exists.
   - What's unclear: Whether `first: 1` with only `pageInfo` requested actually avoids fetching node data (vs `first: 0` which may not be valid).
   - Recommendation: Use `first: 1` (safe, proven pattern from existing codebase). The single node fetched is negligible overhead.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Pest PHP 3.8 + PHPUnit 11.5 |
| Config file | `backend/phpunit.xml` |
| Quick run command | `cd backend && php artisan test --filter Dashboard` |
| Full suite command | `cd backend && php artisan test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | GET /api/dashboard/counts returns 4 entity type counts | feature | `php artisan test --filter CountsTest` | Wave 0 |
| DASH-02 | GET /api/dashboard/indicators returns 10 recent observables | feature | `php artisan test --filter IndicatorsTest` | Wave 0 |
| DASH-03 | GET /api/dashboard/categories returns top 6 label distribution | feature | `php artisan test --filter CategoriesTest` | Wave 0 |
| DASH-04 | Threat map uses existing snapshot endpoint | feature | `php artisan test --filter SnapshotTest` | Exists |
| DASH-06 | Endpoints support polling (stateless GET, 5-min cache) | unit | `php artisan test --filter DashboardServiceTest` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && php artisan test --filter Dashboard`
- **Per wave merge:** `cd backend && php artisan test`
- **Phase gate:** Full suite green before verification

### Wave 0 Gaps
- [ ] `tests/Feature/Dashboard/CountsTest.php` -- covers DASH-01
- [ ] `tests/Feature/Dashboard/IndicatorsTest.php` -- covers DASH-02
- [ ] `tests/Feature/Dashboard/CategoriesTest.php` -- covers DASH-03
- [ ] `tests/Unit/Services/DashboardServiceTest.php` -- covers service logic, stale-cache, DASH-06

*(Test infrastructure (Pest, phpunit.xml, RefreshDatabase trait) already exists -- no framework setup needed)*

## Sources

### Primary (HIGH confidence)
- Existing codebase: `OpenCtiService.php`, `ThreatActorService.php`, `ThreatNewsService.php`, `ThreatMapService.php` -- all patterns verified by reading source
- Existing codebase: `SnapshotController.php` -- invokable controller + error handling pattern
- Existing codebase: `IpSearchService.php`, `ThreatSearchService.php` -- GraphQL query structure for stixCyberObservables with entity_type filters
- Existing codebase: `routes/api.php` -- public vs auth-gated route registration
- Existing tests: `SnapshotTest.php` -- Pest feature test pattern with service mocking

### Secondary (MEDIUM confidence)
- [OpenCTI GraphQL Schema](https://github.com/OpenCTI-Platform/opencti/blob/master/opencti-platform/opencti-graphql/config/schema/opencti.graphql) -- confirmed `pageInfo.globalCount: Int!` exists, confirmed no `stixCyberObservablesDistribution` query
- [OpenCTI Python Client](https://github.com/OpenCTI-Platform/client-python/blob/master/pycti/entities/opencti_stix_cyber_observable.py) -- confirmed no distribution method for observables
- [OpenCTI API Docs](https://docs.opencti.io/latest/reference/api/) -- general API reference

### Tertiary (LOW confidence)
- OpenCTI aggregation query syntax for `first: 0` -- unverified whether 0 is a valid value (use `first: 1` as safe alternative)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all packages already in composer.json, no new dependencies
- Architecture: HIGH - follows 100% established codebase patterns (service + invokable controller + Cache)
- Pitfalls: HIGH - verified against actual OpenCTI schema and existing codebase patterns
- GraphQL queries: MEDIUM - globalCount confirmed in schema, but exact query optimization (first: 0 vs first: 1) needs live validation

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable -- no moving parts, all internal patterns)
