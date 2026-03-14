<?php

use App\Services\IpSearchService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->app->bind(IpSearchService::class, function () {
        $mock = Mockery::mock(IpSearchService::class);
        $mock->shouldReceive('search')
            ->andReturnUsing(fn (string $ip) => [
                'ip' => $ip, 'found' => true, 'score' => 50, 'labels' => [],
                'description' => null, 'created_by' => null, 'created_at' => null,
                'updated_at' => null, 'geo' => null, 'relationships' => [],
                'indicators' => [], 'sightings' => [], 'notes' => [],
                'external_references' => [], 'raw' => null,
            ]);

        return $mock;
    });
});

test('guest first IP search returns 200 with data and credits', function () {
    $response = $this->withHeaders([
        'Origin' => 'http://localhost:5173',
    ])->postJson('/api/ip-search', [
        'query' => '8.8.8.8',
    ]);

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => ['ip', 'found', 'score'],
            'credits' => ['remaining', 'limit', 'resets_at'],
        ]);
});

test('guest second IP search same day returns 429', function () {
    $headers = ['Origin' => 'http://localhost:5173'];

    $this->withHeaders($headers)
        ->postJson('/api/ip-search', ['query' => '8.8.8.8'])
        ->assertStatus(200);

    $response = $this->withHeaders($headers)
        ->postJson('/api/ip-search', ['query' => '1.1.1.1']);

    $response->assertStatus(429)
        ->assertJson([
            'is_guest' => true,
            'remaining' => 0,
            'limit' => 1,
            'message' => 'Sign in for more lookups',
        ])
        ->assertJsonStructure(['resets_at']);
});

test('guest 429 response includes correct JSON structure', function () {
    $headers = ['Origin' => 'http://localhost:5173'];

    $this->withHeaders($headers)
        ->postJson('/api/ip-search', ['query' => '8.8.8.8'])
        ->assertStatus(200);

    $response = $this->withHeaders($headers)
        ->postJson('/api/ip-search', ['query' => '1.1.1.1']);

    $response->assertStatus(429)
        ->assertJsonStructure([
            'message',
            'remaining',
            'limit',
            'resets_at',
            'is_guest',
        ]);
});

test('different IP addresses get independent credit pools', function () {
    $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->withServerVariables(['REMOTE_ADDR' => '10.0.0.1'])
        ->postJson('/api/ip-search', ['query' => '8.8.8.8'])
        ->assertStatus(200);

    // Different IP should also get 200 (independent pool)
    $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->withServerVariables(['REMOTE_ADDR' => '10.0.0.2'])
        ->postJson('/api/ip-search', ['query' => '8.8.8.8'])
        ->assertStatus(200);

    // First IP exhausted
    $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->withServerVariables(['REMOTE_ADDR' => '10.0.0.1'])
        ->postJson('/api/ip-search', ['query' => '1.1.1.1'])
        ->assertStatus(429);

    // Second IP also exhausted
    $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->withServerVariables(['REMOTE_ADDR' => '10.0.0.2'])
        ->postJson('/api/ip-search', ['query' => '1.1.1.1'])
        ->assertStatus(429);
});
