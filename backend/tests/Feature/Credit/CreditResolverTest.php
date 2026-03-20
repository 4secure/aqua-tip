<?php

use App\Models\Credit;
use App\Models\Plan;
use App\Models\User;
use App\Services\CreditResolver;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(PlanSeeder::class);
    $this->resolver = app(CreditResolver::class);
});

// --- resolveLimit tests ---

it('returns 1 for null user (guest)', function () {
    expect($this->resolver->resolveLimit(null))->toBe(1);
});

it('returns 10 for user with no plan and active trial', function () {
    $user = User::factory()->create([
        'plan_id' => null,
        'trial_ends_at' => now()->addDays(15),
    ]);

    expect($this->resolver->resolveLimit($user))->toBe(10);
});

it('returns plan daily_credit_limit for user with plan', function () {
    $proPlan = Plan::where('slug', 'pro')->first();
    $user = User::factory()->create([
        'plan_id' => $proPlan->id,
    ]);

    expect($this->resolver->resolveLimit($user))->toBe(50);
});

it('returns Free plan limit for user with no plan and expired trial', function () {
    $user = User::factory()->create([
        'plan_id' => null,
        'trial_ends_at' => now()->subDay(),
    ]);

    expect($this->resolver->resolveLimit($user))->toBe(3);
});

// --- resolve tests ---

it('creates Credit record with plan-derived limit for authenticated user', function () {
    $basicPlan = Plan::where('slug', 'basic')->first();
    $user = User::factory()->create(['plan_id' => $basicPlan->id]);

    $this->actingAs($user);
    $request = Request::create('/api/test', 'GET');
    $request->setUserResolver(fn () => $user);

    $credit = $this->resolver->resolve($request);

    expect($credit)->toBeInstanceOf(Credit::class)
        ->and($credit->user_id)->toBe($user->id)
        ->and($credit->remaining)->toBe(15)
        ->and($credit->limit)->toBe(15);
});

it('creates Credit record with 1/1 for guest', function () {
    $request = Request::create('/api/test', 'GET');
    $request->setUserResolver(fn () => null);

    $credit = $this->resolver->resolve($request);

    expect($credit)->toBeInstanceOf(Credit::class)
        ->and($credit->user_id)->toBeNull()
        ->and($credit->remaining)->toBe(1)
        ->and($credit->limit)->toBe(1);
});

// --- lazyReset tests ---

it('does nothing if last_reset_at is today', function () {
    $user = User::factory()->create([
        'plan_id' => Plan::where('slug', 'pro')->first()->id,
    ]);
    $credit = Credit::create([
        'user_id' => $user->id,
        'remaining' => 30,
        'limit' => 50,
        'last_reset_at' => now('UTC')->startOfDay(),
    ]);

    $this->resolver->lazyReset($credit, $user);

    $credit->refresh();
    expect($credit->remaining)->toBe(30)
        ->and($credit->limit)->toBe(50);
});

it('resets remaining and limit to plan-derived value when last_reset_at is yesterday', function () {
    $proPlan = Plan::where('slug', 'pro')->first();
    $user = User::factory()->create(['plan_id' => $proPlan->id]);
    $credit = Credit::create([
        'user_id' => $user->id,
        'remaining' => 5,
        'limit' => 50,
        'last_reset_at' => now('UTC')->subDay()->startOfDay(),
    ]);

    $this->resolver->lazyReset($credit, $user);

    $credit->refresh();
    expect($credit->remaining)->toBe(50)
        ->and($credit->limit)->toBe(50);
});

it('assigns Free plan to user with expired trial during lazy reset', function () {
    $freePlan = Plan::where('slug', 'free')->first();
    $user = User::factory()->create([
        'plan_id' => null,
        'trial_ends_at' => now()->subDay(),
    ]);
    $credit = Credit::create([
        'user_id' => $user->id,
        'remaining' => 0,
        'limit' => 10,
        'last_reset_at' => now('UTC')->subDay()->startOfDay(),
    ]);

    $this->resolver->lazyReset($credit, $user);

    $user->refresh();
    $credit->refresh();
    expect($user->plan_id)->toBe($freePlan->id)
        ->and($credit->remaining)->toBe(3)
        ->and($credit->limit)->toBe(3);
});

it('applies pending downgrade when plan_change_at is today or past', function () {
    $proPlan = Plan::where('slug', 'pro')->first();
    $freePlan = Plan::where('slug', 'free')->first();
    $user = User::factory()->create([
        'plan_id' => $proPlan->id,
        'pending_plan_id' => $freePlan->id,
        'plan_change_at' => now()->subDay(),
    ]);
    $credit = Credit::create([
        'user_id' => $user->id,
        'remaining' => 10,
        'limit' => 50,
        'last_reset_at' => now('UTC')->subDay()->startOfDay(),
    ]);

    $this->resolver->lazyReset($credit, $user);

    $user->refresh();
    $credit->refresh();
    expect($user->plan_id)->toBe($freePlan->id)
        ->and($user->pending_plan_id)->toBeNull()
        ->and($user->plan_change_at)->toBeNull()
        ->and($credit->remaining)->toBe(3)
        ->and($credit->limit)->toBe(3);
});

it('does not apply pending downgrade if plan_change_at is in the future', function () {
    $proPlan = Plan::where('slug', 'pro')->first();
    $freePlan = Plan::where('slug', 'free')->first();
    $user = User::factory()->create([
        'plan_id' => $proPlan->id,
        'pending_plan_id' => $freePlan->id,
        'plan_change_at' => now()->addDays(15),
    ]);
    $credit = Credit::create([
        'user_id' => $user->id,
        'remaining' => 10,
        'limit' => 50,
        'last_reset_at' => now('UTC')->subDay()->startOfDay(),
    ]);

    $this->resolver->lazyReset($credit, $user);

    $user->refresh();
    $credit->refresh();
    expect($user->plan_id)->toBe($proPlan->id)
        ->and($user->pending_plan_id)->toBe($freePlan->id)
        ->and($credit->remaining)->toBe(50)
        ->and($credit->limit)->toBe(50);
});
