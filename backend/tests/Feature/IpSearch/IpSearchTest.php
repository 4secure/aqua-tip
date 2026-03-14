<?php

use App\Models\User;
use App\Services\IpSearchService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function fakeIpSearchResult(string $ip = '8.8.8.8'): array
{
    return [
        'ip' => $ip,
        'found' => true,
        'score' => 75,
        'labels' => [['id' => 'lbl-1', 'value' => 'malware', 'color' => '#ff0000']],
        'description' => 'Known DNS resolver',
        'created_by' => 'MITRE',
        'created_at' => '2024-01-01T00:00:00Z',
        'updated_at' => '2024-06-01T00:00:00Z',
        'geo' => [
            'country' => 'United States',
            'country_code' => 'US',
            'city' => 'Mountain View',
            'region' => 'California',
            'lat' => 37.386,
            'lon' => -122.0838,
            'isp' => 'Google LLC',
            'org' => 'Google Public DNS',
            'as' => 'AS15169 Google LLC',
            'asname' => 'GOOGLE',
        ],
        'relationships' => [],
        'indicators' => [],
        'sightings' => [],
        'notes' => [],
        'external_references' => [],
        'raw' => null,
    ];
}

beforeEach(function () {
    $this->app->bind(IpSearchService::class, function () {
        $mock = Mockery::mock(IpSearchService::class);
        $mock->shouldReceive('search')
            ->andReturnUsing(fn (string $ip) => fakeIpSearchResult($ip));

        return $mock;
    });
});

test('IP search with valid IPv4 returns data', function () {
    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/ip-search', ['query' => '8.8.8.8']);

    $response->assertStatus(200)
        ->assertJsonPath('data.ip', '8.8.8.8')
        ->assertJsonPath('data.found', true)
        ->assertJsonPath('data.score', 75)
        ->assertJsonStructure([
            'data' => ['ip', 'found', 'score', 'geo', 'labels'],
            'credits' => ['remaining', 'limit', 'resets_at'],
        ]);
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
