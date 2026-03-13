<?php

use App\Models\User;
use App\Services\DarkWebProviderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

function authenticatedUser(): User
{
    return User::factory()->create(['email_verified_at' => now()]);
}

function fakeProviderSuccess(array $results = []): void
{
    $defaultResults = [
        [
            'email' => 'user@example.com',
            'password' => 'secret123',
            'username' => 'testuser',
            'source' => ['name' => 'BreachDB', 'breach_date' => '2023-01-15'],
            'first_name' => 'John',
            'last_name' => 'Doe',
            'phone' => '+1234567890',
            'fields' => ['email', 'password'],
        ],
    ];

    Http::fake([
        'leakcheck.io/*' => Http::response([
            'found' => count($results ?: $defaultResults),
            'result' => $results ?: $defaultResults,
        ], 200),
    ]);
}

function fakeProviderEmpty(): void
{
    Http::fake([
        'leakcheck.io/*' => Http::response([
            'found' => 0,
            'result' => [],
        ], 200),
    ]);
}

function fakeProviderError(): void
{
    Http::fake([
        'leakcheck.io/*' => Http::response('Internal Server Error', 500),
    ]);
}

test('dark web search without auth returns 401', function () {
    fakeProviderSuccess();

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/dark-web/search', [
            'query' => 'user@example.com',
            'type' => 'email',
        ]);

    $response->assertStatus(401);
});

test('dark web search with auth and valid email returns 200 with breach data', function () {
    fakeProviderSuccess();
    $user = authenticatedUser();

    $response = $this->actingAs($user)
        ->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/dark-web/search', [
            'query' => 'user@example.com',
            'type' => 'email',
        ]);

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => ['found', 'results'],
            'credits' => ['remaining', 'limit', 'resets_at'],
        ])
        ->assertJsonPath('data.found', 1);
});

test('dark web search with auth and valid domain returns 200 with breach results', function () {
    fakeProviderSuccess();
    $user = authenticatedUser();

    $response = $this->actingAs($user)
        ->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/dark-web/search', [
            'query' => 'example.com',
            'type' => 'domain',
        ]);

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => ['found', 'results'],
            'credits' => ['remaining', 'limit', 'resets_at'],
        ]);
});

test('dark web search with invalid email format returns 422', function () {
    $user = authenticatedUser();

    $response = $this->actingAs($user)
        ->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/dark-web/search', [
            'query' => 'not-an-email',
            'type' => 'email',
        ]);

    $response->assertStatus(422);
});

test('dark web search with invalid domain format returns 422', function () {
    $user = authenticatedUser();

    $response = $this->actingAs($user)
        ->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/dark-web/search', [
            'query' => '-invalid-.domain',
            'type' => 'domain',
        ]);

    $response->assertStatus(422);
});

test('dark web search with missing type field returns 422', function () {
    $user = authenticatedUser();

    $response = $this->actingAs($user)
        ->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/dark-web/search', [
            'query' => 'user@example.com',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('type');
});

test('dark web search with zero results deducts credit and returns found=0', function () {
    fakeProviderEmpty();
    $user = authenticatedUser();

    $response = $this->actingAs($user)
        ->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/dark-web/search', [
            'query' => 'user@example.com',
            'type' => 'email',
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('data.found', 0)
        ->assertJsonPath('data.results', []);

    // Credit was deducted (started at 10, now 9)
    $response->assertJsonPath('credits.remaining', 9);
});

test('dark web search provider failure returns 502 and refunds credit', function () {
    fakeProviderError();
    $user = authenticatedUser();

    $response = $this->actingAs($user)
        ->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/dark-web/search', [
            'query' => 'user@example.com',
            'type' => 'email',
        ]);

    $response->assertStatus(502)
        ->assertJsonPath('message', 'Something went wrong. No credit was deducted.')
        ->assertJsonStructure(['credits' => ['remaining', 'limit', 'resets_at']]);

    // Credit was refunded back to 10
    $response->assertJsonPath('credits.remaining', 10);
});

test('dark web search with zero credits returns 429 with resets_at', function () {
    $user = authenticatedUser();

    // Exhaust all credits
    \Illuminate\Support\Facades\DB::table('credits')->insert([
        'user_id' => $user->id,
        'ip_address' => null,
        'remaining' => 0,
        'limit' => 10,
        'last_reset_at' => now('UTC')->startOfDay(),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $response = $this->actingAs($user)
        ->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/dark-web/search', [
            'query' => 'user@example.com',
            'type' => 'email',
        ]);

    $response->assertStatus(429)
        ->assertJsonStructure(['message', 'resets_at']);
});

test('dark web search creates SearchLog with module dark_web', function () {
    fakeProviderSuccess();
    $user = authenticatedUser();

    $this->actingAs($user)
        ->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/dark-web/search', [
            'query' => 'user@example.com',
            'type' => 'email',
        ])
        ->assertStatus(200);

    $this->assertDatabaseHas('search_logs', [
        'user_id' => $user->id,
        'module' => 'dark_web',
        'query' => 'user@example.com',
    ]);
});

test('dark web search masks passwords in results', function () {
    fakeProviderSuccess([
        [
            'email' => 'user@example.com',
            'password' => 'mysecretpassword',
            'username' => 'testuser',
            'source' => ['name' => 'BreachDB', 'breach_date' => '2023-01-15'],
            'first_name' => null,
            'last_name' => null,
            'phone' => null,
            'fields' => ['email', 'password'],
        ],
    ]);
    $user = authenticatedUser();

    $response = $this->actingAs($user)
        ->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/dark-web/search', [
            'query' => 'user@example.com',
            'type' => 'email',
        ]);

    $response->assertStatus(200);

    $password = $response->json('data.results.0.password');
    expect($password)->not->toBe('mysecretpassword');
    expect($password)->toStartWith('mys');
    expect($password)->toContain('*');
});
