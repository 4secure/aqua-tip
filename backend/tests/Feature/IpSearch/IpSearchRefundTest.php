<?php

use App\Exceptions\OpenCtiConnectionException;
use App\Models\User;
use App\Services\IpSearchService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('POST /api/ip-search returns 502 with refund message when service throws', function () {
    $this->app->bind(IpSearchService::class, function () {
        $mock = Mockery::mock(IpSearchService::class);
        $mock->shouldReceive('search')
            ->andThrow(new OpenCtiConnectionException('Connection refused'));

        return $mock;
    });

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/ip-search', ['query' => '8.8.8.8']);

    $response->assertStatus(502)
        ->assertJsonPath('message', 'Something went wrong. No credit was deducted.');
});

test('credit remaining is incremented (refunded) after 502 response', function () {
    $this->app->bind(IpSearchService::class, function () {
        $mock = Mockery::mock(IpSearchService::class);
        $mock->shouldReceive('search')
            ->andThrow(new OpenCtiConnectionException('Connection refused'));

        return $mock;
    });

    // Get the initial credit state before the request
    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/ip-search', ['query' => '8.8.8.8']);

    $response->assertStatus(502);

    // The credits in the response should show the refunded amount
    $response->assertJsonStructure([
        'credits' => ['remaining', 'limit', 'resets_at'],
    ]);
});

test('SearchLog is NOT created when service throws (502 path)', function () {
    $this->app->bind(IpSearchService::class, function () {
        $mock = Mockery::mock(IpSearchService::class);
        $mock->shouldReceive('search')
            ->andThrow(new OpenCtiConnectionException('Connection refused'));

        return $mock;
    });

    $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/ip-search', ['query' => '8.8.8.8']);

    $this->assertDatabaseMissing('search_logs', [
        'module' => 'ip_search',
        'query' => '8.8.8.8',
    ]);
});
