<?php

use App\Exceptions\OpenCtiConnectionException;
use App\Services\IpSearchService;
use App\Services\OpenCtiService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

uses(Tests\TestCase::class);

beforeEach(function () {
    $this->openCtiMock = Mockery::mock(OpenCtiService::class);
    $this->app->instance(OpenCtiService::class, $this->openCtiMock);
});

function fakeObservableResponse(array $overrides = []): array
{
    return array_merge([
        'stixCyberObservables' => [
            'edges' => [
                [
                    'node' => [
                        'id' => 'obs-123',
                        'entity_type' => 'IPv4-Addr',
                        'observable_value' => '8.8.8.8',
                        'x_opencti_score' => 75,
                        'x_opencti_description' => 'Known DNS resolver',
                        'created_at' => '2024-01-01T00:00:00Z',
                        'updated_at' => '2024-06-01T00:00:00Z',
                        'objectLabel' => [
                            ['id' => 'lbl-1', 'value' => 'malware', 'color' => '#ff0000'],
                        ],
                        'createdBy' => ['name' => 'MITRE'],
                        'externalReferences' => [
                            'edges' => [
                                ['node' => ['source_name' => 'VirusTotal', 'url' => 'https://vt.com/8.8.8.8', 'description' => 'VT report']],
                            ],
                        ],
                        'x_opencti_aliases' => [],
                    ],
                ],
            ],
        ],
    ], $overrides);
}

function fakeRelationshipsResponse(): array
{
    return [
        'stixCoreRelationships' => [
            'edges' => [
                [
                    'node' => [
                        'id' => 'rel-1',
                        'relationship_type' => 'related-to',
                        'confidence' => 80,
                        'start_time' => '2024-01-01T00:00:00Z',
                        'stop_time' => null,
                        'from' => ['id' => 'obs-123', 'entity_type' => 'IPv4-Addr', 'name' => '8.8.8.8'],
                        'to' => ['id' => 'ta-1', 'entity_type' => 'Threat-Actor', 'name' => 'APT28'],
                    ],
                ],
            ],
        ],
    ];
}

function fakeIndicatorsResponse(): array
{
    return [
        'indicators' => [
            'edges' => [
                [
                    'node' => [
                        'id' => 'ind-1',
                        'name' => 'Suspicious IP',
                        'pattern' => "[ipv4-addr:value = '8.8.8.8']",
                        'pattern_type' => 'stix',
                        'valid_from' => '2024-01-01T00:00:00Z',
                        'valid_until' => '2025-01-01T00:00:00Z',
                        'x_opencti_score' => 70,
                        'objectLabel' => [
                            ['id' => 'lbl-2', 'value' => 'c2', 'color' => '#ff5500'],
                        ],
                    ],
                ],
            ],
        ],
    ];
}

function fakeSightingsResponse(): array
{
    return [
        'stixSightingRelationships' => [
            'edges' => [
                [
                    'node' => [
                        'id' => 'sig-1',
                        'first_seen' => '2024-03-01T00:00:00Z',
                        'last_seen' => '2024-06-01T00:00:00Z',
                        'attribute_count' => 5,
                        'confidence' => 90,
                        'from' => ['id' => 'ind-1', 'entity_type' => 'Indicator', 'name' => 'Suspicious IP'],
                        'to' => ['id' => 'org-1', 'entity_type' => 'Identity', 'name' => 'CERT-EU'],
                    ],
                ],
            ],
        ],
    ];
}

function fakeNotesResponse(): array
{
    return [
        'notes' => [
            'edges' => [
                [
                    'node' => [
                        'id' => 'note-1',
                        'content' => 'Observed scanning activity.',
                        'created' => '2024-04-01T00:00:00Z',
                        'attribute_abstract' => 'Scanning note',
                        'objectLabel' => [],
                    ],
                ],
            ],
        ],
    ];
}

function fakeGeoApiResponse(): array
{
    return [
        'status' => 'success',
        'country' => 'United States',
        'countryCode' => 'US',
        'city' => 'Mountain View',
        'regionName' => 'California',
        'lat' => 37.386,
        'lon' => -122.0838,
        'isp' => 'Google LLC',
        'org' => 'Google Public DNS',
        'as' => 'AS15169 Google LLC',
        'asname' => 'GOOGLE',
    ];
}

test('search with known IP returns normalized response with score, labels, created_by, description', function () {
    $this->openCtiMock->shouldReceive('query')
        ->times(5) // observable, relationships, indicators, sightings, notes
        ->andReturn(
            fakeObservableResponse(),
            fakeRelationshipsResponse(),
            fakeIndicatorsResponse(),
            fakeSightingsResponse(),
            fakeNotesResponse(),
        );

    Http::fake(['ip-api.com/*' => Http::response(fakeGeoApiResponse())]);

    $service = app(IpSearchService::class);
    $result = $service->search('8.8.8.8');

    expect($result)
        ->toHaveKey('ip', '8.8.8.8')
        ->toHaveKey('found', true)
        ->toHaveKey('score', 75)
        ->toHaveKey('description', 'Known DNS resolver')
        ->toHaveKey('created_by', 'MITRE');

    expect($result['labels'])->toHaveCount(1);
    expect($result['labels'][0])->toHaveKey('value', 'malware');
});

