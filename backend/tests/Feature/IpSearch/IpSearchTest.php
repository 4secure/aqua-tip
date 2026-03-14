<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('IP search with valid IPv4 returns data', function () {
    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/ip-search', ['query' => '8.8.8.8']);

    $response->assertStatus(200)
        ->assertJsonPath('data.ip', '8.8.8.8');
});

test('IP search with valid IPv6 returns data', function () {
    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/ip-search', ['query' => '2001:4860:4860::8888']);

    $response->assertStatus(200)
        ->assertJsonPath('data.ip', '2001:4860:4860::8888');
});

test('IP search with domain returns 422 validation error', function () {
    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/ip-search', ['query' => 'example.com']);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('query');
});

test('IP search with hash returns 422 validation error', function () {
    $hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/ip-search', ['query' => $hash]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('query');
});

test('IP search without query returns 422 validation error', function () {
    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/ip-search', []);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('query');
});

test('IP search with empty string returns 422', function () {
    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/ip-search', ['query' => '']);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('query');
});

test('IP search response includes credits object', function () {
    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/ip-search', ['query' => '8.8.8.8']);

    $response->assertStatus(200)
        ->assertJsonStructure([
            'credits' => ['remaining', 'limit', 'resets_at'],
        ]);
});

test('search is logged in search_logs table', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/ip-search', ['query' => '8.8.8.8'])
        ->assertStatus(200);

    $this->assertDatabaseHas('search_logs', [
        'user_id' => $user->id,
        'module' => 'ip_search',
        'query' => '8.8.8.8',
    ]);
});
