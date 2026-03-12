<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use Laravel\Socialite\Facades\Socialite;
use Mockery\MockInterface;
use Laravel\Socialite\Contracts\Provider;

uses(RefreshDatabase::class);

/**
 * Mock a Socialite user for the given provider.
 */
function mockSocialiteUser(string $provider, array $overrides = []): void
{
    $defaults = [
        'id' => '12345',
        'name' => 'Test User',
        'email' => 'oauth@example.com',
        'avatar' => 'https://example.com/avatar.jpg',
    ];
    $data = array_merge($defaults, $overrides);

    $socialiteUser = Mockery::mock(SocialiteUser::class, function (MockInterface $mock) use ($data) {
        $mock->shouldReceive('getId')->andReturn($data['id']);
        $mock->shouldReceive('getName')->andReturn($data['name']);
        $mock->shouldReceive('getNickname')->andReturn($data['name']);
        $mock->shouldReceive('getEmail')->andReturn($data['email']);
        $mock->shouldReceive('getAvatar')->andReturn($data['avatar']);
    });

    $socialiteProvider = Mockery::mock(Provider::class, function (MockInterface $mock) use ($socialiteUser) {
        $mock->shouldReceive('stateless->user')->andReturn($socialiteUser);
    });

    Socialite::shouldReceive('driver')->with($provider)->andReturn($socialiteProvider);
}

// --- Google OAuth Tests ---

test('google oauth callback creates new user with correct fields', function () {
    mockSocialiteUser('google');

    $response = $this->get('/api/auth/google/callback');

    $response->assertRedirect(config('services.frontend_url') . '/dashboard');
    $this->assertAuthenticated();
    $this->assertDatabaseHas('users', [
        'email' => 'oauth@example.com',
        'name' => 'Test User',
        'oauth_provider' => 'google',
        'oauth_id' => '12345',
        'avatar_url' => 'https://example.com/avatar.jpg',
    ]);

    $user = User::where('email', 'oauth@example.com')->first();
    expect($user->email_verified_at)->not->toBeNull();
});

test('google oauth callback authenticates user and redirects to dashboard', function () {
    mockSocialiteUser('google');

    $response = $this->get('/api/auth/google/callback');

    $response->assertRedirect(config('services.frontend_url') . '/dashboard');
    $this->assertAuthenticated();
});

// --- GitHub OAuth Tests ---

test('github oauth callback creates new user with correct fields', function () {
    mockSocialiteUser('github', ['id' => '67890', 'name' => 'GitHub User', 'email' => 'github@example.com']);

    $response = $this->get('/api/auth/github/callback');

    $response->assertRedirect(config('services.frontend_url') . '/dashboard');
    $this->assertAuthenticated();
    $this->assertDatabaseHas('users', [
        'email' => 'github@example.com',
        'name' => 'GitHub User',
        'oauth_provider' => 'github',
        'oauth_id' => '67890',
    ]);

    $user = User::where('email', 'github@example.com')->first();
    expect($user->email_verified_at)->not->toBeNull();
});

test('github oauth callback authenticates user and redirects to dashboard', function () {
    mockSocialiteUser('github', ['email' => 'gh2@example.com']);

    $response = $this->get('/api/auth/github/callback');

    $response->assertRedirect(config('services.frontend_url') . '/dashboard');
    $this->assertAuthenticated();
});

// --- Account Merging ---

test('oauth callback with existing email/password user merges accounts', function () {
    $existingUser = User::factory()->create([
        'email' => 'existing@example.com',
        'oauth_provider' => null,
        'oauth_id' => null,
    ]);

    mockSocialiteUser('google', ['email' => 'existing@example.com', 'id' => '99999']);

    $response = $this->get('/api/auth/google/callback');

    $response->assertRedirect(config('services.frontend_url') . '/dashboard');
    $this->assertAuthenticated();

    $existingUser->refresh();
    expect($existingUser->oauth_provider)->toBe('google');
    expect($existingUser->oauth_id)->toBe('99999');
    expect(User::where('email', 'existing@example.com')->count())->toBe(1);
});

// --- Existing OAuth User ---

test('oauth callback with existing oauth user updates avatar and logs in', function () {
    $existingUser = User::factory()->create([
        'email' => 'oauthuser@example.com',
        'oauth_provider' => 'google',
        'oauth_id' => '12345',
        'avatar_url' => 'https://old-avatar.com/pic.jpg',
    ]);

    mockSocialiteUser('google', [
        'email' => 'oauthuser@example.com',
        'id' => '12345',
        'avatar' => 'https://new-avatar.com/pic.jpg',
    ]);

    $response = $this->get('/api/auth/google/callback');

    $response->assertRedirect(config('services.frontend_url') . '/dashboard');
    $this->assertAuthenticated();

    $existingUser->refresh();
    expect($existingUser->avatar_url)->toBe('https://new-avatar.com/pic.jpg');
    expect(User::where('email', 'oauthuser@example.com')->count())->toBe(1);
});

// --- Unsupported Provider ---

test('oauth callback with unsupported provider returns error redirect', function () {
    $response = $this->get('/api/auth/twitter/callback');

    $response->assertRedirect();
    $response->assertRedirectContains('error=');
});

// --- Redirect Endpoint Tests ---

test('oauth redirect endpoint returns json with provider url for google', function () {
    $fakeProvider = Mockery::mock(Provider::class, function (MockInterface $mock) {
        $redirectResponse = Mockery::mock();
        $redirectResponse->shouldReceive('getTargetUrl')->andReturn('https://accounts.google.com/oauth');
        $mock->shouldReceive('stateless->redirect')->andReturn($redirectResponse);
    });
    Socialite::shouldReceive('driver')->with('google')->andReturn($fakeProvider);

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->getJson('/api/auth/google/redirect');

    $response->assertOk()
        ->assertJsonStructure(['url'])
        ->assertJson(['url' => 'https://accounts.google.com/oauth']);
});

test('oauth redirect endpoint returns json with provider url for github', function () {
    $fakeProvider = Mockery::mock(Provider::class, function (MockInterface $mock) {
        $redirectResponse = Mockery::mock();
        $redirectResponse->shouldReceive('getTargetUrl')->andReturn('https://github.com/login/oauth');
        $mock->shouldReceive('stateless->redirect')->andReturn($redirectResponse);
    });
    Socialite::shouldReceive('driver')->with('github')->andReturn($fakeProvider);

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->getJson('/api/auth/github/redirect');

    $response->assertOk()
        ->assertJsonStructure(['url'])
        ->assertJson(['url' => 'https://github.com/login/oauth']);
});

test('oauth redirect endpoint rejects unsupported provider with 422', function () {
    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->getJson('/api/auth/twitter/redirect');

    $response->assertStatus(422)
        ->assertJson(['message' => 'Unsupported provider.']);
});