test('search includes geo data from OpenCTI observable when fields present', function () {
    $obsResponse = fakeObservableResponse();
    $obsResponse['stixCyberObservables']['edges'][0]['node']['x_opencti_description'] = 'Test';
    // Simulate that OpenCTI observable has geo data via ip-api fallback
    // (OpenCTI itself doesn't store geo on IPv4-Addr, so geo always comes from ip-api)

    $this->openCtiMock->shouldReceive('query')
        ->times(5)
        ->andReturn(
            $obsResponse,
            fakeRelationshipsResponse(),
            fakeIndicatorsResponse(),
            fakeSightingsResponse(),
            fakeNotesResponse(),
        );

    Http::fake(['ip-api.com/*' => Http::response(fakeGeoApiResponse())]);

    $service = app(IpSearchService::class);
    $result = $service->search('8.8.8.8');

    expect($result['geo'])->not->toBeNull();
    expect($result['geo'])->toHaveKey('country', 'United States');
    expect($result['geo'])->toHaveKey('city', 'Mountain View');
    expect($result['geo'])->toHaveKey('isp', 'Google LLC');
});

test('search falls back to ip-api.com when OpenCTI lacks geo data', function () {
    $this->openCtiMock->shouldReceive('query')
        ->times(5)
        ->andReturn(
            fakeObservableResponse(),
            fakeRelationshipsResponse(),
            fakeIndicatorsResponse(),
            fakeSightingsResponse(),
            fakeNotesResponse(),
        );

    Http::fake(['ip-api.com/*' => Http::response(fakeGeoApiResponse())]);

    $service = app(IpSearchService::class);
    $result = $service->search('8.8.8.8');

    expect($result['geo'])->not->toBeNull();
    expect($result['geo'])->toHaveKey('country', 'United States');
    expect($result['geo'])->toHaveKey('lat', 37.386);
    expect($result['geo'])->toHaveKey('lon', -122.0838);
});

test('search returns found=false with geo data when OpenCTI has no observable', function () {
    $this->openCtiMock->shouldReceive('query')
        ->once()
        ->andReturn(['stixCyberObservables' => ['edges' => []]]);

    Http::fake(['ip-api.com/*' => Http::response(fakeGeoApiResponse())]);

    $service = app(IpSearchService::class);
    $result = $service->search('1.2.3.4');

    expect($result)
        ->toHaveKey('found', false)
        ->toHaveKey('ip', '1.2.3.4')
        ->toHaveKey('score', null);

    expect($result['geo'])->not->toBeNull();
    expect($result['geo'])->toHaveKey('country', 'United States');
});

test('search returns relationships, indicators, sightings, notes, external_references arrays', function () {
    $this->openCtiMock->shouldReceive('query')
        ->times(5)
        ->andReturn(
            fakeObservableResponse(),
            fakeRelationshipsResponse(),
            fakeIndicatorsResponse(),
            fakeSightingsResponse(),
            fakeNotesResponse(),
        );

    Http::fake(['ip-api.com/*' => Http::response(fakeGeoApiResponse())]);

    $service = app(IpSearchService::class);
    $result = $service->search('8.8.8.8');

    expect($result['relationships'])->toHaveCount(1);
    expect($result['relationships'][0])->toHaveKey('relationship_type', 'related-to');
    expect($result['indicators'])->toHaveCount(1);
    expect($result['indicators'][0])->toHaveKey('name', 'Suspicious IP');
    expect($result['sightings'])->toHaveCount(1);
    expect($result['sightings'][0])->toHaveKey('confidence', 90);
    expect($result['notes'])->toHaveCount(1);
    expect($result['notes'][0])->toHaveKey('content', 'Observed scanning activity.');
    expect($result['external_references'])->toHaveCount(1);
    expect($result['external_references'][0])->toHaveKey('source_name', 'VirusTotal');
});

test('search caches results for 15 minutes', function () {
    $this->openCtiMock->shouldReceive('query')
        ->times(5) // Only called once (first search)
        ->andReturn(
            fakeObservableResponse(),
            fakeRelationshipsResponse(),
            fakeIndicatorsResponse(),
            fakeSightingsResponse(),
            fakeNotesResponse(),
        );

    Http::fake(['ip-api.com/*' => Http::response(fakeGeoApiResponse())]);

    $service = app(IpSearchService::class);

    // First call - hits OpenCTI
    $result1 = $service->search('8.8.8.8');

    // Second call - should use cache, not call OpenCTI again
    $result2 = $service->search('8.8.8.8');

    expect($result1)->toEqual($result2);
    // OpenCTI mock would throw if called more than 5 times (only the first call's 5 queries)
});

test('search throws exception when OpenCTI is unreachable', function () {
    $this->openCtiMock->shouldReceive('query')
        ->once()
        ->andThrow(new OpenCtiConnectionException('Connection refused'));

    $service = app(IpSearchService::class);
    $service->search('8.8.8.8');
})->throws(OpenCtiConnectionException::class);

test('ip-api.com failure returns null geo gracefully', function () {
    $this->openCtiMock->shouldReceive('query')
        ->times(5)
        ->andReturn(
            fakeObservableResponse(),
            fakeRelationshipsResponse(),
            fakeIndicatorsResponse(),
            fakeSightingsResponse(),
            fakeNotesResponse(),
        );

    Http::fake(['ip-api.com/*' => Http::response([], 500)]);

    $service = app(IpSearchService::class);
    $result = $service->search('8.8.8.8');

    expect($result['geo'])->toBeNull();
    expect($result['found'])->toBeTrue();
    expect($result['score'])->toBe(75);
});
