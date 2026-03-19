<?php

use App\Exceptions\OpenCtiConnectionException;
use App\Services\DashboardService;

function fakeDashboardIndicators(): array
{
    return array_map(fn (int $i) => [
        'id' => "obs-{$i}",
        'value' => "192.168.1.{$i}",
        'entity_type' => 'IPv4-Addr',
        'score' => rand(10, 100),
        'created_at' => "2026-03-19T10:0{$i}:00Z",
        'labels' => ['Phishing', 'Malware'],
    ], range(1, 10));
}

function mockDashboardIndicators(array $indicators = null): void
{
    $indicators ??= fakeDashboardIndicators();

    app()->bind(DashboardService::class, function () use ($indicators) {
        $mock = Mockery::mock(DashboardService::class);
        $mock->shouldReceive('getIndicators')->andReturn($indicators);

        return $mock;
    });
}

test('GET /api/dashboard/indicators returns 200 with correct structure', function () {
    mockDashboardIndicators();

    $response = $this->getJson('/api/dashboard/indicators');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                ['id', 'value', 'entity_type', 'score', 'created_at', 'labels'],
            ],
        ]);
});

test('GET /api/dashboard/indicators is publicly accessible (no auth required)', function () {
    mockDashboardIndicators();

    $response = $this->getJson('/api/dashboard/indicators');

    $response->assertStatus(200);
});

test('GET /api/dashboard/indicators returns 502 on OpenCTI connection failure', function () {
    app()->bind(DashboardService::class, function () {
        $mock = Mockery::mock(DashboardService::class);
        $mock->shouldReceive('getIndicators')
            ->andThrow(new OpenCtiConnectionException('Connection failed'));

        return $mock;
    });

    $response = $this->getJson('/api/dashboard/indicators');

    $response->assertStatus(502)
        ->assertJsonPath('message', 'Unable to load dashboard indicators. Please try again.');
});

test('GET /api/dashboard/indicators includes labels array for each indicator', function () {
    mockDashboardIndicators();

    $response = $this->getJson('/api/dashboard/indicators');

    $firstIndicator = $response->json('data.0');
    expect($firstIndicator)->toHaveKey('labels');
    expect($firstIndicator['labels'])->toBeArray();
});

test('GET /api/dashboard/indicators returns up to 10 indicators', function () {
    mockDashboardIndicators();

    $response = $this->getJson('/api/dashboard/indicators');

    expect($response->json('data'))->toHaveCount(10);
});
