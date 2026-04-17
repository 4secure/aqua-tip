# Phase 59: Backend Snapshot Resize + Victimology Endpoint - Research

**Researched:** 2026-04-17
**Domain:** Laravel 12 API extension — OpenCTI GraphQL proxy (snapshot parameterization + threat-actor enrichment normalization)
**Confidence:** HIGH (stack, patterns, existing code) / MEDIUM (OpenCTI Country.x_opencti_aliases semantics until GraphiQL verification)

## Summary

Phase 59 extends two existing backend endpoints without introducing new dependencies, new tables, or new services. Both changes are surgical:

1. **Snapshot resize** — `ThreatMapService::getSnapshot()` gains an `int $limit` parameter; `SnapshotController` reads `?limit` from the query string, whitelists it against `{100, 500, 1000, 2000}`, and passes it through. The GraphQL heredoc switches from literal `first: 100` to a variable. Cache key becomes `threat_map:snapshot:{limit}`.

2. **Victimology enrichment** — `ThreatActorService::executeEnrichmentQuery()` gains a single consolidated `stixCoreRelationships` block with `relationship_type: "targets"` and `toTypes: ["Country", "Region", "Sector", "Identity"]`, plus a new `normalizeVictimology()` method that buckets edges by `entity_type` on the `to` node. Organizations are filtered from the Identity bucket via `entity_type === 'Organization'`.

The codebase already establishes every pattern this phase needs: `Cache::remember()` with named keys, GraphQL heredocs with concrete-type fragments, `normalize*()` decomposition inside the service, `flattenRelationshipTargets()` using `array_unique/filter/map`, and `Mockery` service binding in Pest tests. No new stack.

**Primary recommendation:** Implement as two independent task tracks (snapshot | victimology) that can ship in either order. Block both on a one-time GraphiQL verification session at `http://192.168.251.20:8080/graphql` — document the verified `Country.x_opencti_aliases` pattern and `toTypes: ["Identity"]` + `entity_type === 'Organization'` behavior as code comments above the heredocs. Do this verification FIRST, before coding, and record the exact field name used for ISO-2 in the RESEARCH addendum so Phase 64 (frontend flags) knows what to expect.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Snapshot Endpoint (MAPBUF-06)**
- **D-01:** Validate `?limit` as a **whitelist** — only `100`, `500`, `1000`, `2000` are accepted (matches MAPCFG-01 frontend dropdown presets). Any other value (non-numeric, out-of-range, missing) silently defaults to `100`. No 422, no error.
- **D-02:** Cache key pattern is **semantic**: `threat_map:snapshot:{limit}` (e.g. `threat_map:snapshot:500`). Four discrete cache entries maximum, each 15-min TTL, no cross-contamination. Easy to flush per-size via `artisan cache:forget threat_map:snapshot:500` during debugging.
- **D-03:** `ThreatMapService::getSnapshot()` signature changes to `getSnapshot(int $limit = 100): array`. Existing callers (if any) keep working via default. Controller reads `request()->integer('limit')`, validates against whitelist, passes to service.
- **D-04:** GraphQL `first: $limit` is parameterized (currently hardcoded `first: 100`). Snapshot fetch still orders `created_at desc` with no time filter (matches current behavior).
- **D-05:** Country counter aggregation (`countries`, `types`, `countryCounts` in controller response) runs over the full resized event array — counts reflect the active buffer size, not last-100.

**Victimology Enrichment (VICTM-09)**
- **D-06:** Consolidate the 4 victimology sub-queries into a **single** `stixCoreRelationships` block in the enrichment GraphQL with `relationship_type: "targets"` and `toTypes: ["Country", "Region", "Sector", "Identity"]`. PITFALL-13 requires this to avoid N+1 enrichment timeout.
- **D-07:** PHP normalizer splits the consolidated edges by `entity_type` on the `to` node. Use concrete type fragments in GraphQL (`... on Country`, `... on Region`, `... on Sector`, `... on Organization`) to pull the fields needed per type. Organization is a sub-type of Identity in OpenCTI — filter in normalizer by `entity_type === 'Organization'`. PITFALL-12.
- **D-08:** **GraphiQL verification step is mandatory before coding.** Before writing the GraphQL query, connect to `http://192.168.251.20:8080/graphql` (OpenCTI GraphiQL) and confirm:
  - `toTypes: ["Identity"]` returns Organizations when filtered
  - The `Organization` concrete type fragment resolves fields cleanly (STIX type is `Identity`; `entity_type` distinguishes `Organization` from `Individual`/`System`)
  - A representative actor (e.g. APT28) returns non-empty data for at least one of countries/regions/sectors/organizations
  Document the verified query shape as a code comment above the GraphQL heredoc.
- **D-09:** Victimology item shape is **objects**, not strings:
  - `countries: [{id, name, country_code}]` — `country_code` is ISO-2 (e.g. `"US"`). Extract from OpenCTI Country `x_opencti_aliases` or an equivalent field; fall back to `null` when unavailable. Phase 64 VICTM-03 needs this for flag icons.
  - `regions: [{id, name}]`
  - `sectors: [{id, name}]`
  - `organizations: [{id, name}]`
  This matches the existing enrichment block conventions (`tools`, `malware` are already `{id, name}`).
- **D-10:** Graceful degradation on victimology failure. If the consolidated sub-query throws (e.g. OpenCTI partial outage, malformed fragment), the normalizer catches the error, logs it (`Log::warning('Victimology sub-query failed', ['actor_id' => $id, 'error' => ...])`), and returns `victimology: {countries:[], regions:[], sectors:[], organizations:[]}` — the rest of the enrichment payload (ttps/tools/malware/campaigns/relationships) continues to return. Matches SC3 (empty arrays without 500).
- **D-11:** Caching unchanged: `threat_actor_enrichment:{id}` key, 15-min TTL. Victimology data cached alongside the rest of the enrichment payload. A failed victimology fetch is **not** cached — on next request, retry naturally (cache the full successful payload only).
- **D-12:** The existing `campaigns` sub-query stays in the enrichment response. VICTM-01 (remove Campaigns tab) is a frontend-only change in Phase 64. Backend keeps serving `campaigns` for revert safety.

**Deduplication (normalizer)**
- **D-13:** Normalizer uses `array_unique` on `id` per sub-array to prevent duplicates when OpenCTI returns overlapping relationships (e.g., two `targets` edges to the same Country).

**Test Coverage**
- **D-14:** Write Pest feature tests in existing directories:
  - `backend/tests/Feature/ThreatMap/SnapshotTest.php` — cover SC1, SC4 (whitelist validation, cache isolation, default fallback)
  - `backend/tests/Feature/ThreatActor/EnrichmentTest.php` (new file) — cover SC2, SC3 (victimology shape, empty-state, graceful failure)
