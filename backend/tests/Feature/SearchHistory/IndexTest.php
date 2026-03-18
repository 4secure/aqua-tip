<?php

use App\Models\SearchLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('GET /api/search-history returns 401 for guests', function () {
    $response = $this->getJson('/api/search-history');
    $response->assertStatus(401);
});

test('GET /api/search-history returns 200 with envelope structure', function () {
    $user = User::factory()->create();
    SearchLog::create([
        'user_id' => $user->id,
        'ip_address' => '127.0.0.1',
        'module' => 'threat_search',
        'query' => 'example.com',
        'type' => 'domain',
    ]);

    $response = $this->actingAs($user)->getJson('/api/search-history');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [['id', 'query', 'type', 'module', 'created_at']],
            'meta' => ['total', 'limit'],
        ]);
});

test('response excludes ip_address and user_id fields', function () {
    $user = User::factory()->create();
    SearchLog::create([
        'user_id' => $user->id,
        'ip_address' => '192.168.1.1',
        'module' => 'ip_search',
        'query' => '8.8.8.8',
        'type' => 'ipv4',
    ]);

    $response = $this->actingAs($user)->getJson('/api/search-history');
    $entry = $response->json('data.0');

    expect($entry)->not->toHaveKey('ip_address');
    expect($entry)->not->toHaveKey('user_id');
    expect($entry)->toHaveKeys(['id', 'query', 'type', 'module', 'created_at']);
});

test('results are ordered by most recent first', function () {
    $user = User::factory()->create();

    SearchLog::create([
        'user_id' => $user->id,
        'ip_address' => '127.0.0.1',
        'module' => 'threat_search',
        'query' => 'older-query',
        'type' => 'domain',
        'created_at' => now()->subMinutes(10),
    ]);
    SearchLog::create([
        'user_id' => $user->id,
        'ip_address' => '127.0.0.1',
        'module' => 'threat_search',
        'query' => 'newer-query',
        'type' => 'domain',
        'created_at' => now(),
    ]);

    $response = $this->actingAs($user)->getJson('/api/search-history');

    expect($response->json('data.0.query'))->toBe('newer-query');
    expect($response->json('data.1.query'))->toBe('older-query');
});

test('returns maximum 20 results', function () {
    $user = User::factory()->create();

    for ($i = 0; $i < 25; $i++) {
        SearchLog::create([
            'user_id' => $user->id,
            'ip_address' => '127.0.0.1',
            'module' => 'threat_search',
            'query' => "query-$i",
            'type' => 'domain',
        ]);
    }

    $response = $this->actingAs($user)->getJson('/api/search-history');

    expect($response->json('data'))->toHaveCount(20);
    expect($response->json('meta.total'))->toBe(20);
    expect($response->json('meta.limit'))->toBe(20);
});

test('module filter restricts results', function () {
    $user = User::factory()->create();

    SearchLog::create([
        'user_id' => $user->id,
        'ip_address' => '127.0.0.1',
        'module' => 'threat_search',
        'query' => 'threat-query',
        'type' => 'domain',
    ]);
    SearchLog::create([
        'user_id' => $user->id,
        'ip_address' => '127.0.0.1',
        'module' => 'ip_search',
        'query' => 'ip-query',
        'type' => 'ipv4',
    ]);

    $response = $this->actingAs($user)->getJson('/api/search-history?module=threat_search');

    expect($response->json('data'))->toHaveCount(1);
    expect($response->json('data.0.query'))->toBe('threat-query');
});

test('invalid module filter is ignored and returns all results', function () {
    $user = User::factory()->create();

    SearchLog::create([
        'user_id' => $user->id,
        'ip_address' => '127.0.0.1',
        'module' => 'threat_search',
        'query' => 'some-query',
        'type' => 'domain',
    ]);

    $response = $this->actingAs($user)->getJson('/api/search-history?module=bogus_module');

    $response->assertStatus(200);
    expect($response->json('data'))->toHaveCount(1);
});

test('user cannot see another user searches', function () {
    $userA = User::factory()->create();
    $userB = User::factory()->create();

    SearchLog::create([
        'user_id' => $userB->id,
        'ip_address' => '127.0.0.1',
        'module' => 'threat_search',
        'query' => 'secret-query',
        'type' => 'domain',
    ]);

    $response = $this->actingAs($userA)->getJson('/api/search-history');

    expect($response->json('data'))->toHaveCount(0);
    expect($response->json('meta.total'))->toBe(0);
});
