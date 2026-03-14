<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class IpSearchService
{
    public function __construct(
        private readonly OpenCtiService $openCti,
    ) {}

    /**
     * Search for threat intelligence data about an IP address.
     *
     * Queries OpenCTI for observable data, relationships, indicators,
     * sightings, and notes. Falls back to ip-api.com for geolocation.
     * Results are cached for 15 minutes.
     *
     * @param  string  $ip  The IP address to search
     * @return array        Normalized threat intelligence response
     *
     * @throws \App\Exceptions\OpenCtiConnectionException
     * @throws \App\Exceptions\OpenCtiQueryException
     */
    public function search(string $ip): array
    {
        return Cache::remember(
            'ip_search:' . md5($ip),
            now()->addMinutes(15),
            fn () => $this->executeSearch($ip),
        );
    }

    /**
     * Execute the actual search (called inside cache closure).
     */
    private function executeSearch(string $ip): array
    {
        $observable = null;
        $found = false;
        $observableId = null;

        try {
            $observable = $this->queryObservable($ip);
            $found = $observable !== null;
            $observableId = $observable['id'] ?? null;
        } catch (\App\Exceptions\OpenCtiConnectionException $e) {
            // Connection failure must propagate to controller for credit refund
            throw $e;
        } catch (\App\Exceptions\OpenCtiQueryException) {
            // Query format error — continue with geo-only results
        }

        $geo = $this->fetchGeoFromIpApi($ip);

        $relationships = [];
        $indicators = [];
        $sightings = [];
        $notes = [];
        $externalReferences = [];

        if ($found && $observableId) {
            try { $relationships = $this->queryRelationships($observableId); } catch (\App\Exceptions\OpenCtiQueryException) {}
            try { $indicators = $this->queryIndicators($observableId); } catch (\App\Exceptions\OpenCtiQueryException) {}
            // Also extract indicators found in relationships (e.g. based-on)
            $indicators = $this->mergeRelationshipIndicators($indicators, $relationships, $observableId);
            try { $sightings = $this->querySightings($observableId); } catch (\App\Exceptions\OpenCtiQueryException) {}
            try { $notes = $this->queryNotes($observableId); } catch (\App\Exceptions\OpenCtiQueryException) {}
            $externalReferences = $this->extractExternalReferences($observable);
        }

        return $this->buildResponse(
            ip: $ip,
            found: $found,
            observable: $observable,
            geo: $geo,
            relationships: $relationships,
            indicators: $indicators,
            sightings: $sightings,
            notes: $notes,
            externalReferences: $externalReferences,
        );
    }

    /**
     * Query OpenCTI for a STIX Cyber Observable matching the IP.
     */
    private function queryObservable(string $ip): ?array
    {
        $graphql = <<<'GRAPHQL'
        query ($filters: FilterGroup) {
            stixCyberObservables(filters: $filters, first: 1) {
                edges {
                    node {
                        id
                        entity_type
                        observable_value
                        x_opencti_score
                        x_opencti_description
                        created_at
                        updated_at
                        objectLabel {
                            id
                            value
                            color
                        }
                        createdBy {
                            ... on Identity {
                                name
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
            }
        }
        GRAPHQL;

        $variables = [
            'filters' => [
                'mode' => 'and',
                'filters' => [
                    [
                        'key' => 'value',
                        'values' => [$ip],
                        'operator' => 'eq',
                        'mode' => 'or',
                    ],
                    [
                        'key' => 'entity_type',
                        'values' => ['IPv4-Addr', 'IPv6-Addr'],
                        'operator' => 'eq',
                        'mode' => 'or',
                    ],
                ],
                'filterGroups' => [],
            ],
        ];

        $data = $this->openCti->query($graphql, $variables);

        $edges = $data['stixCyberObservables']['edges'] ?? [];

        return $edges[0]['node'] ?? null;
    }

    /**
     * Query STIX core relationships involving the observable.
     */
    private function queryRelationships(string $observableId): array
    {
        $graphql = <<<'GRAPHQL'
        query ($filters: FilterGroup) {
            stixCoreRelationships(filters: $filters, first: 50) {
                edges {
                    node {
                        id
                        relationship_type
                        confidence
                        start_time
                        stop_time
                        from {
                            ... on StixCyberObservable { id entity_type observable_value }
                            ... on ThreatActor { id entity_type name }
                            ... on Malware { id entity_type name }
                            ... on IntrusionSet { id entity_type name }
                            ... on AttackPattern { id entity_type name }
                            ... on Indicator { id entity_type name pattern pattern_type x_opencti_score }
                            ... on Identity { id entity_type name }
                        }
                        to {
                            ... on StixCyberObservable { id entity_type observable_value }
                            ... on ThreatActor { id entity_type name }
                            ... on Malware { id entity_type name }
                            ... on IntrusionSet { id entity_type name }
                            ... on AttackPattern { id entity_type name }
                            ... on Indicator { id entity_type name pattern pattern_type x_opencti_score }
                            ... on Identity { id entity_type name }
                        }
                    }
                }
            }
        }
        GRAPHQL;

        $variables = [
            'filters' => [
                'mode' => 'or',
                'filters' => [
                    ['key' => 'fromId', 'values' => [$observableId], 'operator' => 'eq', 'mode' => 'or'],
                    ['key' => 'toId', 'values' => [$observableId], 'operator' => 'eq', 'mode' => 'or'],
                ],
                'filterGroups' => [],
            ],
        ];

        $data = $this->openCti->query($graphql, $variables);

        return array_map(
            fn (array $rel) => $this->normalizeRelationshipNames($rel),
            $this->flattenEdges($data['stixCoreRelationships']['edges'] ?? []),
        );
    }

    /**
     * Query indicators associated with the observable.
     */
    private function queryIndicators(string $observableId): array
    {
        $graphql = <<<'GRAPHQL'
        query ($filters: FilterGroup) {
            indicators(filters: $filters, first: 50) {
                edges {
                    node {
                        id
                        name
                        pattern
                        pattern_type
                        valid_from
                        valid_until
                        x_opencti_score
                        objectLabel {
                            id
                            value
                            color
                        }
                    }
                }
            }
        }
        GRAPHQL;

        $variables = [
            'filters' => [
                'mode' => 'and',
                'filters' => [
                    ['key' => 'indicates', 'values' => [$observableId], 'operator' => 'eq', 'mode' => 'or'],
                ],
                'filterGroups' => [],
            ],
        ];

        $data = $this->openCti->query($graphql, $variables);

        return array_map(
            fn (array $ind) => $this->normalizeIndicator($ind),
            $this->flattenEdges($data['indicators']['edges'] ?? []),
        );
    }

    /**
     * Query sighting relationships involving the observable.
     */
    private function querySightings(string $observableId): array
    {
        $graphql = <<<'GRAPHQL'
        query ($filters: FilterGroup) {
            stixSightingRelationships(filters: $filters, first: 50) {
                edges {
                    node {
                        id
                        first_seen
                        last_seen
                        attribute_count
                        confidence
                        from {
                            ... on StixCyberObservable { id entity_type observable_value }
                            ... on Indicator { id entity_type name pattern pattern_type x_opencti_score }
                        }
                        to {
                            ... on Identity { id entity_type name }
                            ... on StixCyberObservable { id entity_type observable_value }
                        }
                    }
                }
            }
        }
        GRAPHQL;

        $variables = [
            'filters' => [
                'mode' => 'or',
                'filters' => [
                    ['key' => 'fromId', 'values' => [$observableId], 'operator' => 'eq', 'mode' => 'or'],
                    ['key' => 'toId', 'values' => [$observableId], 'operator' => 'eq', 'mode' => 'or'],
                ],
                'filterGroups' => [],
            ],
        ];

        $data = $this->openCti->query($graphql, $variables);

        return array_map(
            fn (array $s) => $this->normalizeSighting($s),
            $this->flattenEdges($data['stixSightingRelationships']['edges'] ?? []),
        );
    }

    /**
     * Query notes associated with the observable.
     */
    private function queryNotes(string $observableId): array
    {
        $graphql = <<<'GRAPHQL'
        query ($filters: FilterGroup) {
            notes(filters: $filters, first: 50) {
                edges {
                    node {
                        id
                        content
                        created
                        attribute_abstract
                        objectLabel {
                            id
                            value
                            color
                        }
                    }
                }
            }
        }
        GRAPHQL;

        $variables = [
            'filters' => [
                'mode' => 'and',
                'filters' => [
                    ['key' => 'objectContains', 'values' => [$observableId], 'operator' => 'eq', 'mode' => 'or'],
                ],
                'filterGroups' => [],
            ],
        ];

        $data = $this->openCti->query($graphql, $variables);

        return array_map(
            fn (array $note) => $this->normalizeNote($note),
            $this->flattenEdges($data['notes']['edges'] ?? []),
        );
    }

    /**
     * Fetch geolocation data from ip-api.com as fallback.
     */
    private function fetchGeoFromIpApi(string $ip): ?array
    {
        try {
            $response = Http::timeout(5)
                ->get("http://ip-api.com/json/{$ip}", [
                    'fields' => 'status,message,country,countryCode,city,regionName,lat,lon,isp,org,as,asname',
                ]);

            if (! $response->successful()) {
                return null;
            }

            $body = $response->json();

            if (($body['status'] ?? '') !== 'success') {
                return null;
            }

            return [
                'country' => $body['country'] ?? null,
                'country_code' => $body['countryCode'] ?? null,
                'city' => $body['city'] ?? null,
                'region' => $body['regionName'] ?? null,
                'lat' => $body['lat'] ?? null,
                'lon' => $body['lon'] ?? null,
                'isp' => $body['isp'] ?? null,
                'org' => $body['org'] ?? null,
                'as' => $body['as'] ?? null,
                'asname' => $body['asname'] ?? null,
            ];
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Extract external references from an observable node.
     */
    private function extractExternalReferences(?array $observable): array
    {
        if ($observable === null) {
            return [];
        }

        $edges = $observable['externalReferences']['edges'] ?? [];

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
     * Build the unified response array.
     */
    private function buildResponse(
        string $ip,
        bool $found,
        ?array $observable,
        ?array $geo,
        array $relationships,
        array $indicators,
        array $sightings,
        array $notes,
        array $externalReferences,
    ): array {
        return [
            'ip' => $ip,
            'found' => $found,
            'score' => $observable['x_opencti_score'] ?? null,
            'labels' => $observable['objectLabel'] ?? [],
            'description' => $observable['x_opencti_description'] ?? null,
            'created_by' => $observable['createdBy']['name'] ?? null,
            'created_at' => $observable['created_at'] ?? null,
            'updated_at' => $observable['updated_at'] ?? null,
            'geo' => $geo,
            'relationships' => $relationships,
            'indicators' => $indicators,
            'sightings' => $sightings,
            'notes' => $notes,
            'external_references' => $externalReferences,
            'raw' => $observable,
        ];
    }

    /**
     * Extract Indicator entities from relationships and merge with queried indicators.
     */
    private function mergeRelationshipIndicators(array $indicators, array $relationships, string $observableId): array
    {
        $existingIds = array_column($indicators, 'id');

        foreach ($relationships as $rel) {
            foreach (['from', 'to'] as $direction) {
                $entity = $rel[$direction] ?? null;
                if (! $entity || ($entity['entity_type'] ?? '') !== 'Indicator') {
                    continue;
                }
                if (in_array($entity['id'], $existingIds, true)) {
                    continue;
                }
                $indicators[] = $this->normalizeIndicator([
                    'id' => $entity['id'],
                    'name' => $entity['name'] ?? null,
                    'pattern' => $entity['pattern'] ?? null,
                    'pattern_type' => $entity['pattern_type'] ?? null,
                    'x_opencti_score' => $entity['x_opencti_score'] ?? null,
                    'valid_from' => null,
                    'valid_until' => null,
                    'objectLabel' => [],
                ]);
                $existingIds[] = $entity['id'];
            }
        }

        return $indicators;
    }

    /**
     * Normalize relationship from/to nodes so observable_value becomes name.
     */
    private function normalizeRelationshipNames(array $rel): array
    {
        foreach (['from', 'to'] as $direction) {
            if (isset($rel[$direction]['observable_value'])) {
                $rel[$direction]['name'] = $rel[$direction]['observable_value'];
                unset($rel[$direction]['observable_value']);
            }
        }

        return $rel;
    }

    /**
     * Normalize indicator fields for frontend consumption.
     */
    private function normalizeIndicator(array $ind): array
    {
        $ind['score'] = $ind['x_opencti_score'] ?? null;
        unset($ind['x_opencti_score']);
        $ind['labels'] = $ind['objectLabel'] ?? [];
        unset($ind['objectLabel']);

        return $ind;
    }

    /**
     * Normalize sighting fields for frontend consumption.
     */
    private function normalizeSighting(array $s): array
    {
        $s['count'] = $s['attribute_count'] ?? null;
        unset($s['attribute_count']);
        foreach (['from', 'to'] as $direction) {
            if (isset($s[$direction]['observable_value'])) {
                $s[$direction]['name'] = $s[$direction]['observable_value'];
                unset($s[$direction]['observable_value']);
            }
        }

        return $s;
    }

    /**
     * Normalize note fields for frontend consumption.
     */
    private function normalizeNote(array $note): array
    {
        $note['abstract'] = $note['attribute_abstract'] ?? null;
        unset($note['attribute_abstract']);
        $note['labels'] = $note['objectLabel'] ?? [];
        unset($note['objectLabel']);

        return $note;
    }

    /**
     * Flatten GraphQL edges/nodes into a flat array of nodes.
     */
    private function flattenEdges(array $edges): array
    {
        return array_map(
            fn (array $edge) => $edge['node'],
            $edges,
        );
    }
}
