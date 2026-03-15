<?php

use App\Models\User;
use App\Services\ThreatMapService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function fakeThreatMapSnapshot(): array
{
    return [
        [
            'id' => 'evt-1',
            'type' => 'Malware',
            'color' => 'red',
            'ip' => '1.2.3.4',
            'entity_type' => 'IPv4-Addr',
            'timestamp' => '2026-01-01T00:00:00Z',
            'message' => '1.2.3.4',
            'lat' => 51.51,
            'lng' => -0.13,
            'city' => 'London',
            'country' => 'United Kingdom',
            'countryCode' => 'GB',
        ],
        [
            'id' => 'evt-2',
            'type' => 'Phishing',
            'color' => 'violet',
            'ip' => '5.6.7.8',
            'entity_type' => 'IPv4-Addr',
            'timestamp' => '2026-01-01T00:01:00Z',
            'message' => '5.6.7.8',
            'lat' => 39.83,
            'lng' => -98.58,
            'city' => null,
            'country' => 'United States',
            'countryCode' => 'US',
        ],
    ];
}

function mockThreatMapService(array $snapshot = null): void
{
    $snapshot ??= fakeThreatMapSnapshot();

    app()->bind(ThreatMapService::class, function () use ($snapshot) {
        $mock = Mockery::mock(ThreatMapService::class);
        $mock->shouldReceive('getSnapshot')
            ->andReturn($snapshot);

        return $mock;
    });
}

test('GET /api/threat-map/snapshot returns 401 for unauthenticated user', function () {
    $response = $this->getJson('/api/threat-map/snapshot');

    $response->assertStatus(401);
});

test('GET /api/threat-map/snapshot returns 200 with correct structure', function () {
    mockThreatMapService();

    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->getJson('/api/threat-map/snapshot');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                'events',
                'counters' => ['threats', 'countries', 'types'],
            ],
        ]);

    $data = $response->json('data');
    expect($data['events'])->toHaveCount(2);
    expect($data['counters']['threats'])->toBe(2);
    expect($data['counters']['countries'])->toBe(2); // GB + US
    expect($data['counters']['types'])->toBe(2);     // Malware + Phishing
});

test('GET /api/threat-map/snapshot returns 502 on connection failure', function () {
    app()->bind(ThreatMapService::class, function () {
        $mock = Mockery::mock(ThreatMapService::class);
        $mock->shouldReceive('getSnapshot')
            ->andThrow(new \App\Exceptions\OpenCtiConnectionException('Connection failed'));

        return $mock;
    });

    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->getJson('/api/threat-map/snapshot');

    $response->assertStatus(502)
        ->assertJsonPath('message', 'Unable to load threat map data. Please try again.');
});

test('GET /api/threat-map/snapshot returns empty counters for no events', function () {
    mockThreatMapService([]);

    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->getJson('/api/threat-map/snapshot');

    $response->assertStatus(200);

    $counters = $response->json('data.counters');
    expect($counters['threats'])->toBe(0);
    expect($counters['countries'])->toBe(0);
    expect($counters['types'])->toBe(0);
});
