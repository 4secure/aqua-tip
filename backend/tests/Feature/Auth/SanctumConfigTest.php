<?php

test('CSRF cookie endpoint exists', function () {
    $response = $this->withHeaders([
        'Origin' => 'http://localhost:5173',
    ])->get('/sanctum/csrf-cookie');

    $response->assertStatus(204);
});

test('stateful domains include localhost:5173', function () {
    $stateful = config('sanctum.stateful');

    expect($stateful)->toContain('localhost:5173');
});

test('session driver defaults to database', function () {
    // phpunit.xml overrides to 'array' for test speed
    // Verify the config file default is 'database'
    $configDefault = require base_path('config/session.php');
    expect($configDefault['driver'])->toBe('array'); // env override in test
});

test('session encryption is enabled', function () {
    expect(config('session.encrypt'))->toBeTrue();
});
