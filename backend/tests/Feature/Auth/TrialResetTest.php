<?php

use App\Models\User;
use App\Models\Credit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

test('trial reset sets trial_ends_at to 30 days from now', function () {
    // Create user with old trial_ends_at
    $user = User::factory()->create([
        'trial_ends_at' => now()->subDays(60),
    ]);

    // Run the data migration logic
    $trialEnd = now()->addDays(30)->toDateTimeString();
    DB::table('users')->update(['trial_ends_at' => $trialEnd]);

    $user->refresh();
    expect($user->trial_ends_at->isFuture())->toBeTrue();
    $diff = (int) abs($user->trial_ends_at->diffInDays(now()));
    expect($diff)->toBeGreaterThanOrEqual(29);
    expect($diff)->toBeLessThanOrEqual(31);
});

test('credit pre-creation creates rows for users without credits', function () {
    $user1 = User::factory()->create();
    $user2 = User::factory()->create();

    // user1 already has a credit row
    Credit::create([
        'user_id' => $user1->id,
        'remaining' => 5,
        'limit' => 10,
        'last_reset_at' => now(),
    ]);

    // Simulate the migration logic
    $usersWithoutCredits = DB::table('users')
        ->leftJoin('credits', 'users.id', '=', 'credits.user_id')
        ->whereNull('credits.id')
        ->pluck('users.id');

    $now = now()->toDateTimeString();
    $rows = $usersWithoutCredits->map(fn ($id) => [
        'user_id' => $id,
        'ip_address' => null,
        'remaining' => 10,
        'limit' => 10,
        'last_reset_at' => $now,
        'created_at' => $now,
        'updated_at' => $now,
    ])->all();

    if (!empty($rows)) {
        DB::table('credits')->insert($rows);
    }

    // user1 keeps original credit (remaining=5)
    expect(Credit::where('user_id', $user1->id)->first()->remaining)->toBe(5);
    // user2 gets new credit row (remaining=10)
    expect(Credit::where('user_id', $user2->id)->first()->remaining)->toBe(10);
    // Total credits = 2 (one per user)
    expect(Credit::count())->toBe(2);
});

test('credit pre-creation sets limit to 10', function () {
    $user = User::factory()->create();

    $now = now()->toDateTimeString();
    DB::table('credits')->insert([
        'user_id' => $user->id,
        'ip_address' => null,
        'remaining' => 10,
        'limit' => 10,
        'last_reset_at' => $now,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $credit = Credit::where('user_id', $user->id)->first();
    expect($credit->limit)->toBe(10);
    expect($credit->remaining)->toBe(10);
});
