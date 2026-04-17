<?php

use App\Models\User;
use App\Services\OpenCtiService;
use App\Services\ThreatActorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;

uses(RefreshDatabase::class);

beforeEach(fn () => Cache::flush());

/**
 * Build a full fake intrusionSet response with configurable victimology edges.
 *
 * The shape mirrors the GraphQL heredoc in ThreatActorService::executeEnrichmentQuery,
 * including all 6 top-level relationship blocks. Callers override only the
 * `victimology.edges` they care about; other blocks default to empty.
 */
function fakeEnrichmentResponse(array $victimologyEdges = []): array
{
    return [
        'intrusionSet' => [
            'attackPatterns' => ['edges' => []],
            'tools' => ['edges' => []],
            'malware' => ['edges' => []],
            'campaigns' => ['edges' => []],
            'victimology' => ['edges' => $victimologyEdges],
            'allRelationships' => ['edges' => []],
        ],
    ];
}

function victimologyEdge(string $entityType, string $id, string $name, ?array $extra = null): array
{
    $to = [
        'id' => $id,
        'entity_type' => $entityType,
        'name' => $name,
    ];

    if ($extra !== null) {
        $to = array_merge($to, $extra);
    }

    return ['node' => ['to' => $to]];
}

function mockOpenCtiForEnrichment(array $response = null): void
{
    $response ??= fakeEnrichmentResponse();

    app()->bind(OpenCtiService::class, function () use ($response) {
        $mock = Mockery::mock(OpenCtiService::class);
        $mock->shouldReceive('query')->andReturn($response);
        return $mock;
    });
}

// ----- Service-level victimology tests (D-14, D-15) -----

test('enrichment returns all 6 keys including victimology', function () {
    mockOpenCtiForEnrichment();

    $service = app(ThreatActorService::class);
    $result = $service->enrichment('intrusion-set-1');

    expect(array_keys($result))->toBe([
        'ttps', 'tools', 'malware', 'campaigns', 'victimology', 'relationships',
    ]);
});

test('enrichment returns victimology with 4 sub-keys (countries/regions/sectors/organizations)', function () {
    mockOpenCtiForEnrichment();

    $service = app(ThreatActorService::class);
    $result = $service->enrichment('intrusion-set-1');

    expect($result['victimology'])->toHaveKeys(['countries', 'regions', 'sectors', 'organizations']);
    expect($result['victimology']['countries'])->toBe([]);
    expect($result['victimology']['regions'])->toBe([]);
    expect($result['victimology']['sectors'])->toBe([]);
    expect($result['victimology']['organizations'])->toBe([]);
});

test('enrichment buckets edges into correct sub-arrays by entity_type', function () {
    mockOpenCtiForEnrichment(fakeEnrichmentResponse([
        victimologyEdge('Country', 'country-us', 'United States', ['x_opencti_aliases' => ['US', 'USA']]),
        victimologyEdge('Region', 'region-emea', 'Europe, Middle East, and Africa'),
        victimologyEdge('Sector', 'sector-defense', 'Defense'),
        victimologyEdge('Organization', 'org-acme', 'ACME Corp'),
    ]));

    $service = app(ThreatActorService::class);
    $result = $service->enrichment('intrusion-set-1');

    expect($result['victimology']['countries'])->toHaveCount(1);
    expect($result['victimology']['countries'][0])->toBe([
        'id' => 'country-us',
        'name' => 'United States',
        'country_code' => 'US',
    ]);
    expect($result['victimology']['regions'])->toHaveCount(1);
    expect($result['victimology']['regions'][0])->toBe([
        'id' => 'region-emea',
        'name' => 'Europe, Middle East, and Africa',
    ]);
    expect($result['victimology']['sectors'])->toHaveCount(1);
    expect($result['victimology']['sectors'][0])->toBe([
        'id' => 'sector-defense',
        'name' => 'Defense',
    ]);
    expect($result['victimology']['organizations'])->toHaveCount(1);
    expect($result['victimology']['organizations'][0])->toBe([
        'id' => 'org-acme',
        'name' => 'ACME Corp',
    ]);
});

test('enrichment filters Individual and System out of organizations (PITFALL-12)', function () {
    mockOpenCtiForEnrichment(fakeEnrichmentResponse([
        victimologyEdge('Organization', 'org-acme', 'ACME Corp'),
        victimologyEdge('Individual', 'individual-john', 'John Doe'),
        victimologyEdge('System', 'system-srv-01', 'srv-01.corp.example'),
    ]));

    $service = app(ThreatActorService::class);
    $result = $service->enrichment('intrusion-set-1');

    expect($result['victimology']['organizations'])->toHaveCount(1);
    expect($result['victimology']['organizations'][0]['id'])->toBe('org-acme');

    // Individual and System must NOT appear anywhere in victimology
    $allIds = array_merge(
        array_column($result['victimology']['countries'], 'id'),
        array_column($result['victimology']['regions'], 'id'),
        array_column($result['victimology']['sectors'], 'id'),
        array_column($result['victimology']['organizations'], 'id'),
    );
    expect($allIds)->not->toContain('individual-john');
    expect($allIds)->not->toContain('system-srv-01');
});

