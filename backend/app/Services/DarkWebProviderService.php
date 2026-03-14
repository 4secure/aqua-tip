<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

class DarkWebProviderService
{
    /**
     * Search the dark web provider for breach data.
     *
     * @param string $query  Email or domain to search
     * @param string $type   'email' or 'domain'
     * @return array{found: int, results: array}
     *
     * @throws \Illuminate\Http\Client\RequestException
     * @throws ConnectionException
     */
    public function search(string $query, string $type): array
    {
        $baseUrl = config('services.dark_web.base_url');
        $apiKey = config('services.dark_web.api_key');

        $response = Http::withHeaders(['X-API-KEY' => $apiKey])
            ->timeout(15)
            ->retry(2, 500, fn (\Exception $e) => $e instanceof ConnectionException)
            ->get($baseUrl . '/export', [
                'q' => $query,
                'limit' => 1000,
            ]);

        $response->throw();

        $body = $response->json();

        return [
            'found' => $body['total_in_db'] ?? 0,
            'results' => $this->normalizeResults($body['results'] ?? []),
        ];
    }

    /**
     * Normalize raw provider results into a consistent format.
     */
    private function normalizeResults(array $items): array
    {
        return array_map(fn (array $item) => [
            'email' => $item['Email'] ?? null,
            'password' => $this->maskPassword($item['Password'] ?? null),
            'username' => $item['Username'] ?? null,
            'source' => $item['TLD'] ?? $item['URL'] ?? null,
            'url' => $item['URL'] ?? null,
            'breach_date' => null,
            'first_name' => $item['FirstName'] ?? null,
            'last_name' => $item['LastName'] ?? null,
            'phone' => $item['Phone'] ?? null,
            'fields' => [],
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
