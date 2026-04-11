<?php

use App\Exceptions\OpenCtiConnectionException;
use App\Models\User;
use App\Services\DashboardService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function fakeDashboardCategories(): array
{
    return [
        ['label' => 'malware', 'count' => 250],
        ['label' => 'phishing', 'count' => 180],
        ['label' => 'botnet', 'count' => 120],
        ['label' => 'ransomware', 'count' => 90],
        ['label' => 'trojan', 'count' => 60],
        ['label' => 'apt', 'count' => 30],
    ];
}

function mockDashboardCategories(array $categories = null): void
{
    $categories ??= fakeDashboardCategories();

    app()->bind(DashboardService::class, function () use ($categories) {
        $mock = Mockery::mock(DashboardService::class);
        $mock->shouldReceive('getCategories')->andReturn($categories);

        return $mock;
    });
}

test('GET /api/dashboard/categories returns 200 with correct structure', function () {
    mockDashboardCategories();

    $user = User::factory()->create();

    $response = $this->actingAs($user)->getJson('/api/dashboard/categories');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                ['label', 'count'],
            ],
        ]);
});

test('GET /api/dashboard/categories requires authentication', function () {
    mockDashboardCategories();

    $response = $this->getJson('/api/dashboard/categories');

    $response->assertStatus(401);
});

test('GET /api/dashboard/categories returns 502 on OpenCTI connection failure', function () {
    app()->bind(DashboardService::class, function () {
        $mock = Mockery::mock(DashboardService::class);
        $mock->shouldReceive('getCategories')
            ->andThrow(new OpenCtiConnectionException('Connection failed'));

        return $mock;
    });

    $user = User::factory()->create();

    $response = $this->actingAs($user)->getJson('/api/dashboard/categories');

    $response->assertStatus(502)
        ->assertJsonPath('message', 'Unable to load dashboard categories. Please try again.');
});

test('GET /api/dashboard/categories returns at most 6 categories', function () {
    mockDashboardCategories();

    $user = User::factory()->create();

    $response = $this->actingAs($user)->getJson('/api/dashboard/categories');

    expect(count($response->json('data')))->toBeLessThanOrEqual(6);
});
