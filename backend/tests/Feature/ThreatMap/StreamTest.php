<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('GET /api/threat-map/stream returns 401 for unauthenticated user', function () {
    $response = $this->getJson('/api/threat-map/stream');

    $response->assertStatus(401);
});

test('GET /api/threat-map/stream returns SSE headers for authenticated user', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->get('/api/threat-map/stream');

    // StreamedResponse will return 200 with SSE headers
    $response->assertStatus(200);
    expect($response->headers->get('Content-Type'))->toContain('text/event-stream');
    expect($response->headers->get('Cache-Control'))->toContain('no-cache');
    $response->assertHeader('X-Accel-Buffering', 'no');
});
