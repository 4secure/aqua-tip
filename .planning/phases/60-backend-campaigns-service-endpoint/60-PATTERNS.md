# Phase 60: Backend Campaigns Service & Endpoint - Pattern Map

**Mapped:** 2026-04-18
**Files analyzed:** 4 (3 new, 1 modified)
**Analogs found:** 4 / 4 (all strong matches — same codebase, same role, same data flow)

## Summary

Every new file has a near-exact analog already in the codebase. This phase is **pattern replication under a strict "mirror, do not inherit" constraint (PITFALL-09 / D-01)**. The planner's job is NOT to write new patterns — it is to copy the analog shape, swap identifiers (IntrusionSet → Campaign, threat_actors → threat_campaigns, IntrusionSetsOrdering → CampaignsOrdering), and **actively delete** IntrusionSet-only fields (`primary_motivation`, `resource_level`, `goals`, `motivation`) so SC4 passes.

Two critical inversions distinguish the new code from the analogs:

1. **Relationship direction inversion** — `ThreatActorService::normalizeCampaigns()` (lines 626–638) queries from the IntrusionSet side using `fromTypes: ["Campaign"]` and extracts `edge.node.from`. Phase 60 queries from the Campaign side using `toTypes: ["Intrusion-Set"]` and extracts `edge.node.to` (D-10). The word "attributed-to" is identical but the read-position flips.
2. **Attribution shape inversion** — analog returns a flat list of `{id, name, first_seen, last_seen}`; Phase 60 returns `[{id, name}]` only, deduped by id (D-09, D-11, D-20).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `backend/app/Services/ThreatCampaignService.php` | service (OpenCTI GraphQL proxy + cache + normalizer) | request-response (cached) | `backend/app/Services/ThreatActorService.php` | **exact** (same DI, same cache pattern, same heredoc convention, same normalizer shape) — BUT must remain a separate class |
| `backend/app/Http/Controllers/ThreatCampaign/IndexController.php` | controller (single-action invokable) | request-response | `backend/app/Http/Controllers/ThreatActor/IndexController.php` | **exact** (same `__invoke(Request)` shape, same envelope, same 502 catch) |
| `backend/tests/Feature/ThreatCampaign/IndexTest.php` | feature-test (Pest, HTTP + service level) | request-response | `backend/tests/Feature/ThreatActor/ThreatActorIndexTest.php` + `backend/tests/Feature/FeatureGate/FeatureGateMiddlewareTest.php` | **exact** (fixture helper + Mockery service binding + plan-seeded 403/200 split) |
| `backend/routes/api.php` | route-registration (one-line modification) | — | Existing `Route::middleware('feature-gate')->group(...)` block, lines 70–90 | **exact** (drop new `Route::get` alongside `/threat-actors`) |

## Pattern Assignments

---

### `backend/app/Services/ThreatCampaignService.php` (service, request-response with cache)

**Analog:** `backend/app/Services/ThreatActorService.php`
**Critical constraint:** PITFALL-09 / D-01 — standalone class. Must NOT `extends ThreatActorService`, `use ThreatActorService`, or call any method of it. Namespace and filename are new; inheritance is forbidden.

#### Pattern A1 — Namespace + DI constructor (mirror lines 1–12)

**Source: `ThreatActorService.php:1-12`**
```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class ThreatActorService
{
    public function __construct(
        private readonly OpenCtiService $openCti,
    ) {}
```

**Replicate:** Same namespace (`App\Services`), same `Cache` + `Log` use statements, same PHP 8 constructor-promoted private readonly `OpenCtiService`. Rename class to `ThreatCampaignService`.
**Do NOT inherit:** Do NOT `use App\Services\ThreatActorService` — a grep of the new file for `ThreatActor` must return zero matches.

#### Pattern A2 — Cache-wrapped `list()` entry point (mirror lines 29–44)

**Source: `ThreatActorService.php:29-44`**
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

**Replicate:**
- Signature shape (defaults, order, types), `func_get_args()` cache-key derivation, `Cache::remember($key, now()->addMinutes(15), $closure)`.
- Swap namespace: `'threat_actors:'` → `'threat_campaigns:'` (Pitfall 4 — namespace collision must not happen).

