<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;

uses(RefreshDatabase::class);

beforeEach(function () {
    RateLimiter::clear('api-search');
});

test('credits endpoint allows 30 requests per minute', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);

    for ($i = 1; $i <= 30; $i++) {
        $response = $this->actingAs($user)
            ->withHeaders(['Origin' => 'http://localhost:5173'])
            ->getJson('/api/credits');

        $response->assertStatus(200, "Request {$i} should be allowed");
    }
});

test('credits endpoint returns 429 after 30 requests per minute', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);

    for ($i = 1; $i <= 30; $i++) {
        $this->actingAs($user)
            ->withHeaders(['Origin' => 'http://localhost:5173'])
            ->getJson('/api/credits');
    }

    $response = $this->actingAs($user)
        ->withHeaders(['Origin' => 'http://localhost:5173'])
        ->getJson('/api/credits');

    $response->assertStatus(429);
});
