<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('authenticated user can update profile', function () {
    $user = User::factory()->create([
        'name' => 'Old Name',
        'phone' => '+1111111111',
        'timezone' => 'UTC',
        'oauth_provider' => 'google',
    ]);

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->actingAs($user)
        ->putJson('/api/profile', [
            'name' => 'New Name',
            'phone' => '+9876543210',
            'timezone' => 'Asia/Manila',
            'organization' => 'Acme Corp',
            'role' => 'Analyst',
        ]);

    $response->assertOk()
        ->assertJsonPath('data.name', 'New Name')
        ->assertJsonPath('data.phone', '+9876543210')
        ->assertJsonPath('data.timezone', 'Asia/Manila')
        ->assertJsonPath('data.organization', 'Acme Corp')
        ->assertJsonPath('data.role', 'Analyst');

    $response->assertJsonStructure(['data' => ['oauth_provider', 'created_at']]);
});

test('profile update returns updated user resource with plan', function () {
    $plan = \App\Models\Plan::create([
        'slug' => 'basic',
        'name' => 'Basic',
        'daily_credit_limit' => 50,
        'price_cents' => 999,
        'features' => ['feature1'],
        'sort_order' => 1,
    ]);

    $user = User::factory()->create([
        'plan_id' => $plan->id,
    ]);

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->actingAs($user)
        ->putJson('/api/profile', [
            'name' => 'Plan User',
            'phone' => '+1234567890',
            'timezone' => 'UTC',
        ]);

    $response->assertOk()
        ->assertJsonPath('data.name', 'Plan User')
        ->assertJsonPath('data.plan.slug', 'basic')
        ->assertJsonPath('data.plan.name', 'Basic');
});

test('missing name returns 422', function () {
    $user = User::factory()->create();

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->actingAs($user)
        ->putJson('/api/profile', [
            'phone' => '+1234567890',
            'timezone' => 'UTC',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('name');
});

test('short name returns 422', function () {
    $user = User::factory()->create();

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->actingAs($user)
        ->putJson('/api/profile', [
            'name' => 'A',
            'phone' => '+1234567890',
            'timezone' => 'UTC',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('name');
});

test('missing phone returns 422', function () {
    $user = User::factory()->create();

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->actingAs($user)
        ->putJson('/api/profile', [
            'name' => 'John Doe',
            'timezone' => 'UTC',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('phone');
});

test('invalid timezone returns 422', function () {
    $user = User::factory()->create();

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->actingAs($user)
        ->putJson('/api/profile', [
            'name' => 'John Doe',
            'phone' => '+1234567890',
            'timezone' => 'Not/A/Zone',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('timezone');
});

test('unauthenticated user gets 401', function () {
    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->putJson('/api/profile', [
            'name' => 'John Doe',
            'phone' => '+1234567890',
            'timezone' => 'UTC',
        ]);

    $response->assertStatus(401);
});

test('nullable fields can be omitted', function () {
    $user = User::factory()->create([
        'organization' => 'Old Org',
        'role' => 'Old Role',
    ]);

    $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->actingAs($user)
        ->putJson('/api/profile', [
            'name' => 'John Doe',
            'phone' => '+1234567890',
            'timezone' => 'UTC',
        ]);

    $response->assertOk()
        ->assertJsonPath('data.organization', null)
        ->assertJsonPath('data.role', null);

    $user->refresh();
    expect($user->organization)->toBeNull();
    expect($user->role)->toBeNull();
});
