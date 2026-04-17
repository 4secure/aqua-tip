<?php

use App\Models\User;
use App\Services\ThreatMapService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;

uses(RefreshDatabase::class);

beforeEach(fn () => Cache::flush());

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

test('GET /api/threat-map/snapshot is publicly accessible and returns 200 (no auth required)', function () {
    mockThreatMapService();

    $response = $this->getJson('/api/threat-map/snapshot');

    $response->assertStatus(200);
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

// --- MAPBUF-06: ?limit whitelist + cache isolation ---

test('GET /api/threat-map/snapshot?limit=500 passes 500 to service', function () {
    app()->bind(ThreatMapService::class, function () {
        $mock = Mockery::mock(ThreatMapService::class);
        $mock->shouldReceive('getSnapshot')->with(500)->once()->andReturn([]);
        return $mock;
    });

    $response = $this->getJson('/api/threat-map/snapshot?limit=500');

    $response->assertStatus(200);
});

test('GET /api/threat-map/snapshot?limit=2000 passes 2000 to service (upper bound)', function () {
    app()->bind(ThreatMapService::class, function () {
        $mock = Mockery::mock(ThreatMapService::class);
        $mock->shouldReceive('getSnapshot')->with(2000)->once()->andReturn([]);
        return $mock;
    });

    $response = $this->getJson('/api/threat-map/snapshot?limit=2000');

    $response->assertStatus(200);
});

test('GET /api/threat-map/snapshot uses separate caches for each whitelisted limit', function () {
    $snapshot100 = [
        array_merge(fakeThreatMapSnapshot()[0], ['id' => 'evt-100']),
    ];
    $snapshot500 = array_map(
        fn ($i) => array_merge(fakeThreatMapSnapshot()[0], ['id' => "evt-500-{$i}"]),
        range(1, 5),
    );

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

test('GET /api/threat-map/snapshot?limit=99 defaults to 100 (non-whitelisted numeric)', function () {
    app()->bind(ThreatMapService::class, function () {
        $mock = Mockery::mock(ThreatMapService::class);
        $mock->shouldReceive('getSnapshot')->with(100)->once()->andReturn([]);
        return $mock;
    });

    $response = $this->getJson('/api/threat-map/snapshot?limit=99');

    $response->assertStatus(200);
});

test('GET /api/threat-map/snapshot?limit=abc defaults to 100 (non-numeric)', function () {
    app()->bind(ThreatMapService::class, function () {
        $mock = Mockery::mock(ThreatMapService::class);
        $mock->shouldReceive('getSnapshot')->with(100)->once()->andReturn([]);
        return $mock;
    });

    $response = $this->getJson('/api/threat-map/snapshot?limit=abc');

    $response->assertStatus(200);
});

test('GET /api/threat-map/snapshot with no limit param defaults to 100', function () {
    app()->bind(ThreatMapService::class, function () {
        $mock = Mockery::mock(ThreatMapService::class);
        $mock->shouldReceive('getSnapshot')->with(100)->once()->andReturn([]);
        return $mock;
    });

    $response = $this->getJson('/api/threat-map/snapshot');

    $response->assertStatus(200);
});

test('SnapshotController aggregates counters over full resized event array (MAPBUF-06 / D-05)', function () {
    $events = [];
    foreach (['GB' => 3, 'US' => 2, 'DE' => 2] as $code => $count) {
        for ($i = 0; $i < $count; $i++) {
            $events[] = [
                'id' => "evt-{$code}-{$i}",
                'type' => 'Malware',
                'color' => 'red',
                'ip' => "1.2.3.{$i}",
                'entity_type' => 'IPv4-Addr',
                'timestamp' => '2026-01-01T00:00:00Z',
                'message' => 'x',
                'lat' => 0.0,
                'lng' => 0.0,
                'city' => null,
                'country' => $code,
                'countryCode' => $code,
            ];
        }
    }

    app()->bind(ThreatMapService::class, function () use ($events) {
        $mock = Mockery::mock(ThreatMapService::class);
        $mock->shouldReceive('getSnapshot')->with(500)->andReturn($events);
        return $mock;
    });

    $response = $this->getJson('/api/threat-map/snapshot?limit=500');

    $response->assertStatus(200);
    expect($response->json('data.counters.threats'))->toBe(7);
    expect($response->json('data.counters.countries'))->toBe(3);  // GB + US + DE
    expect($response->json('data.countryCounts'))->toHaveCount(3);
});
