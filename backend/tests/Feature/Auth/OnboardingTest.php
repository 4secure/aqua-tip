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
            'timezone' => 'Asia/Manila',
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
            'timezone' => 'Asia/Manila',
        ]);

    $response->assertOk();

    $user->refresh();
    expect($user->name)->toBe('New Name');
});

test('valid onboarding with all fields stores timezone, organization, role', function () {
    $user = User::factory()->create([
        'name' => 'placeholder',
        'phone' => null,
        'onboarding_completed_at' => null,
    ]);

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->actingAs($user)
        ->postJson('/api/onboarding', [
            'name' => 'Jane Smith',
            'phone' => '+1234567890',
            'timezone' => 'America/New_York',
            'organization' => 'Acme Corp',
            'role' => 'Security Analyst',
        ]);

    $response->assertOk()
        ->assertJsonPath('data.name', 'Jane Smith')
        ->assertJsonPath('data.phone', '+1234567890')
        ->assertJsonPath('data.timezone', 'America/New_York')
        ->assertJsonPath('data.organization', 'Acme Corp')
        ->assertJsonPath('data.role', 'Security Analyst')
        ->assertJsonPath('data.onboarding_completed', true);

    $user->refresh();
    expect($user->name)->toBe('Jane Smith');
    expect($user->phone)->toBe('+1234567890');
    expect($user->timezone)->toBe('America/New_York');
    expect($user->organization)->toBe('Acme Corp');
    expect($user->role)->toBe('Security Analyst');
    expect($user->onboarding_completed_at)->not->toBeNull();
});

test('missing timezone returns 422', function () {
    $user = User::factory()->create();

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->actingAs($user)
        ->postJson('/api/onboarding', [
            'name' => 'John Doe',
            'phone' => '+1234567890',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('timezone');
});

test('invalid timezone returns 422', function () {
    $user = User::factory()->create();

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->actingAs($user)
        ->postJson('/api/onboarding', [
            'name' => 'John Doe',
            'phone' => '+1234567890',
            'timezone' => 'Not/A/Timezone',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('timezone');
});

test('organization and role are optional', function () {
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
            'timezone' => 'UTC',
        ]);

    $response->assertOk();

    $user->refresh();
    expect($user->organization)->toBeNull();
    expect($user->role)->toBeNull();
});

test('organization exceeding 255 chars returns 422', function () {
    $user = User::factory()->create();

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->actingAs($user)
        ->postJson('/api/onboarding', [
            'name' => 'John Doe',
            'phone' => '+1234567890',
            'timezone' => 'UTC',
            'organization' => str_repeat('a', 256),
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('organization');
});

test('role exceeding 255 chars returns 422', function () {
    $user = User::factory()->create();

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->actingAs($user)
        ->postJson('/api/onboarding', [
            'name' => 'John Doe',
            'phone' => '+1234567890',
            'timezone' => 'UTC',
            'role' => str_repeat('a', 256),
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('role');
});
