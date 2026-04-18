# Phase 60: Backend Campaigns Service & Endpoint - Research

**Researched:** 2026-04-18
**Domain:** Laravel 12 API — new standalone OpenCTI GraphQL proxy service (`ThreatCampaignService`) + paginated `/api/threat-campaigns` endpoint, 15-min cache, feature-gated
**Confidence:** HIGH (stack, reuse patterns, test infra, route wiring) / MEDIUM (OpenCTI `CampaignsOrdering` enum values, `objective` field name on Campaign SDO, `confidence` availability — these require live GraphiQL verification at `http://192.168.251.20:8080/graphql` per D-12)

## Summary

Phase 60 is surgical and pattern-replicating. Every library, convention, and test fixture this phase needs already exists in the codebase — the work is creating three **new** files that mirror (but never import from) existing ThreatActor analogs:

1. `backend/app/Services/ThreatCampaignService.php` — standalone class, constructor-injected `OpenCtiService`, single public `list()` method that caches on `'threat_campaigns:' . md5(json_encode(func_get_args()))` for 15 min, executes a GraphQL query against OpenCTI's `campaigns` root, normalizes edges and pageInfo.
2. `backend/app/Http/Controllers/ThreatCampaign/IndexController.php` — `__invoke` single-action controller, reads `after`/`search`/`sort`/`order` query params, calls the service, returns `{data: {items, pagination}}`, catches `OpenCtiConnectionException` → 502.
3. `backend/tests/Feature/ThreatCampaign/IndexTest.php` — Pest file, `RefreshDatabase`, service-binding Mockery mock, `fakeCampaignsResponse()` helper, covers SC1–SC4 + 401/502 parity tests.

One route line is added inside `backend/routes/api.php`'s existing `Route::middleware('feature-gate')->group` block (lines 70–90). No config changes. No migrations. No new dependencies.

**PITFALL-09 is non-negotiable and single-enforced by the codebase itself.** `ThreatCampaignService` must NOT extend, wrap, or import from `ThreatActorService`. The codebase's GraphQL heredoc uses concrete-type enums (`IntrusionSetsOrdering`, `intrusionSets` root query), so any accidental copy-paste produces a GraphQL parse error at the OpenCTI side — the error is loud, not silent. SC4's negative test (assert no `primary_motivation`/`resource_level`/`goals` keys in the response) is the second line of defense.

**The one live-verification gate:** D-12 mandates a GraphiQL session at `http://192.168.251.20:8080/graphql` BEFORE committing the heredoc, to confirm four items: `CampaignsOrdering` enum values, `campaigns` root query shape, `attributed-to` relationship resolution `Campaign → IntrusionSet`, and the concrete `... on IntrusionSet { id name }` fragment path. Record findings as a code comment above the heredoc (Phase 59 established this convention — see `ThreatActorService.php` lines 339-349).

**Primary recommendation:** Plan as two parallel tracks — (Track A) service + heredoc + normalizer + unit-level service tests; (Track B) controller + route + HTTP feature tests. They share only a file path fixture (the fake response helper), so they can merge in either order. Both tracks gate on the one-time GraphiQL verification being done first. Mirror `ThreatActorService` signatures/test shape exactly so Phase 65's frontend client can reuse the same pagination helper pattern it already has for threat-actors.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Service Structure (CAMP-07)**
- **D-01:** `ThreatCampaignService` is a **standalone** class in `backend/app/Services/ThreatCampaignService.php`. Depends only on `OpenCtiService` via constructor injection (same DI pattern as `ThreatActorService`). Does NOT extend, copy, or import methods from `ThreatActorService` — PITFALL-09 is non-negotiable.
- **D-02:** Public `list()` signature mirrors `ThreatActorService::list()` parity, minus `motivation`:
  `list(int $first = 24, ?string $after = null, ?string $search = null, string $orderBy = 'modified', string $orderMode = 'desc'): array`
  Returns `['items' => [...], 'pagination' => [...]]`.

