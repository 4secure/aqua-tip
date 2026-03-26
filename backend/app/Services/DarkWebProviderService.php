<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class DarkWebProviderService
{
    private string $baseUrl;
    private string $apiKey;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.dark_web.base_url'), '/');
        $this->apiKey = config('services.dark_web.api_key') ?? '';
    }

    /**
     * Submit a search to LeaksCheck and return the task_id.
     *
     * @param string $query  Email or domain to search
     * @return string  The task_id for polling
     *
     * @throws RuntimeException
     * @throws ConnectionException
     */
    public function startSearch(string $query): string
    {
        $response = Http::timeout(15)
            ->retry(2, 500, fn (\Exception $e) => $e instanceof ConnectionException)
            ->post($this->baseUrl . '/search', [
                'api_key' => $this->apiKey,
                'query' => $query,
                'type' => 'general',
            ]);

        $response->throw();

        $body = $response->json();

        if (empty($body['task_id'])) {
            throw new RuntimeException(
                'LeaksCheck did not return a task_id: ' . ($body['message'] ?? 'Unknown error')
            );
        }

        return $body['task_id'];
    }

    /**
     * Poll the status of a previously submitted search task.
     *
     * @param string $taskId
     * @return array{status: string, found: int, results: array}
     *
     * @throws RuntimeException
     * @throws ConnectionException
     */
    public function checkStatus(string $taskId): array
    {
        $response = Http::timeout(15)
            ->retry(2, 500, fn (\Exception $e) => $e instanceof ConnectionException)
            ->get($this->baseUrl . '/status/' . $taskId, [
                'api_key' => $this->apiKey,
            ]);

        $response->throw();

        $body = $response->json();

        $status = $body['status'] ?? $body['state'] ?? 'UNKNOWN';

        if ($status === 'SUCCESS' || $status === 'PROCESSING') {
            $rawResults = $body['result'] ?? [];
            return [
                'status' => $status,
                'found' => is_array($rawResults) ? count($rawResults) : 0,
                'results' => $this->normalizeResults(is_array($rawResults) ? $rawResults : []),
            ];
        }

        if ($status === 'PENDING') {
            return [
                'status' => 'PENDING',
                'found' => 0,
                'results' => [],
            ];
        }

        // Any other status is treated as an error
        throw new RuntimeException(
            'LeaksCheck search failed with status: ' . $status
            . ($body['message'] ?? '')
        );
    }

    /**
     * Synchronous convenience: submit + poll until SUCCESS or timeout.
     * Kept for backward-compatibility if needed.
     *
     * @param string $query
     * @param string $type  (unused with LeaksCheck, kept for interface compat)
     * @return array{found: int, results: array}
     */
    public function search(string $query, string $type): array
    {
        $taskId = $this->startSearch($query);

        $maxAttempts = 12; // 12 * 4s = 48s max
        $attempt = 0;

        while ($attempt < $maxAttempts) {
            sleep(4);
            $attempt++;

            $result = $this->checkStatus($taskId);

            if ($result['status'] === 'SUCCESS') {
                return [
                    'found' => $result['found'],
                    'results' => $result['results'],
                ];
            }
        }

        throw new RuntimeException('LeaksCheck search timed out after ' . ($maxAttempts * 4) . ' seconds.');
    }

    /**
     * Normalize raw LeaksCheck results into a consistent format.
     */
    private function normalizeResults(array $items): array
    {
        return array_map(fn (array $item) => [
            'email' => $item['email'] ?? $item['Email'] ?? null,
            'password' => $this->maskPassword($item['password'] ?? $item['Password'] ?? null),
            'username' => $item['username'] ?? $item['Username'] ?? null,
            'source' => $item['source'] ?? $item['TLD'] ?? $item['URL'] ?? null,
            'url' => $item['url'] ?? $item['URL'] ?? null,
            'breach_date' => $item['breach_date'] ?? $item['date'] ?? null,
            'first_name' => $item['first_name'] ?? $item['FirstName'] ?? null,
            'last_name' => $item['last_name'] ?? $item['LastName'] ?? null,
            'phone' => $item['phone'] ?? $item['Phone'] ?? null,
            'fields' => $item['fields'] ?? [],
        ], $items);
    }

    /**
     * Mask a password, showing only the first 2-3 characters.
     */
    private function maskPassword(?string $password): ?string
    {
        if ($password === null || $password === '') {
            return null;
        }

        $visibleLength = min(3, strlen($password));
        $maskedLength = max(0, strlen($password) - $visibleLength);

        return substr($password, 0, $visibleLength) . str_repeat('*', $maskedLength);
    }
}
