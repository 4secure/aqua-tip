<?php

use App\Exceptions\OpenCtiConnectionException;
use App\Services\DashboardService;
use App\Services\OpenCtiService;
use Illuminate\Support\Facades\Cache;

uses(Tests\TestCase::class);

beforeEach(function () {
    Cache::flush();
});

function createDashboardService(OpenCtiService $openCti = null): DashboardService
{
    $openCti ??= Mockery::mock(OpenCtiService::class);

    return new DashboardService($openCti);
}

function makeCountsResponse(int $globalCount): array
{
    return [
        'stixCyberObservables' => [
            'pageInfo' => [
                'globalCount' => $globalCount,
            ],
        ],
    ];
}

test('getCounts returns 4 entity type counts from OpenCTI', function () {
    $mock = Mockery::mock(OpenCtiService::class);
    $mock->shouldReceive('query')
        ->times(4)
        ->andReturn(
            makeCountsResponse(100),
            makeCountsResponse(200),
            makeCountsResponse(300),
            makeCountsResponse(400),
        );

    $service = createDashboardService($mock);
    $result = $service->getCounts();

    expect($result)->toHaveCount(4);

    expect($result[0])->toMatchArray(['entity_type' => 'IPv4-Addr', 'label' => 'IP Addresses', 'count' => 100]);
    expect($result[1])->toMatchArray(['entity_type' => 'Domain-Name', 'label' => 'Domains', 'count' => 200]);
    expect($result[2])->toMatchArray(['entity_type' => 'Url', 'label' => 'URLs', 'count' => 300]);
    expect($result[3])->toMatchArray(['entity_type' => 'Email-Addr', 'label' => 'Email Addresses', 'count' => 400]);
});

test('getCounts returns stale cache when OpenCTI fails', function () {
    $staleData = [
        ['entity_type' => 'IPv4-Addr', 'label' => 'IP Addresses', 'count' => 42],
    ];

    Cache::put('dashboard_counts', $staleData, now()->addMinutes(10));

    $mock = Mockery::mock(OpenCtiService::class);
    $mock->shouldReceive('query')
        ->andThrow(new OpenCtiConnectionException('Connection failed'));

    $service = createDashboardService($mock);
    $result = $service->getCounts();

    expect($result)->toBe($staleData);
});

test('getCounts throws when OpenCTI fails and no cache exists', function () {
    $mock = Mockery::mock(OpenCtiService::class);
    $mock->shouldReceive('query')
        ->andThrow(new OpenCtiConnectionException('Connection failed'));

    $service = createDashboardService($mock);

    expect(fn () => $service->getCounts())->toThrow(OpenCtiConnectionException::class);
});

test('getIndicators returns normalized observable array', function () {
    $mock = Mockery::mock(OpenCtiService::class);
    $mock->shouldReceive('query')
        ->once()
        ->andReturn([
            'stixCyberObservables' => [
                'edges' => [
                    [
                        'node' => [
                            'id' => 'x1',
                            'entity_type' => 'IPv4-Addr',
                            'observable_value' => '1.2.3.4',
                            'x_opencti_score' => 75,
                            'created_at' => '2026-03-19T10:00:00Z',
                        ],
                    ],
                ],
            ],
        ]);

    $service = createDashboardService($mock);
    $result = $service->getIndicators();

    expect($result)->toHaveCount(1);
    expect($result[0])->toBe([
        'id' => 'x1',
        'value' => '1.2.3.4',
        'entity_type' => 'IPv4-Addr',
        'score' => 75,
        'created_at' => '2026-03-19T10:00:00Z',
    ]);
});

test('getCategories returns top 6 labels sorted by count descending', function () {
    // Build 8 distinct labels with different frequencies
    $edges = [];
    $labelFrequencies = [
        'malware' => 50,
        'phishing' => 40,
        'botnet' => 30,
        'ransomware' => 25,
        'trojan' => 20,
        'apt' => 15,
        'spam' => 10,   // should be excluded (7th)
        'ddos' => 5,    // should be excluded (8th)
    ];

    foreach ($labelFrequencies as $label => $count) {
        for ($i = 0; $i < $count; $i++) {
            $edges[] = [
                'node' => [
                    'objectLabel' => [
                        ['value' => $label],
                    ],
                ],
            ];
        }
    }

    $mock = Mockery::mock(OpenCtiService::class);
    $mock->shouldReceive('query')
        ->once()
        ->andReturn([
            'stixCyberObservables' => ['edges' => $edges],
        ]);

    $service = createDashboardService($mock);
    $result = $service->getCategories();

    expect($result)->toHaveCount(6);
    expect($result[0]['label'])->toBe('malware');
    expect($result[0]['count'])->toBe(50);

    // Verify descending order
    for ($i = 0; $i < count($result) - 1; $i++) {
        expect($result[$i]['count'])->toBeGreaterThanOrEqual($result[$i + 1]['count']);
    }

    // Verify 'spam' and 'ddos' are excluded
    $labels = array_column($result, 'label');
    expect($labels)->not->toContain('spam');
    expect($labels)->not->toContain('ddos');
});

test('getCategories handles observables with no labels', function () {
    $edges = [
        ['node' => ['objectLabel' => []]],
        ['node' => ['objectLabel' => []]],
        ['node' => ['objectLabel' => []]],
    ];

    $mock = Mockery::mock(OpenCtiService::class);
    $mock->shouldReceive('query')
        ->once()
        ->andReturn([
            'stixCyberObservables' => ['edges' => $edges],
        ]);

    $service = createDashboardService($mock);
    $result = $service->getCategories();

    expect($result)->toBe([]);
});

test('getCounts caches result for 5 minutes', function () {
    $mock = Mockery::mock(OpenCtiService::class);
    $mock->shouldReceive('query')
        ->times(4)
        ->andReturn(makeCountsResponse(10));

    $service = createDashboardService($mock);
    $service->getCounts();

    expect(Cache::has('dashboard_counts'))->toBeTrue();
});
