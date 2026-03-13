<?php

use App\Models\User;
use Illuminate\Auth\Events\Registered;
use App\Notifications\VerifyEmailWithCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;

uses(RefreshDatabase::class);

test('unverified user gets 200 from /api/user', function () {
    $user = User::factory()->unverified()->create();

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->actingAs($user)
        ->getJson('/api/user');

    $response->assertOk()
        ->assertJsonPath('data.email_verified', false);
});

test('verified user gets 200 from /api/user', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->actingAs($user)
        ->getJson('/api/user');

    $response->assertOk();
});

test('registration triggers verification email event', function () {
    Event::fake([Registered::class]);

    $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/register', [
            'name' => 'New User',
            'email' => 'newuser@example.com',
            'password' => 'Password1',
            'password_confirmation' => 'Password1',
        ]);

    Event::assertDispatched(Registered::class);
});

test('verification endpoint marks user as verified', function () {
    $user = User::factory()->unverified()->create();

    $verificationUrl = URL::temporarySignedRoute(
        'verification.verify',
        now()->addMinutes(60),
        ['id' => $user->id, 'hash' => sha1($user->email)]
    );

    $response = $this->actingAs($user)->get($verificationUrl);

    $response->assertOk();
    $user->refresh();
    expect($user->email_verified_at)->not->toBeNull();
});

test('resend endpoint sends verification notification for unverified user', function () {
    Notification::fake();

    $user = User::factory()->unverified()->create();

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->actingAs($user)
        ->postJson('/api/email/verification-notification');

    $response->assertOk()
        ->assertJson(['message' => 'Verification link sent.']);

    Notification::assertSentTo($user, VerifyEmailWithCode::class);
});

test('resend endpoint returns already verified for verified user', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->actingAs($user)
        ->postJson('/api/email/verification-notification');

    $response->assertOk()
        ->assertJson(['message' => 'Email already verified.']);
});

test('unverified user can still access verification routes', function () {
    Notification::fake();

    $user = User::factory()->unverified()->create();

    // Should be able to hit the resend endpoint (not blocked by verified middleware)
    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->actingAs($user)
        ->postJson('/api/email/verification-notification');

    $response->assertOk();
});
