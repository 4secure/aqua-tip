<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

class ThreatNewsService
{
    public function __construct(
        private readonly OpenCtiService $openCti,
    ) {}

    /**
     * List threat intelligence reports from OpenCTI.
     *
     * Returns paginated, normalized report data with optional text search,
     * confidence filter, and configurable sort order.
     * Results are cached for 5 minutes.
     *
     * @param  int          $first      Number of results per page
     * @param  string|null  $after      Cursor for next page
     * @param  string|null  $search     Full-text search term
     * @param  string|null  $confidence Filter by confidence level
     * @param  string       $orderBy    Sort field (default: published)
     * @param  string       $orderMode  Sort direction (default: desc)
     * @return array{items: array, pagination: array}
     *
     * @throws \App\Exceptions\OpenCtiConnectionException
     */
    public function list(
        int $first = 20,
        ?string $after = null,
        ?string $search = null,
        ?string $confidence = null,
        string $orderBy = 'published',
        string $orderMode = 'desc',
    ): array {
        $cacheKey = 'threat_news:' . md5(json_encode(func_get_args()));

        return Cache::remember(
            $cacheKey,
            now()->addMinutes(5),
            fn () => $this->executeQuery($first, $after, $search, $confidence, $orderBy, $orderMode),
        );
    }

    /**
     * Execute the GraphQL query against OpenCTI.
     */
    private function executeQuery(
        int $first,
        ?string $after,
        ?string $search,
        ?string $confidence,
        string $orderBy,
        string $orderMode,
    ): array {
        $graphql = <<<'GRAPHQL'
        query (
            $first: Int!,
            $after: ID,
            $search: String,
            $orderBy: ReportsOrdering,
            $orderMode: OrderingMode,
            $filters: FilterGroup
        ) {
            reports(
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
                        published
                        confidence
                        report_types
                        externalReferences {
                            edges {
                                node {
                                    source_name
                                    url
                                    description
                                }
                            }
                        }
                        objects(first: 20) {
                            edges {
                                node {
                                    ... on IntrusionSet {
                                        id
                                        entity_type
                                        name
                                    }
                                    ... on Malware {
                                        id
                                        entity_type
                                        name
                                    }
                                    ... on Indicator {
                                        id
                                        entity_type
                                        name
                                    }
                                    ... on ThreatActor {
                                        id
                                        entity_type
                                        name
                                    }
                                    ... on AttackPattern {
                                        id
                                        entity_type
                                        name
                                    }
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
            'orderBy' => $orderBy,
            'orderMode' => $orderMode,
        ];

        if ($confidence) {
            $variables['filters'] = [
                'mode' => 'and',
                'filters' => [
                    [
                        'key' => 'confidence',
                        'values' => [$confidence],
                        'operator' => 'eq',
                        'mode' => 'or',
                    ],
                ],
                'filterGroups' => [],
            ];
        }

        $data = $this->openCti->query($graphql, $variables);

        return $this->normalizeResponse($data);
    }

    /**
     * Normalize the GraphQL response into a frontend-friendly format.
     */
    private function normalizeResponse(array $data): array
    {
        $connection = $data['reports'];
        $edges = $connection['edges'] ?? [];
        $pageInfo = $connection['pageInfo'] ?? [];

        $items = array_map(function (array $edge) {
            $node = $edge['node'];

            return [
                'id' => $node['id'],
                'name' => $node['name'],
                'description' => $node['description'] ?? null,
                'published' => $node['published'] ?? null,
                'confidence' => $node['confidence'] ?? null,
                'report_types' => $node['report_types'] ?? [],
                'related_entities' => $this->flattenRelatedEntities(
                    $node['objects']['edges'] ?? [],
                ),
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
     * Flatten related entities from the objects connection.
     *
     * Filters out empty nodes (from unmatched inline fragments).
     */
    private function flattenRelatedEntities(array $edges): array
    {
        $entities = [];

        foreach ($edges as $edge) {
            $node = $edge['node'] ?? [];

            // Skip empty nodes (unmatched inline fragments return empty objects)
            if (empty($node['id'])) {
                continue;
            }

            $entities[] = [
                'id' => $node['id'],
                'entity_type' => $node['entity_type'] ?? null,
                'name' => $node['name'] ?? null,
            ];
        }

        return $entities;
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
