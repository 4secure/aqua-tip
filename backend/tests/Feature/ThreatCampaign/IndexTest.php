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
                    'edges' => [
                        [
                            'node' => [
                                'id' => "label-{$i}",
                                'value' => 'espionage',
                                'color' => '#cc0000',
                            ],
                        ],
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
