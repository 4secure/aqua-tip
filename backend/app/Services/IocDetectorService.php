<?php

namespace App\Services;

class IocDetectorService
{
    /**
     * Detect the type of an Indicator of Compromise from a query string.
     */
    public static function detect(string $query): string
    {
        $query = trim($query);

        // URL check first (before domain, since URLs contain domains)
        if (preg_match('/^https?:\/\//i', $query)) {
            return 'url';
        }

        // IPv4
        if (preg_match('/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/', $query)) {
            return 'ipv4';
        }

        // IPv6
        if (preg_match('/^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/', $query)) {
            return 'ipv6';
        }

        // SHA-256 (64 hex chars)
        if (preg_match('/^[a-fA-F0-9]{64}$/', $query)) {
            return 'sha256';
        }

        // SHA-1 (40 hex chars)
        if (preg_match('/^[a-fA-F0-9]{40}$/', $query)) {
            return 'sha1';
        }

        // MD5 (32 hex chars)
        if (preg_match('/^[a-fA-F0-9]{32}$/', $query)) {
            return 'md5';
        }

        // Domain (basic check: contains dot, no spaces)
        if (preg_match('/^[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/', $query)) {
            return 'domain';
        }

        return 'unknown';
    }
}
