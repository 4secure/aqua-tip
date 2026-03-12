<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

test('user can login with valid credentials', function () {
    User::factory()->create([
        'email' => 'user@example.com',
        'password' => Hash::make('Password1'),
    ]);

    $response = $this->withHeaders([
        'Origin' => 'http://localhost:5173',
    ])->postJson('/api/login', [
        'email' => 'user@example.com',
        'password' => 'Password1',
    ]);

    $response->assertStatus(200)
        ->assertJsonStructure(['data' => ['id', 'name', 'email']]);
});

test('login fails with wrong password', function () {
    User::factory()->create([
        'email' => 'user@example.com',
        'password' => Hash::make('Password1'),
    ]);

    $response = $this->withHeaders([
        'Origin' => 'http://localhost:5173',
    ])->postJson('/api/login', [
        'email' => 'user@example.com',
        'password' => 'WrongPassword1',
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('email');
});

test('login fails with nonexistent email', function () {
    $response = $this->withHeaders([
        'Origin' => 'http://localhost:5173',
    ])->postJson('/api/login', [
        'email' => 'nobody@example.com',
        'password' => 'Password1',
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('email');
});

test('session persists after login', function () {
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
    ])->getJson('/api/user');

    $response->assertStatus(200)
        ->assertJson(['data' => ['email' => 'user@example.com']]);
});

test('unauthenticated user cannot access /api/user', function () {
    $response = $this->getJson('/api/user');

    $response->assertStatus(401);
});
