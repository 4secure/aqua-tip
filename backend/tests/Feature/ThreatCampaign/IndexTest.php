<?php

// Phase 60 test scaffold — tests added in Plans 03 (service) and 04 (HTTP).

use App\Models\Plan;
use App\Models\User;
use App\Services\OpenCtiService;
// class created in Plan 03; import here for scaffold parity
use App\Services\ThreatCampaignService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;

uses(RefreshDatabase::class);

beforeEach(fn () => Cache::flush());

/**
 * Build a fake OpenCTI `campaigns` GraphQL response.
 *
 * Mirrors the shape of the threat-actors fixture in
 * tests/Feature/ThreatActor/ThreatActorIndexTest.php, but carries ONLY
 * Campaign STIX fields (D-06, D-19). IntrusionSet-only keys are
 * intentionally omitted so SC4 absence assertions remain honest — see
 * .planning/phases/60-backend-campaigns-service-endpoint/60-RESEARCH.md
 * Pitfall 9 + D-08 for the full forbidden-field list.
 *
 * Top-level connection key is `campaigns`. Attribution edges follow
 * D-10 inverse direction: node.to (Campaign --attributed-to-->
 * IntrusionSet, read from the Campaign side).
 */
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
                    [
                        'id' => "label-{$i}",
                        'value' => 'espionage',
                        'color' => '#cc0000',
                    ],
                ],
                'externalReferences' => [
                    'edges' => [
                        [
                            'node' => [
                                'source_name' => 'mitre-attack',
                                'url' => "https://attack.mitre.org/campaigns/C{$i}",
                                'description' => "MITRE ref for Operation {$i}",
                            ],
                        ],
                    ],
                ],
                'attributed_to' => [
                    'edges' => [
                        [
                            'node' => [
                                'to' => [
                                    'id' => "intrusion-set-apt{$i}",
                                    'name' => "APT{$i}",
                                ],
                            ],
                        ],
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

/**
 * Bind a Mockery double of OpenCtiService into the container so that
 * ThreatCampaignService receives a deterministic response. Mirrors
 * mockOpenCtiForActors() in ThreatActorIndexTest.php (Pattern C3).
 */
function mockOpenCtiForCampaigns(?array $response = null): void
{
    $response ??= fakeCampaignsResponse();

    app()->bind(OpenCtiService::class, function () use ($response) {
        $mock = Mockery::mock(OpenCtiService::class);
        $mock->shouldReceive('query')
            ->andReturn($response);

        return $mock;
    });
}

/**
 * Seed a `plans` row with every NOT NULL column required by the
 * :memory: SQLite test database. Copied verbatim from
 * tests/Feature/FeatureGate/FeatureGateMiddlewareTest.php (Pattern C4).
 * All 10 columns are required — omitting any triggers an SQL error.
 *
 * Guarded with function_exists() because PHPUnit loads every Feature
 * test file into the same process; both this file and
 * FeatureGateMiddlewareTest.php declare `createPlan()` verbatim per D-22
 * (Rule 1 — auto-fix to prevent "Cannot redeclare" fatal error while
 *  preserving the verbatim body the plan prescribes).
 */
if (! function_exists('createPlan')) {
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
}

// ---------------------------------------------------------------------------
// Wave 1 — service-level tests (Plan 60-03)
// ---------------------------------------------------------------------------
//
// Bind to the Wave 0 helpers above (fakeCampaignsResponse,
// mockOpenCtiForCampaigns). Assert SC1 shape, SC2 cache, SC4 dual
// enforcement (heredoc enum + absence of IntrusionSet-only keys), and
// D-10/D-20 attribution normalization (node.to read + dedupe by id).

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
    expect($result['pagination'])->toHaveKeys(['has_next', 'has_previous', 'start_cursor', 'end_cursor', 'total']);
});

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

test('list uses CampaignsOrdering enum (SC4 heredoc check)', function () {
    app()->bind(OpenCtiService::class, function () {
        $mock = Mockery::mock(OpenCtiService::class);
        $mock->shouldReceive('query')
            ->withArgs(function (string $graphql, array $variables) {
                expect($graphql)->toContain('$orderBy: CampaignsOrdering');
                expect($graphql)->toContain('campaigns(');
                expect($graphql)->not->toContain('IntrusionSetsOrdering');
                expect($graphql)->not->toContain('intrusionSets(');
                expect($graphql)->toContain('toTypes: ["Intrusion-Set"]');

                return true;
            })
            ->andReturn(fakeCampaignsResponse(0));

        return $mock;
    });

    app(ThreatCampaignService::class)->list();
});

