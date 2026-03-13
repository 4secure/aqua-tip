<?php

namespace App\Services;

class MockThreatDataService
{
    /**
     * Generate mock threat intelligence data based on IOC type.
     *
     * @return array<string, mixed>
     */
    public static function generate(string $type, string $query): array
    {
        $base = [
            'query' => $query,
            'type' => $type,
        ];

        return match ($type) {
            'ipv4', 'ipv6' => array_merge($base, self::ipData()),
            'domain' => array_merge($base, self::domainData()),
            'md5', 'sha1', 'sha256' => array_merge($base, self::hashData($type)),
            'url' => array_merge($base, self::urlData()),
            default => array_merge($base, [
                'message' => 'Unable to classify indicator',
            ]),
        };
    }

    /** @return array<string, mixed> */
    private static function ipData(): array
    {
        return [
            'risk_score' => rand(10, 95),
            'country' => 'RU',
            'isp' => 'AS12345 ShadowHost LLC',
            'tags' => ['malware', 'botnet', 'scanner'],
            'last_seen' => now('UTC')->subDays(rand(0, 30))->toDateString(),
            'reports_count' => rand(1, 150),
        ];
    }

    /** @return array<string, mixed> */
    private static function domainData(): array
    {
        return [
            'risk_score' => rand(20, 90),
            'registrar' => 'Namecheap Inc.',
            'creation_date' => now('UTC')->subMonths(rand(1, 36))->toDateString(),
            'dns_records' => [
                ['type' => 'A', 'value' => '185.220.101.' . rand(1, 254)],
                ['type' => 'MX', 'value' => 'mail.example.com'],
            ],
            'tags' => ['phishing', 'dga', 'suspicious'],
            'last_seen' => now('UTC')->subDays(rand(0, 14))->toDateString(),
        ];
    }

    /** @return array<string, mixed> */
    private static function hashData(string $hashType): array
    {
        return [
            'hash_type' => $hashType,
            'malware_family' => 'Emotet',
            'first_seen' => now('UTC')->subMonths(rand(1, 12))->toDateString(),
            'detection_rate' => rand(30, 70) . '/72',
            'file_type' => 'PE32 executable',
            'file_size' => rand(50, 500) . ' KB',
            'tags' => ['trojan', 'emotet', 'banking'],
        ];
    }

    /** @return array<string, mixed> */
    private static function urlData(): array
    {
        return [
            'risk_score' => rand(40, 99),
            'final_url' => 'https://malicious-redirect.example.com/payload',
            'redirects' => rand(0, 5),
            'content_type' => 'text/html',
            'tags' => ['phishing', 'credential-harvesting', 'redirect'],
            'last_seen' => now('UTC')->subDays(rand(0, 7))->toDateString(),
        ];
    }
}
