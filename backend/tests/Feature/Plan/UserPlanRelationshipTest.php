<?php

use App\Models\Plan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('user can have nullable plan_id', function () {
    $user = User::factory()->create();
    expect($user->plan_id)->toBeNull();
    expect($user->plan)->toBeNull();
});

test('user belongs to plan', function () {
    $this->seed(\Database\Seeders\PlanSeeder::class);
    $plan = Plan::where('slug', 'pro')->first();
    $user = User::factory()->create(['plan_id' => $plan->id]);

    expect($user->plan)->toBeInstanceOf(Plan::class);
    expect($user->plan->slug)->toBe('pro');
    expect($user->plan->daily_credit_limit)->toBe(50);
});

test('user has nullable timezone organization and role', function () {
    $user = User::factory()->create();
    expect($user->timezone)->toBeNull();
    expect($user->organization)->toBeNull();
    expect($user->role)->toBeNull();
});

test('user can store timezone organization and role', function () {
    $user = User::factory()->create([
        'timezone' => 'Asia/Manila',
        'organization' => 'AquaSecure',
        'role' => 'Security Analyst',
    ]);

    $user->refresh();
    expect($user->timezone)->toBe('Asia/Manila');
    expect($user->organization)->toBe('AquaSecure');
    expect($user->role)->toBe('Security Analyst');
});

test('plan has many users', function () {
    $this->seed(\Database\Seeders\PlanSeeder::class);
    $plan = Plan::where('slug', 'basic')->first();
    User::factory()->count(2)->create(['plan_id' => $plan->id]);

    expect($plan->users)->toHaveCount(2);
});