test('list caches results for 15 minutes', function () {
    mockOpenCtiForCampaigns();
    Cache::flush();

    $result1 = app(ThreatCampaignService::class)->list();
    expect($result1['items'])->toHaveCount(2);

    // Expected cache key uses 5 positional args (list() drops motivation — D-02).
    $expectedKey = 'threat_campaigns:' . md5(json_encode([24, null, null, 'modified', 'desc']));
    expect(Cache::has($expectedKey))->toBeTrue();

    // Namespace isolation (Pitfall 4) — the IntrusionSet namespace key must not collide.
    expect(Cache::has('threat_actors:' . md5(json_encode([24, null, null, 'modified', 'desc']))))->toBeFalse();

    // Rebind mock to return different data; cached result should still be 2 items.
    app()->bind(OpenCtiService::class, function () {
        $mock = Mockery::mock(OpenCtiService::class);
        $mock->shouldReceive('query')->andReturn(fakeCampaignsResponse(1));

        return $mock;
    });

    $result2 = app(ThreatCampaignService::class)->list();
    expect($result2['items'])->toHaveCount(2); // cache-hit, not the new 1-item mock
});

test('attributed_to normalization dedupes by id and reads node.to', function () {
    $customResponse = [
        'campaigns' => [
            'edges' => [
                ['node' => [
                    'id' => 'campaign-x',
                    'name' => 'Operation X',
                    'description' => null,
                    'first_seen' => null,
                    'last_seen' => null,
                    'objective' => null,
                    'aliases' => [],
                    'modified' => '2025-01-01T00:00:00.000Z',
                    'created' => '2025-01-01T00:00:00.000Z',
                    'objectLabel' => [],
                    'externalReferences' => ['edges' => []],
                    'attributed_to' => [
                        'edges' => [
                            ['node' => ['to' => ['id' => 'is-apt1', 'name' => 'APT1']]],
                            ['node' => ['to' => ['id' => 'is-apt1', 'name' => 'APT1']]], // duplicate id
                            ['node' => ['to' => ['id' => 'is-apt2', 'name' => 'APT2']]],
                        ],
                    ],
                ]],
            ],
            'pageInfo' => [
                'hasNextPage' => false,
                'hasPreviousPage' => false,
                'startCursor' => null,
                'endCursor' => null,
                'globalCount' => 1,
            ],
        ],
    ];
    mockOpenCtiForCampaigns($customResponse);

    $result = app(ThreatCampaignService::class)->list();

    expect($result['items'][0]['attributed_to'])->toHaveCount(2);
    expect($result['items'][0]['attributed_to'])->toBe([
        ['id' => 'is-apt1', 'name' => 'APT1'],
        ['id' => 'is-apt2', 'name' => 'APT2'],
    ]);
});

// ---------------------------------------------------------------------------
// Wave 2 — HTTP-level tests (Plan 60-04)
// ---------------------------------------------------------------------------
//
// Drive the full request lifecycle through the route registered inside
// the feature-gate middleware group. Covers SC1 (envelope shape), SC3
// (auth + feature-gate enforcement: 401 unauth, 403 free-expired, 200
// basic), and the OpenCtiConnectionException → 502 user-safe response.
// Pattern refs: 60-PATTERNS.md C5/C6/C8 + Shared Auth/Feature-Gating
// cheat-sheet.

test('GET /api/threat-campaigns returns 200 for authenticated trial user', function () {
    mockOpenCtiForCampaigns();
    // No trial_ends_at override — User::booted() auto-sets it to +30 days,
    // so this user is on the active-trial branch and should pass the gate.
    $user = User::factory()->create();

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

test('GET /api/threat-campaigns returns 403 for free-plan user', function () {
    mockOpenCtiForCampaigns();
    $plan = createPlan('free');
    // Pitfall 3: trial_ends_at MUST be in the past, otherwise the
    // active-trial branch in FeatureGate::handle() wins and returns 200.
    $user = User::factory()->create([
        'plan_id' => $plan->id,
        'trial_ends_at' => now()->subDay(),
    ]);

    $response = $this->actingAs($user)->getJson('/api/threat-campaigns');

    $response->assertStatus(403)
        ->assertJsonPath('error', 'upgrade_required')
        ->assertJsonPath('message', 'Upgrade your plan to access this feature');
});

test('GET /api/threat-campaigns returns 200 for basic-plan user', function () {
    mockOpenCtiForCampaigns();
    $plan = createPlan('basic');
    $user = User::factory()->create(['plan_id' => $plan->id]);

    $response = $this->actingAs($user)->getJson('/api/threat-campaigns');

    $response->assertStatus(200);
});

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
