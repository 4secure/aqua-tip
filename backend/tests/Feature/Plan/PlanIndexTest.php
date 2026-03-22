<?php

use App\Models\Plan;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(fn () => $this->seed(PlanSeeder::class));

it('returns 200 with 4 plans', function () {
    $response = $this->getJson('/api/plans');

    $response->assertOk()
        ->assertJsonCount(4);
});

it('returns plans sorted by sort_order ascending', function () {
    $response = $this->getJson('/api/plans');

    $response->assertOk();

    $slugs = collect($response->json())->pluck('slug')->all();
    expect($slugs)->toBe(['free', 'basic', 'pro', 'enterprise']);
});

it('works without authentication (public endpoint)', function () {
    // No actingAs — anonymous request
    $response = $this->getJson('/api/plans');

    $response->assertOk()
        ->assertJsonCount(4);
});

it('returns expected keys for each plan', function () {
    $response = $this->getJson('/api/plans');

    $response->assertOk();

    $plan = $response->json()[0];
    expect($plan)->toHaveKeys([
        'id', 'slug', 'name', 'daily_credit_limit',
        'price_cents', 'features', 'description', 'is_popular',
    ]);
});
