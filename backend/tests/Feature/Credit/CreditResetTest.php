<?php

use App\Models\Credit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

afterEach(function () {
    Carbon::setTestNow(null);
});

test('guest who used credit yesterday can search again today', function () {
    $headers = ['Origin' => 'http://localhost:5173'];

    $this->withHeaders($headers)
        ->postJson('/api/ip-search', ['query' => '8.8.8.8'])
        ->assertStatus(200);

    $this->withHeaders($headers)
        ->postJson('/api/ip-search', ['query' => '1.1.1.1'])
        ->assertStatus(429);

    // Advance to next day
    Carbon::setTestNow(now()->addDay());

    $this->withHeaders($headers)
        ->postJson('/api/ip-search', ['query' => '8.8.8.8'])
        ->assertStatus(200);
});

test('authenticated user who used all 10 credits yesterday has 10 again today', function () {
    $user = User::factory()->create();
    $headers = ['Origin' => 'http://localhost:5173'];

    for ($i = 1; $i <= 10; $i++) {
        $this->actingAs($user)->withHeaders($headers)
            ->postJson('/api/ip-search', ['query' => '8.8.8.8'])
            ->assertStatus(200);
    }

    $this->actingAs($user)->withHeaders($headers)
        ->postJson('/api/ip-search', ['query' => '8.8.8.8'])
        ->assertStatus(429);

    // Advance to next day
    Carbon::setTestNow(now()->addDay());

    $response = $this->actingAs($user)->withHeaders($headers)
        ->postJson('/api/ip-search', ['query' => '8.8.8.8']);

    $response->assertStatus(200);
    expect($response->json('credits.remaining'))->toBe(9);
});

test('credit remaining resets to full limit after midnight UTC via lazy reset', function () {
    // Manually create a credit record with remaining=0, last_reset_at=yesterday
    Credit::create([
        'user_id' => null,
        'ip_address' => '127.0.0.1',
        'remaining' => 0,
        'limit' => 1,
        'last_reset_at' => now('UTC')->subDay()->startOfDay(),
    ]);

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/ip-search', ['query' => '8.8.8.8']);

    // Lazy reset should fire, allowing the search
    $response->assertStatus(200);
});

test('credit does NOT reset if same day', function () {
    // Create a credit record with remaining=0, last_reset_at=today
    Credit::create([
        'user_id' => null,
        'ip_address' => '127.0.0.1',
        'remaining' => 0,
        'limit' => 1,
        'last_reset_at' => now('UTC')->startOfDay(),
    ]);

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/ip-search', ['query' => '8.8.8.8']);

    $response->assertStatus(429);
});
