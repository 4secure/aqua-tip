<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('valid name and phone completes onboarding', function () {
    $user = User::factory()->create([
        'name' => 'placeholder',
        'phone' => null,
        'onboarding_completed_at' => null,
    ]);

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->actingAs($user)
        ->postJson('/api/onboarding', [
            'name' => 'John Doe',
            'phone' => '+1234567890',
        ]);

    $response->assertOk()
        ->assertJsonPath('data.name', 'John Doe')
        ->assertJsonPath('data.phone', '+1234567890')
        ->assertJsonPath('data.onboarding_completed', true);

    $user->refresh();
    expect($user->name)->toBe('John Doe');
    expect($user->phone)->toBe('+1234567890');
    expect($user->onboarding_completed_at)->not->toBeNull();
});

test('missing name returns 422', function () {
    $user = User::factory()->create();

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->actingAs($user)
        ->postJson('/api/onboarding', [
            'phone' => '+1234567890',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('name');
});

test('missing phone returns 422', function () {
    $user = User::factory()->create();

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->actingAs($user)
        ->postJson('/api/onboarding', [
            'name' => 'John Doe',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('phone');
});

test('short name returns 422', function () {
    $user = User::factory()->create();

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->actingAs($user)
        ->postJson('/api/onboarding', [
            'name' => 'J',
            'phone' => '+1234567890',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('name');
});

test('onboarding updates user name', function () {
    $user = User::factory()->create(['name' => 'oldname']);

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->actingAs($user)
        ->postJson('/api/onboarding', [
            'name' => 'New Name',
            'phone' => '+9876543210',
        ]);

    $response->assertOk();

    $user->refresh();
    expect($user->name)->toBe('New Name');
});