**Query Parameters (Controller Contract)**
- **D-03:** Controller accepts parity with `GET /api/threat-actors`: `after` (cursor), `search` (full-text via GraphQL `search`), `sort` (mapped to `orderBy`), `order` (mapped to `orderMode`). No `motivation` filter (Campaigns don't have that STIX field).
- **D-04:** Defaults: `sort = modified`, `order = desc`, `first = 24` — matches `ThreatActorService::list()` conventions so Phase 65 grid layout can mirror threat-actors behavior without divergent UX.
- **D-05:** GraphQL variable typing uses the **`CampaignsOrdering`** enum — NOT `IntrusionSetsOrdering`. Success criterion SC4 explicitly forbids the wrong enum.

**Field Selection (GraphQL `campaigns` query)**
- **D-06:** Node fields returned per campaign (locked 7 + extras): `id`, `name`, `description`, `first_seen`, `last_seen`, `objective`, `aliases`, `modified`, `created`, `objectLabel { edges { node { id value color } } }`, `externalReferences { edges { node { source_name url description } } }`, `attributed_to` via `stixCoreRelationships(relationship_type: "attributed-to", toTypes: ["Intrusion-Set"], first: 10)`.
- **D-07:** The list response is rich enough to also back Phase 65's detail modal (CAMP-06) without a separate detail endpoint. **One endpoint, one cached payload.** No `GET /api/threat-campaigns/{id}` in this phase.
- **D-08:** Strictly **exclude** IntrusionSet-only fields from GraphQL selection: no `primary_motivation`, no `resource_level`, no `goals`. SC4 + PITFALL-09.

**Attribution Shape (CAMP-05 forward compat)**
- **D-09:** `attributed_to` is normalized to **an array of `{id, name}` objects**, not a single object or flat string.
- **D-10:** Relationship direction: query **from Campaign → IntrusionSet**, i.e., `stixCoreRelationships(relationship_type: "attributed-to", toTypes: ["Intrusion-Set"])` on the campaign node, extract `edge.node.to { ... on IntrusionSet { id name } }`. This is the **inverse** of `ThreatActorService::normalizeCampaigns()` (which queries from the intrusion set using `fromTypes: ["Campaign"]`) — deliberately different.
- **D-11:** If a campaign has zero `attributed-to` edges, `attributed_to` returns `[]` (empty array), not `null`.

**GraphiQL Verification (PITFALL-09 + PITFALL-12 discipline)**
- **D-12:** **Mandatory live GraphiQL verification at `http://192.168.251.20:8080/graphql` before writing the query.** Confirm (1) `CampaignsOrdering` enum values include `modified`, `first_seen`, `last_seen`; (2) `campaigns` root query exists with args `(first, after, search, orderBy, orderMode, filters)`; (3) `stixCoreRelationships(relationship_type: "attributed-to", toTypes: ["Intrusion-Set"])` returns non-empty edges for a representative campaign; (4) `... on IntrusionSet { id name }` resolves inside `edge.node.to`. Document verified shape as a code comment above the heredoc.

**Caching (CAMP-08)**
- **D-13:** Cache key pattern mirrors `ThreatActorService::list()`: `'threat_campaigns:' . md5(json_encode(func_get_args()))`. 15-minute TTL via `now()->addMinutes(15)`.
- **D-14:** SC2 is verified in tests by calling the endpoint twice with identical params and asserting `Cache::has('threat_campaigns:...')` is true after call 1.

**Route + Middleware (SC3)**
- **D-15:** Route registered inside existing `Route::middleware('feature-gate')->group(...)` block in `backend/routes/api.php` as `Route::get('/threat-campaigns', ThreatCampaignIndexController::class);`.
- **D-16:** Controller class: `App\Http\Controllers\ThreatCampaign\IndexController` — new namespace, new directory. `__invoke(Request $request)` reads query params, calls service, catches `OpenCtiConnectionException` → 502 with `"Unable to load campaigns. Please try again."`.
- **D-17:** No additional middleware (no `deduct-credit`, no extra throttle).

**Normalization**
- **D-18:** `normalizeResponse()` is a **private method on `ThreatCampaignService`** — copy the shape of `ThreatActorService::normalizeResponse()` but do not import or call it. Extract `items` + `pagination` (with keys `has_next`, `has_previous`, `start_cursor`, `end_cursor`, `total` from `hasNextPage`, `hasPreviousPage`, `startCursor`, `endCursor`, `globalCount`).
- **D-19:** Per-campaign item shape: `{id, name, description, objective, aliases, first_seen, last_seen, modified, created, labels: [{id, value, color}], external_references: [{source_name, url, description}], attributed_to: [{id, name}]}`.
- **D-20:** Deduplicate `attributed_to` by `id` — OpenCTI can return duplicate edges when multiple relationship objects point to the same intrusion set.

**Test Coverage**
- **D-21:** New test file: `backend/tests/Feature/ThreatCampaign/IndexTest.php`. Mirrors `ThreatActorIndexTest.php` style. Cover SC1 (shape + all fields), SC2 (cache hit on second call), SC3 (403 free / 200 paid), SC4 (no IntrusionSet-only fields bleed).
- **D-22:** Use `RefreshDatabase` + real `User` + `Plan` seeding for SC3 — same pattern as existing feature-gated tests. Free plan user → 403; Basic+ plan user → 200.

### Claude's Discretion

- Exact OpenCTI field for `objective` — may be `objective` (STIX 2.1 Campaign SDO) or a custom `x_opencti_*` variant. Planner confirms during D-12 GraphiQL verification.
- Whether to include `confidence` field — not in success criteria, add only if zero-cost during GraphiQL verification and the field exists on Campaign.
- Log level if the query returns an unexpected shape — planner picks `warning` vs `error` to match existing Log conventions in `ThreatActorService`.
- Controller `FormRequest` vs inline `$request->query()` — planner picks the lighter option consistent with `ThreatActorIndexController` (currently inline, no FormRequest).
- Pest assertion granularity — planner matches existing `ThreatActorIndexTest.php` style.

### Deferred Ideas (OUT OF SCOPE)

- **Separate `GET /api/threat-campaigns/{id}` detail endpoint** — not needed in Phase 60 because the list payload already carries everything Phase 65's detail modal requires.
- **Date-range filtering on campaigns** (`first_seen` / `last_seen` window) — considered, deferred.
- **Search facets / filter dropdown** on campaigns (labels, confidence, attribution motivation) — deferred.
- **CAMP-GRAPH (campaign→actor navigation graph)** and **MAP-INTERACT (victimology heatmap)** — already deferred in REQUIREMENTS.md §Future.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **CAMP-07** | Backend exposes a paginated `GET /api/threat-campaigns` endpoint backed by a standalone `ThreatCampaignService` (NOT a refactor of `ThreatActorService` — Campaign STIX fields differ) | New `ThreatCampaignService.php` + `ThreatCampaign/IndexController.php` + route line (D-01, D-15, D-16). Architecture section below enumerates the mirrored-not-inherited patterns. PITFALL-09 mitigations: distinct namespace, no `use ThreatActorService`, different GraphQL root query (`campaigns` vs `intrusionSets`), different enum (`CampaignsOrdering` vs `IntrusionSetsOrdering`). SC4 negative test asserts IntrusionSet-only fields never appear. |
| **CAMP-08** | Campaigns endpoint uses the same 15-min server-side cache pattern as Threat Actors | `Cache::remember($key, now()->addMinutes(15), $closure)` with `$key = 'threat_campaigns:' . md5(json_encode(func_get_args()))` (D-13). Pattern verified in `ThreatActorService.php:37`. SC2 assertion pattern verified in `ThreatActorIndexTest.php:188-210` ("list caches results for 15 minutes" test). The `CACHE_STORE=array` test env (verified in `backend/phpunit.xml:26`) makes `Cache::has()` assertions deterministic. |

</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| GraphQL query construction against OpenCTI | API / Backend (Service layer) | — | `ThreatCampaignService` owns the heredoc. `OpenCtiService` is the HTTP proxy only; it has no campaign-domain knowledge. Mirrors ThreatActorService boundary. |
| Response normalization (edges → items, pageInfo → pagination) | API / Backend (Service layer) | — | Private `normalizeResponse()` on `ThreatCampaignService`. Keeps service the single source of truth for the DTO shape the controller/frontend consume. D-18. |
| Cache lookup / store | API / Backend (Service layer) | Laravel `Cache` facade (in-memory `array` driver for tests, config-driven driver for prod) | `Cache::remember()` wraps the OpenCTI call. Cache key computed server-side from `func_get_args()`, never from raw user input — cache-poisoning safe. D-13. |
| HTTP query-param parsing (`after`/`search`/`sort`/`order`) | API / Backend (Controller) | — | `IndexController::__invoke(Request $request)` reads `$request->query()` inline (matching `ThreatActorIndexController` style). D-16. |
| Response envelope shape `{data: {...}}` | API / Backend (Controller) | — | `response()->json(['data' => $serviceResult])`. Consistent across threat-actors, threat-news, dashboard. |
| Authentication + feature gating | API / Backend (Middleware) | — | Route is wrapped in `auth:sanctum` (parent group, api.php:47) + `feature-gate` (nested group, api.php:70). Zero phase-specific middleware logic. D-17. |
| Connection-failure error translation | API / Backend (Controller catch block) | — | `try/catch (OpenCtiConnectionException)` → `502` with user-safe message. `OpenCtiQueryException` intentionally bubbles to Laravel's default 500 (matches threat-actors index behavior — contrast with enrichment controller which also catches query). |
| Rendering / grid / detail modal | Frontend (React) | — | **OUT OF SCOPE for Phase 60.** Phase 65 consumer. Noted only to confirm the response envelope and item shape match what Phase 65 expects. |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Laravel Framework | ^12.0 `[VERIFIED: backend/composer.json]` | HTTP, routing, middleware, cache, validation | Already the application's framework; zero install cost. |
| PHP | ^8.2 `[VERIFIED: backend/composer.json]` | Runtime | Existing. |
| laravel/sanctum | ^4.0 `[VERIFIED: backend/composer.json]` | Bearer-token auth on all `/api/*` routes via `auth:sanctum` middleware | Already enforcing auth on all other feature-gated routes (api.php:47). |
| pestphp/pest | ^3.8 `[VERIFIED: backend/composer.json]` | Test framework (DSL over PHPUnit) | Used by every existing feature test in `tests/Feature/`. |
| pestphp/pest-plugin-laravel | ^3.2 `[VERIFIED: backend/composer.json]` | Laravel helpers in Pest | Provides `actingAs()`, `getJson()`, `assertStatus()`, `assertJsonStructure()`. |
| mockery/mockery | ^1.6 `[VERIFIED: backend/composer.json]` | Service binding mocks in tests | Used by `ThreatActorIndexTest.php:70-76` + every other feature test that mocks `OpenCtiService`. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Laravel `Cache` facade (array driver in test env) | Built-in | 15-min TTL cache wrapping OpenCTI call | Always — this is the CAMP-08 mechanism. Test env hardcodes `CACHE_STORE=array` (backend/phpunit.xml:26) so `Cache::has()` / `Cache::flush()` are deterministic. `[VERIFIED: phpunit.xml]` |
| Laravel `Log` facade | Built-in | Warning log if query returns an unexpected shape | Optional — add `Log::warning` only in the same places `ThreatActorService` already uses it (currently only in `safeNormalizeVictimology`). For Phase 60, a clean success-or-exception service means `Log` may not be needed at all. |
| Laravel `Http` client | Built-in | Already used inside `OpenCtiService::query()` | Indirect — this service stays mocked in tests. Not called directly by `ThreatCampaignService`. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff | Why not chosen |
|------------|-----------|----------|----------------|
| Inline cache key with `md5(json_encode(func_get_args()))` | Semantic key like `"threat_campaigns:{search}:{sort}:{order}:{after}:{first}"` | Human-readable keys, easier to flush single combos by name | D-13 explicitly chose the `md5(json_encode(...))` pattern to match `ThreatActorService` exactly. Cost of drift > cost of opaque keys. |
| `FormRequest` for query-param validation | Inline `$request->query('sort', 'modified')` | Centralized validation, auto-422 on bad input | D-16 + existing `ThreatActorIndexController` use inline reads with defaults. Sort values are passed through to OpenCTI which rejects invalid enum values with a `OpenCtiQueryException` → 500. This is acceptable for a low-risk internal enum; adding a FormRequest is extra surface area for zero delta. |
| Separate `GET /api/threat-campaigns/{id}` detail route | List + detail split (REST-idiomatic) | Smaller list payload, dedicated cache per detail | D-07 explicitly decided "one cached payload, one endpoint." Campaigns are small enough that the detail modal reuses the list item. Revisit only if Phase 65+ needs per-campaign enrichment (victim graph, TTPs). |
| Extending `ThreatActorService` or sharing a base class | `BaseOpenCtiListService` abstract | DRY at the `Cache::remember` / `flattenRelationshipTargets` level | **Forbidden by PITFALL-09 + D-01.** Campaign STIX fields differ enough that shared inheritance would leak IntrusionSet-only concerns. Copying ~10 lines of boilerplate is the explicitly chosen design. |

**Installation:**

```bash
# No new dependencies. All libraries already present in backend/composer.json.
# Verify current test infra works before starting:
cd backend
composer install
php artisan test --filter=ThreatActorIndex
```

**Version verification:** `backend/composer.json` was `[VERIFIED]` during this research pass. All libraries above are already installed at or above the minimum versions listed. No `npm view`/`composer show` pin check is needed for this phase because no new deps are introduced.

## Architecture Patterns

### System Architecture Diagram

```
                       Frontend (Phase 65, out of scope for Phase 60)
                                       |
                                       | GET /api/threat-campaigns?after=&search=&sort=&order=
                                       v
    +----------------------------------------------------------------+
    |              Laravel HTTP layer (backend/routes/api.php)        |
    |                                                                 |
    |   Route::middleware('auth:sanctum')->group                      |
    |     -> Route::middleware('feature-gate')->group  [api.php:70]   |
    |        -> Route::get('/threat-campaigns',                       |
    |              ThreatCampaignIndexController::class) [NEW line]   |
    +----------------------------------------------------------------+
                                       |
                                       | $request (with ?after, ?search, ?sort, ?order)
                                       v
    +----------------------------------------------------------------+
    | ThreatCampaign\IndexController::__invoke(Request)   [NEW file] |
    |                                                                 |
    |   reads query params (inline, matching ThreatActorIndexCtrl)    |
    |   -> app(ThreatCampaignService)->list($first, $after, ...)      |
    |   catches OpenCtiConnectionException -> 502 JSON                |
    |   returns response()->json(['data' => $result])                 |
    +----------------------------------------------------------------+
                                       |
                                       | method call
                                       v
    +----------------------------------------------------------------+
    | ThreatCampaignService::list()                       [NEW file] |
    |                                                                 |
    |   $cacheKey = 'threat_campaigns:' . md5(json_encode(...args))   |
    |   Cache::remember($cacheKey, now()->addMinutes(15), fn() =>     |
    |       $this->executeQuery(...))                                 |
    +----------------------------------------------------------------+
                  |                                        |
         CACHE HIT (200, fast)                     CACHE MISS
                  |                                        |
                  +-----------------+                      v
                                    |       +---------------------------+
                                    |       | executeQuery()            |
                                    |       |  builds heredoc + vars    |
                                    |       |  -> openCti->query(...)   |
                                    |       +---------------------------+
                                    |                      |
                                    |                      v
                                    |       +---------------------------+
                                    |       | OpenCtiService::query()   |
                                    |       |  HTTP POST (Bearer)       |
                                    |       |  -> OpenCTI /graphql      |
                                    |       | [http://192.168.251.20:   |
                                    |       |  8080/graphql]            |
                                    |       +---------------------------+
                                    |                      |
                                    |                      v
                                    |       +---------------------------+
                                    |       | normalizeResponse(data)   |
                                    |       |  edges -> items[]         |
                                    |       |  pageInfo -> pagination   |
                                    |       +---------------------------+
                                    |                      |
                                    v                      v
                    +---------------------------------------------+
                    |   return ['items' => [...],                 |
                    |           'pagination' => [...]]            |
                    +---------------------------------------------+
                                    |
                                    v
                    Controller wraps: { data: {items, pagination} }
                                    |
                                    v
                          HTTP 200 JSON response
```

### Recommended File Structure

```
backend/
  app/
    Services/
      ThreatCampaignService.php                    # NEW — standalone (D-01)
      ThreatActorService.php                       # EXISTING — reference only, do not modify
      OpenCtiService.php                           # EXISTING — injected via DI
    Http/
      Controllers/
        ThreatCampaign/
          IndexController.php                      # NEW (D-15, D-16)
        ThreatActor/
          IndexController.php                      # EXISTING — mirror its shape
      Middleware/
        FeatureGate.php                            # EXISTING — unchanged
    Exceptions/
      OpenCtiConnectionException.php               # EXISTING — caught in controller
      OpenCtiQueryException.php                    # EXISTING — bubbles to 500
  routes/
    api.php                                        # MODIFIED — one new line + one new use statement
  tests/
    Feature/
      ThreatCampaign/                              # NEW directory
        IndexTest.php                              # NEW (D-21)
      ThreatActor/
        ThreatActorIndexTest.php                   # EXISTING — mirror structure
        EnrichmentTest.php                         # EXISTING — reference for feature-gate pattern
```

### Pattern 1: Cache-wrapped service method (mirror-not-inherit)

**What:** Public entry point applies a cache envelope around a private query method; cache key derives from `func_get_args()` so any unique param combo gets its own cache entry.

**When to use:** Any OpenCTI list/search endpoint. This is the project's canonical pattern.

**Reference — `ThreatActorService.php:29-44` `[VERIFIED: read 2026-04-18]`:**
```php
public function list(
    int $first = 24,
    ?string $after = null,
    ?string $search = null,
    ?string $motivation = null,
    string $orderBy = 'modified',
    string $orderMode = 'desc',
): array {
    $cacheKey = 'threat_actors:' . md5(json_encode(func_get_args()));

    return Cache::remember(
        $cacheKey,
        now()->addMinutes(15),
        fn () => $this->executeQuery($first, $after, $search, $motivation, $orderBy, $orderMode),
    );
}
```

**New `ThreatCampaignService` equivalent (D-02, D-13):**
```php
public function list(
    int $first = 24,
    ?string $after = null,
    ?string $search = null,
    string $orderBy = 'modified',
    string $orderMode = 'desc',
): array {
    $cacheKey = 'threat_campaigns:' . md5(json_encode(func_get_args()));

    return Cache::remember(
        $cacheKey,
        now()->addMinutes(15),
        fn () => $this->executeQuery($first, $after, $search, $orderBy, $orderMode),
    );
}
```

### Pattern 2: GraphQL heredoc with variables + concrete-type fragments

**What:** Query string uses nowdoc (`<<<'GRAPHQL'`) so PHP does not interpolate. All user-controlled values are passed as `$variables`, never interpolated into the string. Inline fragments select fields on concrete types returned by an abstract relationship target.

**Reference — `ThreatActorService.php:57-144` `[VERIFIED]`:** uses `query ($first: Int!, $after: ID, $search: String, $orderBy: IntrusionSetsOrdering, $orderMode: OrderingMode, $filters: FilterGroup)` and `intrusionSets(first: $first, after: $after, ...)` root.

**New campaigns query skeleton (D-05, D-06, D-08, D-10 — final shape pending D-12 GraphiQL verification):**
```graphql
query (
    $first: Int!,
    $after: ID,
    $search: String,
    $orderBy: CampaignsOrdering,
    $orderMode: OrderingMode,
    $filters: FilterGroup
) {
    campaigns(
        first: $first
        after: $after
        search: $search
        orderBy: $orderBy
        orderMode: $orderMode
        filters: $filters
    ) {
        edges {
            node {
                id
                name
                description
                first_seen
                last_seen
                objective
                aliases
                modified
                created
                objectLabel {
                    edges {
                        node {
                            id
                            value
                            color
                        }
                    }
                }
                externalReferences {
                    edges {
                        node {
                            source_name
                            url
                            description
                        }
                    }
                }
                attributed_to: stixCoreRelationships(
                    relationship_type: "attributed-to"
                    toTypes: ["Intrusion-Set"]
                    first: 10
                ) {
                    edges {
                        node {
                            to {
                                ... on IntrusionSet {
                                    id
                                    name
                                }
                            }
                        }
                    }
                }
            }
        }
        pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
            globalCount
        }
    }
}
```

**IMPORTANT notes for the planner:**
1. The `$filters: FilterGroup` variable is included for future-compat but not populated in Phase 60 — matches `ThreatActorService.php:138-144`. If Phase 60 omits filters entirely, drop the variable. The D-12 GraphiQL session is the right moment to decide.
2. `attributed_to` is a GraphQL **alias** on `stixCoreRelationships` — same pattern `ThreatActorService` uses for `targetedCountries`, `targetedSectors` (line 84-99 of the existing file). The alias makes the normalizer cleaner.
3. The field name `objective` is STIX 2.1 but OpenCTI sometimes ships a `x_opencti_*` variant for extensions. **D-12 must confirm.** If the live schema only has `x_opencti_objective`, swap the field in the heredoc and document in the code comment.
4. Document the verified shape as a multi-line `#` comment above the heredoc — identical convention to `ThreatActorService.php:339-349` (Phase 59 victimology).

### Pattern 3: Single-action invokable controller

**What:** Class with one `__invoke(Request)` method, bound directly to route. Reads query params with defaults, calls service, wraps in `{data: ...}`, catches connection exception → 502.

**Reference — `ThreatActorIndexController.php:19-45` `[VERIFIED]`:**
```php
public function __invoke(Request $request): JsonResponse
{
    $after = $request->query('after');
    $search = $request->query('search');
    $motivation = $request->query('motivation');   // Phase 60: drop this line
    $sort = $request->query('sort', 'modified');
    $order = $request->query('order', 'desc');

    try {
        $data = app(ThreatActorService::class)->list(24, $after, $search, $motivation, $sort, $order);
    } catch (OpenCtiConnectionException) {
        return response()->json([
            'message' => 'Unable to load threat actors. Please try again.',
        ], 502);
    }

    return response()->json(['data' => $data]);
}
```

**New `ThreatCampaign\IndexController` (D-16):** identical shape, drop `$motivation`, swap service class, swap 502 message to `"Unable to load campaigns. Please try again."`.

### Pattern 4: Pest feature test with service-binding mock + plan-seeded auth

**What:** Test file at `backend/tests/Feature/ThreatCampaign/IndexTest.php`. `uses(RefreshDatabase::class)`. A fixture helper builds a fake GraphQL response. `mockOpenCtiForCampaigns()` binds a Mockery mock into the container. HTTP tests use `actingAs($user)` with a user seeded to a specific plan slug.

**Reference lines (all `[VERIFIED: 2026-04-18]`):**
- `ThreatActorIndexTest.php:1-76` — imports + fixture helper + service binder + `uses(RefreshDatabase)`
- `ThreatActorIndexTest.php:188-210` — cache assertion pattern ("list caches results for 15 minutes")
- `FeatureGateMiddlewareTest.php:31-44` — `createPlan($slug)` helper (shows required `price_cents`, `daily_credit_limit`, etc.)
- `FeatureGateMiddlewareTest.php:46-60` — 403 assertion for free-plan user with expired trial
- `FeatureGateMiddlewareTest.php:62-71` — 200 assertion for basic plan user

**Anti-Patterns to Avoid**

- **Subclassing or importing from `ThreatActorService`** — explicit PITFALL-09 violation. The service must stand alone (D-01).
- **Interpolating user input into the GraphQL string** — always pass via `$variables`. The nowdoc syntax `<<<'GRAPHQL'` enforces this by disabling PHP interpolation.
- **Caching failed responses** — Laravel's `Cache::remember` already does not cache thrown closures. Do not add manual try/catch that returns an empty array (that would poison the cache for 15 min).
- **Reading `$request->all()` instead of explicit `$request->query('key')`** — consistent with existing controllers; `all()` leaks unintended params.
- **Adding `Route::get(...)` outside the existing `feature-gate` group** — would break SC3. The new line MUST go inside the group at api.php:70-90 (currently lines 77 and 88 show other entries — either boundary is fine).
- **Using the built-in Laravel `User::factory()->create()` without seeding a plan for a 403 test** — because `User::booted()` (`User.php:83-87`) auto-sets `trial_ends_at = now()->addDays(30)` on creation, factory users get 200 by default (active trial). To test a 403, you must explicitly override `trial_ends_at` to a past date AND assign a free plan. See `FeatureGateMiddlewareTest.php:50-53` for the canonical pattern `[VERIFIED]`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 15-minute cache | Custom cache table / file cache / stale-while-revalidate | `Cache::remember($key, now()->addMinutes(15), $closure)` | Laravel's `Cache` facade with the `array` driver in tests and whatever the prod driver is. Already battle-tested. `[VERIFIED: ThreatActorService.php:39-43]` |
| Cache key generation | `sha1` / `crc32` / custom concatenation | `md5(json_encode(func_get_args()))` | D-13 mandates parity with `ThreatActorService.php:37`. MD5 here is for key uniqueness, not security — no cryptographic requirement. |
| GraphQL query execution | Raw `Http::post()` in the service | Inject `OpenCtiService` and call `->query($graphql, $variables)` | `OpenCtiService` handles Bearer auth, retries, timeouts, and error-type translation. `[VERIFIED: OpenCtiService.php:23-66]` |
| Exception translation | Inspecting HTTP status codes in the controller | Catch `OpenCtiConnectionException` → 502 | `OpenCtiService::query()` already raises typed exceptions. Controller only cares about connection-vs-query distinction. `[VERIFIED: OpenCtiService.php:44-56]` |
| Feature-gate enforcement | Custom `abort(403)` in controller | Use the `feature-gate` middleware alias | Already registered in `bootstrap/app.php:19` and wrapping the existing group at `api.php:70`. Zero per-route code. `[VERIFIED]` |
| Bearer auth enforcement | Custom `Auth::check()` in controller | Parent `auth:sanctum` middleware group at `api.php:47` | Wrapping the new route inside the existing nested group is a one-liner. `[VERIFIED]` |
| Response envelope | Custom `{"success": true, "data": ..., "errors": null}` | `response()->json(['data' => $result])` | Matches threat-actors, threat-news, dashboard — Phase 65 frontend's generic pagination helper already expects this shape. |
| Relationship edge flattening | `foreach`-based deduplication | `array_values(array_unique(array_filter(array_map(...))))` | The canonical chain used in `ThreatActorService::flattenRelationshipTargets()` (lines 214-220). For `attributed_to` dedup-by-id (D-20), the closure should key on `id`, not `name`. |
| Test HTTP client mocking | `Http::fake()` alone (won't intercept `OpenCtiService` method calls) | `app()->bind(OpenCtiService::class, fn () => Mockery::mock(...))` | `OpenCtiService::query()` is the mockable surface — `Http::fake` only intercepts the HTTP layer and forces tests to care about Bearer-token + retry mechanics. `[VERIFIED: ThreatActorIndexTest.php:65-76]` |

**Key insight:** Every single infrastructure concern in this phase has a one-line solution that already exists in the codebase. The only non-trivial work is (a) writing the GraphQL heredoc correctly (D-12 verification protects this) and (b) the normalizer (D-18/D-19 shape is fully specified). Everything else is pattern replication.

## Runtime State Inventory

Phase 60 is pure-greenfield backend file creation with zero rename, migration, or data-layer mutation. Nevertheless, per the research protocol:

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| **Stored data** | None — the new cache key `threat_campaigns:*` is created fresh on first access; no existing data uses this namespace. | None. |
| **Live service config** | None — no connector, dashboard, or external tool references `/api/threat-campaigns`. Phase 65 (frontend) will register the route path on its end when it ships. | None for Phase 60. |
| **OS-registered state** | None — no scheduled tasks, systemd units, or daemon processes consume this endpoint. Laravel auto-discovers routes via `RouteServiceProvider`; no manual registration. | None. |
| **Secrets / env vars** | `OPENCTI_URL` + `OPENCTI_TOKEN` — already required by `OpenCtiService::query()` (verified: `OpenCtiService.php:25-30`). No new secrets. | None. Existing `.env` and Railway config remain valid. |
| **Build artifacts / installed packages** | None — no new composer deps, no compiled assets. `php artisan route:list` will show the new route automatically on next boot; no cache:clear needed unless `config:cache` was run in prod (`php artisan route:cache` then `route:clear` if so). | Prod deploy: run `php artisan route:clear && php artisan route:cache` on Railway to pick up the new route if route caching is active. |

**Canonical question answered:** After every file in the repo is updated, the only runtime state that changes is Laravel's in-process route map (regenerated on boot) and a new cache key namespace (populated on first call). No migrations, no data rewrites, no external re-registration.

## Common Pitfalls

### Pitfall 1: Accidentally copying `IntrusionSetsOrdering` enum into campaigns heredoc

**What goes wrong:** Planner or executor copies the ThreatActorService heredoc wholesale and forgets to swap `IntrusionSetsOrdering` → `CampaignsOrdering`. The query parses, then OpenCTI rejects it with `"Unknown type IntrusionSetsOrdering for Campaign root"` (or similar). Tests mock `OpenCtiService` and return a fake payload, so **the error never surfaces in CI** — it only explodes in prod or a live-smoke test.

**Why it happens:** Too-aggressive copy-paste. SC4 explicitly guards against this (D-05).

**How to avoid:**
1. D-12 GraphiQL verification confirms `CampaignsOrdering` exists and documents its enum values.
2. `IndexTest.php` should add a test that asserts the GraphQL variables passed into `OpenCtiService::query()` — specifically, parse the heredoc argument and assert it contains `$orderBy: CampaignsOrdering` and does NOT contain `IntrusionSetsOrdering`. Mirror the `ThreatActorIndexTest.php:121-140` `withArgs` pattern but on the query string itself.
3. Code-review checklist item: grep the new service for `IntrusionSet` — zero results is the only acceptable answer.

**Warning signs:** Any OpenCTI response with a GraphQL validation error.

### Pitfall 2: Relationship direction inversion

**What goes wrong:** Executor copies `ThreatActorService::normalizeCampaigns()` (lines 626-638 — uses `fromTypes: ["Campaign"]` and reads `edge.node.from`). For Phase 60 the direction is inverted (D-10): from the Campaign node, the IntrusionSet lives at `toTypes: ["Intrusion-Set"]` and `edge.node.to`. Copying the wrong direction produces an empty `attributed_to` array for every campaign.

**Why it happens:** The word "attributed" is ambiguous — A is attributed to B could mean "A.relationships includes attributed-to → B" or "B.relationships includes attributed-to ← A". OpenCTI convention: `attributed-to` is a directed STIX SRO (from subject, to object) where `Campaign --attributed-to--> IntrusionSet`. Querying it from the Campaign side, the IntrusionSet is the `to`.

**How to avoid:**
1. D-10 is explicit: `toTypes: ["Intrusion-Set"]`, read `edge.node.to`.
2. The SC4 negative test will NOT catch this — it only checks for IntrusionSet-only fields bleeding in, not for correct attribution population. Add a separate positive test: `fakeCampaignsResponse()` returns an edge with `attributed_to.edges.[].node.to` populated, and the resulting item's `attributed_to` array is non-empty with the expected `{id, name}`.
3. D-12 GraphiQL verification item (3) proves the direction is correct on at least one real campaign.

**Warning signs:** Empty `attributed_to` arrays on every campaign, no matter what filter.

### Pitfall 3: Feature-gate trial-autoset masking 403 tests

**What goes wrong:** The default `User::factory()->create()` produces a user that passes the feature gate (active trial), because `User::booted()` auto-sets `trial_ends_at = now()->addDays(30)` when null (`User.php:83-87` `[VERIFIED]`). A 403-for-free-plan test that just does `$user = User::factory()->create(['plan_id' => $freePlan->id])` **returns 200** because the trial path in `FeatureGate::handle()` (`FeatureGate.php:19-25`) wins over the free-plan path.

**Why it happens:** Silent auto-upsert on model creation. The behavior is correct (new users get a 30-day trial), but it violates the "dumb factory" expectation.

**How to avoid:** For any 403 assertion, explicitly override `trial_ends_at` to the past:
```php
$plan = createPlan('free');                // from FeatureGateMiddlewareTest.php pattern
$user = User::factory()->create([
    'plan_id' => $plan->id,
    'trial_ends_at' => now()->subDay(),    // REQUIRED to kill the trial branch
]);
```
`[VERIFIED: FeatureGateMiddlewareTest.php:46-60]`.

**Warning signs:** Free-plan 403 test asserts `200` — first instinct is "middleware broken"; actual cause is "trial still active."

### Pitfall 4: Cache key collision between ThreatActor and ThreatCampaign

**What goes wrong:** Both services use `md5(json_encode(func_get_args()))`. If the namespace prefix is forgotten or typoed, two queries with identical args (both defaulting to `first=24, after=null, search=null, orderBy='modified', orderMode='desc'`) produce the same cache entry — one clobbers the other.

**Why it happens:** Copy-paste missing the namespace swap.

**How to avoid:** Namespace prefix (`'threat_campaigns:'` vs `'threat_actors:'`) is non-negotiable (D-13). Add a service-level unit test: call `list()` once, assert `Cache::has('threat_campaigns:' . md5(...))` is true and `Cache::has('threat_actors:' . md5(...))` is false. (Mirror of SC2 test, extended.)

**Warning signs:** Fresh cache returns the wrong resource; or a fresh run of `php artisan test` passes but a warm-cache run fails.

### Pitfall 5: OpenCTI unreachable during Phase 60 coding (off-network executor)

**What goes wrong:** D-12 mandates live GraphiQL verification. If the Phase 60 executor is off-network (parallel worktree, WFH VPN down, lab power issue), they cannot confirm `CampaignsOrdering` enum values or `objective` field name. Plan then stalls or — worse — executor writes the heredoc on assumption.

**Why it happens:** Phase 59 already hit this (see `59-02-GRAPHIQL-NOTES.md` — the Phase 59 task 0 resume signal documents the fallback pattern).

**How to avoid:** Adopt Phase 59's resume-signal discipline:
1. The plan's GraphiQL task must support a `deferred, using assumed shape from research` fallback.
2. Research (this file) documents the **assumed** query shape based on STIX 2.1 spec + cross-reference with `ThreatActorService` conventions. This is the fallback.
3. If the executor uses the fallback, the phase retrospective includes a follow-up task: someone on-network runs the D-12 checks and either confirms or files a diff PR.
4. The GraphQL nowdoc syntax + typed variables make a wrong assumption LOUD: OpenCTI returns a parse error, not silent bad data. This is the containment.

**Warning signs:** Executor replies with `deferred, using assumed shape from research` — this is acceptable; flag retrospective.

### Pitfall 6: `Cache::has()` returns false in tests despite `Cache::remember()` call

**What goes wrong:** In a test env with `CACHE_STORE=array` (verified: `phpunit.xml:26`), `Cache::flush()` between tests is **required** or the array driver carries state across tests within the same Pest process. Missing a `beforeEach(fn () => Cache::flush())` hook (see `EnrichmentTest.php:11` `[VERIFIED]`) leaks cache between tests and makes SC2's "twice in 15 min" assertion flaky.

**Why it happens:** Pest shares the application container across tests in the same file by default.

**How to avoid:** Add `beforeEach(fn () => Cache::flush())` at the top of `IndexTest.php` after `uses(RefreshDatabase::class)`. Matches `EnrichmentTest.php:11` exactly.

**Warning signs:** SC2 test passes in isolation (`--filter='caches results'`) but fails in full-file run.

## Code Examples

Verified patterns sourced from this codebase. Planner should cite these line numbers in task actions.

### Skeleton: `ThreatCampaignService::list()` + `executeQuery()`

```php
// Source pattern: backend/app/Services/ThreatActorService.php:29-144 [VERIFIED]
// Campaign-specific query shape pending D-12 GraphiQL verification.

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class ThreatCampaignService
{
    public function __construct(
        private readonly OpenCtiService $openCti,
    ) {}

    public function list(
        int $first = 24,
        ?string $after = null,
        ?string $search = null,
        string $orderBy = 'modified',
        string $orderMode = 'desc',
    ): array {
        $cacheKey = 'threat_campaigns:' . md5(json_encode(func_get_args()));

        return Cache::remember(
            $cacheKey,
            now()->addMinutes(15),
            fn () => $this->executeQuery($first, $after, $search, $orderBy, $orderMode),
        );
    }

    private function executeQuery(
        int $first,
        ?string $after,
        ?string $search,
        string $orderBy,
        string $orderMode,
    ): array {
        // D-12: Query shape verified against OpenCTI GraphiQL at
        // http://192.168.251.20:8080/graphql on {date}:
        //   - CampaignsOrdering enum includes: modified, first_seen, last_seen, created, name
        //   - `campaigns` root accepts (first, after, search, orderBy, orderMode, filters)
        //   - `stixCoreRelationships(relationship_type: "attributed-to", toTypes: ["Intrusion-Set"])`
        //     returns `edge.node.to` with inline fragment `... on IntrusionSet { id name }`
        //   - `objective` confirmed as direct field on Campaign (STIX 2.1 SDO)
        //   - `confidence` {included | omitted} — decision {rationale}
        $graphql = <<<'GRAPHQL'
        query (
            $first: Int!,
            $after: ID,
            $search: String,
            $orderBy: CampaignsOrdering,
            $orderMode: OrderingMode,
            $filters: FilterGroup
        ) {
            campaigns(
                first: $first
                after: $after
                search: $search
                orderBy: $orderBy
                orderMode: $orderMode
                filters: $filters
            ) {
                edges {
                    node {
                        id
                        name
                        description
                        first_seen
                        last_seen
                        objective
                        aliases
                        modified
                        created
                        objectLabel {
                            edges {
                                node {
                                    id
                                    value
                                    color
                                }
                            }
                        }
                        externalReferences {
                            edges {
                                node {
                                    source_name
                                    url
                                    description
                                }
                            }
                        }
                        attributed_to: stixCoreRelationships(
                            relationship_type: "attributed-to"
                            toTypes: ["Intrusion-Set"]
                            first: 10
                        ) {
                            edges {
                                node {
                                    to {
                                        ... on IntrusionSet {
                                            id
                                            name
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                pageInfo {
                    hasNextPage
                    hasPreviousPage
                    startCursor
                    endCursor
                    globalCount
                }
            }
        }
        GRAPHQL;

        $variables = [
            'first' => $first,
            'after' => $after,
            'search' => $search ?: null,
            'orderBy' => $orderBy,
            'orderMode' => $orderMode,
        ];

        $data = $this->openCti->query($graphql, $variables);

        return $this->normalizeResponse($data);
    }

    private function normalizeResponse(array $data): array
    {
        $connection = $data['campaigns'];
        $edges = $connection['edges'] ?? [];
        $pageInfo = $connection['pageInfo'] ?? [];

        $items = array_map(function (array $edge) {
            $node = $edge['node'];

            return [
                'id' => $node['id'],
                'name' => $node['name'],
                'description' => $node['description'] ?? null,
                'objective' => $node['objective'] ?? null,
                'aliases' => $node['aliases'] ?? [],
                'first_seen' => $node['first_seen'] ?? null,
                'last_seen' => $node['last_seen'] ?? null,
                'modified' => $node['modified'] ?? null,
                'created' => $node['created'] ?? null,
                'labels' => $this->flattenLabels(
                    $node['objectLabel']['edges'] ?? [],
                ),
                'external_references' => $this->flattenExternalReferences(
                    $node['externalReferences']['edges'] ?? [],
                ),
                'attributed_to' => $this->flattenAttributedTo(
                    $node['attributed_to']['edges'] ?? [],
                ),
            ];
        }, $edges);

        return [
            'items' => $items,
            'pagination' => [
                'has_next' => $pageInfo['hasNextPage'] ?? false,
                'has_previous' => $pageInfo['hasPreviousPage'] ?? false,
                'start_cursor' => $pageInfo['startCursor'] ?? null,
                'end_cursor' => $pageInfo['endCursor'] ?? null,
                'total' => $pageInfo['globalCount'] ?? null,
            ],
        ];
    }

    /**
     * D-20: Dedupe attributed_to by id. OpenCTI may return multiple edges
     * pointing to the same IntrusionSet when multiple relationship objects exist.
     */
    private function flattenAttributedTo(array $edges): array
    {
        $seen = [];
        $out = [];
        foreach ($edges as $edge) {
            $to = $edge['node']['to'] ?? null;
            if (!is_array($to) || empty($to['id'])) {
                continue;
            }
            if (isset($seen[$to['id']])) {
                continue;
            }
            $seen[$to['id']] = true;
            $out[] = [
                'id' => $to['id'],
                'name' => $to['name'] ?? null,
            ];
        }
        return $out;
    }

    private function flattenLabels(array $edges): array
    {
        return array_map(
            fn (array $edge) => [
                'id' => $edge['node']['id'] ?? null,
                'value' => $edge['node']['value'] ?? null,
                'color' => $edge['node']['color'] ?? null,
            ],
            $edges,
        );
    }

    private function flattenExternalReferences(array $edges): array
    {
        return array_map(
            fn (array $edge) => [
                'source_name' => $edge['node']['source_name'] ?? null,
                'url' => $edge['node']['url'] ?? null,
                'description' => $edge['node']['description'] ?? null,
            ],
            $edges,
        );
    }
}
```

### Skeleton: `ThreatCampaign\IndexController`

```php
// Source pattern: backend/app/Http/Controllers/ThreatActor/IndexController.php:1-46 [VERIFIED]

namespace App\Http\Controllers\ThreatCampaign;

use App\Exceptions\OpenCtiConnectionException;
use App\Http\Controllers\Controller;
use App\Services\ThreatCampaignService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IndexController extends Controller
{
    /**
     * List OpenCTI campaigns.
     *
     * GET /api/threat-campaigns
     * Query params: after, search, sort, order
     */
    public function __invoke(Request $request): JsonResponse
    {
        $after = $request->query('after');
        $search = $request->query('search');
        $sort = $request->query('sort', 'modified');
        $order = $request->query('order', 'desc');

        try {
            $data = app(ThreatCampaignService::class)->list(
                24,
                $after,
                $search,
                $sort,
                $order,
            );
        } catch (OpenCtiConnectionException) {
            return response()->json([
                'message' => 'Unable to load campaigns. Please try again.',
            ], 502);
        }

        return response()->json(['data' => $data]);
    }
}
```

### Skeleton: Route registration (single-line diff)

Location: `backend/routes/api.php` `[VERIFIED]`. Add:

1. **Import (top of file, alphabetical near existing ThreatActor import — around line 19-20):**
   ```php
   use App\Http\Controllers\ThreatCampaign\IndexController as ThreatCampaignIndexController;
   ```
2. **Route (inside `Route::middleware('feature-gate')->group(...)` block — current block spans lines 70-90, between the existing threat-actors and threat-news entries or alongside them):**
   ```php
   // Threat campaigns
   Route::get('/threat-campaigns', ThreatCampaignIndexController::class);
   ```

Verification: after merging, `php artisan route:list | grep threat-campaigns` must show the route with middleware `api,auth:sanctum,feature-gate`.

### Skeleton: `ThreatCampaign/IndexTest.php`

```php
// Source pattern: backend/tests/Feature/ThreatActor/ThreatActorIndexTest.php [VERIFIED]
// + backend/tests/Feature/FeatureGate/FeatureGateMiddlewareTest.php for plan seeding [VERIFIED]

use App\Models\Plan;
use App\Models\User;
use App\Services\OpenCtiService;
use App\Services\ThreatCampaignService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;

uses(RefreshDatabase::class);

beforeEach(fn () => Cache::flush());   // Pitfall 6 — array-driver state carries across tests

function fakeCampaignsResponse(int $count = 2): array
{
    $edges = [];
    for ($i = 1; $i <= $count; $i++) {
        $edges[] = [
            'node' => [
                'id' => "campaign-{$i}",
                'name' => "Operation {$i}",
                'description' => "Description for Operation {$i}",
                'first_seen' => '2024-01-15T10:30:00.000Z',
                'last_seen' => '2025-06-20T14:00:00.000Z',
                'objective' => "Steal data for Operation {$i}",
                'aliases' => ["AliasA{$i}", "AliasB{$i}"],
                'modified' => '2025-06-20T14:00:00.000Z',
                'created' => '2024-01-15T10:30:00.000Z',
                'objectLabel' => [
                    'edges' => [
                        ['node' => ['id' => "label-{$i}", 'value' => 'espionage', 'color' => '#cc0000']],
                    ],
                ],
                'externalReferences' => [
                    'edges' => [
                        ['node' => [
                            'source_name' => 'mitre-attack',
                            'url' => "https://attack.mitre.org/campaigns/C{$i}",
                            'description' => "MITRE ref for Operation {$i}",
                        ]],
                    ],
                ],
                'attributed_to' => [
                    'edges' => [
                        ['node' => ['to' => ['id' => "intrusion-set-apt{$i}", 'name' => "APT{$i}"]]],
                    ],
                ],
            ],
        ];
    }

    return [
        'campaigns' => [
            'edges' => $edges,
            'pageInfo' => [
                'hasNextPage' => true,
                'hasPreviousPage' => false,
                'startCursor' => 'cursor-start',
                'endCursor' => 'cursor-end',
                'globalCount' => 50,
            ],
        ],
    ];
}

function mockOpenCtiForCampaigns(array $response = null): void
{
    $response ??= fakeCampaignsResponse();
    app()->bind(OpenCtiService::class, function () use ($response) {
        $mock = Mockery::mock(OpenCtiService::class);
        $mock->shouldReceive('query')->andReturn($response);
        return $mock;
    });
}

function createPlan(string $slug): Plan
{
    return Plan::create([
        'slug' => $slug,
        'name' => ucfirst($slug),
        'daily_credit_limit' => 10,
        'price_cents' => $slug === 'free' ? 0 : 1000,
        'is_popular' => false,
        'sort_order' => 1,
        'is_active' => true,
        'features' => ['test'],
        'description' => "Test {$slug} plan",
    ]);
}

// --- Service-level: SC1 (shape) ---
test('list returns normalized campaigns with all fields', function () {
    mockOpenCtiForCampaigns();
    $result = app(ThreatCampaignService::class)->list();

    expect($result)->toHaveKeys(['items', 'pagination']);
    expect($result['items'])->toHaveCount(2);

    $c = $result['items'][0];
    expect($c)->toHaveKeys([
        'id', 'name', 'description', 'objective', 'aliases',
        'first_seen', 'last_seen', 'modified', 'created',
        'labels', 'external_references', 'attributed_to',
    ]);
    expect($c['attributed_to'])->toBe([['id' => 'intrusion-set-apt1', 'name' => 'APT1']]);
});

// --- SC4 (negative): no IntrusionSet-only fields bleed ---
test('list never emits IntrusionSet-only fields', function () {
    mockOpenCtiForCampaigns();
    $result = app(ThreatCampaignService::class)->list();

    foreach ($result['items'] as $item) {
        expect($item)->not->toHaveKey('primary_motivation');
        expect($item)->not->toHaveKey('resource_level');
        expect($item)->not->toHaveKey('goals');
        expect($item)->not->toHaveKey('motivation');
    }
});

// --- SC4 (positive): CampaignsOrdering in the heredoc, NOT IntrusionSetsOrdering ---
test('list uses CampaignsOrdering enum (SC4 heredoc check)', function () {
    app()->bind(OpenCtiService::class, function () {
        $mock = Mockery::mock(OpenCtiService::class);
        $mock->shouldReceive('query')
            ->withArgs(function (string $graphql, array $variables) {
                expect($graphql)->toContain('$orderBy: CampaignsOrdering');
                expect($graphql)->not->toContain('IntrusionSetsOrdering');
                expect($graphql)->not->toContain('intrusionSets(');
                expect($graphql)->toContain('campaigns(');
                return true;
            })
            ->andReturn(fakeCampaignsResponse(0));
        return $mock;
    });
    app(ThreatCampaignService::class)->list();
});

// --- SC2: cache hit on second call (CAMP-08) ---
test('list caches results for 15 minutes (SC2)', function () {
    mockOpenCtiForCampaigns();
    Cache::flush();

    $result1 = app(ThreatCampaignService::class)->list();
    expect($result1['items'])->toHaveCount(2);

    // Assert the key exists after call 1 (D-14)
    // Cache key uses func_get_args() so reconstruct it:
    $expectedKey = 'threat_campaigns:' . md5(json_encode([24, null, null, 'modified', 'desc']));
    expect(Cache::has($expectedKey))->toBeTrue();

    // Replace mock to return different data; cached result should still be 2 items
    app()->bind(OpenCtiService::class, function () {
        $mock = Mockery::mock(OpenCtiService::class);
        $mock->shouldReceive('query')->andReturn(fakeCampaignsResponse(1));
        return $mock;
    });
    $result2 = app(ThreatCampaignService::class)->list();
    expect($result2['items'])->toHaveCount(2); // cached, not 1
});

// --- HTTP level ---
test('GET /api/threat-campaigns returns 200 for authenticated trial user', function () {
    mockOpenCtiForCampaigns();
    $user = User::factory()->create(); // trial auto-activated by User::booted()
    $response = $this->actingAs($user)->getJson('/api/threat-campaigns');
    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                'items',
                'pagination' => ['has_next', 'has_previous', 'start_cursor', 'end_cursor', 'total'],
            ],
        ]);
});

test('GET /api/threat-campaigns returns 401 for unauthenticated', function () {
    $this->getJson('/api/threat-campaigns')->assertStatus(401);
});

// --- SC3: free-plan 403 ---
test('GET /api/threat-campaigns returns 403 for free-plan user with expired trial (SC3)', function () {
    mockOpenCtiForCampaigns();
    $plan = createPlan('free');
    $user = User::factory()->create([
        'plan_id' => $plan->id,
        'trial_ends_at' => now()->subDay(),    // Pitfall 3 — kill the trial branch
    ]);
    $response = $this->actingAs($user)->getJson('/api/threat-campaigns');
    $response->assertStatus(403)
        ->assertJsonPath('error', 'upgrade_required')
        ->assertJsonPath('message', 'Upgrade your plan to access this feature');
});

// --- SC3: paid plan 200 ---
test('GET /api/threat-campaigns returns 200 for basic-plan user (SC3)', function () {
    mockOpenCtiForCampaigns();
    $plan = createPlan('basic');
    $user = User::factory()->create(['plan_id' => $plan->id]);
    $response = $this->actingAs($user)->getJson('/api/threat-campaigns');
    $response->assertStatus(200);
});

// --- 502 on OpenCTI connection failure ---
test('GET /api/threat-campaigns returns 502 on connection failure', function () {
    app()->bind(OpenCtiService::class, function () {
        $mock = Mockery::mock(OpenCtiService::class);
        $mock->shouldReceive('query')
            ->andThrow(new \App\Exceptions\OpenCtiConnectionException('Connection failed'));
        return $mock;
    });
    $user = User::factory()->create();
    $response = $this->actingAs($user)->getJson('/api/threat-campaigns');
    $response->assertStatus(502)
        ->assertJsonPath('message', 'Unable to load campaigns. Please try again.');
});
```

### Reference: Verified exact line ranges in `ThreatActorService.php`

The CONTEXT.md cited specific line numbers — they were **confirmed by direct read on 2026-04-18**:

| Quoted reference | Confirmed in current file (779 lines total) |
|------------------|---------------------------------------------|
| Cache key convention "line 37" | Line 37 exactly: `$cacheKey = 'threat_actors:' . md5(json_encode(func_get_args()));` ✓ |
| `list()` signature "lines 29-44" | Lines 29-44 ✓ (decl at 29, close at 44) |
| `normalizeResponse()` shape "lines 169-209" | Lines 169-209 ✓ (definition 169, return at 199-208) |
| Flatten helpers "lines 211-235" | Lines 211-235 ✓ (`flattenRelationshipTargets` 214-220, `flattenExternalReferences` 222-235) |
| `normalizeCampaigns` (inverse-direction reference) | Lines 626-638 (uses `fromTypes: ["Campaign"]`, extracts from `edge.node.from`). **Phase 60 is the inverse direction** (D-10). |

### Reference: Exact test-file line ranges for structure parity

`backend/tests/Feature/ThreatActor/ThreatActorIndexTest.php` `[VERIFIED]`:

| Section | Lines | Purpose |
|---------|-------|---------|
| `uses(RefreshDatabase::class)` | 8 | Required for any test that touches the DB (SC3 plan seeding). |
| `fakeIntrusionSetsResponse()` | 10-63 | Fixture builder — Phase 60 mirrors as `fakeCampaignsResponse()`. |
| `mockOpenCtiForActors()` | 65-76 | Service-binding mock helper — mirror as `mockOpenCtiForCampaigns()`. |
| SC1 equivalent (shape test) | 78-104 | "list returns normalized threat actors with all fields". |
| Pagination shape test | 106-119 | Assertion pattern for the 5-key pagination object. |
| Cache test | 188-210 | SC2 equivalent for CAMP-08. |
| 401/502 HTTP tests | 238-277 | Mirror precisely. |

`backend/tests/Feature/FeatureGate/FeatureGateMiddlewareTest.php` `[VERIFIED]`:

| Section | Lines | Purpose |
|---------|-------|---------|
| `createPlan($slug)` helper | 31-44 | Reusable for Phase 60 — copy verbatim into `IndexTest.php`. |
| Free-plan 403 test shape | 46-60 | Mirror for SC3. |
| Basic-plan 200 test shape | 62-71 | Mirror for SC3. |

### Reference: Route registration location in `api.php`

Feature-gate group spans lines **70-90** `[VERIFIED]`. Existing entries for context:

- **Line 70:** `Route::middleware('feature-gate')->group(function () {`
- **Line 76:** `Route::get('/threat-actors', ThreatActorIndexController::class);`
- **Line 77:** `Route::get('/threat-actors/{id}/enrichment', ThreatActorEnrichmentController::class);`
- **Line 80:** `Route::get('/threat-news', ThreatNewsIndexController::class);`
- **Line 90:** `});` (close of feature-gate group)

Best insertion point: after line 77 (immediately following the threat-actor routes) — semantic grouping of OpenCTI list endpoints.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Campaigns shown as sub-list inside Threat Actor enrichment (`ThreatActorService::normalizeCampaigns`, lines 626-638) | Dedicated `/api/threat-campaigns` list endpoint with full field set | v6.1 (this phase) | Phase 65 frontend can show campaigns as a first-class page view; existing sub-list stays (CONTEXT.md D-12 in Phase 59: "existing `campaigns` sub-query stays in the enrichment response"). |
| Single-file hardcoded `first: 100` GraphQL queries | Typed `$first: Int!` variable, user-selectable cap (per ThreatMapService pattern) | v6.1 (Phase 59) | Established the pattern this phase reuses. |
| One-off shape guesses for OpenCTI GraphQL | Mandatory live GraphiQL verification with code-comment provenance | v6.1 (Phase 59) | Reduces the "works in my test, breaks in prod" class of bug. |

**Deprecated/outdated:**
- None — this is a net-new endpoint following an already-ratified Phase 59 pattern.

## Assumptions Log

These claims were NOT verified in this research session; they are based on STIX 2.1 spec, OpenCTI documentation, and cross-reference to existing code. D-12's live GraphiQL session must verify each one before the heredoc ships.

| # | Claim | Section | Risk if Wrong | Mitigation |
|---|-------|---------|---------------|------------|
| A1 | `CampaignsOrdering` enum exists and includes `modified`, `first_seen`, `last_seen`, `created`, `name` as valid values | GraphQL heredoc | OpenCTI rejects query at parse time with GraphQL validation error — 500 via `OpenCtiQueryException`. Tests with mocked service pass, live breaks loudly. | D-12 confirms. Test `SC4 heredoc check` asserts presence of `$orderBy: CampaignsOrdering` in the query string but cannot assert it's a valid enum on the OpenCTI side (only a live probe can). |
| A2 | `objective` is the direct field name on OpenCTI Campaign SDO (STIX 2.1) — not `x_opencti_objective` or similar | GraphQL heredoc + normalizer | Returned node has `objective = null` for every campaign; normalizer silently produces `null` — a **silent wrong** outcome. | D-12 confirms. If the field is `x_opencti_objective`, swap both the heredoc selection and the normalizer key. |
| A3 | `stixCoreRelationships(relationship_type: "attributed-to", toTypes: ["Intrusion-Set"])` queried from the Campaign node resolves to `edge.node.to { ... on IntrusionSet { id name } }` | GraphQL heredoc + `flattenAttributedTo` | Empty `attributed_to` arrays on every campaign (Pitfall 2). | D-12 confirms. If the live schema has a different alias or `toTypes` literal (e.g. `"IntrusionSet"` without hyphen), adjust. |
| A4 | `confidence` is an optional STIX field on Campaign | Claude's Discretion area | Executor adds `confidence` to heredoc, OpenCTI rejects with "Unknown field `confidence` on Campaign"; test mocks still pass, live breaks. | D-12 confirms. Default to OMITTING `confidence` unless verification says "zero-cost." |
| A5 | OpenCTI's Campaign SDO exposes `objectLabel` with `{edges {node {id, value, color}}}` shape identical to IntrusionSet's | heredoc labels selection | Labels returned as empty/null when they should be populated. | D-12 can verify in the same session — query one known campaign, inspect the `objectLabel` structure. |
| A6 | OpenCTI route `campaigns(first, after, search, orderBy, orderMode, filters)` matches the threat-actors `intrusionSets(...)` signature exactly | GraphQL heredoc args | Query fails to validate arguments; 500 via `OpenCtiQueryException`. | D-12 confirms. The OpenCTI schema convention is uniform across SDOs, so this is HIGH-confidence assumed, but MUST be live-checked. |
| A7 | `FeatureGate` middleware behavior unchanged since Phase 59 (free → 403; active trial → 200; paid plan → 200) | Controller / test SC3 expectations | SC3 tests break, or worse, the endpoint is inadvertently accessible to free users. | Source file `FeatureGate.php` was directly read during this research (`[VERIFIED 2026-04-18]`, lines 1-37); behavior matches. No migrations touching `plans` or `users` since v6.0 affect the gate logic. |
| A8 | `CACHE_STORE=array` remains the test env default | SC2 cache-assertion design | `Cache::has()` might not behave deterministically across drivers (file/database/redis). | Verified via `backend/phpunit.xml:26` `[VERIFIED]`. Change would require a deliberate env override. |

## Open Questions (RESOLVED)

1. **Is `confidence` worth including if D-12 finds it exists?**
   - What we know: CONTEXT.md Claude's Discretion says "add only if zero-cost during GraphiQL verification and the field exists on Campaign."
   - What's unclear: Whether Phase 65 needs it, and whether excluding it now forces a future backward-incompatible cache-key bump (new field → same cache key → stale data).
   - RESOLVED: **Omit `confidence` in Phase 60.** Cache keys are param-based, not field-based, so a later addition requires no cache bump. Deferring keeps the SC4 negative-bleed test tighter.

2. **Should the route be throttled beyond `auth:sanctum`?**
   - What we know: D-17 says no additional middleware. Threat-actors is also unthrottled.
   - What's unclear: Whether campaign pagination could be abused as a scrape vector (cache hides most of it).
   - RESOLVED: **Follow D-17** (no throttle). Revisit in a future hardening phase if analytics show abuse. The 15-min cache + OpenCTI's own rate limits are the mitigation.

3. **Where exactly inside the feature-gate group should the route go?**
   - What we know: D-15 says "inside the existing feature-gate group." CONTEXT.md canonical refs say "lines 77-86."
   - What's unclear: Current file layout has threat-actors (76-77), threat-news (80-81), threat-map stream (84), dashboard (87-89).
   - RESOLVED: **Insert immediately after line 77** (the threat-actors enrichment route), with a `// Threat campaigns` comment above. Semantic grouping of OpenCTI list endpoints.

4. **Does Phase 65 want `labels` on the list response, or just on the detail modal?**
   - What we know: D-06 locks labels into the list response.
   - What's unclear: Whether Phase 65's `CampaignCard` grid will render labels (potentially visual clutter) or only the detail modal.
   - RESOLVED: **Keep labels in the list response per D-06.** Payload weight is negligible; Phase 65 can choose not to render them. Backward-compat for free.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| PHP 8.2+ | Backend runtime | ✓ | per `backend/composer.json` `[VERIFIED]` | — |
| Composer | Dep install | ✓ | — | — |
| Laravel 12 | Framework | ✓ | ^12.0 `[VERIFIED: composer.json]` | — |
| Pest 3.8 + Mockery 1.6 | Test runner | ✓ | `[VERIFIED: composer.json]` | — |
| PostgreSQL | Prod DB | ✓ | Railway addon | SQLite `:memory:` in `backend/phpunit.xml` test env `[VERIFIED]` |
| OpenCTI live GraphiQL | D-12 verification (ONE-TIME, pre-coding) | ⚠ conditional | 5.x/6.x at `http://192.168.251.20:8080/graphql` | **If off-network:** adopt Phase 59's resume-signal pattern (`59-02-GRAPHIQL-NOTES.md` `[VERIFIED]`) — proceed with the assumed shape in this RESEARCH.md, flag a retrospective task for on-network verification. |
| Laragon / local `php artisan` | Local dev loop | ✓ | per PROJECT.md Constraints | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** OpenCTI network access for D-12. If unreachable, proceed using the assumed GraphQL shape documented in the **Assumptions Log** section above. Schedule an on-network verification as a phase-retrospective task. The codebase mitigations (nowdoc-forced parameterization, typed variables, exception translation) mean a wrong assumption surfaces LOUDLY at runtime, not silently.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Pest 3.8 on PHPUnit 11 `[VERIFIED: composer.json]` |
| Config file | `backend/phpunit.xml` (Laravel 12 default) + `backend/tests/Pest.php` |
| Quick run command | `cd backend && php artisan test --filter=ThreatCampaign` |
| Full suite command | `cd backend && composer test` (runs `config:clear` + `artisan test`) |
| Estimated runtime | ~10 seconds targeted filter / ~60 seconds full feature suite |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| **SC1 (CAMP-07)** | `/api/threat-campaigns` returns list with `id`, `name`, `description`, `first_seen`, `last_seen`, `objective`, `attributed_to` (array of `{id, name}`) | feature (service) | `php artisan test --filter='list returns normalized campaigns with all fields'` | Wave 0: CREATE `tests/Feature/ThreatCampaign/IndexTest.php` |
| **SC1 (CAMP-07)** | HTTP endpoint returns 200 with `{data: {items, pagination}}` envelope for authenticated trial user | feature (HTTP) | `php artisan test --filter='GET /api/threat-campaigns returns 200 for authenticated trial user'` | Wave 0: same file |
| **SC2 (CAMP-08)** | Second call within 15 min returns from cache; `Cache::has('threat_campaigns:...')` true after call 1 | feature (service) | `php artisan test --filter='list caches results for 15 minutes'` | Wave 0: same file |
| **SC3 (CAMP-07)** | Free-plan user with expired trial receives 403 `upgrade_required` | feature (HTTP) | `php artisan test --filter='403 for free-plan user'` | Wave 0: same file |
| **SC3 (CAMP-07)** | Basic-plan paid user receives 200 | feature (HTTP) | `php artisan test --filter='200 for basic-plan user'` | Wave 0: same file |
| **SC3 (CAMP-07)** | `php artisan route:list \| grep threat-campaigns` shows middleware `auth:sanctum,feature-gate` | manual (CLI) | `cd backend && php artisan route:list --path=threat-campaigns` | Wave 0: new; run once post-route registration; capture output into the plan's verification log |
| **SC4 (CAMP-07)** | Response NEVER contains keys `primary_motivation`, `resource_level`, `goals`, `motivation` | feature (service) | `php artisan test --filter='list never emits IntrusionSet-only fields'` | Wave 0: same file |
| **SC4 (CAMP-07)** | GraphQL heredoc contains `$orderBy: CampaignsOrdering` + `campaigns(` and NOT `IntrusionSetsOrdering` / `intrusionSets(` | feature (service) | `php artisan test --filter='list uses CampaignsOrdering enum'` | Wave 0: same file |
| CAMP-07 (error path) | `OpenCtiConnectionException` → 502 with user-safe message | feature (HTTP) | `php artisan test --filter='returns 502 on connection failure'` | Wave 0: same file |
| CAMP-07 (auth path) | Unauthenticated request → 401 | feature (HTTP) | `php artisan test --filter='returns 401 for unauthenticated'` | Wave 0: same file |
| CAMP-07 (attribution) | `attributed_to` is normalized to array of `{id, name}`, deduped by id | feature (service) | `php artisan test --filter='attributed_to normalization'` (add this test) | Wave 0: same file |
| D-12 live verification | OpenCTI GraphiQL schema confirms assumed shape | manual (external) | n/a — one-time human action at `http://192.168.251.20:8080/graphql`; record findings as code-comment above the heredoc and in `60-XX-GRAPHIQL-NOTES.md` | Wave 0: GraphiQL session task (mirror Phase 59 pattern) |

### What constitutes "validated" for each Success Criterion

- **SC1** ✅ when: service test asserts all 12 item keys present with expected types; HTTP test asserts envelope structure `{data: {items, pagination}}`; pagination has 5 required keys.
- **SC2** ✅ when: cache-hit test passes with mock swap proving second call skips `query()`; `Cache::has($expectedKey)` returns true after call 1.
- **SC3** ✅ when: free-plan 403 test, basic-plan 200 test, and `route:list` CLI output all pass. All three are required — the middleware could be stripped and the tests could still pass if `route:list` is not checked.
- **SC4** ✅ when: negative-field-bleed test passes AND heredoc-enum test passes. Both are required — the first catches normalizer bugs, the second catches query bugs.

### Sampling Rate

- **Per task commit:** `cd backend && php artisan test --filter=ThreatCampaign` (covers all Phase 60 tests; ~5-10s)
- **Per wave merge:** `cd backend && php artisan test tests/Feature/ThreatCampaign tests/Feature/ThreatActor tests/Feature/FeatureGate` (includes regression of the feature-gate middleware behavior this phase depends on)
- **Phase gate (`/gsd-verify-work`):** `cd backend && composer test` (full suite green) + `php artisan route:list --path=threat-campaigns` output attached to verification log + D-12 GraphiQL session findings documented in a `60-XX-GRAPHIQL-NOTES.md` file
- **Max feedback latency:** under 10 seconds for the targeted filter; the full suite is ~60 seconds

### Wave 0 Gaps

- [ ] **CREATE `backend/tests/Feature/ThreatCampaign/IndexTest.php`** — does not exist (directory itself is new). Covers SC1–SC4 + 401 + 502 + attribution-normalization.
- [ ] **CREATE `backend/tests/Feature/ThreatCampaign/` directory** — parent directory for the test file.
- [ ] **D-12 GraphiQL verification session** — external, one-time, pre-heredoc-commit. Mirror `59-02-GRAPHIQL-NOTES.md` structure. If off-network: file a resume-signal `deferred, using assumed shape from research (CampaignsOrdering + objective + attributed_to via toTypes=[Intrusion-Set])` and proceed.
- [ ] **Framework install: none needed.** Pest + Mockery + Laravel 12 + all dev deps already in `composer.json`. Confirmed via `[VERIFIED]` read.

### Validation Sign-Off

- All SC1–SC4 map to at least one automated test ✓
- No 3 consecutive tasks without automated verify ✓ (every task below ties to a Pest filter)
- Wave 0 covers all MISSING references ✓ (the directory and file are the only missing artifacts)
- No watch-mode flags ✓ (all commands are one-shot)
- Feedback latency < 30s ✓ (filter runs in < 10s)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | `auth:sanctum` inherited from parent middleware group (api.php:47). Bearer token on all `/api/*` except the explicit public routes (plans, ip-search, enterprise contact, threat-map snapshot). No changes to auth posture. |
| V3 Session Management | no | Stateless API; Sanctum token-based. |
| V4 Access Control | yes | `feature-gate` middleware enforces plan tier. Free-plan users receive 403. Verified test coverage via SC3. No IDOR risk (endpoint is a list, no resource ID in URL). |
| V5 Input Validation | yes | Four query params (`after`, `search`, `sort`, `order`) — all typed via GraphQL variables; no string interpolation into heredoc. `sort`/`order` are passed through to OpenCTI which rejects invalid enums with `OpenCtiQueryException` (returns 500). Consider optional allow-list on `sort` if UX requires 422 for bad values — D-16 defers to inline read so this is intentionally permissive. |
| V6 Cryptography | no | No new crypto. `md5(json_encode(...))` used for cache key derivation only (non-security use). |
| V7 Error Handling | yes | `OpenCtiConnectionException` → 502 with generic user-safe message. `OpenCtiQueryException` bubbles to Laravel's default 500 (matches threat-actors index behavior). Do NOT expose OpenCTI error details in the 502 response. |
| V11 Business Logic | yes | Endpoint is idempotent GET, no credit deduction, no side effects. Cache key derived server-side from `func_get_args()`, not from raw user input — cache-poisoning safe. |
| V13 API Security | yes | JSON responses only. No CORS changes (inherits global config). OpenCTI Bearer token lives in `config/services.php`, never in response bodies. |

### Known Threat Patterns for Laravel 12 + OpenCTI proxy

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| GraphQL injection via `?search` | Tampering | Passed as `$search: String` GraphQL variable; nowdoc heredoc prevents PHP interpolation; OpenCTI treats the value as a string, not code. ✓ Safe. |
| Resource exhaustion via `?first=1000000` | DoS | `$first` is hardcoded server-side to `24` in the controller (D-04). Users cannot override. ✓ Safe. |
| Sensitive data in error responses | Info Disclosure | Controller returns generic `"Unable to load campaigns. Please try again."` on connection failure. OpenCTI error details stay server-side in Laravel logs. ✓ Safe. |
| Feature-gate bypass via route registration outside the group | Privilege Escalation | Route MUST be inside `Route::middleware('feature-gate')->group(...)` block (D-15). Code review + SC3 test (`route:list` CLI check) catches this. |
| Cache key collision with another namespace | Tampering (server-side) | Namespace prefix `threat_campaigns:` prevents collision with `threat_actors:` / `threat_map:` / `threat_actor_enrichment:`. Verified by Pitfall 4 mitigation test. |
| Log flooding via repeated bad queries | DoS (log volume) | Bad queries throw `OpenCtiQueryException` → 500 — Laravel's default exception handler logs once per request; no per-item iteration. ✓ Bounded. |
| Credential leak via debug helpers | Info Disclosure | Do NOT add `dd()`, `dump()`, `Log::debug(...full response...)`. `OpenCtiService` already hides the Bearer token. ✓ Via code review. |
| Authorization bypass via `?view=campaigns` URL param | N/A (future risk) | Phase 60 does not read `?view`; Phase 65 (frontend) uses it for view toggle. Backend is view-agnostic. ✓ No surface here. |

## Project Constraints (from CLAUDE.md)

`./CLAUDE.md` is present at the repo root. Directives relevant to this phase:

| Directive | Source | How Phase 60 complies |
|-----------|--------|------------------------|
| Backend is Laravel 11 (PHP) on Railway with PostgreSQL | CLAUDE.md Tech Stack | Phase 60 adds Laravel controller + service + Pest tests; PostgreSQL unchanged. (Note: CLAUDE.md says Laravel 11; `composer.json` shows `^12.0` — likely an outdated CLAUDE.md note. Stack is functionally the same — services/DI/middleware work identically.) |
| OAuth callbacks use custom domain | CLAUDE.md Deployment | Not touched by Phase 60. |
| Railway CLI does not work in non-interactive terminals | CLAUDE.md Deployment | Phase 60 requires no Railway deploy steps; local test run only. Prod deploy follows existing Git → Railway flow. |
| No TypeScript | CLAUDE.md Gotchas | Phase 60 is backend PHP only. ✓ |
| No tests exist | CLAUDE.md Gotchas | **Stale — tests do exist** (see `tests/Feature/ThreatActor/`, `FeatureGate/`, 16 feature test directories verified). Phase 60 extends the existing Pest suite. |
| No linter/formatter configured | CLAUDE.md Gotchas | Phase 60 follows existing PSR-12 style by convention; no tooling added. |

**Security from global rules (`~/.claude/rules/common/security.md`):** Pre-commit checklist (no hardcoded secrets, inputs validated, SQL injection prevention, XSS prevention) — Phase 60 ✓ all: no secrets added; inputs validated at service boundary (typed GraphQL variables); no raw SQL (Eloquent/GraphQL only); no HTML output (JSON only).

**Testing from global rules (`~/.claude/rules/common/testing.md`):** Minimum 80% coverage, TDD workflow — Phase 60 covers SC1–SC4 + 401 + 502 + attribution + enum-check + dedup; estimated 10-12 feature tests, all pre-specified. TDD order: tests first, then service, then controller, then route.

## Sources

### Primary (HIGH confidence, directly verified)

- `backend/app/Services/ThreatActorService.php` — DI, cache key pattern (line 37), `list()` signature (29-44), normalizer (169-209), flatten helpers (211-235), inverse-direction `normalizeCampaigns` (626-638) `[VERIFIED read 2026-04-18]`
- `backend/app/Http/Controllers/ThreatActor/IndexController.php` — `__invoke` shape, 502 handling (lines 19-45) `[VERIFIED read]`
- `backend/app/Http/Middleware/FeatureGate.php` — exact behavior (free → 403, active trial → pass, paid → pass) `[VERIFIED read]`
- `backend/app/Services/OpenCtiService.php` — `query()` signature, Bearer auth, exception translation `[VERIFIED read]`
- `backend/routes/api.php` — feature-gate group at lines 70-90, existing threat-actors routes at 76-77 `[VERIFIED read]`
- `backend/tests/Feature/ThreatActor/ThreatActorIndexTest.php` — Pest + Mockery service-binding pattern, fixture helper, cache-hit test `[VERIFIED read]`
- `backend/tests/Feature/ThreatActor/EnrichmentTest.php` — `beforeEach(fn () => Cache::flush())` pattern `[VERIFIED read]`
- `backend/tests/Feature/FeatureGate/FeatureGateMiddlewareTest.php` — `createPlan()` helper, 403 for expired-trial free user (lines 46-60), 200 for basic plan (62-71) `[VERIFIED read]`
- `backend/app/Models/User.php` — `booted()` auto-sets trial_ends_at (lines 81-87) — Pitfall 3 provenance `[VERIFIED read]`
- `backend/database/factories/UserFactory.php` — default factory does NOT set plan_id or trial_ends_at (relies on User::booted) `[VERIFIED read]`
- `backend/bootstrap/app.php` — `feature-gate` alias binding (line 19) `[VERIFIED read]`
- `backend/phpunit.xml` — `CACHE_STORE=array`, `DB_CONNECTION=sqlite:memory` `[VERIFIED read]`
- `backend/composer.json` — Laravel ^12.0, Pest ^3.8, Mockery ^1.6 all present `[VERIFIED read]`
- `.planning/phases/60-backend-campaigns-service-endpoint/60-CONTEXT.md` — locked decisions D-01..D-22 `[VERIFIED]`
- `.planning/phases/60-backend-campaigns-service-endpoint/60-DISCUSSION-LOG.md` — discussion context `[VERIFIED]`
- `.planning/ROADMAP.md` — Phase 60 goals, SC1–SC4, PITFALL-09 `[VERIFIED]`
- `.planning/REQUIREMENTS.md` — CAMP-07, CAMP-08 definitions `[VERIFIED]`
- `.planning/phases/59-backend-snapshot-resize-victimology-endpoint/59-VALIDATION.md` — Phase 59 validation template `[VERIFIED read]`
- `.planning/phases/59-backend-snapshot-resize-victimology-endpoint/59-02-GRAPHIQL-NOTES.md` — resume-signal pattern for off-network D-12 `[VERIFIED read]`
- `.planning/phases/59-backend-snapshot-resize-victimology-endpoint/59-RESEARCH.md` — Validation Architecture section at line 633 as structural reference `[VERIFIED read]`

### Secondary (MEDIUM confidence, spec / documentation)

- [STIX 2.1 Campaign SDO spec](https://docs.oasis-open.org/cti/stix/v2.1/os/stix-v2.1-os.html#_pcpvfz4ik6d6) — `CITED` — defines `name`, `description`, `aliases`, `first_seen`, `last_seen`, `objective` as standard Campaign fields
- [STIX 2.1 Relationship `attributed-to`](https://docs.oasis-open.org/cti/stix/v2.1/os/stix-v2.1-os.html#_b2z6h5fotoh1) — `CITED` — defines the `source_ref`/`target_ref` direction for `attributed-to` (Campaign → IntrusionSet)
- [OpenCTI GraphQL API docs](https://docs.opencti.io/latest/reference/api/) — `CITED` general reference
- Laravel 12 `Cache::remember()` — `[ASSUMED]` behavior consistent with Laravel 11 (no deprecation in release notes as of knowledge cutoff)

### Tertiary (LOW confidence — flagged for live verification in D-12)

- OpenCTI-specific `CampaignsOrdering` enum member list — `[ASSUMED]` based on uniform schema convention with `IntrusionSetsOrdering` (`modified`, `created`, etc.). Verify in GraphiQL introspection.
- OpenCTI `objective` field variant (direct vs `x_opencti_objective`) — `[ASSUMED]` direct STIX field. Verify in GraphiQL.
- `confidence` availability on Campaign — `[ASSUMED]` optional. Default: omit.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — every lib pinned in `composer.json`, every pattern exists in the codebase, zero new deps.
- Architecture: **HIGH** — mirror-not-inherit pattern is fully specified by CONTEXT.md; line-for-line analogs exist.
- Route + middleware wiring: **HIGH** — existing group verified; insertion point identified.
- Test strategy: **HIGH** — fixture helper, service-binding mock, plan-seeded auth, cache-hit assertion, and negative-field-bleed patterns all have verified analogs.
- Pitfalls: **HIGH** for PITFALL-09 (explicit + SC4 test), **MEDIUM** for D-12-dependent claims (enum, field name).
- OpenCTI GraphQL specifics: **MEDIUM** (pending D-12 GraphiQL session) — all assumptions are enumerated in the Assumptions Log and default to LOUD-FAIL on wrong guess (parameterization + nowdoc forces typed validation at the GraphQL layer).

**Research date:** 2026-04-18

**Valid until:** 2026-05-18 (30 days — stable backend stack, no fast-moving dependencies, Phase 59 pattern settled 2026-04-17). Re-verify if OpenCTI version on `192.168.251.20` is upgraded, Laravel 12 minor version rolls, or any changes merge to `backend/app/Services/ThreatActorService.php`, `backend/app/Http/Middleware/FeatureGate.php`, or `backend/routes/api.php` between research and execution.