- **D-15:** Mock `OpenCtiService::query()` via `Http::fake()` or service binding; do not hit live OpenCTI in tests.

### Claude's Discretion

- Exact field on OpenCTI Country for ISO-2 country code (likely `x_opencti_aliases` or a direct code field) — planner resolves this during the mandatory GraphiQL verification step (D-08).
- Specific validation helper location (inline in controller vs. small `FormRequest`) — planner picks the lighter option consistent with existing backend controllers.
- Exact Log level (`warning` vs. `error`) for partial victimology failure — planner picks based on existing Log conventions in `ThreatActorService`.
- Pest test assertion granularity — planner matches existing `ThreatActorIndexTest.php` style.

### Deferred Ideas (OUT OF SCOPE)

None surfaced during discussion — scope stayed tight to backend endpoints. Related future capabilities already deferred in REQUIREMENTS.md §Future Requirements:

- MAP-INTERACT (victimology heatmap) — Phase 64 list view is sufficient
- CAMP-GRAPH (campaign→actor navigation) — not needed for v6.1
- MAP-EXPORT (CSV/JSON export) — out of scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **MAPBUF-06** | Country-counter aggregation respects the active buffer size (counts include all settled markers, not just the last-100 snapshot) | Controller-side aggregation in `SnapshotController::__invoke()` already iterates the full `$events` array (lines 27-52). Parameterizing `getSnapshot($limit)` in the service automatically propagates through — the controller math is buffer-size-agnostic. See "Snapshot Endpoint" in Code Examples. |
| **VICTM-09** | Backend extends the existing actor enrichment GraphQL query with 4 new `stixCoreRelationships` blocks (Country/Region/Sector/Identity-filtered-to-Organization), normalized into a `victimology` response key | Existing `executeEnrichmentQuery()` heredoc (ThreatActorService.php:263-420) already uses concrete-type fragments (`... on Country`, `... on Identity`, etc.). Pattern is directly reusable. `normalizeEnrichmentResponse()` (line 432) composes per-section normalizers — add `normalizeVictimology()` following same shape. PITFALL-13 mandates a single consolidated block, not four aliased blocks. See "Victimology Enrichment" in Code Examples. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Tech stack:** Backend is Laravel 11 per project CLAUDE.md, but `composer.json` requires `laravel/framework: ^12.0` — **Laravel 12 is in use** (composer lockfile is source of truth; CLAUDE.md note is stale). Plan against Laravel 12.
- **Database:** PostgreSQL in production (Railway); SQLite in local tests per `tests/Pest.php` loading `Tests\TestCase::class`.
- **OpenCTI proxy rule:** All OpenCTI access goes through `OpenCtiService::query()` — Laravel holds the Bearer token. Frontend never talks to OpenCTI directly. Both endpoints in this phase already respect this.
- **Zero-new-dep convention:** v6.1 Roadmap Phase 59 entry uses the existing stack only. No new Composer packages.
- **No TypeScript / no lint / no formatter** on the frontend — n/a for this backend-only phase.
- **OpenCTI on private network (`192.168.251.20`)** — GraphiQL verification (D-08) requires network access to the lab. If running Phase 59 implementation from outside that network, set up a tunnel first or use a pre-captured schema dump.
- **Commit style (userEmail/global rules):** Conventional commits — `feat:`, `fix:`, `refactor:`, `test:`, `docs:`. No attribution trailers (disabled globally via `~/.claude/settings.json`).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `laravel/framework` | `^12.0` (in use per composer.json) | HTTP + cache + container | Already the project's framework; no choice to make. `[VERIFIED: backend/composer.json:11]` |
| `pestphp/pest` | `^3.8` | Test runner | Project convention; all existing feature tests are Pest. `[VERIFIED: backend/composer.json:23]` |
| `mockery/mockery` | `^1.6` | Test doubles | Used in `ThreatActorIndexTest.php` and `ThreatMapServiceTest.php` for `OpenCtiService` binding. `[VERIFIED: backend/composer.json:22]` |

### Supporting (already present, no install needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `Illuminate\Support\Facades\Cache` | (core) | 15-min cache for snapshot + enrichment | Both endpoints. Pattern: `Cache::remember(key, now()->addMinutes(15), closure)`. `[VERIFIED: ThreatActorService.php:38, ThreatMapService.php:213]` |
| `Illuminate\Support\Facades\Log` | (core) | Partial-failure logging per D-10 | `Log::warning('Victimology sub-query failed', [...])`. `[VERIFIED: existing usage in ThreatMap\StreamController.php:77, 145]` |
| `Illuminate\Http\Request` | (core) | Read `?limit` query string | Project uses `$request->query('key')` pattern (see `ThreatActor\IndexController.php:21-25`). For integer coercion with defaults, Laravel 12 offers `$request->integer('limit')` / `$request->integer('limit', 100)`. `[CITED: https://laravel.com/docs/12.x/requests]` |
| `OpenCtiService` | (project) | GraphQL proxy with Bearer token | `query(string $graphql, array $variables = []): array` — already used by both services. `[VERIFIED: backend/app/Services/OpenCtiService.php]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline whitelist in controller | Dedicated `FormRequest` (`SnapshotIndexRequest`) | Overkill for a single optional integer with 4 valid values. Codebase convention is inline `$request->query()` reads (see `ThreatActor\IndexController.php`, `ThreatNews\IndexController.php`). **Use inline.** |
| Four aliased sub-queries in GraphQL (`targetedCountries:`, `targetedRegions:`, ...) | Single consolidated `stixCoreRelationships` block with `toTypes: [...]` | PITFALL-13 explicitly bans aliased approach — causes N+1 timeout against OpenCTI. **Use single consolidated block (D-06, locked).** |
| `try/catch` around the whole enrichment query | Per-section try/catch that degrades only victimology | D-10 requires victimology failure to NOT take down ttps/tools/malware/campaigns. **Per-section catch inside `normalizeVictimology()`.** |
| `Cache::forget()` on write | TTL-only expiry | 15-min TTL is fine; `Cache::forget()` is for manual dev flush (`artisan tinker`). No auto-invalidation needed. |

**Installation:**
```bash
# No new dependencies. All stack pieces are already in composer.json.
```

**Version verification:**
```bash
# backend/composer.json pin confirmed 2026-04-17:
#   laravel/framework: ^12.0   → Laravel 12.x (not 11.x as CLAUDE.md says)
#   pestphp/pest:      ^3.8
#   mockery/mockery:   ^1.6
# No version bumps required for Phase 59.
```

## Architecture Patterns

### Recommended Project Structure
```
backend/
├── app/
│   ├── Http/Controllers/
│   │   ├── ThreatMap/SnapshotController.php      # MODIFY: read ?limit, whitelist, pass to service
│   │   └── ThreatActor/EnrichmentController.php  # NO CHANGE (shape handled in service)
│   ├── Services/
│   │   ├── ThreatMapService.php                  # MODIFY: getSnapshot(int $limit = 100)
│   │   └── ThreatActorService.php                # MODIFY: add victimology block + normalizer
│   └── routes/api.php                            # NO CHANGE (route is already defined)
└── tests/Feature/
    ├── ThreatMap/SnapshotTest.php                # MODIFY: add whitelist/cache-isolation tests
    └── ThreatActor/EnrichmentTest.php            # CREATE: victimology shape/empty/failure tests
