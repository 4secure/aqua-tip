<?php

namespace App\Services;

use App\Exceptions\OpenCtiConnectionException;
use App\Exceptions\OpenCtiQueryException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;

class OpenCtiService
{
    /**
     * Execute a GraphQL query against the OpenCTI API.
     *
     * @param  string  $graphql    The GraphQL query string
     * @param  array   $variables  Optional variables for the query
     * @return array               The 'data' key from the GraphQL response
     *
     * @throws OpenCtiConnectionException  On missing config, network, or timeout errors
     * @throws OpenCtiQueryException       On GraphQL-level errors in the response
     */
    public function query(string $graphql, array $variables = []): array
    {
        $baseUrl = config('services.opencti.url');
        $token = config('services.opencti.token');

        if (empty($baseUrl) || empty($token)) {
            throw new OpenCtiConnectionException('OpenCTI credentials not configured');
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $token,
            ])
                ->timeout(15)
                ->retry(2, 500, fn (\Exception $e) => $e instanceof ConnectionException)
                ->post($baseUrl . '/graphql', [
                    'query' => $graphql,
                    'variables' => $variables,
                ]);

            $response->throw();
        } catch (ConnectionException $e) {
            throw new OpenCtiConnectionException(
                'OpenCTI connection failed: ' . $e->getMessage(),
                $e->getCode(),
                $e
            );
        } catch (RequestException $e) {
            throw new OpenCtiConnectionException(
                'OpenCTI request failed: ' . $e->getMessage(),
                $e->getCode(),
                $e
            );
        }

        $body = $response->json();

        if (! empty($body['errors'])) {
            $firstError = $body['errors'][0]['message'] ?? 'Unknown GraphQL error';
            throw new OpenCtiQueryException($firstError);
        }

        return $body['data'] ?? [];
    }

    /**
     * Check OpenCTI API connectivity and return version info.
     *
     * @return array{status: string, version: string}
     *
     * @throws OpenCtiConnectionException
     * @throws OpenCtiQueryException
     */
    public function healthCheck(): array
    {
        $data = $this->query('{ about { version } }');

        return [
            'status' => 'ok',
            'version' => $data['about']['version'] ?? 'unknown',
        ];
    }
}
