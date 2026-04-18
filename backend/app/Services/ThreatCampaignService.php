<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

/**
 * Standalone OpenCTI Campaigns service.
 *
 * PITFALL-09 / D-01: This class is deliberately STANDALONE — no
 * inheritance, no cross-imports from the IntrusionSet analog. Campaign
 * STIX fields differ (first_seen, last_seen, objective) and must never
 * bleed across the two surfaces. See 60-RESEARCH.md Pitfall 9 + D-08
 * for the forbidden-field list enforced by SC4.
 *
 * Wave 1 implementation — see:
 *   .planning/phases/60-backend-campaigns-service-endpoint/60-03-PLAN.md
 *   .planning/phases/60-backend-campaigns-service-endpoint/60-02-GRAPHIQL-NOTES.md (D-12)
 */
class ThreatCampaignService
{
    public function __construct(
        private readonly OpenCtiService $openCti,
    ) {}

    /**
     * List campaigns from OpenCTI.
     *
     * Returns paginated, normalized Campaign data with optional
     * full-text search. Results are cached for 15 minutes under the
     * `threat_campaigns:` namespace (Pitfall 4 — must not collide
     * with the `threat_actors:` namespace owned by the IntrusionSet
     * analog in this same directory).
     *
     * Signature intentionally drops the trailing nullable-string
     * parameter that exists on the IntrusionSet analog's list() —
     * Campaign SDO has no such field (D-02, D-08).
     *
     * @param  int          $first      Number of results per page
     * @param  string|null  $after      Cursor for next page
     * @param  string|null  $search     Full-text search term
     * @param  string       $orderBy    CampaignsOrdering enum member
     * @param  string       $orderMode  OrderingMode (asc|desc)
     * @return array{items: array, pagination: array}
     *
     * @throws \App\Exceptions\OpenCtiConnectionException
     */
    public function list(
        int $first = 24,
        ?string $after = null,
        ?string $search = null,
        string $orderBy = 'modified',
        string $orderMode = 'desc',
    ): array {
        $cacheKey = 'threat_campaigns:' . md5(json_encode(func_get_args()));

        return Cache::remember(
            $cacheKey,
            now()->addMinutes(15),
            fn () => $this->executeQuery($first, $after, $search, $orderBy, $orderMode),
        );
    }

    /**
     * Execute the GraphQL campaigns query against OpenCTI.
     */
    private function executeQuery(
        int $first,
        ?string $after,
        ?string $search,
        string $orderBy,
        string $orderMode,
    ): array {
        // D-12: Query shape verified against OpenCTI GraphiQL
        // Endpoint: http://192.168.251.20:8080/graphql (introspection) +
        //           http://14.192.146.4:9731/graphql (query execution cross-check)
        // Date: 2026-04-18 — see .planning/phases/60-backend-campaigns-service-endpoint/60-02-GRAPHIQL-NOTES.md
        //
        // Verified schema facts:
        //   - CampaignsOrdering enum includes: modified, first_seen, last_seen, created, name (among others)
        //   - campaigns(first, after, search, orderBy: CampaignsOrdering, orderMode, filters) root query
        //   - objective is a direct String scalar on Campaign (NOT x_opencti_objective)
        //   - stixCoreRelationships(relationship_type: "attributed-to", toTypes: ["Intrusion-Set"])
        //     on a Campaign node resolves edge.node.to as a UNION → use "... on IntrusionSet { id name }"
        //   - confidence intentionally omitted (Claude's Discretion / Open Question 1)
        //   - Forbidden fields (enforced by SC4): see 60-RESEARCH.md Pitfall 9 + D-08
        $graphql = <<<'GRAPHQL'
        query (
            $first: Int!,
            $after: ID,
            $search: String,
            $orderBy: CampaignsOrdering,
            $orderMode: OrderingMode,
            $filters: FilterGroup
        ) {
            campaigns(
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
                        first_seen
                        last_seen
                        objective
                        aliases
                        modified
                        created
                        objectLabel {
                            edges {
                                node {
                                    id
                                    value
                                    color
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
                        attributed_to: stixCoreRelationships(
                            relationship_type: "attributed-to"
                            toTypes: ["Intrusion-Set"]
                            first: 10
                        ) {
                            edges {
                                node {
                                    to {
                                        ... on IntrusionSet {
                                            id
                                            name
                                        }
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

        $data = $this->openCti->query($graphql, $variables);

        return $this->normalizeResponse($data);
    }

    /**
     * Normalize the GraphQL response into a frontend-friendly format.
     *
     * D-19 item shape: 12 keys per campaign (id, name, description,
     * objective, aliases, first_seen, last_seen, modified, created,
     * labels, external_references, attributed_to). Pagination mirrors
     * the IntrusionSet analog's 5-key contract because Phase 65 shares
     * pagination helpers across both surfaces.
     */
    private function normalizeResponse(array $data): array
    {
        $connection = $data['campaigns'] ?? [];
        $edges = $connection['edges'] ?? [];
        $pageInfo = $connection['pageInfo'] ?? [];

        $items = array_map(function (array $edge) {
            $node = $edge['node'];

            return [
                'id' => $node['id'],
                'name' => $node['name'],
                'description' => $node['description'] ?? null,
                'objective' => $node['objective'] ?? null,
                'aliases' => $node['aliases'] ?? [],
                'first_seen' => $node['first_seen'] ?? null,
                'last_seen' => $node['last_seen'] ?? null,
                'modified' => $node['modified'] ?? null,
                'created' => $node['created'] ?? null,
                'labels' => $this->flattenLabels($node['objectLabel']['edges'] ?? []),
                'external_references' => $this->flattenExternalReferences(
                    $node['externalReferences']['edges'] ?? [],
                ),
                'attributed_to' => $this->flattenAttributedTo(
                    $node['attributed_to']['edges'] ?? [],
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
     * Flatten attributed-to edges into a deduped list of {id, name}.
     *
     * D-10 inverse direction: reads `$edge['node']['to']` because the
     * query is anchored on the Campaign side (toTypes: ["Intrusion-Set"]).
     * This is the inverse of the IntrusionSet analog's campaign-relationship
     * normalizer, which reads `node.from` because it queries from the
     * IntrusionSet side. See 60-PATTERNS.md Pattern A4 for the contrast.
     *
     * D-20 dedupe: OpenCTI may emit multiple relationship edges pointing
     * at the same IntrusionSet — we collapse by id.
     *
     * D-11 empty-array contract: zero edges returns `[]`, NOT `null`.
     * Phase 65 CAMP-05 renders no chip in that case.
     */
    private function flattenAttributedTo(array $edges): array
    {
        $seen = [];
        $out = [];

        foreach ($edges as $edge) {
            $to = $edge['node']['to'] ?? null;

            if (! is_array($to) || empty($to['id'])) {
                continue;
            }

            if (isset($seen[$to['id']])) {
                continue;
            }

            $seen[$to['id']] = true;
            $out[] = [
                'id' => $to['id'],
                'name' => $to['name'] ?? null,
            ];
        }

        return $out;
    }

    /**
     * Flatten objectLabel edges into a list of {id, value, color}.
     */
    private function flattenLabels(array $edges): array
    {
        return array_map(
            fn (array $edge) => [
                'id' => $edge['node']['id'] ?? null,
                'value' => $edge['node']['value'] ?? null,
                'color' => $edge['node']['color'] ?? null,
            ],
            $edges,
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
