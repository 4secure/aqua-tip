<?php

namespace App\Services;

use App\Data\CountryCentroids;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class ThreatMapService
{
    /**
     * Attack type labels mapped to color categories.
     * Red: C2/DDoS/Malware, Amber: Scanning/BEC, Violet: Phishing/APT, Cyan: Recon.
     */
    private const TYPE_COLORS = [
        'command-and-control' => 'red',
        'c2' => 'red',
        'ddos' => 'red',
        'malware' => 'red',
        'scanning' => 'amber',
        'business-email-compromise' => 'amber',
        'bec' => 'amber',
        'phishing' => 'violet',
        'apt' => 'violet',
        'reconnaissance' => 'cyan',
        'recon' => 'cyan',
    ];

    /**
     * Entity type to attack type name mapping (fallback when no labels).
     */
    private const ENTITY_TYPE_MAP = [
        'Malware' => 'Malware',
        'Attack-Pattern' => 'Attack Pattern',
        'Indicator' => 'Indicator',
        'Incident' => 'Incident',
        'Intrusion-Set' => 'Intrusion Set',
        'Campaign' => 'Campaign',
    ];

    public function __construct(
        private readonly OpenCtiService $openCti,
    ) {}

    /**
     * Parse a raw STIX event from OpenCTI SSE stream into a normalized event.
     *
     * Extracts IP address, classifies attack type, assigns color.
     * Returns null if no IP can be extracted.
     *
     * @param  array  $raw  Raw STIX event data
     * @return array{id: string, type: string, color: string, ip: string, entity_type: string, timestamp: string, message: string}|null
     */
    public function parseStixEvent(array $raw): ?array
    {
        if (empty($raw['id']) && empty($raw['entity_type'])) {
            return null;
        }

        $ip = $this->extractIp($raw);

        if ($ip === null) {
            return null;
        }

        $attackType = $this->classifyAttackType($raw);
        $color = $this->getColorForType($attackType);

        return [
            'id' => $raw['id'] ?? uniqid('evt-'),
            'type' => $attackType,
            'color' => $color,
            'ip' => $ip,
            'entity_type' => $raw['entity_type'] ?? 'Unknown',
            'timestamp' => $raw['created_at'] ?? now()->toIso8601String(),
            'message' => $raw['name'] ?? $raw['observable_value'] ?? $ip,
        ];
    }

    /**
     * Geocode an IP address using ip-api.com with country centroid fallback.
     *
     * @param  string       $ip           The IP address to geocode
     * @param  string|null  $countryCode  Optional country code hint for centroid fallback
     * @return array{lat: float, lng: float, city: ?string, country: ?string, countryCode: ?string}|null
     */
    public function resolveGeo(string $ip, ?string $countryCode = null): ?array
    {
        return Cache::remember(
            'geo:' . md5($ip),
            now()->addHours(1),
            fn () => $this->fetchGeo($ip, $countryCode),
        );
    }

    /**
     * Fetch a snapshot of recent threat events for initial page load.
     *
     * @return array  Array of geo-annotated events
     */
    public function getSnapshot(): array
    {
        return Cache::remember(
            'threat_map:snapshot',
            now()->addMinutes(15),
            fn () => $this->fetchSnapshot(),
        );
    }

    /**
     * Execute the geo lookup (called inside cache closure).
     */
    private function fetchGeo(string $ip, ?string $countryCode): ?array
    {
        try {
            $response = Http::timeout(3)
                ->get("http://ip-api.com/json/{$ip}", [
                    'fields' => 'status,lat,lon,city,country,countryCode',
                ]);

            if ($response->successful()) {
                $body = $response->json();

                if (($body['status'] ?? '') === 'success') {
                    return [
                        'lat' => $body['lat'],
                        'lng' => $body['lon'],
                        'city' => $body['city'] ?? null,
                        'country' => $body['country'] ?? null,
                        'countryCode' => $body['countryCode'] ?? null,
                    ];
                }

                // ip-api failed but may have returned a country code
                $countryCode = $countryCode ?? ($body['countryCode'] ?? null);
            }
        } catch (\Throwable) {
            // Network error — fall through to centroid
        }

        // Centroid fallback
        if ($countryCode !== null) {
            $centroid = CountryCentroids::get($countryCode);

            if ($centroid !== null) {
                return [
                    'lat' => $centroid['lat'],
                    'lng' => $centroid['lng'],
                    'city' => null,
                    'country' => null,
                    'countryCode' => $countryCode,
                ];
            }
        }

        return null;
    }

    /**
     * Poll OpenCTI for IP observables created after $since.
     *
     * Returns parsed (but not geo-enriched) events, newest first.
     *
     * @param  string  $since  ISO-8601 timestamp cursor
     * @return array<int, array>
     */
    public function pollRecentEvents(string $since): array
    {
        $graphql = <<<'GRAPHQL'
        query ($filters: FilterGroup) {
            stixCyberObservables(filters: $filters, first: 30, orderBy: created_at, orderMode: desc) {
                edges {
                    node {
                        id
                        entity_type
                        observable_value
                        created_at
                        objectLabel {
                            value
                        }
                        ... on IPv4Addr {
                            value
                        }
                        ... on IPv6Addr {
                            value
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
                        'key' => 'entity_type',
                        'values' => ['IPv4-Addr', 'IPv6-Addr'],
                        'operator' => 'eq',
                        'mode' => 'or',
                    ],
                    [
                        'key' => 'created_at',
                        'values' => [$since],
                        'operator' => 'gt',
                        'mode' => 'or',
                    ],
                ],
                'filterGroups' => [],
            ],
        ];

        $data = $this->openCti->query($graphql, $variables);
        $edges = $data['stixCyberObservables']['edges'] ?? [];

        $events = [];

        foreach ($edges as $edge) {
            $node = $edge['node'] ?? null;

            if ($node === null) {
                continue;
            }

            $parsed = $this->parseStixEvent($node);

            if ($parsed !== null) {
                $events[] = $parsed;
            }
        }

        return $events;
    }

    /**
     * Fetch recent STIX events from OpenCTI for the snapshot.
     */
    private function fetchSnapshot(): array
    {
        $graphql = <<<'GRAPHQL'
        query ($filters: FilterGroup) {
            stixCyberObservables(filters: $filters, first: 100, orderBy: created_at, orderMode: desc) {
                edges {
                    node {
                        id
                        entity_type
                        observable_value
                        created_at
                        objectLabel {
                            value
                        }
                        ... on IPv4Addr {
                            value
                        }
                        ... on IPv6Addr {
                            value
                        }
                    }
                }
            }
        }
        GRAPHQL;

        $fifteenMinutesAgo = now()->subMinutes(15)->toIso8601String();

        $variables = [
            'filters' => [
                'mode' => 'and',
                'filters' => [
                    [
                        'key' => 'entity_type',
                        'values' => ['IPv4-Addr', 'IPv6-Addr'],
                        'operator' => 'eq',
                        'mode' => 'or',
                    ],
                    [
                        'key' => 'created_at',
                        'values' => [$fifteenMinutesAgo],
                        'operator' => 'gt',
                        'mode' => 'or',
                    ],
                ],
                'filterGroups' => [],
            ],
        ];

        $data = $this->openCti->query($graphql, $variables);
        $edges = $data['stixCyberObservables']['edges'] ?? [];

        $events = [];

        foreach ($edges as $edge) {
            $node = $edge['node'] ?? null;

            if ($node === null) {
                continue;
            }

            $parsed = $this->parseStixEvent($node);

            if ($parsed === null) {
                continue;
            }

            $geo = $this->resolveGeo($parsed['ip']);

            if ($geo !== null) {
                $parsed['lat'] = $geo['lat'];
                $parsed['lng'] = $geo['lng'];
                $parsed['city'] = $geo['city'];
                $parsed['country'] = $geo['country'];
                $parsed['countryCode'] = $geo['countryCode'];
            }

            $events[] = $parsed;
        }

        return $events;
    }

    /**
     * Extract an IP address from raw STIX event data.
     */
    private function extractIp(array $raw): ?string
    {
        $entityType = $raw['entity_type'] ?? '';

        // Direct IP observable types
        if (in_array($entityType, ['IPv4-Addr', 'IPv6-Addr', 'Malware'], true)) {
            $ip = $raw['value'] ?? $raw['observable_value'] ?? null;

            if ($ip !== null && filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }

            // For Malware with direct IP value
            if ($ip !== null) {
                return $ip;
            }
        }

        // Indicator with STIX pattern containing IP
        if ($entityType === 'Indicator') {
            $pattern = $raw['pattern'] ?? '';

            if (preg_match("/ipv[46]-addr:value\s*=\s*'([^']+)'/i", $pattern, $matches)) {
                return $matches[1];
            }
        }

        // Try extracting from value/observable_value for any type
        $value = $raw['value'] ?? $raw['observable_value'] ?? null;

        if ($value !== null && filter_var($value, FILTER_VALIDATE_IP)) {
            return $value;
        }

        return null;
    }

    /**
     * Classify attack type from labels (priority) then entity_type (fallback).
     */
    private function classifyAttackType(array $raw): string
    {
        // Check labels first
        $labels = $raw['objectLabel'] ?? [];

        foreach ($labels as $label) {
            $labelValue = strtolower($label['value'] ?? '');

            if (isset(self::TYPE_COLORS[$labelValue])) {
                return ucfirst($labelValue);
            }

            // Check partial matches
            foreach (array_keys(self::TYPE_COLORS) as $knownType) {
                if (str_contains($labelValue, $knownType)) {
                    return ucfirst($knownType);
                }
            }
        }

        // Fallback to entity_type mapping
        $entityType = $raw['entity_type'] ?? '';

        return self::ENTITY_TYPE_MAP[$entityType] ?? 'Unknown';
    }

    /**
     * Get color category for an attack type.
     *
     * @param  string  $type  The classified attack type
     * @return string  Color name: red, amber, violet, or cyan
     */
    public function getColorForType(string $type): string
    {
        $normalized = strtolower($type);

        return self::TYPE_COLORS[$normalized] ?? 'cyan';
    }
}
