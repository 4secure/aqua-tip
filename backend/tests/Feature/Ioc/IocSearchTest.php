<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('IOC search with valid IP returns data type ipv4', function () {
    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/ioc/search', ['query' => '8.8.8.8']);

    $response->assertStatus(200)
        ->assertJsonPath('data.type', 'ipv4')
        ->assertJsonPath('data.query', '8.8.8.8');
});

test('IOC search with domain returns data type domain', function () {
    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/ioc/search', ['query' => 'malware.example.com']);

    $response->assertStatus(200)
        ->assertJsonPath('data.type', 'domain');
});

test('IOC search with SHA256 hash returns data type sha256', function () {
    $hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/ioc/search', ['query' => $hash]);

    $response->assertStatus(200)
        ->assertJsonPath('data.type', 'sha256');
});

test('IOC search without query returns 422 validation error', function () {
    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/ioc/search', []);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('query');
});

test('IOC search with empty string returns 422', function () {
    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/ioc/search', ['query' => '']);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('query');
});

test('IOC search response includes credits object', function () {
    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/ioc/search', ['query' => '8.8.8.8']);

    $response->assertStatus(200)
        ->assertJsonStructure([
            'credits' => ['remaining', 'limit', 'resets_at'],
        ]);
});

test('search is logged in search_logs table', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/ioc/search', ['query' => '8.8.8.8'])
        ->assertStatus(200);

    $this->assertDatabaseHas('search_logs', [
        'user_id' => $user->id,
        'module' => 'ioc_search',
        'query' => '8.8.8.8',
    ]);
});
