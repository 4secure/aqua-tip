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
     * text search and structured filters for motivation.
     * Results are cached for 15 minutes.
     *
     * @param  int          $first          Number of results per page
     * @param  string|null  $after          Cursor for next page
     * @param  string|null  $search         Full-text search term
     * @param  string|null  $motivation     Filter by primary_motivation
     * @return array{items: array, pagination: array}
     *
     * @throws \App\Exceptions\OpenCtiConnectionException
     */
    public function list(
        int $first = 21,
        ?string $after = null,
        ?string $search = null,
        ?string $motivation = null,
    ): array {
        $cacheKey = 'threat_actors:' . md5(json_encode(func_get_args()));

        return Cache::remember(
            $cacheKey,
            now()->addMinutes(15),
            fn () => $this->executeQuery($first, $after, $search, $motivation),
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
                        modified
                        goals
                        targetedCountries: stixCoreRelationships(
                            relationship_type: "targets"
                            toTypes: ["Country"]
                            first: 20
                        ) {
                            edges {
                                node {
                                    to {
                                        ... on Country {
                                            id
                                            name
                                        }
                                    }
                                }
                            }
                        }
                        targetedSectors: stixCoreRelationships(
                            relationship_type: "targets"
                            toTypes: ["Sector"]
                            first: 20
                        ) {
                            edges {
                                node {
                                    to {
                                        ... on Sector {
                                            id
                                            name
                                        }
                                    }
                                }
                            }
                        }
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

        if ($motivation) {
            $variables['filters'] = [
                'mode' => 'and',
                'filters' => [
                    [
                        'key' => 'primary_motivation',
                        'values' => [$motivation],
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
                'modified' => $node['modified'] ?? null,
                'goals' => $node['goals'] ?? [],
                'targeted_countries' => $this->flattenRelationshipTargets(
                    $node['targetedCountries']['edges'] ?? [],
                ),
                'targeted_sectors' => $this->flattenRelationshipTargets(
                    $node['targetedSectors']['edges'] ?? [],
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
     * Flatten relationship target edges (countries, sectors) into name arrays.
     */
    private function flattenRelationshipTargets(array $edges): array
    {
        return array_values(array_unique(array_filter(array_map(
            fn (array $edge) => $edge['node']['to']['name'] ?? null,
            $edges,
        ))));
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
