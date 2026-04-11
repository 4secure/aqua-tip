<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;

uses(RefreshDatabase::class);

beforeEach(function () {
    RateLimiter::clear('email-verify-daily');
});

test('email verification resend returns 429 after 20 daily requests', function () {
    $user = User::factory()->create(['email_verified_at' => null]);

    // Also clear the per-minute throttle to avoid hitting it first
    for ($i = 1; $i <= 20; $i++) {
        // Clear per-minute limiter each iteration to avoid the 6/min cap
        RateLimiter::clear('6');

        $this->actingAs($user)
            ->withHeaders(['Origin' => 'http://localhost:5173'])
            ->postJson('/api/email/verification-notification');
    }

    // Clear per-minute limiter one more time for the final request
    RateLimiter::clear('6');

    $response = $this->actingAs($user)
        ->withHeaders(['Origin' => 'http://localhost:5173'])
        ->postJson('/api/email/verification-notification');

    $response->assertStatus(429);
});
