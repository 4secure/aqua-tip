<?php

use App\Services\ThreatSearchService;
use App\Services\OpenCtiService;

test('buildResponse does not include raw observable data', function () {
    $openCtiMock = Mockery::mock(OpenCtiService::class);
    $service = new ThreatSearchService($openCtiMock);

    // Use reflection to call the private buildResponse method
    $method = new ReflectionMethod(ThreatSearchService::class, 'buildResponse');
    $method->setAccessible(true);

    $mockObservable = [
        'entity_type' => 'IPv4-Addr',
        'x_opencti_score' => 75,
        'objectLabel' => [['value' => 'malicious', 'color' => '#ff0000']],
        'x_opencti_description' => 'Test observable',
        'createdBy' => ['name' => 'TestOrg'],
        'created_at' => '2025-01-01T00:00:00Z',
        'updated_at' => '2025-01-02T00:00:00Z',
    ];

    $result = $method->invoke(
        $service,
        query: '1.2.3.4',
        found: true,
        observable: $mockObservable,
        geo: null,
        relationships: [],
        indicators: [],
        sightings: [],
        notes: [],
        externalReferences: [],
    );

    expect($result)->not->toHaveKey('raw');
    expect($result)->toHaveKey('query');
    expect($result)->toHaveKey('detected_type');
    expect($result)->toHaveKey('found');
    expect($result)->toHaveKey('score');
    expect($result)->toHaveKey('external_references');
    expect($result['query'])->toBe('1.2.3.4');
    expect($result['found'])->toBeTrue();
});
