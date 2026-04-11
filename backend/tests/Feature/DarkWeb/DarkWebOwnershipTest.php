<?php

use App\Models\DarkWebTask;
use App\Models\User;
use App\Services\DarkWebProviderService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function createOwner(): User
{
    return User::factory()->create(['email_verified_at' => now()]);
}

function createNonOwner(): User
{
    return User::factory()->create(['email_verified_at' => now()]);
}

function mockCheckStatusSuccess(): void
{
    $mock = Mockery::mock(DarkWebProviderService::class);
    $mock->shouldReceive('checkStatus')
        ->andReturn([
            'status' => 'SUCCESS',
            'found' => 1,
            'results' => [
                [
                    'title' => null,
                    'source' => 'example.com',
                    'identity' => 'user@example.com',
                    'credential' => 'sec***',
                    'context' => null,
                ],
            ],
        ]);

    app()->instance(DarkWebProviderService::class, $mock);
}

test('task owner can access dark web task status and gets 200', function () {
    mockCheckStatusSuccess();

    $owner = createOwner();
    $taskId = 'task-abc-123';

    DarkWebTask::create([
        'user_id' => $owner->id,
        'task_id' => $taskId,
    ]);

    $response = $this->actingAs($owner)
        ->getJson("/api/dark-web/status/{$taskId}");

    $response->assertStatus(200)
        ->assertJsonStructure([
            'status',
            'data' => ['found', 'results'],
        ]);
});

test('non-owner of dark web task gets 403 Forbidden', function () {
    $owner = createOwner();
    $nonOwner = createNonOwner();
    $taskId = 'task-abc-456';

    DarkWebTask::create([
        'user_id' => $owner->id,
        'task_id' => $taskId,
    ]);

    $response = $this->actingAs($nonOwner)
        ->getJson("/api/dark-web/status/{$taskId}");

    $response->assertStatus(403)
        ->assertJson(['message' => 'Forbidden.']);
});

test('unknown task_id returns 403 not 404', function () {
    $user = createOwner();

    $response = $this->actingAs($user)
        ->getJson('/api/dark-web/status/nonexistent-task-999');

    $response->assertStatus(403)
        ->assertJson(['message' => 'Forbidden.']);
});

test('unauthenticated user cannot access dark web task status', function () {
    $response = $this->getJson('/api/dark-web/status/any-task-id');

    $response->assertStatus(401);
});