test('enrichment dedupes victimology entries by id (D-13)', function () {
    mockOpenCtiForEnrichment(fakeEnrichmentResponse([
        victimologyEdge('Country', 'country-us', 'United States', ['x_opencti_aliases' => ['US']]),
        victimologyEdge('Country', 'country-us', 'United States', ['x_opencti_aliases' => ['US']]),
        victimologyEdge('Sector', 'sector-defense', 'Defense'),
        victimologyEdge('Sector', 'sector-defense', 'Defense'),
    ]));

    $service = app(ThreatActorService::class);
    $result = $service->enrichment('intrusion-set-1');

    expect($result['victimology']['countries'])->toHaveCount(1);
    expect($result['victimology']['sectors'])->toHaveCount(1);
});

test('enrichment extracts ISO-2 country_code from x_opencti_aliases (first 2-char uppercase match)', function () {
    mockOpenCtiForEnrichment(fakeEnrichmentResponse([
        victimologyEdge('Country', 'country-us', 'United States', ['x_opencti_aliases' => ['United States', 'US', 'USA']]),
        victimologyEdge('Country', 'country-de', 'Germany', ['x_opencti_aliases' => ['DE', 'DEU']]),
        victimologyEdge('Country', 'country-nocode', 'Nowhere', ['x_opencti_aliases' => ['Nowhere', 'Neverland']]),
        victimologyEdge('Country', 'country-empty', 'Empty', ['x_opencti_aliases' => []]),
    ]));

    $service = app(ThreatActorService::class);
    $result = $service->enrichment('intrusion-set-1');

    $countries = collect($result['victimology']['countries'])->keyBy('id');
    expect($countries['country-us']['country_code'])->toBe('US');
    expect($countries['country-de']['country_code'])->toBe('DE');
    expect($countries['country-nocode']['country_code'])->toBeNull();
    expect($countries['country-empty']['country_code'])->toBeNull();
});

test('enrichment skips malformed edges (missing to node or entity_type) without throwing', function () {
    mockOpenCtiForEnrichment(fakeEnrichmentResponse([
        ['node' => ['to' => null]],                                  // missing 'to'
        ['node' => ['to' => ['id' => 'x', 'entity_type' => null]]],  // null entity_type
        ['node' => ['to' => ['name' => 'Missing ID']]],              // missing id
        ['node' => ['to' => ['id' => 'country-us', 'entity_type' => 'Country', 'name' => 'US', 'x_opencti_aliases' => ['US']]]],
    ]));

    $service = app(ThreatActorService::class);
    $result = $service->enrichment('intrusion-set-1');

    // Only the well-formed Country edge survives
    expect($result['victimology']['countries'])->toHaveCount(1);
    expect($result['victimology']['regions'])->toBe([]);
    expect($result['victimology']['sectors'])->toBe([]);
    expect($result['victimology']['organizations'])->toBe([]);
});

// ----- HTTP-level tests -----

test('GET /api/threat-actors/{id}/enrichment returns 200 with victimology for authenticated user', function () {
    mockOpenCtiForEnrichment(fakeEnrichmentResponse([
        victimologyEdge('Country', 'country-us', 'United States', ['x_opencti_aliases' => ['US']]),
        victimologyEdge('Organization', 'org-acme', 'ACME Corp'),
    ]));

    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->getJson('/api/threat-actors/intrusion-set-1/enrichment');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                'ttps',
                'tools',
                'malware',
                'campaigns',
                'victimology' => ['countries', 'regions', 'sectors', 'organizations'],
                'relationships',
            ],
        ]);

    expect($response->json('data.victimology.countries'))->toHaveCount(1);
    expect($response->json('data.victimology.organizations'))->toHaveCount(1);
});

test('GET /api/threat-actors/{id}/enrichment returns empty victimology for actor with no targets (SC3)', function () {
    mockOpenCtiForEnrichment();  // default: all blocks empty

    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->getJson('/api/threat-actors/intrusion-set-1/enrichment');

    $response->assertStatus(200);
    expect($response->json('data.victimology'))->toBe([
        'countries' => [],
        'regions' => [],
        'sectors' => [],
        'organizations' => [],
    ]);
});

test('GET /api/threat-actors/{id}/enrichment returns 401 for unauthenticated user', function () {
    $response = $this->getJson('/api/threat-actors/intrusion-set-1/enrichment');

    $response->assertStatus(401);
});

test('GET /api/threat-actors/{id}/enrichment returns 502 on OpenCTI connection failure', function () {
    app()->bind(OpenCtiService::class, function () {
        $mock = Mockery::mock(OpenCtiService::class);
        $mock->shouldReceive('query')
            ->andThrow(new \App\Exceptions\OpenCtiConnectionException('Connection failed'));
        return $mock;
    });

    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->getJson('/api/threat-actors/intrusion-set-1/enrichment');

    $response->assertStatus(502)
        ->assertJsonPath('message', 'Service temporarily unavailable.');
});

test('GET /api/threat-actors/{id}/enrichment returns 502 on OpenCTI query failure (NOT graceful-degrade at query level)', function () {
    app()->bind(OpenCtiService::class, function () {
        $mock = Mockery::mock(OpenCtiService::class);
        $mock->shouldReceive('query')
            ->andThrow(new \App\Exceptions\OpenCtiQueryException('Bad query'));
        return $mock;
    });

    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->getJson('/api/threat-actors/intrusion-set-1/enrichment');

    // Query-level failure is NOT the D-10 partial-outage case (that's parse-level inside
    // normalizeVictimology). Controller returns 502 for whole-query failures - unchanged.
    $response->assertStatus(502);
});
