<?php

use Illuminate\Support\Facades\RateLimiter;

beforeEach(function () {
    RateLimiter::clear('oauth-redirect');
});

test('oauth redirect allows 10 requests per minute', function () {
    for ($i = 1; $i <= 10; $i++) {
        $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
            ->getJson('/api/auth/google/redirect');

        // Should not be 429 (may be 200 or other status depending on OAuth config)
        expect($response->getStatusCode())->not->toBe(429, "Request {$i} should not be rate limited");
    }
});

test('oauth redirect returns 429 after 10 requests per minute', function () {
    for ($i = 1; $i <= 10; $i++) {
        $this->withHeaders(['Origin' => 'http://localhost:5173'])
            ->getJson('/api/auth/google/redirect');
    }

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->getJson('/api/auth/google/redirect');

    $response->assertStatus(429);
});
