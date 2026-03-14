<?php

use App\Models\User;
use App\Services\OpenCtiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;

uses(RefreshDatabase::class);

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
                'targetedCountries' => [
                    'edges' => [
                        ['node' => ['to' => ['name' => 'United States']]],
                        ['node' => ['to' => ['name' => 'Germany']]],
                    ],
                ],
                'targetedSectors' => [
                    'edges' => [
                        ['node' => ['to' => ['name' => 'Government']]],
                        ['node' => ['to' => ['name' => 'Defense']]],
                    ],
                ],
                'externalReferences' => [
                    'edges' => [
                        [
                            'node' => [
                                'source_name' => 'mitre-attack',
                                'url' => "https://attack.mitre.org/groups/G{$i}",
                                'description' => "MITRE ref for APT{$i}",
                            ],
                        ],
                    ],
                ],
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

test('list returns normalized threat actors with all fields', function () {
    mockOpenCtiForActors();

    $service = app(\App\Services\ThreatActorService::class);
    $result = $service->list();

    expect($result)->toHaveKeys(['items', 'pagination']);
    expect($result['items'])->toHaveCount(2);

    $actor = $result['items'][0];
    expect($actor)->toHaveKeys([
        'id', 'name', 'description', 'aliases', 'motivation',
        'resource_level', 'modified', 'goals', 'targeted_countries',
        'targeted_sectors', 'external_references',
    ]);
    expect($actor['id'])->toBe('intrusion-set-1');
    expect($actor['name'])->toBe('APT1');
    expect($actor['aliases'])->toBe(['Alias1A', 'Alias1B']);
    expect($actor['motivation'])->toBe('espionage');
    expect($actor['goals'])->toBe(['Goal 1 A', 'Goal 1 B']);
    expect($actor['external_references'])->toHaveCount(1);
    expect($actor['external_references'][0])->toBe([
        'source_name' => 'mitre-attack',
        'url' => 'https://attack.mitre.org/groups/G1',
        'description' => 'MITRE ref for APT1',
    ]);
});

test('list returns normalized pagination', function () {
    mockOpenCtiForActors();

    $service = app(\App\Services\ThreatActorService::class);
    $result = $service->list();

    expect($result['pagination'])->toBe([
        'has_next' => true,
        'has_previous' => false,
        'start_cursor' => 'cursor-start',
        'end_cursor' => 'cursor-end',
        'total' => 50,
    ]);
});

test('list forwards pagination params to GraphQL query', function () {
    app()->bind(OpenCtiService::class, function () {
        $mock = Mockery::mock(OpenCtiService::class);
        $mock->shouldReceive('query')
            ->withArgs(function (string $graphql, array $variables) {
                return $variables['first'] === 21
                    && $variables['after'] === 'my-cursor'
                    && $variables['orderBy'] === 'modified'
                    && $variables['orderMode'] === 'desc';
            })
            ->andReturn(fakeIntrusionSetsResponse(0));

        return $mock;
    });

    $service = app(\App\Services\ThreatActorService::class);
    $result = $service->list(21, 'my-cursor');

    expect($result['items'])->toBeArray();
});

test('list passes search as GraphQL variable not filter', function () {
    app()->bind(OpenCtiService::class, function () {
        $mock = Mockery::mock(OpenCtiService::class);
        $mock->shouldReceive('query')
            ->withArgs(function (string $graphql, array $variables) {
                return $variables['search'] === 'apt28'
                    && ! isset($variables['filters']);
            })
            ->andReturn(fakeIntrusionSetsResponse(0));

        return $mock;
    });

    $service = app(\App\Services\ThreatActorService::class);
    $result = $service->list(21, null, 'apt28');

    expect($result['items'])->toBeArray();
});

test('list builds FilterGroup for motivation filter', function () {
    app()->bind(OpenCtiService::class, function () {
        $mock = Mockery::mock(OpenCtiService::class);
        $mock->shouldReceive('query')
            ->withArgs(function (string $graphql, array $variables) {
                $filters = $variables['filters'] ?? null;
                if (! $filters) {
                    return false;
                }

                return $filters['mode'] === 'and'
                    && $filters['filterGroups'] === []
                    && $filters['filters'][0]['key'] === 'primary_motivation'
                    && $filters['filters'][0]['values'] === ['espionage']
                    && $filters['filters'][0]['operator'] === 'eq';
            })
            ->andReturn(fakeIntrusionSetsResponse(0));

        return $mock;
    });

    $service = app(\App\Services\ThreatActorService::class);
    $result = $service->list(21, null, null, 'espionage');

    expect($result['items'])->toBeArray();
});

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

test('list propagates OpenCtiConnectionException', function () {
    app()->bind(OpenCtiService::class, function () {
        $mock = Mockery::mock(OpenCtiService::class);
        $mock->shouldReceive('query')
            ->andThrow(new \App\Exceptions\OpenCtiConnectionException('Connection failed'));

        return $mock;
    });

    $service = app(\App\Services\ThreatActorService::class);
    $service->list();
})->throws(\App\Exceptions\OpenCtiConnectionException::class, 'Connection failed');

test('list handles nullable globalCount', function () {
    $response = fakeIntrusionSetsResponse(1);
    $response['intrusionSets']['pageInfo']['globalCount'] = null;
    mockOpenCtiForActors($response);

    $service = app(\App\Services\ThreatActorService::class);
    $result = $service->list();

    expect($result['pagination']['total'])->toBeNull();
});

// --- HTTP-level tests ---

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

test('GET /api/threat-actors returns 401 for unauthenticated user', function () {
    $response = $this->getJson('/api/threat-actors');

    $response->assertStatus(401);
});

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
