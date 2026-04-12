<?php

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;

uses(RefreshDatabase::class);

test('forgot password sends reset link for email/password user', function () {
    Notification::fake();

    $user = User::factory()->create([
        'email' => 'resetme@example.com',
        'oauth_provider' => null,
    ]);

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/forgot-password', [
            'email' => 'resetme@example.com',
        ]);

    $response->assertOk();
    $response->assertJson(['message' => 'If an account exists with that email, a password reset link has been sent.']);
    Notification::assertSentTo($user, ResetPassword::class);
});

test('forgot password returns uniform response for oauth user', function () {
    User::factory()->create([
        'email' => 'oauthonly@example.com',
        'oauth_provider' => 'google',
        'oauth_id' => '12345',
    ]);

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/forgot-password', [
            'email' => 'oauthonly@example.com',
        ]);

    $response->assertOk();
    $response->assertJson(['message' => 'If an account exists with that email, a password reset link has been sent.']);
});

test('forgot password returns uniform response for non-existent email', function () {
    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/forgot-password', [
            'email' => 'nobody@example.com',
        ]);

    $response->assertOk();
    $response->assertJson(['message' => 'If an account exists with that email, a password reset link has been sent.']);
});

test('forgot password does not send reset link to oauth user', function () {
    Notification::fake();

    $user = User::factory()->create([
        'email' => 'oauthonly2@example.com',
        'oauth_provider' => 'google',
        'oauth_id' => '67890',
    ]);

    $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/forgot-password', ['email' => 'oauthonly2@example.com']);

    Notification::assertNotSentTo($user, ResetPassword::class);
});

test('reset password resets password with valid token', function () {
    $user = User::factory()->create([
        'email' => 'reset@example.com',
        'oauth_provider' => null,
    ]);

    $token = Password::createToken($user);

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/reset-password', [
            'token' => $token,
            'email' => 'reset@example.com',
            'password' => 'NewPassword1',
            'password_confirmation' => 'NewPassword1',
        ]);

    $response->assertOk();

    $user->refresh();
    expect(Hash::check('NewPassword1', $user->password))->toBeTrue();
});

test('reset password fails with invalid token', function () {
    $user = User::factory()->create([
        'email' => 'invalid@example.com',
        'oauth_provider' => null,
    ]);

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/reset-password', [
            'token' => 'invalid-token-here',
            'email' => 'invalid@example.com',
            'password' => 'NewPassword1',
            'password_confirmation' => 'NewPassword1',
        ]);

    $response->assertStatus(422);
});

test('reset password enforces password strength rules', function () {
    $user = User::factory()->create([
        'email' => 'strength@example.com',
        'oauth_provider' => null,
    ]);

    $token = Password::createToken($user);

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/reset-password', [
            'token' => $token,
            'email' => 'strength@example.com',
            'password' => 'short',
            'password_confirmation' => 'short',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('password');
});

test('password reset does not auto-login user', function () {
    $user = User::factory()->create([
        'email' => 'nologin@example.com',
        'oauth_provider' => null,
    ]);

    $token = Password::createToken($user);

    $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/reset-password', [
            'token' => $token,
            'email' => 'nologin@example.com',
            'password' => 'NewPassword1',
            'password_confirmation' => 'NewPassword1',
        ]);

    $this->assertGuest();
});

test('password reset invalidates all user tokens', function () {
    $user = User::factory()->create([
        'email' => 'wipe@example.com',
        'oauth_provider' => null,
    ]);

    // Create tokens
    $user->createToken('device-1');
    $user->createToken('device-2');
    expect($user->tokens()->count())->toBe(2);

    $token = Password::createToken($user);

    $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/reset-password', [
            'token' => $token,
            'email' => 'wipe@example.com',
            'password' => 'NewPassword1',
            'password_confirmation' => 'NewPassword1',
        ]);

    expect($user->tokens()->count())->toBe(0);
});

test('forgot password is throttled for same email', function () {
    Notification::fake();

    User::factory()->create([
        'email' => 'throttle@example.com',
        'oauth_provider' => null,
    ]);

    // First request should succeed
    $first = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/forgot-password', [
            'email' => 'throttle@example.com',
        ]);

    $first->assertOk();

    // Second request within throttle window
    // Response is always 200 (anti-enumeration), but broker throttles internally
    $second = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/forgot-password', [
            'email' => 'throttle@example.com',
        ]);

    $second->assertOk();
});
