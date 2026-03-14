<?php

use App\Models\User;
use App\Services\OpenCtiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;

uses(RefreshDatabase::class);

function fakeReportsResponse(int $count = 2): array
{
    $edges = [];
    for ($i = 1; $i <= $count; $i++) {
        $edges[] = [
            'node' => [
                'id' => "report-{$i}",
                'name' => "Threat Report {$i}",
                'description' => "Description for report {$i}",
                'published' => "2026-01-0{$i}T00:00:00Z",
                'confidence' => 85,
                'report_types' => ['threat-report', 'internal-report'],
                'externalReferences' => [
                    'edges' => [
                        [
                            'node' => [
                                'source_name' => 'reference-source',
                                'url' => "https://example.com/report-{$i}",
                                'description' => "Ref for report {$i}",
                            ],
                        ],
                    ],
                ],
                'objects' => [
                    'edges' => [
                        [
                            'node' => [
                                'id' => "intrusion-set-{$i}",
                                'entity_type' => 'Intrusion-Set',
                                'name' => "APT{$i}",
                            ],
                        ],
                        [
                            'node' => [
                                'id' => "malware-{$i}",
                                'entity_type' => 'Malware',
                                'name' => "Emotet-{$i}",
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }

    return [
        'reports' => [
            'edges' => $edges,
            'pageInfo' => [
                'hasNextPage' => true,
                'hasPreviousPage' => false,
                'startCursor' => 'cursor-start',
                'endCursor' => 'cursor-end',
                'globalCount' => 100,
            ],
        ],
    ];
}

function mockOpenCtiForNews(array $response = null): void
{
    $response ??= fakeReportsResponse();

    app()->bind(OpenCtiService::class, function () use ($response) {
        $mock = Mockery::mock(OpenCtiService::class);
        $mock->shouldReceive('query')
            ->andReturn($response);

        return $mock;
    });
}

test('list returns normalized reports with all fields', function () {
    mockOpenCtiForNews();

    $service = app(\App\Services\ThreatNewsService::class);
    $result = $service->list();

    expect($result)->toHaveKeys(['items', 'pagination']);
    expect($result['items'])->toHaveCount(2);

    $report = $result['items'][0];
    expect($report)->toHaveKeys([
        'id', 'name', 'description', 'published', 'confidence',
        'report_types', 'related_entities', 'external_references',
    ]);
    expect($report['id'])->toBe('report-1');
    expect($report['name'])->toBe('Threat Report 1');
    expect($report['published'])->toBe('2026-01-01T00:00:00Z');
    expect($report['confidence'])->toBe(85);
    expect($report['report_types'])->toBe(['threat-report', 'internal-report']);
});

test('list normalizes related entities from objects field', function () {
    mockOpenCtiForNews();

    $service = app(\App\Services\ThreatNewsService::class);
    $result = $service->list();

    $entities = $result['items'][0]['related_entities'];
    expect($entities)->toHaveCount(2);
    expect($entities[0])->toBe([
        'id' => 'intrusion-set-1',
        'entity_type' => 'Intrusion-Set',
        'name' => 'APT1',
    ]);
    expect($entities[1])->toBe([
        'id' => 'malware-1',
        'entity_type' => 'Malware',
        'name' => 'Emotet-1',
    ]);
});

test('list normalizes external references', function () {
    mockOpenCtiForNews();

    $service = app(\App\Services\ThreatNewsService::class);
    $result = $service->list();

    $refs = $result['items'][0]['external_references'];
    expect($refs)->toHaveCount(1);
    expect($refs[0])->toBe([
        'source_name' => 'reference-source',
        'url' => 'https://example.com/report-1',
        'description' => 'Ref for report 1',
    ]);
});

test('list returns normalized pagination', function () {
    mockOpenCtiForNews();

    $service = app(\App\Services\ThreatNewsService::class);
    $result = $service->list();

    expect($result['pagination'])->toBe([
        'has_next' => true,
        'has_previous' => false,
        'start_cursor' => 'cursor-start',
        'end_cursor' => 'cursor-end',
        'total' => 100,
    ]);
});

test('list forwards pagination and sort params to GraphQL query', function () {
    app()->bind(OpenCtiService::class, function () {
        $mock = Mockery::mock(OpenCtiService::class);
        $mock->shouldReceive('query')
            ->withArgs(function (string $graphql, array $variables) {
                return $variables['first'] === 21
                    && $variables['after'] === 'my-cursor'
                    && $variables['orderBy'] === 'published'
                    && $variables['orderMode'] === 'desc';
            })
            ->andReturn(fakeReportsResponse(0));

        return $mock;
    });

    $service = app(\App\Services\ThreatNewsService::class);
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
            ->andReturn(fakeReportsResponse(0));

        return $mock;
    });

    $service = app(\App\Services\ThreatNewsService::class);
    $result = $service->list(21, null, 'apt28');

    expect($result['items'])->toBeArray();
});

test('list builds FilterGroup for confidence filter', function () {
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
                    && $filters['filters'][0]['key'] === 'confidence'
                    && $filters['filters'][0]['values'] === ['85']
                    && $filters['filters'][0]['operator'] === 'eq';
            })
            ->andReturn(fakeReportsResponse(0));

        return $mock;
    });

    $service = app(\App\Services\ThreatNewsService::class);
    $result = $service->list(21, null, null, '85');

    expect($result['items'])->toBeArray();
});

