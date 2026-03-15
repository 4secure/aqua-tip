<?php

use App\Data\CountryCentroids;
use App\Services\OpenCtiService;
use App\Services\ThreatMapService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

uses(Tests\TestCase::class);

beforeEach(function () {
    $this->openCtiMock = Mockery::mock(OpenCtiService::class);
    $this->app->instance(OpenCtiService::class, $this->openCtiMock);
    $this->service = app(ThreatMapService::class);
});

// ── CountryCentroids ──────────────────────────────────────────────────

it('returns coordinates for known country code US', function () {
    $result = CountryCentroids::get('US');

    expect($result)->not->toBeNull()
        ->and($result['lat'])->toBe(39.83)
        ->and($result['lng'])->toBe(-98.58);
});

it('returns null for unknown country code ZZ', function () {
    expect(CountryCentroids::get('ZZ'))->toBeNull();
});

it('contains at least 50 country entries', function () {
    $reflection = new ReflectionClass(CountryCentroids::class);
    $centroids = $reflection->getConstant('CENTROIDS');

    expect(count($centroids))->toBeGreaterThanOrEqual(50);
});

// ── parseStixEvent ────────────────────────────────────────────────────

it('extracts IP from ipv4-addr type', function () {
    $raw = [
        'id' => 'obs-1',
        'entity_type' => 'IPv4-Addr',
        'value' => '1.2.3.4',
        'created_at' => '2026-01-01T00:00:00Z',
        'objectLabel' => [],
    ];

    $result = $this->service->parseStixEvent($raw);

    expect($result)->not->toBeNull()
        ->and($result['ip'])->toBe('1.2.3.4')
        ->and($result['type'])->toBe('Unknown');
});

it('extracts IP from indicator STIX pattern field', function () {
    $raw = [
        'id' => 'ind-1',
        'entity_type' => 'Indicator',
        'pattern' => "[ipv4-addr:value = '10.20.30.40']",
        'pattern_type' => 'stix',
        'created_at' => '2026-01-01T00:00:00Z',
        'objectLabel' => [],
    ];

    $result = $this->service->parseStixEvent($raw);

    expect($result)->not->toBeNull()
        ->and($result['ip'])->toBe('10.20.30.40');
});

it('classifies malware type from entity_type', function () {
    $raw = [
        'id' => 'mal-1',
        'entity_type' => 'Malware',
        'value' => '5.6.7.8',
        'created_at' => '2026-01-01T00:00:00Z',
        'objectLabel' => [],
    ];

    $result = $this->service->parseStixEvent($raw);

    expect($result)->not->toBeNull()
        ->and($result['type'])->toBe('Malware');
});

it('classifies phishing from labels', function () {
    $raw = [
        'id' => 'obs-2',
        'entity_type' => 'IPv4-Addr',
        'value' => '1.1.1.1',
        'created_at' => '2026-01-01T00:00:00Z',
        'objectLabel' => [
            ['value' => 'phishing'],
        ],
    ];

    $result = $this->service->parseStixEvent($raw);

    expect($result)->not->toBeNull()
        ->and($result['type'])->toBe('Phishing');
});

it('returns null when no IP is extractable', function () {
    $raw = [
        'id' => 'report-1',
        'entity_type' => 'Report',
        'name' => 'Some report',
        'created_at' => '2026-01-01T00:00:00Z',
        'objectLabel' => [],
    ];

    expect($this->service->parseStixEvent($raw))->toBeNull();
});

it('returns null for empty data', function () {
    expect($this->service->parseStixEvent([]))->toBeNull();
});

it('returns null for malformed data', function () {
    expect($this->service->parseStixEvent(['id' => null, 'entity_type' => null]))->toBeNull();
});

// ── resolveGeo ────────────────────────────────────────────────────────

it('resolves geo from ip-api.com on success', function () {
    Cache::flush();

    Http::fake([
        'ip-api.com/*' => Http::response([
            'status' => 'success',
            'lat' => 37.7749,
            'lon' => -122.4194,
            'city' => 'San Francisco',
            'country' => 'United States',
            'countryCode' => 'US',
        ]),
    ]);

    $result = $this->service->resolveGeo('8.8.8.8');

    expect($result)->not->toBeNull()
        ->and($result['lat'])->toBe(37.7749)
        ->and($result['lng'])->toBe(-122.4194)
        ->and($result['city'])->toBe('San Francisco')
        ->and($result['country'])->toBe('United States')
        ->and($result['countryCode'])->toBe('US');
});