**Delete (D-02, D-08):** Drop the `?string $motivation = null` parameter entirely. Campaign SDO has no motivation field. New signature:
```php
public function list(
    int $first = 24,
    ?string $after = null,
    ?string $search = null,
    string $orderBy = 'modified',
    string $orderMode = 'desc',
): array
```

#### Pattern A3 — GraphQL heredoc with typed variables (mirror structure of lines 57–144, swap identifiers)

**Source: `ThreatActorService.php:57-66` (header) + lines 161-164 (query execution)**
```php
$graphql = <<<'GRAPHQL'
query (
    $first: Int!,
    $after: ID,
    $search: String,
    $orderBy: IntrusionSetsOrdering,
    $orderMode: OrderingMode,
    $filters: FilterGroup
) {
    intrusionSets(...)
    ...
}
GRAPHQL;

$data = $this->openCti->query($graphql, $variables);
return $this->normalizeResponse($data);
```

**Replicate:**
- Nowdoc syntax `<<<'GRAPHQL' ... GRAPHQL` (single-quoted heredoc — disables PHP interpolation, forces parameterization). Never use double-quoted heredoc.
- Typed GraphQL variables block with `$first: Int!`, `$after: ID`, `$search: String`, `$orderMode: OrderingMode`, `$filters: FilterGroup`.
- `$this->openCti->query($graphql, $variables)` call.

**SC4-critical swaps (D-05, D-08):**
- `IntrusionSetsOrdering` → **`CampaignsOrdering`** (SC4 explicit).
- `intrusionSets(...)` root → **`campaigns(...)`** root.
- Drop fields: `primary_motivation`, `resource_level`, `goals`, `targetedCountries`, `targetedSectors` (replaced by `attributed_to` relationship, see Pattern A4).
- Add fields (D-06): `first_seen`, `last_seen`, `objective`, `created` (ISO timestamp), plus `objectLabel { edges { node { id value color } } }`.

#### Pattern A4 — Relationship extraction with inline concrete-type fragment — **INVERSE DIRECTION**

**Source (contrasting reference — this is the INVERSE of what Phase 60 does): `ThreatActorService.php:620-638`**
```php
/**
 * Normalize campaign relationship edges.
 *
 * Campaigns use fromTypes direction (Campaign --attributed-to--> IntrusionSet),
 * so we extract from 'from' not 'to'.
 */
private function normalizeCampaigns(array $edges): array
{
    return array_values(array_filter(array_map(function (array $edge) {
        $campaign = $edge['node']['from'] ?? [];

        return empty($campaign['id']) ? null : [
            'id' => $campaign['id'],
            'name' => $campaign['name'] ?? null,
            'first_seen' => $campaign['first_seen'] ?? null,
            'last_seen' => $campaign['last_seen'] ?? null,
        ];
    }, $edges)));
}
```

**CRITICAL — Phase 60 inverts this direction (D-10):**

When queried **from the IntrusionSet side** (the existing enrichment endpoint), OpenCTI returns `stixCoreRelationships(fromTypes: ["Campaign"])` and the Campaign lives at `edge.node.from`. This is what the code above does.

