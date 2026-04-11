<?php

use App\Models\Plan;
use App\Models\User;
use App\Services\OpenCtiService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function mockOpenCtiForGating(): void
{
    app()->bind(OpenCtiService::class, function () {
        $mock = Mockery::mock(OpenCtiService::class);
        $mock->shouldReceive('query')->andReturn([
            'intrusionSets' => [
                'edges' => [],
                'pageInfo' => [
                    'hasNextPage' => false,
                    'hasPreviousPage' => false,
                    'startCursor' => null,
                    'endCursor' => null,
                    'globalCount' => 0,
                ],
            ],
        ]);

        return $mock;
    });
}

function createPlan(string $slug): Plan
{
    return Plan::create([
        'slug' => $slug,
        'name' => ucfirst($slug),
        'daily_credit_limit' => 10,
        'price_cents' => $slug === 'free' ? 0 : 1000,
        'is_popular' => false,
        'sort_order' => 1,
        'is_active' => true,
        'features' => ['test'],
        'description' => "Test {$slug} plan",
    ]);
}

test('free-plan user receives 403 upgrade_required', function () {
    mockOpenCtiForGating();

    $plan = createPlan('free');
    $user = User::factory()->create([
        'plan_id' => $plan->id,
        'trial_ends_at' => now()->subDay(),
    ]);

    $response = $this->actingAs($user)->getJson('/api/threat-actors');

    $response->assertStatus(403)
        ->assertJsonPath('error', 'upgrade_required')
        ->assertJsonPath('message', 'Upgrade your plan to access this feature');
});

test('basic-plan user passes feature gate', function () {
    mockOpenCtiForGating();

    $plan = createPlan('basic');
    $user = User::factory()->create(['plan_id' => $plan->id]);

    $response = $this->actingAs($user)->getJson('/api/threat-actors');

    $response->assertStatus(200);
});

test('pro-plan user passes feature gate', function () {
    mockOpenCtiForGating();

    $plan = createPlan('pro');
    $user = User::factory()->create(['plan_id' => $plan->id]);

    $response = $this->actingAs($user)->getJson('/api/threat-actors');

    $response->assertStatus(200);
});

test('enterprise-plan user passes feature gate', function () {
    mockOpenCtiForGating();

    $plan = createPlan('enterprise');
    $user = User::factory()->create(['plan_id' => $plan->id]);

    $response = $this->actingAs($user)->getJson('/api/threat-actors');

    $response->assertStatus(200);
});

test('trial user with no plan passes feature gate', function () {
    mockOpenCtiForGating();

    $user = User::factory()->create([
        'plan_id' => null,
        'trial_ends_at' => now()->addDays(30),
    ]);

    $response = $this->actingAs($user)->getJson('/api/threat-actors');

    $response->assertStatus(200);
});

test('expired trial user on free plan receives 403', function () {
    mockOpenCtiForGating();

    $plan = createPlan('free');
    $user = User::factory()->create([
        'plan_id' => $plan->id,
        'trial_ends_at' => now()->subDay(),
    ]);

    $response = $this->actingAs($user)->getJson('/api/threat-actors');

    $response->assertStatus(403)
        ->assertJsonPath('error', 'upgrade_required');
});