test('list caches results for 5 minutes', function () {
    mockOpenCtiForNews();

    Cache::flush();

    $service = app(\App\Services\ThreatNewsService::class);
    $result1 = $service->list();

    // Replace mock to return different data
    app()->bind(OpenCtiService::class, function () {
        $mock = Mockery::mock(OpenCtiService::class);
        $mock->shouldReceive('query')
            ->andReturn(fakeReportsResponse(1));

        return $mock;
    });

    // Should return cached result (still 2 items, not 1)
    $service2 = app(\App\Services\ThreatNewsService::class);
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

    $service = app(\App\Services\ThreatNewsService::class);
    $service->list();
})->throws(\App\Exceptions\OpenCtiConnectionException::class, 'Connection failed');

test('list handles nullable globalCount', function () {
    $response = fakeReportsResponse(1);
    $response['reports']['pageInfo']['globalCount'] = null;
    mockOpenCtiForNews($response);

    $service = app(\App\Services\ThreatNewsService::class);
    $result = $service->list();

    expect($result['pagination']['total'])->toBeNull();
});

test('list handles empty objects edges gracefully', function () {
    $response = fakeReportsResponse(1);
    $response['reports']['edges'][0]['node']['objects'] = ['edges' => []];
    mockOpenCtiForNews($response);

    $service = app(\App\Services\ThreatNewsService::class);
    $result = $service->list();

    expect($result['items'][0]['related_entities'])->toBe([]);
});

// --- HTTP-level tests ---

test('GET /api/threat-news returns 200 for authenticated user', function () {
    mockOpenCtiForNews();

    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->getJson('/api/threat-news');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                'items',
                'pagination' => ['has_next', 'has_previous', 'start_cursor', 'end_cursor', 'total'],
            ],
        ]);
});

test('GET /api/threat-news returns 401 for unauthenticated user', function () {
    $response = $this->getJson('/api/threat-news');

    $response->assertStatus(401);
});

test('GET /api/threat-news returns 502 on connection failure', function () {
    app()->bind(OpenCtiService::class, function () {
        $mock = Mockery::mock(OpenCtiService::class);
        $mock->shouldReceive('query')
            ->andThrow(new \App\Exceptions\OpenCtiConnectionException('Connection failed'));

        return $mock;
    });

    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->getJson('/api/threat-news');

    $response->assertStatus(502)
        ->assertJsonPath('message', 'Unable to load threat news. Please try again.');
});
