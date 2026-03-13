<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;

uses(RefreshDatabase::class);

test('valid 6-digit code verifies user email', function () {
    $user = User::factory()->unverified()->create();
    Cache::put("email_verify_code:{$user->id}", '123456', now()->addMinutes(15));

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->actingAs($user)
        ->postJson('/api/email/verify-code', ['code' => '123456']);

    $response->assertOk()
        ->assertJson(['message' => 'Email verified successfully.']);

    $user->refresh();
    expect($user->email_verified_at)->not->toBeNull();
    expect(Cache::has("email_verify_code:{$user->id}"))->toBeFalse();
});

test('wrong code returns 422', function () {
    $user = User::factory()->unverified()->create();
    Cache::put("email_verify_code:{$user->id}", '123456', now()->addMinutes(15));

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->actingAs($user)
        ->postJson('/api/email/verify-code', ['code' => '999999']);

    $response->assertStatus(422)
        ->assertJson(['message' => 'Invalid or expired verification code.']);

    $user->refresh();
    expect($user->email_verified_at)->toBeNull();
});

test('expired code returns 422', function () {
    $user = User::factory()->unverified()->create();
    // Do not put any code in cache (simulates expiration)

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->actingAs($user)
        ->postJson('/api/email/verify-code', ['code' => '123456']);

    $response->assertStatus(422)
        ->assertJson(['message' => 'Invalid or expired verification code.']);
});

test('already verified user gets appropriate response', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->actingAs($user)
        ->postJson('/api/email/verify-code', ['code' => '123456']);

    $response->assertOk()
        ->assertJson(['message' => 'Email already verified.']);
});

test('code validation requires exactly 6 characters', function () {
    $user = User::factory()->unverified()->create();

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->actingAs($user)
        ->postJson('/api/email/verify-code', ['code' => '123']);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('code');
});
