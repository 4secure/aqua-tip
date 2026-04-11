<?php

use App\Exceptions\OpenCtiConnectionException;
use App\Exceptions\OpenCtiQueryException;
use App\Models\User;
use App\Services\OpenCtiService;
use App\Services\ThreatActorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;

uses(RefreshDatabase::class);

function createVerifiedUser(): User
{
    return User::factory()->create(['email_verified_at' => now()]);
}

test('enrichment controller returns generic message on OpenCtiQueryException', function () {
    $user = createVerifiedUser();

    $mock = Mockery::mock(ThreatActorService::class);
    $mock->shouldReceive('enrichment')
        ->once()
        ->andThrow(new OpenCtiQueryException('Internal OpenCTI URL: https://opencti.internal/graphql'));

    $this->app->instance(ThreatActorService::class, $mock);

    Log::spy();

    $response = $this->actingAs($user)
        ->getJson('/api/threat-actors/fake-id/enrichment');

    $response->assertStatus(502)
        ->assertJson(['message' => 'Service temporarily unavailable.']);

    // Ensure internal details are NOT leaked in response
    $body = $response->getContent();
    expect($body)->not->toContain('opencti.internal');
    expect($body)->not->toContain('Internal OpenCTI URL');

    Log::shouldHaveReceived('error')
        ->withArgs(fn ($msg, $ctx) => str_contains($msg, 'OpenCTI enrichment query failed')
            && $ctx['threat_actor_id'] === 'fake-id'
            && str_contains($ctx['exception'], 'opencti.internal'));
});

test('enrichment controller returns generic message on OpenCtiConnectionException', function () {
    $user = createVerifiedUser();

    $mock = Mockery::mock(ThreatActorService::class);
    $mock->shouldReceive('enrichment')
        ->once()
        ->andThrow(new OpenCtiConnectionException('Connection refused to https://opencti.internal'));

    $this->app->instance(ThreatActorService::class, $mock);

    Log::spy();

    $response = $this->actingAs($user)
        ->getJson('/api/threat-actors/fake-id/enrichment');

    $response->assertStatus(502)
        ->assertJson(['message' => 'Service temporarily unavailable.']);

    $body = $response->getContent();
    expect($body)->not->toContain('opencti.internal');
    expect($body)->not->toContain('Connection refused');

    Log::shouldHaveReceived('error')
        ->withArgs(fn ($msg, $ctx) => str_contains($msg, 'OpenCTI enrichment connection failed')
            && $ctx['threat_actor_id'] === 'fake-id'
            && str_contains($ctx['exception'], 'Connection refused'));
});

test('health controller returns generic message on OpenCtiConnectionException', function () {
    $user = createVerifiedUser();

    $mock = Mockery::mock(OpenCtiService::class);
    $mock->shouldReceive('healthCheck')
        ->once()
        ->andThrow(new OpenCtiConnectionException('Connection refused to https://opencti.internal'));

    $this->app->instance(OpenCtiService::class, $mock);

    Log::spy();

    $response = $this->actingAs($user)
        ->getJson('/api/opencti/health');

    $response->assertStatus(503)
        ->assertJson([
            'status' => 'error',
            'message' => 'Service temporarily unavailable.',
        ]);

    $body = $response->getContent();
    expect($body)->not->toContain('opencti.internal');
    expect($body)->not->toContain('Connection refused');

    Log::shouldHaveReceived('error')
        ->withArgs(fn ($msg, $ctx) => str_contains($msg, 'OpenCTI health check failed')
            && str_contains($ctx['exception'], 'Connection refused'));
});

test('health controller returns generic message on OpenCtiQueryException', function () {
    $user = createVerifiedUser();

    $mock = Mockery::mock(OpenCtiService::class);
    $mock->shouldReceive('healthCheck')
        ->once()
        ->andThrow(new OpenCtiQueryException('GraphQL parse error at https://opencti.internal/graphql'));

    $this->app->instance(OpenCtiService::class, $mock);

    Log::spy();

    $response = $this->actingAs($user)
        ->getJson('/api/opencti/health');

    $response->assertStatus(503)
        ->assertJson([
            'status' => 'error',
            'message' => 'Service temporarily unavailable.',
        ]);

    $body = $response->getContent();
    expect($body)->not->toContain('opencti.internal');
    expect($body)->not->toContain('GraphQL parse error');
});

test('Log::error is called with exception context on enrichment failure', function () {
    $user = createVerifiedUser();

    $mock = Mockery::mock(ThreatActorService::class);
    $mock->shouldReceive('enrichment')
        ->once()
        ->andThrow(new OpenCtiQueryException('Detailed internal error message'));

    $this->app->instance(ThreatActorService::class, $mock);

    Log::spy();

    $this->actingAs($user)
        ->getJson('/api/threat-actors/test-id/enrichment');

    Log::shouldHaveReceived('error')
        ->withArgs(function ($message, $context) {
            return str_contains($message, 'OpenCTI enrichment query failed')
                && isset($context['threat_actor_id'])
                && $context['threat_actor_id'] === 'test-id'
                && isset($context['exception'])
                && str_contains($context['exception'], 'Detailed internal error message')
                && isset($context['trace']);
        });
});
