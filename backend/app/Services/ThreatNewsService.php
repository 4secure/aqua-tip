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
     * confidence filter, label filter, and configurable sort order.
     * Results are cached for 5 minutes.
     *
     * @param  int          $first      Number of results per page
     * @param  string|null  $after      Cursor for next page
     * @param  string|null  $search     Full-text search term
     * @param  string|null  $confidence Filter by confidence level
     * @param  string|null  $labelId    Filter by label ID
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
        ?string $labelId = null,
        string $orderBy = 'published',
        string $orderMode = 'desc',
    ): array {
        $cacheKey = 'threat_news:' . md5(json_encode(func_get_args()));

        return Cache::remember(
            $cacheKey,
            now()->addMinutes(5),
            fn () => $this->executeQuery($first, $after, $search, $confidence, $labelId, $orderBy, $orderMode),
        );
    }

    /**
     * List all available report labels from OpenCTI.
     *
     * Results are cached for 15 minutes.
     *
     * @return array<int, array{id: string|null, value: string|null, color: string|null}>
     *
     * @throws \App\Exceptions\OpenCtiConnectionException
     */
    public function labels(): array
    {
        return Cache::remember(
            'threat_news:labels',
            now()->addMinutes(15),
            fn () => $this->executeLabelsQuery(),
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
        ?string $labelId,
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
                        objectLabel {
                            id
                            value
                            color
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

        $filterItems = [];

        if ($confidence) {
            $filterItems[] = [
                'key' => 'confidence',
                'values' => [$confidence],
                'operator' => 'eq',
                'mode' => 'or',
            ];
        }

        if ($labelId) {
            $filterItems[] = [
                'key' => 'objectLabel',
                'values' => [$labelId],
                'operator' => 'eq',
                'mode' => 'or',
            ];
        }

        if (!empty($filterItems)) {
            $variables['filters'] = [
                'mode' => 'and',
                'filters' => $filterItems,
                'filterGroups' => [],
            ];
        }

        $data = $this->openCti->query($graphql, $variables);

        return $this->normalizeResponse($data);
    }

    /**
     * Fetch all labels from OpenCTI.
     */
    private function executeLabelsQuery(): array
    {
        $graphql = <<<'GRAPHQL'
        query ($first: Int!) {
          labels(first: $first, orderBy: value, orderMode: asc) {
            edges {
              node {
                id
                value
                color
              }
            }
          }
        }
        GRAPHQL;

        $data = $this->openCti->query($graphql, ['first' => 500]);

        return array_map(
            fn (array $edge) => [
                'id' => $edge['node']['id'] ?? null,
                'value' => $edge['node']['value'] ?? null,
                'color' => $edge['node']['color'] ?? null,
            ],
            $data['labels']['edges'] ?? [],
        );
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
                'labels' => $this->flattenLabels(
                    $node['objectLabel'] ?? [],
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
     * Flatten label edges into a simple array.
     */
    private function flattenLabels(array $labels): array
    {
        return array_map(
            fn (array $label) => [
                'id' => $label['id'] ?? null,
                'value' => $label['value'] ?? null,
                'color' => $label['color'] ?? null,
            ],
            $labels,
        );
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
