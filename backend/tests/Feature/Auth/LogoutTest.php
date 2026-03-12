<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

test('user can logout', function () {
    User::factory()->create([
        'email' => 'user@example.com',
        'password' => Hash::make('Password1'),
    ]);

    $this->withHeaders([
        'Origin' => 'http://localhost:5173',
    ])->postJson('/api/login', [
        'email' => 'user@example.com',
        'password' => 'Password1',
    ])->assertStatus(200);

    $response = $this->withHeaders([
        'Origin' => 'http://localhost:5173',
    ])->postJson('/api/logout');

    $response->assertStatus(200)
        ->assertJson(['message' => 'Logged out']);
});

test('session destroyed after logout', function () {
    User::factory()->create([
        'email' => 'user@example.com',
        'password' => Hash::make('Password1'),
    ]);

    $this->withHeaders([
        'Origin' => 'http://localhost:5173',
    ])->postJson('/api/login', [
        'email' => 'user@example.com',
        'password' => 'Password1',
    ])->assertStatus(200);

    $this->assertAuthenticated('web');

    $this->withHeaders([
        'Origin' => 'http://localhost:5173',
    ])->postJson('/api/logout')->assertStatus(200);

    $this->assertGuest('web');
});