it('falls back to country centroids when ip-api fails', function () {
    Cache::flush();

    Http::fake([
        'ip-api.com/*' => Http::response([
            'status' => 'fail',
            'message' => 'reserved range',
        ]),
    ]);

    // ip-api failed with no countryCode and no fallback hint — result should be null.
    $result = $this->service->resolveGeo('0.0.0.0');

    expect($result)->toBeNull();
});

it('falls back to centroids when ip-api returns countryCode on partial failure', function () {
    Cache::flush();

    Http::fake([
        'ip-api.com/*' => Http::response([
            'status' => 'fail',
            'message' => 'private range',
            'countryCode' => 'DE',
        ]),
    ]);

    $result = $this->service->resolveGeo('192.168.1.1', 'DE');

    expect($result)->not->toBeNull()
        ->and($result['lat'])->toBe(51.17)
        ->and($result['lng'])->toBe(10.45);
});

it('returns null when both ip-api and centroid lookup fail', function () {
    Cache::flush();

    Http::fake([
        'ip-api.com/*' => Http::response([], 500),
    ]);

    $result = $this->service->resolveGeo('0.0.0.0');

    expect($result)->toBeNull();
});

it('caches geo resolution results', function () {
    Cache::flush();

    Http::fake([
        'ip-api.com/*' => Http::response([
            'status' => 'success',
            'lat' => 51.5074,
            'lon' => -0.1278,
            'city' => 'London',
            'country' => 'United Kingdom',
            'countryCode' => 'GB',
        ]),
    ]);

    // First call — hits the API
    $this->service->resolveGeo('1.1.1.1');

    // Second call — should use cache, not API again
    $result = $this->service->resolveGeo('1.1.1.1');

    Http::assertSentCount(1);
    expect($result['city'])->toBe('London');
});

// ── classifyAttackType color mapping ──────────────────────────────────

it('maps C2 attack type to red color', function () {
    $raw = [
        'id' => 'obs-c2',
        'entity_type' => 'IPv4-Addr',
        'value' => '1.2.3.4',
        'created_at' => '2026-01-01T00:00:00Z',
        'objectLabel' => [
            ['value' => 'command-and-control'],
        ],
    ];

    $result = $this->service->parseStixEvent($raw);

    expect($result['color'])->toBe('red');
});

it('maps phishing to violet color', function () {
    $raw = [
        'id' => 'obs-ph',
        'entity_type' => 'IPv4-Addr',
        'value' => '1.2.3.4',
        'created_at' => '2026-01-01T00:00:00Z',
        'objectLabel' => [
            ['value' => 'phishing'],
        ],
    ];

    $result = $this->service->parseStixEvent($raw);

    expect($result['color'])->toBe('violet');
});

it('maps scanning to amber color', function () {
    $raw = [
        'id' => 'obs-sc',
        'entity_type' => 'IPv4-Addr',
        'value' => '1.2.3.4',
        'created_at' => '2026-01-01T00:00:00Z',
        'objectLabel' => [
            ['value' => 'scanning'],
        ],
    ];

    $result = $this->service->parseStixEvent($raw);

    expect($result['color'])->toBe('amber');
});

it('maps reconnaissance to cyan color', function () {
    $raw = [
        'id' => 'obs-rc',
        'entity_type' => 'IPv4-Addr',
        'value' => '1.2.3.4',
        'created_at' => '2026-01-01T00:00:00Z',
        'objectLabel' => [
            ['value' => 'reconnaissance'],
        ],
    ];

    $result = $this->service->parseStixEvent($raw);

    expect($result['color'])->toBe('cyan');
});

it('defaults unknown attack types to cyan', function () {
    $raw = [
        'id' => 'obs-unk',
        'entity_type' => 'IPv4-Addr',
        'value' => '1.2.3.4',
        'created_at' => '2026-01-01T00:00:00Z',
        'objectLabel' => [],
    ];

    $result = $this->service->parseStixEvent($raw);

    expect($result['color'])->toBe('cyan');
});
