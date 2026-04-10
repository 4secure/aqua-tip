<?php

use App\Models\Plan;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('plan seeder creates 4 plans', function () {
    $this->seed(\Database\Seeders\PlanSeeder::class);
    expect(Plan::count())->toBe(4);
});

test('plan seeder creates correct tiers', function () {
    $this->seed(\Database\Seeders\PlanSeeder::class);

    $free = Plan::where('slug', 'free')->first();
    expect($free)->not->toBeNull();
    expect($free->daily_credit_limit)->toBe(5);
    expect($free->price_cents)->toBe(0);

    $basic = Plan::where('slug', 'basic')->first();
    expect($basic)->not->toBeNull();
    expect($basic->daily_credit_limit)->toBe(30);
    expect($basic->price_cents)->toBe(1000);

    $pro = Plan::where('slug', 'pro')->first();
    expect($pro)->not->toBeNull();
    expect($pro->daily_credit_limit)->toBe(50);
    expect($pro->price_cents)->toBe(2900);
    expect($pro->is_popular)->toBeTrue();

    $enterprise = Plan::where('slug', 'enterprise')->first();
    expect($enterprise)->not->toBeNull();
    expect($enterprise->daily_credit_limit)->toBe(200);
    expect($enterprise->price_cents)->toBeNull();
});

test('plan seeder is idempotent', function () {
    $this->seed(\Database\Seeders\PlanSeeder::class);
    $this->seed(\Database\Seeders\PlanSeeder::class);
    expect(Plan::count())->toBe(4);
});

test('plan features are arrays', function () {
    $this->seed(\Database\Seeders\PlanSeeder::class);
    $pro = Plan::where('slug', 'pro')->first();
    expect($pro->features)->toBeArray();
    expect($pro->features)->toContain('50 searches per day');
    expect($pro->features)->toContain('All threat lookups');
    expect($pro->features)->toContain('Dark web monitoring');
});

test('enterprise has API access feature', function () {
    $this->seed(\Database\Seeders\PlanSeeder::class);
    $enterprise = Plan::where('slug', 'enterprise')->first();
    expect($enterprise->features)->toContain('API access');
    expect($enterprise->features)->toHaveCount(7);
});

test('free plan does not have API access', function () {
    $this->seed(\Database\Seeders\PlanSeeder::class);
    $free = Plan::where('slug', 'free')->first();
    expect($free->features)->not->toContain('API access');
    expect($free->features)->toHaveCount(6);
});
