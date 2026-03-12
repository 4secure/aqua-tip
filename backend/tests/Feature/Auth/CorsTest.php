<?php

test('CORS headers present on API response from allowed origin', function () {
    $response = $this->withHeaders([
        'Origin' => 'http://localhost:5173',
    ])->postJson('/api/login', [
        'email' => 'test@example.com',
        'password' => 'password',
    ]);

    $response->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
});

test('CORS supports credentials', function () {
    $response = $this->withHeaders([
        'Origin' => 'http://localhost:5173',
    ])->postJson('/api/login', [
        'email' => 'test@example.com',
        'password' => 'password',
    ]);

    $response->assertHeader('Access-Control-Allow-Credentials', 'true');
});
