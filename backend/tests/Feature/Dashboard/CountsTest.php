<?php

use App\Exceptions\OpenCtiConnectionException;
use App\Models\User;
use App\Services\DashboardService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function fakeDashboardCounts(): array
{
    return [
        ['entity_type' => 'IPv4-Addr', 'label' => 'IP Addresses', 'count' => 1234],
        ['entity_type' => 'Domain-Name', 'label' => 'Domains', 'count' => 567],
        ['entity_type' => 'Hostname', 'label' => 'Hostnames', 'count' => 890],
        ['entity_type' => 'X509-Certificate', 'label' => 'Certificates', 'count' => 123],
    ];
}

function mockDashboardCounts(array $counts = null): void
{
    $counts ??= fakeDashboardCounts();

    app()->bind(DashboardService::class, function () use ($counts) {
        $mock = Mockery::mock(DashboardService::class);
        $mock->shouldReceive('getCounts')->andReturn($counts);

        return $mock;
    });
}

test('GET /api/dashboard/counts returns 200 with correct structure', function () {
    mockDashboardCounts();

    $user = User::factory()->create();

    $response = $this->actingAs($user)->getJson('/api/dashboard/counts');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                ['entity_type', 'label', 'count'],
            ],
        ]);

    expect($response->json('data'))->toHaveCount(4);
});

test('GET /api/dashboard/counts requires authentication', function () {
    mockDashboardCounts();

    $response = $this->getJson('/api/dashboard/counts');

    $response->assertStatus(401);
});

test('GET /api/dashboard/counts returns 502 on OpenCTI connection failure', function () {
    app()->bind(DashboardService::class, function () {
        $mock = Mockery::mock(DashboardService::class);
        $mock->shouldReceive('getCounts')
            ->andThrow(new OpenCtiConnectionException('Connection failed'));

        return $mock;
    });

    $user = User::factory()->create();

    $response = $this->actingAs($user)->getJson('/api/dashboard/counts');

    $response->assertStatus(502)
        ->assertJsonPath('message', 'Unable to load dashboard counts. Please try again.');
});

test('GET /api/dashboard/counts returns correct entity types', function () {
    mockDashboardCounts();

    $user = User::factory()->create();

    $response = $this->actingAs($user)->getJson('/api/dashboard/counts');

    $entityTypes = array_column($response->json('data'), 'entity_type');

    expect($entityTypes)->toBe(['IPv4-Addr', 'Domain-Name', 'Hostname', 'X509-Certificate']);
});