When queried **from the Campaign side** (Phase 60's new endpoint), OpenCTI returns `stixCoreRelationships(toTypes: ["Intrusion-Set"])` and the IntrusionSet lives at `edge.node.to`. The relationship is the same edge in OpenCTI's graph — only the reading direction flips.

**Correct Phase 60 shape (GraphQL alias + inline fragment on `to`):**
```graphql
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
```

**Correct Phase 60 flattener (mirror `normalizeCampaigns` shape but read `to` not `from`, dedupe by id per D-20):**
```php
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
```

**If zero edges → return `[]` (empty array), NOT `null`** (D-11). Frontend CAMP-05 renders no chip.

#### Pattern A5 — `normalizeResponse()` private method (mirror lines 169–209)

**Source: `ThreatActorService.php:169-209`**
```php
private function normalizeResponse(array $data): array
{
    $connection = $data['intrusionSets'];
    $edges = $connection['edges'] ?? [];
    $pageInfo = $connection['pageInfo'] ?? [];

    $items = array_map(function (array $edge) {
        $node = $edge['node'];

        return [
            'id' => $node['id'],
            'name' => $node['name'],
            'description' => $node['description'] ?? null,
            'aliases' => $node['aliases'] ?? [],
            'motivation' => $node['primary_motivation'] ?? null,
            'resource_level' => $node['resource_level'] ?? null,
            'modified' => $node['modified'] ?? null,
            'goals' => $node['goals'] ?? [],
            'targeted_countries' => $this->flattenRelationshipTargets(
                $node['targetedCountries']['edges'] ?? [],
            ),
            'targeted_sectors' => $this->flattenRelationshipTargets(
                $node['targetedSectors']['edges'] ?? [],
            ),
            'external_references' => $this->flattenExternalReferences(
                $node['externalReferences']['edges'] ?? [],
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
```

**Replicate exactly (pagination block is IDENTICAL):** The pagination return shape (`has_next`, `has_previous`, `start_cursor`, `end_cursor`, `total` mapped from `hasNextPage`, `hasPreviousPage`, `startCursor`, `endCursor`, `globalCount`) is a locked contract — Phase 65's frontend pagination helper already consumes this exact shape.

**SC4-critical changes for Campaign item shape (D-19):**
- Root connection key: `$data['intrusionSets']` → **`$data['campaigns']`**.
- **DELETE these keys** (D-08, SC4): `motivation`, `resource_level`, `goals`, `targeted_countries`, `targeted_sectors`. They must not appear at all — including as `null` — in the output.
- **ADD these keys** (D-19): `objective`, `first_seen`, `last_seen`, `created`, `labels`, `attributed_to`.

**Final Campaign item shape:**
```php
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
    'labels' => $this->flattenLabels($node['objectLabel']['edges'] ?? []),
    'external_references' => $this->flattenExternalReferences(
        $node['externalReferences']['edges'] ?? [],
    ),
    'attributed_to' => $this->flattenAttributedTo(
        $node['attributed_to']['edges'] ?? [],
    ),
];
```

#### Pattern A6 — Flatten helpers (mirror lines 211–235, adapt for labels)

**Source: `ThreatActorService.php:211-235`**
```php
/**
 * Flatten relationship target edges (countries, sectors) into name arrays.
 */
private function flattenRelationshipTargets(array $edges): array
{
    return array_values(array_unique(array_filter(array_map(
        fn (array $edge) => $edge['node']['to']['name'] ?? null,
        $edges,
    ))));
}

/**
 * Flatten external references edges into a simple array.
 */
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
```

**Replicate `flattenExternalReferences` verbatim** — the OpenCTI `externalReferences` shape is identical across IntrusionSet and Campaign.

**Do NOT reuse `flattenRelationshipTargets`** — Campaign uses `attributed_to` (different shape, needs dedupe by id per D-20). See `flattenAttributedTo` above in Pattern A4.

**Add new `flattenLabels` helper** (D-19, no direct analog — closest kin is the `array_map` closure pattern):
```php
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
```

#### Pattern A7 — GraphiQL verification code comment (mirror Phase 59 convention)

**Source (established Phase 59 convention — `ThreatActorService.php:339-349` area):** A multi-line `//` comment block above the heredoc declares the date + GraphiQL URL + enum values verified live at OpenCTI. Phase 60 must reproduce this discipline (D-12). Example shape:

```php
// D-12: Query shape verified against OpenCTI GraphiQL at
// http://192.168.251.20:8080/graphql on {date}:
//   - CampaignsOrdering enum includes: modified, first_seen, last_seen, created, name
//   - `campaigns` root accepts (first, after, search, orderBy, orderMode, filters)
//   - `stixCoreRelationships(relationship_type: "attributed-to", toTypes: ["Intrusion-Set"])`
//     returns `edge.node.to` with inline fragment `... on IntrusionSet { id name }`
//   - `objective` confirmed as direct field on Campaign (STIX 2.1 SDO)
//   - `confidence` {included | omitted} — decision {rationale}
$graphql = <<<'GRAPHQL'
...
GRAPHQL;
```

---

### `backend/app/Http/Controllers/ThreatCampaign/IndexController.php` (controller, single-action invokable)

**Analog:** `backend/app/Http/Controllers/ThreatActor/IndexController.php`
**Match quality:** exact — same role, same data flow, same exception handling.

#### Pattern B1 — Full file structure (mirror `ThreatActor/IndexController.php:1-46`)

**Source: `ThreatActor/IndexController.php:1-46` (complete file)**
```php
<?php

namespace App\Http\Controllers\ThreatActor;

use App\Exceptions\OpenCtiConnectionException;
use App\Http\Controllers\Controller;
use App\Services\ThreatActorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IndexController extends Controller
{
    /**
     * List threat actors (intrusion sets) from OpenCTI.
     *
     * GET /api/threat-actors
     * Query params: after, search, motivation, sort, order
     */
    public function __invoke(Request $request): JsonResponse
    {
        $after = $request->query('after');
        $search = $request->query('search');
        $motivation = $request->query('motivation');
        $sort = $request->query('sort', 'modified');
        $order = $request->query('order', 'desc');

        try {
            $data = app(ThreatActorService::class)->list(
                24,
                $after,
                $search,
                $motivation,
                $sort,
                $order,
            );
        } catch (OpenCtiConnectionException) {
            return response()->json([
                'message' => 'Unable to load threat actors. Please try again.',
            ], 502);
        }

        return response()->json([
            'data' => $data,
        ]);
    }
}
```

**Replicate with these swaps (D-03, D-04, D-16):**

1. `namespace App\Http\Controllers\ThreatActor` → **`App\Http\Controllers\ThreatCampaign`** (new directory).
2. `use App\Services\ThreatActorService` → **`use App\Services\ThreatCampaignService`**.
3. **DELETE** line `$motivation = $request->query('motivation');` (D-03 — no motivation filter for campaigns).
4. In service call, drop `$motivation` arg: `->list(24, $after, $search, $sort, $order)` (matches the 5-arg `list()` signature from Pattern A2).
5. 502 message: `'Unable to load threat actors. Please try again.'` → **`'Unable to load campaigns. Please try again.'`** (D-16).
6. Docblock path: `GET /api/threat-actors` → `GET /api/threat-campaigns`; `Query params:` list drops `motivation`.

**Replicate exactly (do not deviate):**
- `__invoke(Request $request): JsonResponse` signature.
- Inline `$request->query('key', 'default')` reads (no FormRequest — matches D-16 discretion choice).
- `app(ServiceClass::class)` container resolution (not constructor DI — matches the analog).
- Single `try { ... } catch (OpenCtiConnectionException)` block. Do NOT catch `OpenCtiQueryException` (bubbles to Laravel's default 500 — matches analog).
- Envelope: `response()->json(['data' => $data])`.

---

### `backend/tests/Feature/ThreatCampaign/IndexTest.php` (feature-test)

**Primary analog:** `backend/tests/Feature/ThreatActor/ThreatActorIndexTest.php`
**Secondary analog:** `backend/tests/Feature/FeatureGate/FeatureGateMiddlewareTest.php` (for `createPlan` + 403 seeding)
**Tertiary analog:** `backend/tests/Feature/ThreatActor/EnrichmentTest.php` (for `beforeEach(fn () => Cache::flush())`)

#### Pattern C1 — Test file header + RefreshDatabase + Cache flush (mirror `EnrichmentTest.php:1-11`)

**Source: `EnrichmentTest.php:1-11`**
```php
<?php

use App\Models\User;
use App\Services\OpenCtiService;
use App\Services\ThreatActorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;

uses(RefreshDatabase::class);

beforeEach(fn () => Cache::flush());
```

**Replicate:**
- `uses(RefreshDatabase::class)` — required for `Plan` and `User` seeding in SC3 tests (D-22).
- `beforeEach(fn () => Cache::flush())` — **mandatory** (Pitfall 6). The `array` driver carries state across tests in the same Pest file; without this, SC2 ("caches results") passes in isolation but fails in full-file runs.

**Swap imports:**
- `App\Services\ThreatActorService` → `App\Services\ThreatCampaignService`.
- Add `use App\Models\Plan;` (needed for `createPlan` helper in Pattern C4).

#### Pattern C2 — Fixture helper function (mirror `ThreatActorIndexTest.php:10-63`)

**Source: `ThreatActorIndexTest.php:10-63`**
```php
function fakeIntrusionSetsResponse(int $count = 2): array
{
    $edges = [];
    for ($i = 1; $i <= $count; $i++) {
        $edges[] = [
            'node' => [
                'id' => "intrusion-set-{$i}",
                'name' => "APT{$i}",
                'description' => "Description for APT{$i}",
                'aliases' => ["Alias{$i}A", "Alias{$i}B"],
                'primary_motivation' => 'espionage',
                'resource_level' => 'government',
                'modified' => '2025-01-15T10:30:00.000Z',
                'goals' => ["Goal {$i} A", "Goal {$i} B"],
                'targetedCountries' => [...],
                'targetedSectors' => [...],
                'externalReferences' => [...],
            ],
        ];
    }

    return [
        'intrusionSets' => [
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
```

**Replicate as `fakeCampaignsResponse(int $count = 2)`:**
- Loop with `$i = 1..$count` building a node array — identical pattern.
- `pageInfo` block is **verbatim identical** — same keys, same example values. Do not change.
- Top-level key: `intrusionSets` → **`campaigns`**.

**SC4-critical node swaps (D-06, D-08, D-19):**
- **DELETE** `primary_motivation`, `resource_level`, `goals`, `targetedCountries`, `targetedSectors` from the fixture node entirely — they are IntrusionSet-only and must NOT appear in Campaign fixtures either (otherwise the SC4 negative test is structurally weaker).
- **ADD** `first_seen`, `last_seen`, `objective`, `created`, `objectLabel`, `attributed_to`.

**Attribution edge shape (mirrors D-10 relationship direction):**
```php
'attributed_to' => [
    'edges' => [
        ['node' => ['to' => ['id' => "intrusion-set-apt{$i}", 'name' => "APT{$i}"]]],
    ],
],
```
Note `node.to` (not `node.from`) — this is the inversion from `normalizeCampaigns`.

#### Pattern C3 — Service-binding Mockery helper (mirror `ThreatActorIndexTest.php:65-76`)

**Source: `ThreatActorIndexTest.php:65-76`**
```php
function mockOpenCtiForActors(array $response = null): void
{
    $response ??= fakeIntrusionSetsResponse();

    app()->bind(OpenCtiService::class, function () use ($response) {
        $mock = Mockery::mock(OpenCtiService::class);
        $mock->shouldReceive('query')
            ->andReturn($response);

        return $mock;
    });
}
```

**Replicate as `mockOpenCtiForCampaigns(array $response = null): void`:** Swap helper name + fixture fallback reference to `fakeCampaignsResponse()`. Everything else identical — `app()->bind(OpenCtiService::class, ...)` + `Mockery::mock(OpenCtiService::class)` + `shouldReceive('query')->andReturn($response)`.

**Why this pattern (don't-hand-roll):** The container binding pattern intercepts `OpenCtiService` at the DI level, which is the boundary `ThreatCampaignService` uses. `Http::fake()` would only intercept the Laravel HTTP layer and force tests to care about Bearer auth + retry mechanics irrelevant to Phase 60.

#### Pattern C4 — Plan-seeding helper for feature-gate tests (mirror `FeatureGateMiddlewareTest.php:31-44`)

**Source: `FeatureGateMiddlewareTest.php:31-44`**
```php
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
```

**Replicate verbatim** into `IndexTest.php` (copy all 10 required columns on `plans` table). Phase 60's planner must not reduce the field set — missing any column causes an SQL error in the `:memory:` SQLite test DB.

#### Pattern C5 — Free-plan 403 seeding with trial killswitch (mirror `FeatureGateMiddlewareTest.php:46-60`)

**Source: `FeatureGateMiddlewareTest.php:46-60`**
```php
test('free-plan user receives 403 upgrade_required', function () {
    mockOpenCtiForGating();

    $plan = createPlan('free');
    $user = User::factory()->create([
        'plan_id' => $plan->id,
        'trial_ends_at' => now()->subDay(),
    ]);

    $response = $this->actingAs($user)->getJson('/api/threat-actors');

    $response->assertStatus(403)
        ->assertJsonPath('error', 'upgrade_required')
        ->assertJsonPath('message', 'Upgrade your plan to access this feature');
});
```

**Critical pattern (Pitfall 3 — PITFALL-03 in CONTEXT.md Pitfalls list):** The `trial_ends_at => now()->subDay()` line is NON-NEGOTIABLE for the 403 assertion. `User::booted()` auto-sets `trial_ends_at = now()->addDays(30)` on factory create, so omitting this override yields **200** (trial branch wins over free-plan branch inside `FeatureGate::handle()`). This is the canonical "silent auto-upsert" gotcha.

**Replicate, swapping URL only:** `/api/threat-actors` → `/api/threat-campaigns`. JSON path assertions (`error` = `upgrade_required`, `message` = `Upgrade your plan to access this feature`) are contractual — do not change them.

#### Pattern C6 — HTTP 200 + JSON structure assertion (mirror `ThreatActorIndexTest.php:238-253`)

**Source: `ThreatActorIndexTest.php:238-253`**
```php
test('GET /api/threat-actors returns 200 for authenticated user', function () {
    mockOpenCtiForActors();

    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->getJson('/api/threat-actors');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                'items',
                'pagination' => ['has_next', 'has_previous', 'start_cursor', 'end_cursor', 'total'],
            ],
        ]);
});
```

**Replicate with URL swap.** Note `User::factory()->create()` (NO `trial_ends_at` override) — relies on the trial-autoset to grant 200. This is the **correct** pattern for 200 tests (unlike the 403 test which must kill the trial).

#### Pattern C7 — Cache assertion for SC2 (mirror `ThreatActorIndexTest.php:188-210`)

**Source: `ThreatActorIndexTest.php:188-210`**
```php
test('list caches results for 15 minutes', function () {
    mockOpenCtiForActors();

    Cache::flush();

    $service = app(\App\Services\ThreatActorService::class);
    $result1 = $service->list();

    // Replace mock to return different data
    app()->bind(OpenCtiService::class, function () {
        $mock = Mockery::mock(OpenCtiService::class);
        $mock->shouldReceive('query')
            ->andReturn(fakeIntrusionSetsResponse(1));

        return $mock;
    });

    // Should return cached result (still 2 items, not 1)
    $service2 = app(\App\Services\ThreatActorService::class);
    $result2 = $service2->list();

    expect($result2['items'])->toHaveCount(2);
});
```

**Replicate with service + fixture swap.** The "replace-mock-mid-test" trick is the canonical way to prove a cache hit: if the service re-invoked OpenCTI, it would get the new fixture (1 item); because it hits the cache, it returns the original 2.

**Extension for D-14 (explicit `Cache::has()` assertion):** Add immediately after `$result1`:
```php
$expectedKey = 'threat_campaigns:' . md5(json_encode([24, null, null, 'modified', 'desc']));
expect(Cache::has($expectedKey))->toBeTrue();
```
Note: 5 positional args because `ThreatCampaignService::list()` drops `motivation`. Recomputing the key in the test mirrors the `md5(json_encode(func_get_args()))` construction in the service (Pattern A2) — if either drifts, this assertion fails loudly.

#### Pattern C8 — 502 on connection failure (mirror `ThreatActorIndexTest.php:261-277`)

**Source: `ThreatActorIndexTest.php:261-277`**
```php
test('GET /api/threat-actors returns 502 on connection failure', function () {
    app()->bind(OpenCtiService::class, function () {
        $mock = Mockery::mock(OpenCtiService::class);
        $mock->shouldReceive('query')
            ->andThrow(new \App\Exceptions\OpenCtiConnectionException('Connection failed'));

        return $mock;
    });

    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->getJson('/api/threat-actors');

    $response->assertStatus(502)
        ->assertJsonPath('message', 'Unable to load threat actors. Please try again.');
});
```

**Replicate, swap URL + 502 message** to match Pattern B1's `'Unable to load campaigns. Please try again.'`.

#### Pattern C9 — SC4 negative assertion (new — no direct analog)

**Rationale:** No existing test asserts *absence* of fields. This is a Phase 60-specific contract test. Structure:
```php
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
```

**Pattern C10 — SC4 heredoc content assertion (new — extends `withArgs` pattern from `ThreatActorIndexTest.php:121-140`):**
Inspect the GraphQL string passed to `OpenCtiService::query()` and assert enum identifiers directly:
```php
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
```

---

### `backend/routes/api.php` (route-registration, single-line modification)

**Analog:** existing `Route::middleware('feature-gate')->group(...)` block at lines 70–90.

#### Pattern D1 — Import alongside existing ThreatActor imports (mirror line 20)

**Source: `api.php:19-20`**
```php
use App\Http\Controllers\ThreatActor\EnrichmentController as ThreatActorEnrichmentController;
use App\Http\Controllers\ThreatActor\IndexController as ThreatActorIndexController;
```

**Add (insert immediately after line 20, alphabetical position):**
```php
use App\Http\Controllers\ThreatCampaign\IndexController as ThreatCampaignIndexController;
```

The `as ThreatCampaignIndexController` alias avoids a collision with the existing `ThreatActorIndexController` / `ThreatNewsIndexController` / `DashboardCountsController` pattern already established in this file.

#### Pattern D2 — Route inside existing feature-gate group (mirror lines 75–77)

**Source: `api.php:70-90`** (feature-gate group — excerpt showing insertion context)
```php
// Premium features (authenticated + feature-gated)
Route::middleware('feature-gate')->group(function () {
    // Dark web search (feature-gated + credit-gated)
    Route::post('/dark-web/search', DarkWebSearchController::class)->middleware('deduct-credit');
    Route::get('/dark-web/status/{taskId}', [DarkWebSearchController::class, 'status']);

    // Threat actors & enrichment
    Route::get('/threat-actors', ThreatActorIndexController::class);
    Route::get('/threat-actors/{id}/enrichment', ThreatActorEnrichmentController::class);

    // Threat news
    Route::get('/threat-news', ThreatNewsIndexController::class);
    Route::get('/threat-news/labels', ThreatNewsLabelsController::class);
    ...
});
```

**Add (immediately after line 77, before the blank line leading to Threat news):**
```php
    // Threat campaigns
    Route::get('/threat-campaigns', ThreatCampaignIndexController::class);
```

**Why here (D-15 + Open Question 3):** Semantic grouping of OpenCTI list endpoints. Threat actors and campaigns are conceptually paired (an IntrusionSet executes Campaigns) — keeping them contiguous matches the existing threat-news + threat-news/labels grouping convention.

**Do NOT:**
- Add any middleware to the route (no `deduct-credit`, no `throttle:xxx`) — D-17.
- Register outside the `Route::middleware('feature-gate')->group` — breaks SC3.
- Use `Route::resource` or route-model binding — all other entries in this group are single-action invokable controllers.

**Verification:** After merge, `php artisan route:list | grep threat-campaigns` must show the route with middleware chain `api,auth:sanctum,feature-gate`.

---

## Shared Patterns

### Auth + Feature Gating (applies to controller + tests)

**Source:** `backend/app/Http/Middleware/FeatureGate.php` (existing, unchanged) + route registration nesting.
**Apply to:** `ThreatCampaign/IndexController.php` (implicit via route middleware — no per-route code), `IndexTest.php` SC3 tests.

**Middleware chain resolution:**
- Parent group `Route::middleware('auth:sanctum')` at `api.php:47` → unauthenticated → 401.
- Nested group `Route::middleware('feature-gate')` at `api.php:70` → free plan + expired trial → 403 `upgrade_required`.
- Paid plan OR active trial → handler runs.

**Test setup cheat-sheet:**
| Scenario | `User::factory()->create(...)` args | Expected status |
|----------|-------------------------------------|-----------------|
| Unauthenticated | (don't call `actingAs`) | 401 |
| Authenticated trial (default) | `[]` (factory default — trial_ends_at auto-set to +30 days) | 200 |
| Paid basic plan | `['plan_id' => createPlan('basic')->id]` | 200 |
| Free plan, expired trial (403 test) | `['plan_id' => createPlan('free')->id, 'trial_ends_at' => now()->subDay()]` | 403 |

### Error Translation (applies to controller + test)

**Source:** `backend/app/Services/OpenCtiService.php:44-56` (raises `OpenCtiConnectionException` on network/request failures, `OpenCtiQueryException` on GraphQL errors).
**Apply to:** `ThreatCampaign/IndexController.php` + 502 test in `IndexTest.php`.

**Rule:**
- Catch `OpenCtiConnectionException` in the controller → return 502 with user-safe message. Matches the analog exactly.
- Do NOT catch `OpenCtiQueryException` → let it bubble to Laravel's default 500 handler. This matches `ThreatActor/IndexController.php` (contrast with `EnrichmentController` which catches both — that pattern is NOT used here).

### Response Envelope (applies to controller + HTTP tests)

**Source:** Consistent across threat-actors, threat-news, dashboard controllers.
**Apply to:** controller return + `assertJsonStructure` in tests.

**Always:**
```php
return response()->json(['data' => $data]);
```

**Frontend contract (Phase 65 consumer):**
```json
{
  "data": {
    "items": [...],
    "pagination": {
      "has_next": bool,
      "has_previous": bool,
      "start_cursor": string|null,
      "end_cursor": string|null,
      "total": int|null
    }
  }
}
```

### GraphQL Parameterization (applies to service)

**Source:** `backend/app/Services/ThreatActorService.php:57-144`.
**Apply to:** `ThreatCampaignService.php` `executeQuery()`.

**Always:**
- Nowdoc syntax `<<<'GRAPHQL' ... GRAPHQL` — single-quoted. Never interpolate PHP variables into the query.
- All user-influenced values passed via `$variables` array to `$this->openCti->query($graphql, $variables)`.
- Typed GraphQL variables (`$first: Int!`, `$orderBy: CampaignsOrdering`, etc.) — OpenCTI validates these at parse time, so typo'd enums fail loudly rather than silently.

---

## No Analog Found

None. Every new file has a strong existing analog in the codebase.

One partial-gap: the **SC4 negative-assertion test pattern** ("assert absence of IntrusionSet-only keys", Pattern C9) does not exist in the codebase — no other test asserts *absence* of response fields. The pattern is simple enough to construct from Pest's `expect($x)->not->toHaveKey('key')` primitive; no analog is required. Documented above as a new Phase-60-specific contract.

---

## Metadata

**Analog search scope:**
- `backend/app/Services/` (6 files; `ThreatActorService.php` is the dominant analog — 779 lines total)
- `backend/app/Http/Controllers/ThreatActor/` (2 files; `IndexController.php` is the exact analog — 46 lines)
- `backend/tests/Feature/ThreatActor/` (`ThreatActorIndexTest.php` + `EnrichmentTest.php`)
- `backend/tests/Feature/FeatureGate/` (`FeatureGateMiddlewareTest.php`)
- `backend/routes/api.php` (existing feature-gate group at lines 70–90)
- `backend/app/Http/Middleware/FeatureGate.php` (confirmed unchanged — feeds shared-patterns section)
- `backend/app/Services/OpenCtiService.php` (confirmed exception types `OpenCtiConnectionException`/`OpenCtiQueryException`)

**Files read (no re-reads performed):**
- `backend/app/Services/ThreatActorService.php` — lines 1–60 (namespace + DI + `list()`), 160–235 (normalize + flatten helpers), 620–672 (inverse `normalizeCampaigns` for contrasting excerpt).
- `backend/app/Http/Controllers/ThreatActor/IndexController.php` — full file (46 lines).
- `backend/routes/api.php` — full file (111 lines).
- `backend/tests/Feature/ThreatActor/ThreatActorIndexTest.php` — lines 1–130 (fixtures + service-binding + first test), 180–278 (cache test + HTTP 200/401/502 tests).
- `backend/tests/Feature/ThreatActor/EnrichmentTest.php` — lines 1–70 (header + `beforeEach(Cache::flush())` convention).
- `backend/tests/Feature/FeatureGate/FeatureGateMiddlewareTest.php` — lines 1–75 (createPlan helper + 403/200 seeding patterns).
- `backend/app/Services/OpenCtiService.php` — lines 1–70 (query signature + exception types).

**Pattern extraction date:** 2026-04-18
