<?php

namespace Tests\Feature\OpenCti;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class OpenCtiHealthTest extends TestCase
{
    use RefreshDatabase;
    public function test_health_endpoint_returns_401_without_auth(): void
    {
        $response = $this->getJson('/api/opencti/health');

        $response->assertStatus(401);
    }

    public function test_health_endpoint_returns_200_when_opencti_reachable(): void
    {
        config(['services.opencti.url' => 'http://opencti.local']);
        config(['services.opencti.token' => 'test-token']);

        Http::fake([
            'opencti.local/graphql' => Http::response([
                'data' => ['about' => ['version' => '6.4.3']],
            ]),
        ]);

        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/opencti/health');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'ok',
                'version' => '6.4.3',
            ]);
    }

    public function test_health_endpoint_returns_503_when_opencti_unreachable(): void
    {
        config(['services.opencti.url' => '']);
        config(['services.opencti.token' => '']);

        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/opencti/health');

        $response->assertStatus(503)
            ->assertJson([
                'status' => 'error',
            ])
            ->assertJsonStructure(['status', 'message']);
    }

    public function test_artisan_health_command_outputs_success(): void
    {
        config(['services.opencti.url' => 'http://opencti.local']);
        config(['services.opencti.token' => 'test-token']);

        Http::fake([
            'opencti.local/graphql' => Http::response([
                'data' => ['about' => ['version' => '6.4.3']],
            ]),
        ]);

        $this->artisan('opencti:health')
            ->expectsOutputToContain('OpenCTI is reachable')
            ->expectsOutputToContain('6.4.3')
            ->assertExitCode(0);
    }

    public function test_artisan_health_command_outputs_error_on_failure(): void
    {
        config(['services.opencti.url' => '']);
        config(['services.opencti.token' => '']);

        $this->artisan('opencti:health')
            ->expectsOutputToContain('OpenCTI is not reachable')
            ->assertExitCode(1);
    }
}