```

### Pattern 1: Whitelist Validation for Query Param with Silent Fallback
**What:** Read an integer query param, compare to an allowlist, default to safe value on miss. No 422 response.
**When to use:** Public endpoint accepting a small set of discrete enum-like values from a frontend dropdown. Matches D-01.
**Example:**
```php
// Source: D-01 + existing pattern in ThreatActor\IndexController.php:21-25
final class SnapshotController extends Controller
{
    private const ALLOWED_LIMITS = [100, 500, 1000, 2000];

    public function __invoke(Request $request): JsonResponse
    {
        $requested = $request->integer('limit'); // Laravel 12: returns 0 when missing/invalid
        $limit = in_array($requested, self::ALLOWED_LIMITS, true) ? $requested : 100;

        try {
            $events = app(ThreatMapService::class)->getSnapshot($limit);
        } catch (OpenCtiConnectionException) {
            return response()->json(['message' => 'Unable to load threat map data. Please try again.'], 502);
        }
        // ...aggregation unchanged...
    }
}
```

**Note on `$request->integer()` behavior:** In Laravel 12, `integer()` returns `0` for missing/non-numeric values (it's a non-null integer return type). The second-argument default exists but is only used when the key is absent — it won't save you from `?limit=abc` (still returns 0) or `?limit=99` (returns 99, not in whitelist). **Always validate against the whitelist AFTER coercion** — don't rely on the default arg alone. `[CITED: https://laravel.com/docs/12.x/requests] [VERIFIED: cross-checked against mastering laravel 2025-12 note about request helper default-value inconsistency]`

### Pattern 2: Cache::remember with Semantic Per-Param Key
**What:** Cache closures keyed by the parameter value itself (not a hash), for human-readable flushing.
**When to use:** Small, finite parameter space (4 discrete limit values here). Matches D-02.
**Example:**
```php
// Source: D-02 + existing pattern in ThreatActorService.php:249
public function getSnapshot(int $limit = 100): array
{
    return Cache::remember(
        "threat_map:snapshot:{$limit}",
        now()->addMinutes(15),
        fn () => $this->fetchSnapshot($limit),
    );
}
```
Contrast with `ThreatActorService::list()` line 36 which uses `md5(json_encode(func_get_args()))` — justified there because 6 params with continuous value space (cursor strings, search terms). **Do not hash the snapshot key** (D-02 is explicit).

### Pattern 3: Concrete-Type Fragment GraphQL with entity_type Discriminator
**What:** Query a polymorphic field once; use `... on ConcreteType { ... }` fragments for each possible type, and include `entity_type` on a common interface (`BasicObject`) so the PHP side can bucket edges.
**When to use:** OpenCTI relationship endpoints where `to` can resolve to multiple concrete types. Matches D-07 + PITFALL-12.
**Example:**
```php
// Source: D-06, D-07 + existing pattern in ThreatActorService.php:338-417 (allRelationships)
victimology: stixCoreRelationships(
    relationship_type: "targets"
    toTypes: ["Country", "Region", "Sector", "Identity"]
    first: 200
) {
    edges {
        node {
            to {
                ... on BasicObject {
                    id
                    entity_type    // "Country" | "Region" | "Sector" | "Organization" | "Individual" | "System"
                }
                ... on Country {
                    name
                    x_opencti_aliases   // ISO-2 candidate — verify in GraphiQL
                }
                ... on Region {
                    name
                }
                ... on Sector {
                    name
                }
                ... on Organization {
                    name
                }
            }
        }
    }
}
```
The `first: 200` budget comfortably covers even prolific actors like APT28 (historically <50 combined targets); leaves room for overlap dedup via D-13.

### Pattern 4: Sub-Section Normalizer with Per-Section Failure Containment
**What:** Decompose a complex response into `normalize<Section>()` private methods; wrap the fragile section in try/catch to degrade gracefully.
**When to use:** When one sub-response must not take down the whole payload. Matches D-10.
**Example:**
```php
// Source: D-10 + pattern from ThreatActorService.php:432-443 (normalizeEnrichmentResponse)
private function normalizeEnrichmentResponse(array $data, string $actorId): array
{
    $intrusionSet = $data['intrusionSet'] ?? [];

    return [
        'ttps' => $this->normalizeTtps($intrusionSet['attackPatterns']['edges'] ?? []),
        'tools' => $this->normalizeTools($intrusionSet['tools']['edges'] ?? []),
        'malware' => $this->normalizeMalware($intrusionSet['malware']['edges'] ?? []),
        'campaigns' => $this->normalizeCampaigns($intrusionSet['campaigns']['edges'] ?? []),
        'victimology' => $this->safeNormalizeVictimology(
            $intrusionSet['victimology']['edges'] ?? [],
            $actorId,
        ),
        'relationships' => $this->normalizeRelationships($intrusionSet['allRelationships']['edges'] ?? []),
    ];
}

private function safeNormalizeVictimology(array $edges, string $actorId): array
{
    try {
        return $this->normalizeVictimology($edges);
    } catch (\Throwable $e) {
        Log::warning('Victimology sub-query failed', [
            'actor_id' => $actorId,
            'error' => $e->getMessage(),
        ]);

        return ['countries' => [], 'regions' => [], 'sectors' => [], 'organizations' => []];
    }
}
```

**Caveat re D-11 ("failed victimology fetch is NOT cached"):** The above pattern DOES cache the fallback `{empty arrays}` result because the outer `Cache::remember` closure returns successfully. To honor D-11 strictly, place the try/catch logic such that a catastrophic parse failure is distinguishable from a genuinely empty `[]` response. Two viable approaches for the planner to choose between:

1. **Strict D-11 reading (separate catch at higher level):** Only wrap the victimology-extraction portion in try/catch inside `executeEnrichmentQuery`; on failure, return a signal value (not the empty shape), and have `enrichment()` bypass `Cache::remember` by calling `Cache::put` explicitly on success only. More ceremony, matches D-11 verbatim.
2. **Pragmatic reading (cache the empty-shape fallback):** Treat D-11 as "don't cache transient GraphQL fatal errors" — if victimology truly breaks, the whole query throws `OpenCtiQueryException` and `Cache::remember` does not cache exceptions. Parse-level failures (malformed edges) return `{empty arrays}` that ARE cached for 15 min — acceptable because they represent "this actor currently has no queryable victimology." Matches observed `Cache::remember` semantics (closures that throw do NOT cache).

**Recommendation:** Approach 2 is simpler and matches framework semantics. `Cache::remember` in Laravel does not cache when the closure throws — verified behavior. Route catastrophic failures (network/GraphQL error) to bubble as exceptions (caught by `EnrichmentController::catch(OpenCtiQueryException)` → 502); route parse failures to logged `{empty arrays}` that can safely cache for 15 min. Flag this for discuss-phase confirmation if strict D-11 reading is preferred. `[ASSUMED]`

### Pattern 5: Pest Feature Test with Mockery Service Binding
**What:** Replace the real `OpenCtiService` with a `Mockery::mock` in the container; stub `query()` to return a GraphQL-shaped array; exercise the service or HTTP endpoint.
**When to use:** Every test in this phase. Matches D-15.
**Example:**
```php
// Source: D-15 + existing pattern in ThreatActorIndexTest.php:65-76
function mockOpenCtiForEnrichment(array $response): void
{
    app()->bind(OpenCtiService::class, function () use ($response) {
        $mock = Mockery::mock(OpenCtiService::class);
        $mock->shouldReceive('query')->andReturn($response);
        return $mock;
    });
}

test('enrichment returns victimology with countries/regions/sectors/organizations', function () {
    mockOpenCtiForEnrichment(fakeEnrichmentWithVictimology());
    Cache::flush();  // avoid cross-test bleed on 'threat_actor_enrichment:*'

    $user = User::factory()->create();  // enrichment is feature-gated per api.php:70,77
    $response = $this->actingAs($user)->getJson('/api/threat-actors/intrusion-set-1/enrichment');

    $response->assertStatus(200);
    expect($response->json('data.victimology'))->toHaveKeys(['countries', 'regions', 'sectors', 'organizations']);
});
```

**Test-isolation gotcha:** Both services use long-lived `Cache::remember` keys. Every test that exercises a service method MUST call `Cache::flush()` in `beforeEach` OR hit a distinct key (e.g. vary the actor id / limit across tests). The existing `ThreatActorIndexTest` does not `Cache::flush()` between tests — relies on fresh `RefreshDatabase` not wiping cache (it doesn't). Phase 59 tests should flush explicitly. `[VERIFIED: observed in ThreatActorIndexTest.php:191, where Cache::flush() is called deliberately]`

### Anti-Patterns to Avoid

- **4 aliased sub-queries** (`targetedCountries`, `targetedRegions`, ...): PITFALL-13. One consolidated block only.
- **Hashing the snapshot cache key** (`md5(json_encode(...))` pattern from `ThreatActorService::list()`): D-02 is explicit — semantic keys for the snapshot so ops can `artisan cache:forget threat_map:snapshot:500`.
- **Returning 422 on invalid `?limit`**: D-01 locks silent default. No validation response.
- **Breaking the existing enrichment response shape** (removing `campaigns`, renaming `ttps`, etc.): D-12 — the frontend still ships the Campaigns tab until Phase 64; the field must stay.
- **Adding `auth:sanctum` to the snapshot route**: It is currently public (api.php:106, outside `auth:sanctum` group). Do not change this. **NOTE:** `tests/Feature/ThreatMap/SnapshotTest.php:56-60` asserts 401 for unauthenticated — this test is currently WRONG (or the test setup has a hidden global auth middleware). See Open Questions #1. The planner must reconcile before shipping.
- **Hitting live OpenCTI from tests**: D-15 — always `Http::fake()` or `Mockery` the service.
- **Calling the GraphQL heredoc without first running it in GraphiQL**: D-08 is non-negotiable (PITFALL-12). Document the verified query as a code comment above the heredoc.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Query string integer coercion | Custom `is_numeric && (int)` logic | `$request->integer('limit')` | Framework handles empty/invalid/missing in one call. `[CITED: Laravel 12 docs]` |
| Cache with expiry | Manual cache-put + expiration check | `Cache::remember(key, ttl, closure)` | Exact pattern used 7+ times in this codebase (ThreatActorService, ThreatMapService, IpSearchService, ThreatSearchService, ThreatNewsService). |
| GraphQL polymorphic type resolution | Switch statement on response shape in PHP | `... on ConcreteType { ... }` fragments + `entity_type` discriminator | Solved at the query layer; see `ThreatActorService::allRelationships` (line 338). |
| HTTP mocking | Hand-rolled stub class | `Mockery::mock(OpenCtiService::class)` + `app()->bind()` | Established pattern in `ThreatActorIndexTest`, `ThreatMapServiceTest`. |
| OpenCTI GraphQL client | Custom cURL or `php-graphql-client` lib | Existing `OpenCtiService::query()` | Already handles Bearer auth, retries on connection exception, GraphQL error unwrapping. |

**Key insight:** Every hard piece of this phase (cache keys, GraphQL type resolution, test mocking, error wrapping) has a canonical implementation somewhere in `backend/`. The value of this phase is in **parameterization and composition**, not new infrastructure.

## Common Pitfalls

### Pitfall 1: `toTypes: ["Identity"]` returns Organizations, Individuals, AND Systems
**What goes wrong:** The consolidated sub-query returns `to` nodes for all Identity subtypes — but only Organization is wanted. If the normalizer naively dumps every Identity edge into `organizations`, the frontend shows `Individual` or `System` names in the Organization list.
**Why it happens:** Organization is a STIX sub-type of Identity (PITFALL-12). `toTypes: ["Identity"]` is the correct filter, but OpenCTI returns all Identity concrete types.
**How to avoid:** In `normalizeVictimology()`, switch on `$edge['node']['to']['entity_type']`:
```php
match ($edge['node']['to']['entity_type'] ?? null) {
    'Country' => /* push to countries */,
    'Region' => /* push to regions */,
    'Sector' => /* push to sectors */,
    'Organization' => /* push to organizations — ONLY this value, not 'Individual' or 'System' */,
    default => /* skip silently */,
};
```
**Warning signs:** Integration test with a real actor shows John Doe (Individual) or a System host in the organizations list; user bug report in Phase 64.

### Pitfall 2: Country ISO-2 code storage varies by data source
**What goes wrong:** `Country.x_opencti_aliases` is a flexible `[String]` field — some connectors populate it with ISO-2 codes (e.g. `["US", "USA"]`), others leave it empty, others populate with alternate names (`["United States of America", "America"]`). OpenCTI Issue #1310 documents this inconsistency. Phase 64 flag rendering will break if `country_code` is sometimes non-ISO-2.
**Why it happens:** STIX 2.1 has no canonical country code field on Location/Country. Each connector implementation chooses what to put in aliases.
**How to avoid:** In `normalizeVictimology()`, extract `country_code` defensively — loop `x_opencti_aliases`, find the first 2-char uppercase-alpha entry:
```php
private function extractIsoCode(array $aliases): ?string
{
    foreach ($aliases as $alias) {
        if (is_string($alias) && preg_match('/^[A-Z]{2}$/', $alias)) {
            return $alias;
        }
    }
    return null;
}
```
Fall back to `null` (never throw). Phase 64 component must treat `country_code: null` as "no flag, just name."
**Warning signs:** `country_code: "United States"` leaking into Phase 64; flag icons fail to render.
**[ASSUMED]** on exact OpenCTI field — verified field name in live GraphiQL (D-08) may reveal a more direct option (e.g., `country` scalar on Location).

### Pitfall 3: `Cache::flush()` omitted between tests → cross-contamination
**What goes wrong:** Test A seeds the enrichment cache with 2 items; test B mocks the service to return 0 items but still sees 2 because the cache wasn't cleared. SC1 (cache isolation between limits) is especially vulnerable.
**Why it happens:** `RefreshDatabase` doesn't clear cache; Laravel tests default to the `array` cache driver, which persists within a single test run.
**How to avoid:** Add `beforeEach(fn () => Cache::flush())` to `SnapshotTest.php` AND `EnrichmentTest.php`. Or use a distinct actor id / limit per test.
**Warning signs:** Tests pass individually but fail when run together; order-dependent flake.

### Pitfall 4: `$request->integer('limit')` with no argument returns `0`, not `null`
**What goes wrong:** Code assumes `request()->integer('limit') === null` means "not provided." It's actually `=== 0`. Whitelist `[100, 500, 1000, 2000]` doesn't contain 0, so fallback kicks in — which is correct by luck. But the mental model is wrong.
**Why it happens:** Laravel's `integer()` method is typed `: int`, so it can never return `null`. Missing → `0`. Non-numeric → `0`.
**How to avoid:** Treat the whitelist check as the single source of truth. Never special-case "zero / missing / invalid" separately. `[CITED: https://laravel.com/docs/12.x/requests]`
**Warning signs:** Off-by-one reasoning during review; dead branches.

### Pitfall 5: Existing `SnapshotTest.php` asserts 401 for unauthenticated but route is public
**What goes wrong:** The test at lines 56-60 asserts `$response->assertStatus(401);`, but `routes/api.php:106` defines the route OUTSIDE the `auth:sanctum` middleware group. Either (a) the test is green because of a hidden global middleware that isn't visible in `routes/api.php`, or (b) the test is broken and not actually green, or (c) the route used to be authenticated and was moved public without updating the test.
**Why it happens:** Latent state — `SnapshotController::__invoke` doesn't declare middleware; the route group in `api.php` is unambiguous.
**How to avoid:** Before committing Phase 59 changes, RUN the existing test suite and note any red tests. If `SnapshotTest::it('returns 401 for unauthenticated user')` is currently red, it's a pre-existing bug to fix — either (i) gate the route behind `auth:sanctum` (policy decision — PROBABLY NOT, since the dashboard needs unauthenticated access per api.php:105 comment `"used by dashboard map"`) or (ii) update the test to assert 200. Planner must choose with user confirmation.
**Warning signs:** Test has never been run; `$this->getJson` returning 200 when 401 expected.

### Pitfall 6: Adding `victimology` breaks existing `EnrichmentTest.php` fixtures (if any)
**What goes wrong:** An existing test asserting `$response->json('data')` has exactly 5 keys (`ttps, tools, malware, campaigns, relationships`) would fail when a 6th key appears.
**Why it happens:** Brittle assertion over full shape.
**How to avoid:** There is NO existing `ThreatActor/EnrichmentTest.php` (verified via `ls` → only `ThreatActorIndexTest.php` exists). So this is a greenfield write. But audit `ThreatActorIndexTest.php` for any enrichment-related assertions before committing — should be none.
**Warning signs:** Unexpected fixture failures when running the full Pest suite.

### Pitfall 7: OpenCTI private network unreachable from CI / production runner
**What goes wrong:** The GraphiQL verification step (D-08) requires network access to `192.168.251.20:8080`. If Phase 59 is implemented from a remote workstation or CI, the verification can't happen live.
**Why it happens:** OpenCTI lab is on an internal IP per PROJECT.md Constraints.
**How to avoid:** Do the GraphiQL verification locally at Laragon where the backend works. Capture a sample response as JSON (save to a scratch file, or paste into the RESEARCH addendum). The verification only needs to happen once — the resulting code comment documents the shape forever.
**Warning signs:** "Connection refused" during `php artisan tinker` calls to OpenCtiService; planner can't decide between `x_opencti_aliases` and a direct `code` field.

## Code Examples

Verified patterns from existing codebase:

### Snapshot Endpoint — Before / After Shape

**Before (ThreatMapService.php:211-218):**
```php
public function getSnapshot(): array
{
    return Cache::remember(
        'threat_map:snapshot',
        now()->addMinutes(15),
        fn () => $this->fetchSnapshot(),
    );
}
```

**After (D-02, D-03):**
```php
public function getSnapshot(int $limit = 100): array
{
    return Cache::remember(
        "threat_map:snapshot:{$limit}",
        now()->addMinutes(15),
        fn () => $this->fetchSnapshot($limit),
    );
}

// fetchSnapshot signature also changes:
private function fetchSnapshot(int $limit): array
{
    $graphql = <<<'GRAPHQL'
    query ($first: Int!) {
        stixCyberObservables(types: ["IPv4-Addr", "IPv6-Addr"], first: $first, orderBy: created_at, orderMode: desc) {
            edges {
                node { id entity_type observable_value created_at objectLabel { value } }
            }
        }
    }
    GRAPHQL;

    $data = $this->openCti->query($graphql, ['first' => $limit]);
    // ...rest of fetch logic unchanged (line 405 onward)...
}
```

**Source:** Verified against `ThreatMapService.php` lines 211-436 and cross-checked with the existing parameterized pattern in `ThreatActorService::executeQuery()` (line 48). `[VERIFIED]`

### Victimology Enrichment — GraphQL Block Addition

**Added to `executeEnrichmentQuery` heredoc** (after the `campaigns:` block, before `allRelationships:`):
```graphql
# D-08: Verified against live GraphiQL at http://192.168.251.20:8080/graphql on YYYY-MM-DD.
# toTypes: ["Identity"] returns Organization | Individual | System — filter in PHP by entity_type === 'Organization' (PITFALL-12).
# x_opencti_aliases holds ISO-2 code candidates; extract via regex match /^[A-Z]{2}$/ in normalizer (PITFALL-2).
victimology: stixCoreRelationships(
    relationship_type: "targets"
    toTypes: ["Country", "Region", "Sector", "Identity"]
    first: 200
) {
    edges {
        node {
            to {
                ... on BasicObject {
                    id
                    entity_type
                }
                ... on Country {
                    name
                    x_opencti_aliases
                }
                ... on Region {
                    name
                }
                ... on Sector {
                    name
                }
                ... on Organization {
                    name
                }
            }
        }
    }
}
```

### Victimology Normalizer

```php
// Source: Derived from existing normalizeTools/normalizeMalware/flattenRelationshipTargets patterns
private function normalizeVictimology(array $edges): array
{
    $buckets = ['countries' => [], 'regions' => [], 'sectors' => [], 'organizations' => []];

    foreach ($edges as $edge) {
        $node = $edge['node']['to'] ?? null;
        if (empty($node['id']) || empty($node['entity_type'])) {
            continue;
        }

        $item = ['id' => $node['id'], 'name' => $node['name'] ?? null];

        match ($node['entity_type']) {
            'Country' => $buckets['countries'][] = $item + ['country_code' => $this->extractIsoCode($node['x_opencti_aliases'] ?? [])],
            'Region' => $buckets['regions'][] = $item,
            'Sector' => $buckets['sectors'][] = $item,
            'Organization' => $buckets['organizations'][] = $item,
            default => null,  // skip Individual / System / unexpected
        };
    }

    // D-13: dedupe by id per bucket
    foreach ($buckets as $key => $items) {
        $seen = [];
        $buckets[$key] = array_values(array_filter($items, function ($item) use (&$seen) {
            if (isset($seen[$item['id']])) return false;
            $seen[$item['id']] = true;
            return true;
        }));
    }

    return $buckets;
}

private function extractIsoCode(array $aliases): ?string
{
    foreach ($aliases as $alias) {
        if (is_string($alias) && preg_match('/^[A-Z]{2}$/', $alias)) {
            return $alias;
        }
    }
    return null;
}
```

### Pest Feature Test for Cache Isolation (SC1)

```php
// Source: Derived from SnapshotTest.php + ThreatActorIndexTest.php patterns
test('GET /api/threat-map/snapshot uses separate caches for each limit', function () {
    Cache::flush();

    $snapshot100 = [/* 1 event */];
    $snapshot500 = [/* 5 events */];

    app()->bind(ThreatMapService::class, function () use ($snapshot100, $snapshot500) {
        $mock = Mockery::mock(ThreatMapService::class);
        $mock->shouldReceive('getSnapshot')->with(100)->andReturn($snapshot100);
        $mock->shouldReceive('getSnapshot')->with(500)->andReturn($snapshot500);
        return $mock;
    });

    $r100 = $this->getJson('/api/threat-map/snapshot?limit=100');
    $r500 = $this->getJson('/api/threat-map/snapshot?limit=500');

    expect($r100->json('data.events'))->toHaveCount(1);
    expect($r500->json('data.events'))->toHaveCount(5);
});

test('GET /api/threat-map/snapshot defaults to 100 on invalid limit', function () {
    Cache::flush();

    app()->bind(ThreatMapService::class, function () {
        $mock = Mockery::mock(ThreatMapService::class);
        $mock->shouldReceive('getSnapshot')->with(100)->andReturn([]);  // expect 100, not 99
        return $mock;
    });

    // Invalid → defaults to 100
    $this->getJson('/api/threat-map/snapshot?limit=99')->assertStatus(200);
    $this->getJson('/api/threat-map/snapshot?limit=abc')->assertStatus(200);
    $this->getJson('/api/threat-map/snapshot')->assertStatus(200);
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded `first: 100` in snapshot GraphQL | Parameterized `first: $limit` | Phase 59 | Enables frontend buffer dropdown (Phase 62) |
| Four aliased victimology sub-queries | Single consolidated `toTypes: [...]` | Phase 59 | Avoids N+1 enrichment timeout (PITFALL-13) |
| `campaigns` tab in frontend | `victimology` tab | Phase 64 (not this phase) | Backend keeps `campaigns` key for compatibility (D-12) |

**Deprecated/outdated:**
- CLAUDE.md says "Laravel 11" — **actually Laravel 12 per composer.json**. CLAUDE.md is stale; do not regress.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `Country.x_opencti_aliases` is the ISO-2 source; first 2-char alpha entry wins | Pitfall 2 / Code Examples | Phase 64 flag icons render blank. Mitigation: D-08 GraphiQL verification MUST confirm this before coding. If OpenCTI exposes a direct `country_code` scalar, swap to it and update the heredoc. |
| A2 | `Cache::remember` does NOT cache when the closure throws (so victimology exceptions bubble to a 502, while parse-level `{empty arrays}` fallbacks DO cache for 15 min) | Pattern 4 caveat | If framework caches exceptions, D-11 is violated. Low risk — Laravel framework behavior is well-established. Verify by writing a Pest test that throws in the closure and checks `Cache::has()` is false. |
| A3 | The "recommended" reading of D-10 is that parse-level failure inside `normalizeVictimology` returns empty arrays (caches); GraphQL-level failure throws and hits `EnrichmentController::catch(OpenCtiQueryException)` (502) | Pattern 4 + Pitfall — graceful degradation | If user wanted ALL failures (including network) to degrade to `{empty arrays}` + 200, would need per-key try/catch at the controller. Low risk — D-10 is explicit about "partial outage... rest of enrichment continues" which matches parse-level containment. |
| A4 | The existing `SnapshotTest::'returns 401 for unauthenticated user'` test is either latently broken or relies on hidden global auth middleware not visible in `routes/api.php` | Pitfall 5 / Open Questions | Could derail CI if test is currently red. Planner must run `php artisan test --filter=Snapshot` before touching the file. |
| A5 | Laravel 12's `$request->integer('limit')` returns `0` for missing / non-numeric values (confirmed by search result referencing Laravel 12 docs; not re-verified against running app) | Pitfall 4 | If behavior is `null`, `in_array(null, [100,500,1000,2000], true)` is false → still falls through to default 100. Failure mode benign. |

## Open Questions

1. **Is the existing `SnapshotTest::'returns 401 for unauthenticated user'` test currently passing?**
   - What we know: Route is public (api.php:106), outside `auth:sanctum` group.
   - What's unclear: Is there a global middleware stack applied in `bootstrap/app.php` or a `withMiddleware` closure that adds auth to all API routes by default?
   - Recommendation: Run `php artisan test --filter=Snapshot` at phase start. If the test is red, file a Wave 0 fix task: either (a) confirm public access is intended and flip the test to assert 200, OR (b) gate the route behind `auth:sanctum` (would be a regression — the route comment explicitly says "public, used by dashboard map").

2. **Does OpenCTI `Country` have a direct `code` / `country_code` scalar field?**
   - What we know: `x_opencti_aliases` is a documented String[] field in the public OpenCTI schema.
   - What's unclear: Whether OpenCTI 5.x / 6.x exposes a dedicated ISO-2 scalar directly on Country.
   - Recommendation: D-08 GraphiQL session must try both — introspect `Country` type and confirm. If a direct field exists, use it and skip the regex-based `extractIsoCode()` helper.

3. **What's the realistic upper bound on edge counts for the consolidated victimology query?**
   - What we know: `first: 200` is generous; existing sub-queries in enrichment use `first: 100` (attackPatterns), `first: 50` (tools/malware/campaigns).
   - What's unclear: Whether any historical actor blows past 200 combined targets, causing truncation without pagination.
   - Recommendation: `first: 200` is safe for v6.1. If truncation observed in QA (unlikely), upgrade to cursor-paginated victimology in a future phase. Out of scope here.

4. **Should the snapshot cache include a namespace prefix to avoid collision with a future `threat_map:snapshot:geo` or similar?**
   - What we know: Current key `threat_map:snapshot` is already in use; new keys are `threat_map:snapshot:{100|500|1000|2000}`.
   - What's unclear: Should we reserve `threat_map:snapshot:v2:{limit}` in case the response shape evolves?
   - Recommendation: Do not over-engineer. If the shape changes later, that phase's deployment can flush the cache via `artisan cache:clear`. Keep keys simple.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PHP | Backend runtime | ✓ | ^8.2 (composer.json:9) | — |
| Composer | Dep install | ✓ | (Laragon-provided) | — |
| Laravel 12 | Framework | ✓ | ^12.0 (composer.json:11) | — |
| Pest 3.8 | Test runner | ✓ | ^3.8 (composer.json:23) | — |
| Mockery 1.6 | Test mocks | ✓ | ^1.6 (composer.json:22) | — |
| PostgreSQL | Prod DB | ✓ | (Railway addon) | SQLite for local tests |
| OpenCTI | GraphiQL verification (D-08) | ⚠ conditional | 5.x/6.x at 192.168.251.20:8080 | Must be on internal network. If unreachable, pre-capture schema / sample response while on-network; document in code comment. |
| Laragon (php artisan, composer) | Local dev | ✓ | per PROJECT.md Constraints | — |

**Missing dependencies with no fallback:**
- None (all stack present).

**Missing dependencies with fallback:**
- OpenCTI network access is the only environmental constraint. If the Phase 59 implementer is off-network, they must pair with someone on-network for the D-08 verification step OR use a cached GraphQL response. This is the only blocker for "don't have to be at the lab" execution.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Pest 3.8 on PHPUnit 11 `[VERIFIED: composer.json]` |
| Config file | `backend/phpunit.xml` (Laravel 12 default) + `backend/tests/Pest.php` |
| Quick run command | `cd backend && php artisan test --filter=Snapshot` (or `--filter=Enrichment`) |
| Full suite command | `cd backend && composer test` (runs `config:clear` + `artisan test`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SC1 (MAPBUF-06) | `?limit=500` and `?limit=100` return different cache-isolated payloads | feature (HTTP) | `php artisan test --filter='snapshot uses separate caches'` | Wave 0: extend `SnapshotTest.php` |
| SC4 (MAPBUF-06) | Invalid/missing `?limit` defaults to 100 | feature (HTTP) | `php artisan test --filter='snapshot defaults to 100 on invalid limit'` | Wave 0: extend `SnapshotTest.php` |
| MAPBUF-06 (aggregation) | Counts aggregate over the full resized event array | unit | `php artisan test --filter='SnapshotController aggregates counters over full event array'` | Wave 0: `ThreatMap/SnapshotTest.php` new test |
| SC2 (VICTM-09) | Actor with known targets returns non-empty `victimology` key with 4 sub-arrays | feature | `php artisan test --filter='enrichment returns victimology'` | Wave 0: CREATE `tests/Feature/ThreatActor/EnrichmentTest.php` |
| SC3 (VICTM-09) | Actor with no targets returns empty arrays, not 500 | feature | `php artisan test --filter='enrichment victimology empty state'` | Wave 0: same file |
| VICTM-09 (graceful degradation D-10) | Parse failure in victimology normalizer logs + returns empty, rest of enrichment returns | unit | `php artisan test --filter='safeNormalizeVictimology catches and logs'` | Wave 0: `tests/Unit/Services/ThreatActorServiceTest.php` (may need to create) |
| SC5 (D-08) | OpenCTI `toTypes` filter verified via GraphiQL | manual-only | n/a (documented as code comment) | Not test-automatable; one-time GraphiQL session with diff-in-heredoc |

### Sampling Rate
- **Per task commit:** `php artisan test --filter=Snapshot` (or `--filter=Enrichment` depending on track)
- **Per wave merge:** `composer test` (full suite) — takes ~5-10s for the 140+ existing Pest tests
- **Phase gate:** Full suite green + manual GraphiQL verification screenshot attached to phase log

### Wave 0 Gaps
- [ ] `backend/tests/Feature/ThreatActor/EnrichmentTest.php` — CREATE (does not exist; only `ThreatActorIndexTest.php` present). Covers SC2, SC3, D-10 graceful degradation.
- [ ] `backend/tests/Feature/ThreatMap/SnapshotTest.php` — EXTEND with 3-5 new tests for whitelist / cache isolation / default fallback. Also investigate and fix the currently-asserted `returns 401 for unauthenticated` test (see Open Question #1).
- [ ] (optional) `backend/tests/Unit/Services/ThreatActorServiceTest.php` — CREATE if the planner wants unit coverage of `normalizeVictimology` + `extractIsoCode` in isolation. Not strictly required — feature tests cover the observable behavior.
- [ ] Framework install: **none needed**. Pest + Mockery already in `require-dev`.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | partial | Snapshot endpoint is INTENTIONALLY public (api.php:106); enrichment endpoint is `auth:sanctum` + `feature-gate` (api.php:70, 77). No auth changes in this phase. |
| V3 Session Management | no | Phase doesn't touch session handling. |
| V4 Access Control | yes | Preserve current access posture: snapshot public, enrichment feature-gated. Do NOT inadvertently move the snapshot route into the `auth:sanctum` group. |
| V5 Input Validation | yes | `?limit` whitelist is the only new input. D-01 enforces discrete enum validation before passing to service. Safe. |
| V6 Cryptography | no | No new crypto. |
| V7 Error Handling | yes | D-10 graceful degradation must NOT leak OpenCTI internals in the user-visible response. `Log::warning` captures error detail server-side; client sees `{empty arrays}` + 200 OK. Existing `OpenCtiConnectionException` handler already returns the generic 502 message — preserve. |
| V11 Business Logic | yes | Snapshot whitelist prevents abuse via `?limit=1000000` (resource exhaustion on OpenCTI query + PHP memory). Whitelist is the mitigation. |
| V13 API Security | yes | Both routes return JSON, use Bearer-token-free proxy pattern. Ensure `?limit` does not appear in any logged URL if logs retain query strings — values are non-sensitive integers but best practice. |

### Known Threat Patterns for Laravel 12 + OpenCTI proxy

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| GraphQL parameter injection via `?limit` | Tampering | Integer coercion + whitelist = safe; value is interpolated as a variable, never string-concatenated into the heredoc. |
| Resource exhaustion via unbounded `first:` | DoS | Whitelist caps at 2000. OpenCTI's own internal limits also apply. |
| Sensitive data in error responses | Info Disclosure | Existing `EnrichmentController` catches `OpenCtiQueryException` and returns `"Service temporarily unavailable."` — preserve. Don't leak the raw GraphQL error. |
| Log flooding via victimology parse errors (D-10 happy path) | DoS | `Log::warning` is rate-limited by the logger config; even so, a single parse failure per actor per 15-min cache TTL is bounded. |
| Cache poisoning via rogue client specifying `?limit=500` | Tampering | Cache key is derived from server-side whitelisted `$limit`, not raw user input. Invalid values never reach the cache key. |
| OpenCTI credential leak in debug | Info Disclosure | `OpenCtiService::query()` already hides Bearer token; do not add `dd($data)` or `dump($response)` — note existing dead `// dd($data);` at `ThreatMapService.php:404, 408` — clean up in this phase's refactor (nice-to-have, not blocking). |

## Sources

### Primary (HIGH confidence)
- `backend/composer.json` — Laravel 12, Pest 3.8, Mockery 1.6 pinned `[VERIFIED]`
- `backend/app/Services/ThreatMapService.php` — existing `getSnapshot()` / `fetchSnapshot()` `[VERIFIED read]`
- `backend/app/Services/ThreatActorService.php` — existing `enrichment()` / `executeEnrichmentQuery()` / `normalizeEnrichmentResponse()` `[VERIFIED read]`
- `backend/app/Http/Controllers/ThreatMap/SnapshotController.php` — existing aggregation logic `[VERIFIED read]`
- `backend/app/Http/Controllers/ThreatActor/EnrichmentController.php` — existing 502 handling `[VERIFIED read]`
- `backend/routes/api.php` — route definitions + middleware groups `[VERIFIED read]`
- `backend/tests/Feature/ThreatActor/ThreatActorIndexTest.php` — Pest + Mockery service-binding pattern `[VERIFIED read]`
- `backend/tests/Feature/ThreatMap/SnapshotTest.php` — existing assertion style `[VERIFIED read]`
- `backend/app/Services/OpenCtiService.php` — GraphQL proxy signature `[VERIFIED read]`
- `.planning/phases/59-backend-snapshot-resize-victimology-endpoint/59-CONTEXT.md` — locked decisions D-01..D-15 `[VERIFIED]`
- `.planning/ROADMAP.md` — Phase 59 goals, SC1-SC5, PITFALL-12/13 `[VERIFIED]`

### Secondary (MEDIUM confidence)
- [Laravel 12 HTTP Requests docs](https://laravel.com/docs/12.x/requests) — `$request->integer()` behavior
- [Mastering Laravel: Request helper default-value inconsistency](https://masteringlaravel.io/daily/2025-12-18-request-helper-default-value-inconsistency) — confirms `integer()` returns `0` on missing/invalid
- [OpenCTI GraphQL API docs](https://docs.opencti.io/latest/reference/api/) — general reference
- [OpenCTI GraphQL schema on GitHub](https://github.com/OpenCTI-Platform/opencti/blob/master/opencti-platform/opencti-graphql/config/schema/opencti.graphql) — truncated view; full file too large for WebFetch
- [OpenCTI Filters knowledge](https://docs.opencti.io/5.12.X/reference/filters/) — `toTypes` filter semantics

### Tertiary (LOW confidence, flagged for GraphiQL verification in D-08)
- [OpenCTI Issue #1310 — Country aliases recognition](https://github.com/OpenCTI-Platform/opencti/issues/1310) — confirms `x_opencti_aliases` is used for country identifiers; inconsistent connector population noted
- [OpenCTI GraphQL query question](https://github.com/OpenCTI-Platform/opencti/issues/8963) — `toTypes` usage patterns
- Community claim that `entity_type === "Organization"` is the discriminator for the Organization Identity subtype — consistent with OpenCTI STIX implementation; **verify in live GraphiQL (D-08)**

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — every library pinned in composer.json, every pattern exists in the codebase, zero new deps.
- Architecture: **HIGH** — patterns for whitelist validation, semantic cache keys, concrete-type GraphQL fragments, per-section normalizers are all established in the existing code.
- Pitfalls: **MEDIUM** — Pitfalls 1, 3, 4, 6 are code-verified. Pitfall 2 (Country ISO-2 field) and Pitfall 5 (SnapshotTest 401) are flagged for live verification.
- Test strategy: **HIGH** — mirrors `ThreatActorIndexTest.php` precisely.
- OpenCTI GraphQL specifics: **MEDIUM** (pending D-08) — `toTypes: ["Identity"]` + `entity_type === 'Organization'` is the documented pattern, but `x_opencti_aliases` ISO-2 extraction is the weakest link; the GraphiQL session documents or replaces it.

**Research date:** 2026-04-17
**Valid until:** 2026-05-17 (30 days — stable backend stack, no fast-moving dependencies). Re-verify if OpenCTI version on `192.168.251.20` is upgraded before Phase 59 starts.
