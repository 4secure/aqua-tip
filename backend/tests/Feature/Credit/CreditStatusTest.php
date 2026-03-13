<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('GET /api/credits for guest returns remaining 1 limit 1 when fresh', function () {
    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->getJson('/api/credits');

    $response->assertStatus(200)
        ->assertJson([
            'remaining' => 1,
            'limit' => 1,
        ])
        ->assertJsonStructure(['resets_at']);
});

test('GET /api/credits for guest after 1 search returns remaining 0', function () {
    $headers = ['Origin' => 'http://localhost:5173'];

    $this->withHeaders($headers)
        ->postJson('/api/ioc/search', ['query' => '8.8.8.8'])
        ->assertStatus(200);

    $response = $this->withHeaders($headers)
        ->getJson('/api/credits');

    $response->assertStatus(200)
        ->assertJson(['remaining' => 0]);
});

test('GET /api/credits for authenticated user returns remaining 10 limit 10 when fresh', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->withHeaders(['Origin' => 'http://localhost:5173'])
        ->getJson('/api/credits');

    $response->assertStatus(200)
        ->assertJson([
            'remaining' => 10,
            'limit' => 10,
        ]);
});

test('GET /api/credits does NOT deduct a credit', function () {
    $user = User::factory()->create();
    $headers = ['Origin' => 'http://localhost:5173'];

    $first = $this->actingAs($user)->withHeaders($headers)
        ->getJson('/api/credits');

    $second = $this->actingAs($user)->withHeaders($headers)
        ->getJson('/api/credits');

    expect($first->json('remaining'))->toBe(10);
    expect($second->json('remaining'))->toBe(10);
});

test('GET /api/credits response includes resets_at as ISO 8601 string', function () {
    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->getJson('/api/credits');

    $response->assertStatus(200);

    $resetsAt = $response->json('resets_at');
    expect($resetsAt)->toBeString();
    // ISO 8601 format check
    expect(strtotime($resetsAt))->not->toBeFalse();
});
