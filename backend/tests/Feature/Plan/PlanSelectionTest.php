<?php

use App\Models\Credit;
use App\Models\Plan;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(fn () => $this->seed(PlanSeeder::class));

it('upgrades trial user (no plan) to pro immediately', function () {
    $user = User::factory()->create([
        'plan_id' => null,
        'trial_ends_at' => now()->addDays(15),
    ]);

    $response = $this->actingAs($user)->postJson('/api/plan', ['plan' => 'pro']);

    $response->assertOk()
        ->assertJsonPath('message', 'Plan upgraded')
        ->assertJsonPath('plan.slug', 'pro');

    $user->refresh();
    $proPlan = Plan::where('slug', 'pro')->first();
    expect($user->plan_id)->toBe($proPlan->id);
});

it('upgrades Free user immediately and boosts remaining credits', function () {
    $freePlan = Plan::where('slug', 'free')->first();
    $proPlan = Plan::where('slug', 'pro')->first();

    $user = User::factory()->create(['plan_id' => $freePlan->id]);
    $credit = Credit::create([
        'user_id' => $user->id,
        'remaining' => 1,
        'limit' => 3,
        'last_reset_at' => now('UTC')->startOfDay(),
    ]);

    $response = $this->actingAs($user)->postJson('/api/plan', ['plan' => 'pro']);

    $response->assertOk()
        ->assertJsonPath('message', 'Plan upgraded');

    $user->refresh();
    $credit->refresh();

    expect($user->plan_id)->toBe($proPlan->id)
        ->and($credit->remaining)->toBe(48) // 1 + (50 - 3)
        ->and($credit->limit)->toBe(50);
});

it('stores pending downgrade for Pro user selecting Free', function () {
    $proPlan = Plan::where('slug', 'pro')->first();
    $freePlan = Plan::where('slug', 'free')->first();

    $user = User::factory()->create(['plan_id' => $proPlan->id]);

    $response = $this->actingAs($user)->postJson('/api/plan', ['plan' => 'free']);

    $response->assertOk()
        ->assertJsonPath('message', 'Downgrade scheduled')
        ->assertJsonPath('pending_plan.slug', 'free');

    $user->refresh();
    expect($user->plan_id)->toBe($proPlan->id)
        ->and($user->pending_plan_id)->toBe($freePlan->id)
        ->and($user->plan_change_at)->not->toBeNull();

    // plan_change_at should be roughly 30 days from now
    $daysUntilChange = (int) now()->diffInDays($user->plan_change_at, false);
    expect($daysUntilChange)->toBeGreaterThanOrEqual(29)
        ->and($daysUntilChange)->toBeLessThanOrEqual(31);
});

it('returns 422 for enterprise plan selection', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/plan', ['plan' => 'enterprise']);

    $response->assertUnprocessable();
});

it('returns already on this plan for same plan', function () {
    $proPlan = Plan::where('slug', 'pro')->first();
    $user = User::factory()->create(['plan_id' => $proPlan->id]);

    $response = $this->actingAs($user)->postJson('/api/plan', ['plan' => 'pro']);

    $response->assertOk()
        ->assertJsonPath('message', 'Already on this plan');
});

it('requires authentication', function () {
    $response = $this->postJson('/api/plan', ['plan' => 'pro']);

    $response->assertUnauthorized();
});

it('returns 422 for invalid slug', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/plan', ['plan' => 'nonexistent']);

    $response->assertUnprocessable();
});

it('cancels pending downgrade on upgrade', function () {
    $basicPlan = Plan::where('slug', 'basic')->first();
    $freePlan = Plan::where('slug', 'free')->first();

    $user = User::factory()->create([
        'plan_id' => $basicPlan->id,
        'pending_plan_id' => $freePlan->id,
        'plan_change_at' => now()->addDays(20),
    ]);

    $response = $this->actingAs($user)->postJson('/api/plan', ['plan' => 'pro']);

    $response->assertOk()
        ->assertJsonPath('message', 'Plan upgraded');

    $user->refresh();
    $proPlan = Plan::where('slug', 'pro')->first();
    expect($user->plan_id)->toBe($proPlan->id)
        ->and($user->pending_plan_id)->toBeNull()
        ->and($user->plan_change_at)->toBeNull();
});
