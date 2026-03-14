<?php

namespace Tests\Feature\OpenCti;

use App\Exceptions\OpenCtiConnectionException;
use App\Exceptions\OpenCtiQueryException;
use App\Services\OpenCtiService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class OpenCtiServiceTest extends TestCase
{
    private OpenCtiService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new OpenCtiService();
    }

    public function test_query_throws_connection_exception_when_url_is_empty(): void
    {
        config(['services.opencti.url' => '']);
        config(['services.opencti.token' => 'some-token']);

        $this->expectException(OpenCtiConnectionException::class);
        $this->expectExceptionMessage('OpenCTI credentials not configured');

        $this->service->query('{ about { version } }');
    }

    public function test_query_throws_connection_exception_when_token_is_empty(): void
    {
        config(['services.opencti.url' => 'http://localhost:8080']);
        config(['services.opencti.token' => '']);

        $this->expectException(OpenCtiConnectionException::class);
        $this->expectExceptionMessage('OpenCTI credentials not configured');

        $this->service->query('{ about { version } }');
    }

    public function test_query_sends_post_to_graphql_with_bearer_token_and_returns_data(): void
    {
        config(['services.opencti.url' => 'http://opencti.local']);
        config(['services.opencti.token' => 'test-token-123']);

        Http::fake([
            'opencti.local/graphql' => Http::response([
                'data' => ['about' => ['version' => '6.4.3']],
            ]),
        ]);

        $result = $this->service->query('{ about { version } }');

        $this->assertEquals(['about' => ['version' => '6.4.3']], $result);

        Http::assertSent(function ($request) {
            return $request->url() === 'http://opencti.local/graphql'
                && $request->method() === 'POST'
                && $request->hasHeader('Authorization', 'Bearer test-token-123');
        });
    }

    public function test_query_throws_query_exception_when_response_contains_graphql_errors(): void
    {
        config(['services.opencti.url' => 'http://opencti.local']);
        config(['services.opencti.token' => 'test-token-123']);

        Http::fake([
            'opencti.local/graphql' => Http::response([
                'errors' => [
                    ['message' => 'Unknown field "nonexistent"'],
                ],
            ]),
        ]);

        $this->expectException(OpenCtiQueryException::class);
        $this->expectExceptionMessage('Unknown field "nonexistent"');

        $this->service->query('{ nonexistent { id } }');
    }

    public function test_query_throws_connection_exception_on_http_failure(): void
    {
        config(['services.opencti.url' => 'http://opencti.local']);
        config(['services.opencti.token' => 'test-token-123']);

        Http::fake([
            'opencti.local/graphql' => function () {
                throw new ConnectionException('Connection refused');
            },
        ]);

        $this->expectException(OpenCtiConnectionException::class);

        $this->service->query('{ about { version } }');
    }

    public function test_health_check_returns_status_and_version(): void
    {
        config(['services.opencti.url' => 'http://opencti.local']);
        config(['services.opencti.token' => 'test-token-123']);

        Http::fake([
            'opencti.local/graphql' => Http::response([
                'data' => ['about' => ['version' => '6.4.3']],
            ]),
        ]);

        $result = $this->service->healthCheck();

        $this->assertEquals('ok', $result['status']);
        $this->assertEquals('6.4.3', $result['version']);
    }

    public function test_query_includes_correct_authorization_header_format(): void
    {
        config(['services.opencti.url' => 'http://opencti.local']);
        config(['services.opencti.token' => 'my-bearer-token']);

        Http::fake([
            'opencti.local/graphql' => Http::response([
                'data' => ['stixCoreObjects' => []],
            ]),
        ]);

        $this->service->query('{ stixCoreObjects { edges { node { id } } } }');

        Http::assertSent(function ($request) {
            $authHeader = $request->header('Authorization');
            return $authHeader[0] === 'Bearer my-bearer-token';
        });
    }

    public function test_query_sends_variables_in_request_body(): void
    {
        config(['services.opencti.url' => 'http://opencti.local']);
        config(['services.opencti.token' => 'test-token']);

        Http::fake([
            'opencti.local/graphql' => Http::response([
                'data' => ['stixCoreObject' => ['id' => 'abc-123']],
            ]),
        ]);

        $this->service->query(
            'query($id: String!) { stixCoreObject(id: $id) { id } }',
            ['id' => 'abc-123']
        );

        Http::assertSent(function ($request) {
            $body = $request->data();
            return isset($body['query']) && isset($body['variables']['id']);
        });
    }
}
