<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('authenticated user can make 10 searches', function () {
    $user = User::factory()->create();

    for ($i = 1; $i <= 10; $i++) {
        $this->actingAs($user)
            ->withHeaders(['Origin' => 'http://localhost:5173'])
            ->postJson('/api/ip-search', ['query' => '8.8.8.8'])
            ->assertStatus(200);
    }
});

test('11th search returns 429 with correct payload', function () {
    $user = User::factory()->create();

    for ($i = 1; $i <= 10; $i++) {
        $this->actingAs($user)
            ->withHeaders(['Origin' => 'http://localhost:5173'])
            ->postJson('/api/ip-search', ['query' => '8.8.8.8'])
            ->assertStatus(200);
    }

    $response = $this->actingAs($user)
        ->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/ip-search', ['query' => '8.8.8.8']);

    $response->assertStatus(429)
        ->assertJson([
            'is_guest' => false,
            'remaining' => 0,
            'limit' => 10,
            'message' => 'Daily limit reached',
        ]);
});

test('credits remaining decrements correctly', function () {
    $user = User::factory()->create();
    $headers = ['Origin' => 'http://localhost:5173'];

    $first = $this->actingAs($user)
        ->withHeaders($headers)
        ->postJson('/api/ip-search', ['query' => '8.8.8.8']);

    $first->assertStatus(200);
    expect($first->json('credits.remaining'))->toBe(9);

    for ($i = 2; $i <= 5; $i++) {
        $this->actingAs($user)
            ->withHeaders($headers)
            ->postJson('/api/ip-search', ['query' => '8.8.8.8']);
    }

    $fifth = $this->actingAs($user)
        ->withHeaders($headers)
        ->postJson('/api/ip-search', ['query' => '8.8.8.8']);

    $fifth->assertStatus(200);
    expect($fifth->json('credits.remaining'))->toBe(4);
});

test('two different authenticated users have independent credit pools', function () {
    $userA = User::factory()->create();
    $userB = User::factory()->create();
    $headers = ['Origin' => 'http://localhost:5173'];

    // User A makes 10 searches (exhausts credits)
    for ($i = 1; $i <= 10; $i++) {
        $this->actingAs($userA)
            ->withHeaders($headers)
            ->postJson('/api/ip-search', ['query' => '8.8.8.8'])
            ->assertStatus(200);
    }

    // User A is now at 429
    $this->actingAs($userA)
        ->withHeaders($headers)
        ->postJson('/api/ip-search', ['query' => '8.8.8.8'])
        ->assertStatus(429);

    // User B should still have full credits
    $this->actingAs($userB)
        ->withHeaders($headers)
        ->postJson('/api/ip-search', ['query' => '8.8.8.8'])
        ->assertStatus(200);
});
