<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

class ThreatActorService
{
    public function __construct(
        private readonly OpenCtiService $openCti,
    ) {}

    /**
     * List threat actors (intrusion sets) from OpenCTI.
     *
     * Returns paginated, normalized intrusion set data with optional
     * text search and structured filters for motivation/sophistication.
     * Results are cached for 15 minutes.
     *
     * @param  int          $first          Number of results per page
     * @param  string|null  $after          Cursor for next page
     * @param  string|null  $search         Full-text search term
     * @param  string|null  $motivation     Filter by primary_motivation
     * @param  string|null  $sophistication Filter by sophistication level
     * @return array{items: array, pagination: array}
     *
     * @throws \App\Exceptions\OpenCtiConnectionException
     */
    public function list(
        int $first = 20,
        ?string $after = null,
        ?string $search = null,
        ?string $motivation = null,
        ?string $sophistication = null,
    ): array {
        $cacheKey = 'threat_actors:' . md5(json_encode(func_get_args()));

        return Cache::remember(
            $cacheKey,
            now()->addMinutes(15),
            fn () => $this->executeQuery($first, $after, $search, $motivation, $sophistication),
        );
    }

    /**
     * Execute the GraphQL query against OpenCTI.
     */
    private function executeQuery(
        int $first,
        ?string $after,
        ?string $search,
        ?string $motivation,
        ?string $sophistication,
    ): array {
        $graphql = <<<'GRAPHQL'
        query (
            $first: Int!,
            $after: ID,
            $search: String,
            $orderBy: IntrusionSetsOrdering,
            $orderMode: OrderingMode,
            $filters: FilterGroup
        ) {
            intrusionSets(
                first: $first
                after: $after
                search: $search
                orderBy: $orderBy
                orderMode: $orderMode
                filters: $filters
            ) {
                edges {
                    node {
                        id
                        name
                        description
                        aliases
                        primary_motivation
                        resource_level
                        sophistication
                        goals
                        externalReferences {
                            edges {
                                node {
                                    source_name
                                    url
                                    description
                                }
                            }
                        }
                    }
                }
                pageInfo {
                    hasNextPage
                    hasPreviousPage
                    startCursor
                    endCursor
                    globalCount
                }
            }
        }
        GRAPHQL;

        $variables = [
            'first' => $first,
            'after' => $after,
            'search' => $search ?: null,
            'orderBy' => 'name',
            'orderMode' => 'asc',
        ];

        if ($motivation || $sophistication) {
            $filters = ['mode' => 'and', 'filters' => [], 'filterGroups' => []];

            if ($motivation) {
                $filters['filters'][] = [
                    'key' => 'primary_motivation',
                    'values' => [$motivation],
                    'operator' => 'eq',
                    'mode' => 'or',
                ];
            }

            if ($sophistication) {
                $filters['filters'][] = [
                    'key' => 'sophistication',
                    'values' => [$sophistication],
                    'operator' => 'eq',
                    'mode' => 'or',
                ];
            }

            $variables['filters'] = $filters;
        }

        $data = $this->openCti->query($graphql, $variables);

        return $this->normalizeResponse($data);
    }

    /**
     * Normalize the GraphQL response into a frontend-friendly format.
     */
    private function normalizeResponse(array $data): array
    {
        $connection = $data['intrusionSets'];
        $edges = $connection['edges'] ?? [];
        $pageInfo = $connection['pageInfo'] ?? [];

        $items = array_map(function (array $edge) {
            $node = $edge['node'];

            return [
                'id' => $node['id'],
                'name' => $node['name'],
                'description' => $node['description'] ?? null,
                'aliases' => $node['aliases'] ?? [],
                'motivation' => $node['primary_motivation'] ?? null,
                'resource_level' => $node['resource_level'] ?? null,
                'sophistication' => $node['sophistication'] ?? null,
                'goals' => $node['goals'] ?? [],
                'external_references' => $this->flattenExternalReferences(
                    $node['externalReferences']['edges'] ?? [],
                ),
            ];
        }, $edges);

        return [
            'items' => $items,
            'pagination' => [
                'has_next' => $pageInfo['hasNextPage'] ?? false,
                'has_previous' => $pageInfo['hasPreviousPage'] ?? false,
                'start_cursor' => $pageInfo['startCursor'] ?? null,
                'end_cursor' => $pageInfo['endCursor'] ?? null,
                'total' => $pageInfo['globalCount'] ?? null,
            ],
        ];
    }

    /**
     * Flatten external references edges into a simple array.
     */
    private function flattenExternalReferences(array $edges): array
    {
        return array_map(
            fn (array $edge) => [
                'source_name' => $edge['node']['source_name'] ?? null,
                'url' => $edge['node']['url'] ?? null,
                'description' => $edge['node']['description'] ?? null,
            ],
            $edges,
        );
    }
}
