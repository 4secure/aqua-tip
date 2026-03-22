<?php

use App\Models\Plan;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(fn () => $this->seed(PlanSeeder::class));

it('returns plan object for user with Pro plan', function () {
    $proPlan = Plan::where('slug', 'pro')->first();
    $user = User::factory()->create(['plan_id' => $proPlan->id]);

    $response = $this->actingAs($user)->getJson('/api/user');

    $response->assertOk()
        ->assertJsonPath('data.plan.id', $proPlan->id)
        ->assertJsonPath('data.plan.slug', 'pro')
        ->assertJsonPath('data.plan.name', 'Pro')
        ->assertJsonPath('data.plan.daily_credit_limit', 50);

    expect($response->json('data.plan.features'))->toBeArray();
});

it('returns null plan and active trial for trial user', function () {
    $user = User::factory()->create([
        'plan_id' => null,
        'trial_ends_at' => now()->addDays(15),
    ]);

    $response = $this->actingAs($user)->getJson('/api/user');

    $response->assertOk()
        ->assertJsonPath('data.plan', null)
        ->assertJsonPath('data.trial_active', true);

    expect($response->json('data.trial_days_left'))->toBeGreaterThan(0);
});

it('returns plan object and inactive trial for expired trial user on Free', function () {
    $freePlan = Plan::where('slug', 'free')->first();
    $user = User::factory()->create([
        'plan_id' => $freePlan->id,
        'trial_ends_at' => now()->subDays(5),
    ]);

    $response = $this->actingAs($user)->getJson('/api/user');

    $response->assertOk()
        ->assertJsonPath('data.plan.slug', 'free')
        ->assertJsonPath('data.trial_active', false)
        ->assertJsonPath('data.trial_days_left', 0);
});

it('returns pending plan and plan_change_at for pending downgrade', function () {
    $proPlan = Plan::where('slug', 'pro')->first();
    $freePlan = Plan::where('slug', 'free')->first();
    $changeAt = now()->addDays(20);

    $user = User::factory()->create([
        'plan_id' => $proPlan->id,
        'pending_plan_id' => $freePlan->id,
        'plan_change_at' => $changeAt,
    ]);

    $response = $this->actingAs($user)->getJson('/api/user');

    $response->assertOk()
        ->assertJsonPath('data.pending_plan.slug', 'free')
        ->assertJsonPath('data.pending_plan.name', 'Free');

    expect($response->json('data.plan_change_at'))->not->toBeNull();
});

it('returns null pending_plan and null plan_change_at when no pending downgrade', function () {
    $proPlan = Plan::where('slug', 'pro')->first();
    $user = User::factory()->create([
        'plan_id' => $proPlan->id,
        'pending_plan_id' => null,
        'plan_change_at' => null,
    ]);

    $response = $this->actingAs($user)->getJson('/api/user');

    $response->assertOk()
        ->assertJsonPath('data.pending_plan', null)
        ->assertJsonPath('data.plan_change_at', null);
});

it('returns timezone, organization, and role fields', function () {
    $user = User::factory()->create([
        'timezone' => 'America/New_York',
        'organization' => 'Acme Corp',
        'role' => 'Security Analyst',
    ]);

    $response = $this->actingAs($user)->getJson('/api/user');

    $response->assertOk()
        ->assertJsonPath('data.timezone', 'America/New_York')
        ->assertJsonPath('data.organization', 'Acme Corp')
        ->assertJsonPath('data.role', 'Security Analyst');
});
