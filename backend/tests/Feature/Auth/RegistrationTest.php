<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('user can register with valid data', function () {
    $response = $this->withHeaders([
        'Origin' => 'http://localhost:5173',
    ])->postJson('/api/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'Password1',
        'password_confirmation' => 'Password1',
    ]);

    $response->assertStatus(201)
        ->assertJsonStructure(['data' => ['id', 'name', 'email']]);

    $this->assertDatabaseHas('users', ['email' => 'test@example.com']);
    $this->assertAuthenticated();
});

test('registration fails with short password', function () {
    $response = $this->postJson('/api/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'Short1A',
        'password_confirmation' => 'Short1A',
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('password');
});

test('registration fails without uppercase letter', function () {
    $response = $this->postJson('/api/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'alllower1',
        'password_confirmation' => 'alllower1',
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('password');
});

test('registration fails without number', function () {
    $response = $this->postJson('/api/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'NoNumberHere',
        'password_confirmation' => 'NoNumberHere',
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('password');
});

test('registration fails with duplicate email', function () {
    User::factory()->create(['email' => 'taken@example.com']);

    $response = $this->postJson('/api/register', [
        'name' => 'Test User',
        'email' => 'taken@example.com',
        'password' => 'Password1',
        'password_confirmation' => 'Password1',
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('email');
});

test('registration requires all fields', function () {
    $response = $this->postJson('/api/register', []);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['name', 'email', 'password']);
});
