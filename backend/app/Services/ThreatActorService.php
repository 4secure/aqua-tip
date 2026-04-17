<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

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
        int $first = 24,
        ?string $after = null,
        ?string $search = null,
        ?string $motivation = null,
        string $orderBy = 'modified',
        string $orderMode = 'desc',
    ): array {
        $cacheKey = 'threat_actors:' . md5(json_encode(func_get_args()));

        return Cache::remember(
            $cacheKey,
            now()->addMinutes(15),
            fn () => $this->executeQuery($first, $after, $search, $motivation, $orderBy, $orderMode),
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
        string $orderBy,
        string $orderMode,
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
            'orderBy' => $orderBy,
            'orderMode' => $orderMode,
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

    /**
     * Get enrichment data for a single threat actor (intrusion set).
     *
     * Returns TTPs grouped by MITRE ATT&CK tactic, tools, malware,
     * campaigns, and general relationships. Cached for 15 minutes.
     *
     * @param  string  $id  The OpenCTI intrusion set ID
     * @return array{ttps: array, tools: array, malware: array, campaigns: array, relationships: array}
     *
     * @throws \App\Exceptions\OpenCtiConnectionException
     */
    public function enrichment(string $id): array
    {
        $cacheKey = 'threat_actor_enrichment:' . $id;

        return Cache::remember(
            $cacheKey,
            now()->addMinutes(15),
            fn () => $this->executeEnrichmentQuery($id),
        );
    }

    /**
     * Execute the enrichment GraphQL query against OpenCTI.
     */
    private function executeEnrichmentQuery(string $id): array
    {
        $graphql = <<<'GRAPHQL'
        query ($id: String!) {
          intrusionSet(id: $id) {
            attackPatterns: stixCoreRelationships(
              relationship_type: "uses"
              toTypes: ["Attack-Pattern"]
              first: 100
            ) {
              edges {
                node {
                  to {
                    ... on AttackPattern {
                      id
                      name
                      x_mitre_id
                      killChainPhases {
                        kill_chain_name
                        phase_name
                        x_opencti_order
                      }
                    }
                  }
                }
              }
            }
            tools: stixCoreRelationships(
              relationship_type: "uses"
              toTypes: ["Tool"]
              first: 50
            ) {
              edges {
                node {
                  to {
                    ... on Tool {
                      id
                      name
                    }
                  }
                }
              }
            }
            malware: stixCoreRelationships(
              relationship_type: "uses"
              toTypes: ["Malware"]
              first: 50
            ) {
              edges {
                node {
                  to {
                    ... on Malware {
                      id
                      name
                    }
                  }
                }
              }
            }
            campaigns: stixCoreRelationships(
              relationship_type: "attributed-to"
              fromTypes: ["Campaign"]
              first: 50
            ) {
              edges {
                node {
                  from {
                    ... on Campaign {
                      id
                      name
                      first_seen
                      last_seen
                    }
                  }
                }
              }
            }
            # VICTM-09 / D-06 - Consolidated victimology sub-query. PITFALL-13: MUST stay a
            # single stixCoreRelationships block with toTypes: ["Country","Region","Sector","Identity"] -
            # do NOT split into 4 aliased blocks (causes N+1 enrichment timeout against OpenCTI).
            #
            # D-08 - Verified against OpenCTI GraphiQL at http://192.168.251.20:8080/graphql.
            # toTypes: ["Identity"] resolves to concrete types Organization | Individual | System -
            # filter in PHP normalizer by entity_type === 'Organization' (PITFALL-12). The
            # Country.x_opencti_aliases field carries ISO-2 codes inconsistently - extractIsoCode()
            # picks the first 2-char uppercase-alpha entry (Pitfall 2).
            #
            # first: 200 is generous; historical actors have <50 combined targets.
            victimology: stixCoreRelationships(
              relationship_type: "targets"
              toTypes: ["Country", "Region", "Sector", "Identity"]
              first: 200
            ) {
              edges {
                node {
                  to {
                    ... on BasicObject {
                      id
                      entity_type
                    }
                    ... on Country {
                      name
                      x_opencti_aliases
                    }
                    ... on Region {
                      name
                    }
                    ... on Sector {
                      name
                    }
                    ... on Organization {
                      name
                    }
                  }
                }
              }
            }
            allRelationships: stixCoreRelationships(first: 100) {
              edges {
                node {
                  id
                  relationship_type
                  from {
                    ... on BasicObject {
                      id
                      entity_type
                    }
                    ... on ThreatActor {
                      name
                    }
                    ... on IntrusionSet {
                      name
                    }
                    ... on Campaign {
                      name
                    }
                    ... on Malware {
                      name
                    }
                    ... on Tool {
                      name
                    }
                    ... on AttackPattern {
                      name
                    }
                    ... on Identity {
                      name
                    }
                    ... on Location {
                      name
                    }
                    ... on Country {
                      name
                    }
                    ... on Vulnerability {
                      name
                    }
                  }
                  to {
                    ... on BasicObject {
                      id
                      entity_type
                    }
                    ... on ThreatActor {
                      name
                    }
                    ... on IntrusionSet {
                      name
                    }
                    ... on Campaign {
                      name
                    }
                    ... on Malware {
                      name
                    }
                    ... on Tool {
                      name
                    }
                    ... on AttackPattern {
                      name
                    }
                    ... on Identity {
                      name
                    }
                    ... on Location {
                      name
                    }
                    ... on Country {
                      name
                    }
                    ... on Vulnerability {
                      name
                    }
                  }
                }
              }
            }
          }
        }
        GRAPHQL;

        $data = $this->openCti->query($graphql, ['id' => $id]);

        return $this->normalizeEnrichmentResponse($data, $id);
    }

    /**
     * Normalize enrichment GraphQL response into structured arrays.
     *
     * TTPs are grouped by MITRE ATT&CK tactic in kill chain order.
     */
    private function normalizeEnrichmentResponse(array $data, string $actorId): array
    {
        $intrusionSet = $data['intrusionSet'] ?? [];

        return [
            'ttps' => $this->normalizeTtps($intrusionSet['attackPatterns']['edges'] ?? []),
            'tools' => $this->normalizeTools($intrusionSet['tools']['edges'] ?? []),
            'malware' => $this->normalizeMalware($intrusionSet['malware']['edges'] ?? []),
            'campaigns' => $this->normalizeCampaigns($intrusionSet['campaigns']['edges'] ?? []),
            'victimology' => $this->safeNormalizeVictimology(
                $intrusionSet['victimology']['edges'] ?? [],
                $actorId,
            ),
            'relationships' => $this->normalizeRelationships($intrusionSet['allRelationships']['edges'] ?? []),
        ];
    }

    /**
     * Normalize attack patterns into tactic-grouped TTPs.
     *
     * Groups techniques by MITRE ATT&CK tactic (phase_name) in kill chain order.
     * Techniques without a mitre-attack kill chain phase go into 'other'.
     */
    private function normalizeTtps(array $edges): array
    {
        $tacticOrder = [
            'reconnaissance',
            'resource-development',
            'initial-access',
            'execution',
            'persistence',
            'privilege-escalation',
            'defense-evasion',
            'credential-access',
            'discovery',
            'lateral-movement',
            'collection',
            'command-and-control',
            'exfiltration',
            'impact',
        ];

        $tacticLabels = [
            'reconnaissance' => 'Reconnaissance',
            'resource-development' => 'Resource Development',
            'initial-access' => 'Initial Access',
            'execution' => 'Execution',
            'persistence' => 'Persistence',
            'privilege-escalation' => 'Privilege Escalation',
            'defense-evasion' => 'Defense Evasion',
            'credential-access' => 'Credential Access',
            'discovery' => 'Discovery',
            'lateral-movement' => 'Lateral Movement',
            'collection' => 'Collection',
            'command-and-control' => 'Command and Control',
            'exfiltration' => 'Exfiltration',
            'impact' => 'Impact',
        ];

        $grouped = [];

        foreach ($edges as $edge) {
            $pattern = $edge['node']['to'] ?? [];
            if (empty($pattern['id'])) {
                continue;
            }

            $technique = [
                'id' => $pattern['id'],
                'name' => $pattern['name'] ?? null,
                'mitre_id' => $pattern['x_mitre_id'] ?? null,
            ];

            $killChainPhases = $pattern['killChainPhases'] ?? [];
            $mitrePhases = array_filter(
                $killChainPhases,
                fn ($phase) => ($phase['kill_chain_name'] ?? '') === 'mitre-attack',
            );

            if (empty($mitrePhases)) {
                $grouped['other'][] = $technique;
            } else {
                foreach ($mitrePhases as $phase) {
                    $tactic = $phase['phase_name'] ?? 'other';
                    $grouped[$tactic][] = $technique;
                }
            }
        }

        $result = [];
        foreach ($tacticOrder as $tactic) {
            if (isset($grouped[$tactic])) {
                $result[] = [
                    'tactic' => $tactic,
                    'tactic_label' => $tacticLabels[$tactic] ?? ucfirst(str_replace('-', ' ', $tactic)),
                    'techniques' => $grouped[$tactic],
                ];
                unset($grouped[$tactic]);
            }
        }

        // Append 'other' and any unknown tactics last
        foreach ($grouped as $tactic => $techniques) {
            $result[] = [
                'tactic' => $tactic,
                'tactic_label' => $tactic === 'other'
                    ? 'Other'
                    : ucfirst(str_replace('-', ' ', $tactic)),
                'techniques' => $techniques,
            ];
        }

        return $result;
    }

    /**
     * Normalize tool relationship edges.
     */
    private function normalizeTools(array $edges): array
    {
        return array_values(array_filter(array_map(function (array $edge) {
            $tool = $edge['node']['to'] ?? [];

            return empty($tool['id']) ? null : [
                'id' => $tool['id'],
                'name' => $tool['name'] ?? null,
                'type' => 'tool',
            ];
        }, $edges)));
    }

    /**
     * Normalize malware relationship edges.
     */
    private function normalizeMalware(array $edges): array
    {
        return array_values(array_filter(array_map(function (array $edge) {
            $malware = $edge['node']['to'] ?? [];

            return empty($malware['id']) ? null : [
                'id' => $malware['id'],
                'name' => $malware['name'] ?? null,
                'type' => 'malware',
            ];
        }, $edges)));
    }

    /**
     * Normalize campaign relationship edges.
     *
     * Campaigns use fromTypes direction (Campaign --attributed-to--> IntrusionSet),
     * so we extract from 'from' not 'to'.
     */
    private function normalizeCampaigns(array $edges): array
    {
        return array_values(array_filter(array_map(function (array $edge) {
            $campaign = $edge['node']['from'] ?? [];

            return empty($campaign['id']) ? null : [
                'id' => $campaign['id'],
                'name' => $campaign['name'] ?? null,
                'first_seen' => $campaign['first_seen'] ?? null,
                'last_seen' => $campaign['last_seen'] ?? null,
            ];
        }, $edges)));
    }

    /**
     * Normalize general relationship edges into flat objects.
     */
    private function normalizeRelationships(array $edges): array
    {
        return array_map(function (array $edge) {
            $rel = $edge['node'];

            return [
                'id' => $rel['id'],
                'relationship_type' => $rel['relationship_type'] ?? null,
                'from' => $this->normalizeRelationshipEntity($rel['from'] ?? []),
                'to' => $this->normalizeRelationshipEntity($rel['to'] ?? []),
            ];
        }, $edges);
    }

    /**
     * Normalize a relationship entity (from/to) with name fallback.
     */
    private function normalizeRelationshipEntity(array $entity): array
    {
        $name = $entity['name']
            ?? $entity['observable_value']
            ?? $entity['entity_type']
            ?? null;

        return [
            'id' => $entity['id'] ?? null,
            'entity_type' => $entity['entity_type'] ?? null,
            'name' => $name,
        ];
    }

    /**
     * Safe wrapper around normalizeVictimology per D-10.
     *
     * Parse-level failures (malformed edges, unexpected shape) are logged via
     * Log::warning and degrade to empty arrays so the rest of the enrichment
     * payload (ttps/tools/malware/campaigns/relationships) keeps serving.
     *
     * NOTE on caching: Laravel's Cache::remember does NOT cache closures that
     * throw, so a genuine OpenCTI failure (OpenCtiQueryException) bubbles to
     * the controller and produces a 502 - never poisoning the cache with a
     * phantom empty payload. A parse-level fallback DOES cache for 15 min,
     * which is acceptable because it represents "this actor currently has no
     * parseable victimology" - re-fetch on natural TTL expiry.
     */
    private function safeNormalizeVictimology(array $edges, string $actorId): array
    {
        try {
            return $this->normalizeVictimology($edges);
        } catch (\Throwable $e) {
            Log::warning('Victimology sub-query failed', [
                'actor_id' => $actorId,
                'error' => $e->getMessage(),
            ]);

            return ['countries' => [], 'regions' => [], 'sectors' => [], 'organizations' => []];
        }
    }

    /**
     * Normalize consolidated victimology edges into 4 buckets per D-07 + D-09.
     *
     * PITFALL-12: toTypes: ["Identity"] returns Organization | Individual | System.
     * Filter strictly on entity_type === 'Organization' - Individuals and Systems
     * are NOT victim entities and must not leak into the organizations bucket.
     *
     * D-13: dedupe by id per bucket - OpenCTI may return overlapping edges when
     * the same Country/Sector has multiple "targets" relationships with the actor.
     */
    private function normalizeVictimology(array $edges): array
    {
        $buckets = [
            'countries' => [],
            'regions' => [],
            'sectors' => [],
            'organizations' => [],
        ];

        foreach ($edges as $edge) {
            $node = $edge['node']['to'] ?? null;

            if (!is_array($node) || empty($node['id']) || empty($node['entity_type'])) {
                continue;
            }

            $base = [
                'id' => $node['id'],
                'name' => $node['name'] ?? null,
            ];

            match ($node['entity_type']) {
                'Country' => $buckets['countries'][] = $base + [
                    'country_code' => $this->extractIsoCode($node['x_opencti_aliases'] ?? []),
                ],
                'Region' => $buckets['regions'][] = $base,
                'Sector' => $buckets['sectors'][] = $base,
                'Organization' => $buckets['organizations'][] = $base,
                default => null, // SKIP Individual / System / any other Identity sub-type (PITFALL-12)
            };
        }

        // D-13: dedupe by id per bucket, preserving first-seen order.
        foreach ($buckets as $key => $items) {
            $seen = [];
            $buckets[$key] = array_values(array_filter($items, function (array $item) use (&$seen) {
                if (isset($seen[$item['id']])) {
                    return false;
                }
                $seen[$item['id']] = true;
                return true;
            }));
        }

        return $buckets;
    }

    /**
     * Extract an ISO-2 country code from OpenCTI Country.x_opencti_aliases per Pitfall 2.
     *
     * The field is a flexible [String] - some connectors populate it with ISO-2
     * codes (["US", "USA"]), others with alternate names. We pick the first
     * 2-char uppercase-alpha entry and return null when none matches.
     *
     * Phase 64 VICTM-03 treats `country_code: null` as "show the name, omit the
     * flag" - never throw from here.
     */
    private function extractIsoCode(array $aliases): ?string
    {
        foreach ($aliases as $alias) {
            if (is_string($alias) && preg_match('/^[A-Z]{2}$/', $alias)) {
                return $alias;
            }
        }

        return null;
    }
}
