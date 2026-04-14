<?php

namespace App\Services;

use App\Exceptions\OpenCtiConnectionException;
use Illuminate\Support\Facades\Cache;

class DashboardService
{
    public function __construct(
        private readonly OpenCtiService $openCti,
    ) {}

    /**
     * Get observable counts by entity type (IPv4-Addr, Domain-Name, Hostname, X509-Certificate, Email-Addr, Cryptocurrency-Wallet, Url).
     *
     * Uses 5-min cache with stale-cache fallback when OpenCTI is unreachable.
     *
     * @return array<int, array{entity_type: string, label: string, count: int}>
     *
     * @throws OpenCtiConnectionException When OpenCTI is unreachable and no cached data exists
     */
    public function getCounts(): array
    {
        $cacheKey = 'dashboard_counts';
        $cached = Cache::get($cacheKey);

        try {
            $fresh = $this->fetchCounts();
            Cache::put($cacheKey, $fresh, now()->addMinutes(5));

            return $fresh;
        } catch (OpenCtiConnectionException $e) {
            if ($cached !== null) {
                return $cached;
            }

            throw $e;
        }
    }

    /**
     * Get 10 most recent observables with value, type, score, and timestamp.
     *
     * Uses 5-min cache with stale-cache fallback when OpenCTI is unreachable.
     *
     * @return array<int, array{id: string, value: string, entity_type: string, score: int|null, created_at: string, labels: array<int, string>}>
     *
     * @throws OpenCtiConnectionException When OpenCTI is unreachable and no cached data exists
     */
    public function getIndicators(?string $label = null): array
    {
        $cacheKey = $label ? "dashboard_indicators_label_{$label}" : 'dashboard_indicators';
        $cached = Cache::get($cacheKey);

        try {
            $fresh = $this->fetchIndicators($label);
            Cache::put($cacheKey, $fresh, now()->addMinutes(5));

            return $fresh;
        } catch (OpenCtiConnectionException $e) {
            if ($cached !== null) {
                return $cached;
            }

            throw $e;
        }
    }

    /**
     * Get top 6 label distribution from recent observables.
     *
     * Uses 5-min cache with stale-cache fallback when OpenCTI is unreachable.
     *
     * @return array<int, array{label: string, count: int}>
     *
     * @throws OpenCtiConnectionException When OpenCTI is unreachable and no cached data exists
     */
    public function getCategories(): array
    {
        $cacheKey = 'dashboard_categories';
        $cached = Cache::get($cacheKey);

        try {
            $fresh = $this->fetchCategories();
            Cache::put($cacheKey, $fresh, now()->addMinutes(5));

            return $fresh;
        } catch (OpenCtiConnectionException $e) {
            if ($cached !== null) {
                return $cached;
            }

            throw $e;
        }
    }

    /**
     * Fetch entity type counts from OpenCTI via 7 sequential GraphQL queries.
     *
     * @return array<int, array{entity_type: string, label: string, count: int}>
     */
    private function fetchCounts(): array
    {
        $entityTypes = [
            'IPv4-Addr' => 'IP Addresses',
            'Domain-Name' => 'Domains',
            'Hostname' => 'Hostnames',
            'X509-Certificate' => 'Certificates',
            'Email-Addr' => 'Email',
            'Cryptocurrency-Wallet' => 'Crypto Wallet',
            'Url' => 'URL',
        ];

        $graphql = <<<'GRAPHQL'
        query ($filters: FilterGroup) {
            stixCyberObservables(filters: $filters, first: 1) {
                pageInfo {
                    globalCount
                }
            }
        }
        GRAPHQL;

        $results = [];

        foreach ($entityTypes as $entityType => $label) {
            $variables = [
                'filters' => [
                    'mode' => 'and',
                    'filters' => [
                        [
                            'key' => 'entity_type',
                            'values' => [$entityType],
                            'operator' => 'eq',
                            'mode' => 'or',
                        ],
                    ],
                    'filterGroups' => [],
                ],
            ];

            $data = $this->openCti->query($graphql, $variables);
            $count = $data['stixCyberObservables']['pageInfo']['globalCount'] ?? 0;

            $results[] = [
                'entity_type' => $entityType,
                'label' => $label,
                'count' => $count,
            ];
        }

        return $results;
    }

    /**
     * Fetch 10 most recent observables from OpenCTI.
     *
     * @return array<int, array{id: string, value: string, entity_type: string, score: int|null, created_at: string, labels: array<int, string>}>
     */
    private function fetchIndicators(?string $label = null): array
    {
        $graphql = <<<'GRAPHQL'
        query ($filters: FilterGroup) {
            stixCyberObservables(first: 10, orderBy: created_at, orderMode: desc, filters: $filters) {
                edges {
                    node {
                        id
                        entity_type
                        observable_value
                        x_opencti_score
                        created_at
                        objectLabel {
                            value
                        }
                    }
                }
            }
        }
        GRAPHQL;

        $variables = [];

        if ($label !== null) {
            $variables = [
                'filters' => [
                    'mode' => 'and',
                    'filters' => [
                        [
                            'key' => 'objectLabel',
                            'values' => [$label],
                            'operator' => 'eq',
                            'mode' => 'or',
                        ],
                    ],
                    'filterGroups' => [],
                ],
            ];
        }

        $data = $this->openCti->query($graphql, $variables);
        $edges = $data['stixCyberObservables']['edges'] ?? [];

        return array_map(fn (array $edge) => [
            'id' => $edge['node']['id'],
            'value' => $edge['node']['observable_value'],
            'entity_type' => $edge['node']['entity_type'],
            'score' => $edge['node']['x_opencti_score'] ?? null,
            'created_at' => $edge['node']['created_at'],
            'labels' => array_map(
                fn (array $label) => $label['value'],
                $edge['node']['objectLabel'] ?? [],
            ),
        ], $edges);
    }

    /**
     * Fetch 500 recent observables and aggregate label distribution (top 6).
     *
     * @return array<int, array{label: string, count: int}>
     */
    private function fetchCategories(): array
    {
        $graphql = <<<'GRAPHQL'
        {
            stixCyberObservables(first: 500, orderBy: created_at, orderMode: desc) {
                edges {
                    node {
                        objectLabel {
                            value
                        }
                    }
                }
            }
        }
        GRAPHQL;

        $data = $this->openCti->query($graphql);
        $edges = $data['stixCyberObservables']['edges'] ?? [];

        $labelCounts = [];

        foreach ($edges as $edge) {
            foreach ($edge['node']['objectLabel'] ?? [] as $label) {
                $name = $label['value'] ?? '';

                if ($name !== '') {
                    $labelCounts[$name] = ($labelCounts[$name] ?? 0) + 1;
                }
            }
        }

        arsort($labelCounts);
        $top6 = array_slice($labelCounts, 0, 6, true);

        return array_map(
            fn (string $name, int $count) => ['label' => $name, 'count' => $count],
            array_keys($top6),
            array_values($top6),
        );
    }
}
