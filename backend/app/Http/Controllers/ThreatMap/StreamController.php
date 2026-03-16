<?php

namespace App\Http\Controllers\ThreatMap;

use App\Http\Controllers\Controller;
use App\Services\ThreatMapService;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StreamController extends Controller
{
    /**
     * Stream threat map events to the frontend via SSE.
     *
     * GET /api/threat-map/stream
     *
     * Connects to the OpenCTI live stream SSE endpoint and forwards
     * parsed IPv4/IPv6 events (with geo enrichment) to the frontend.
     */
    public function __invoke(): StreamedResponse
    {
        $service = app(ThreatMapService::class);

        return response()->stream(function () use ($service) {
            while (ob_get_level()) {
                ob_end_flush();
            }

            @set_time_limit(0);

            $maxLifetimeSeconds = 300;
            $startedAt = time();

            $baseUrl = config('services.opencti.url');
            $token = config('services.opencti.token');
            $streamId = config('services.opencti.stream_id');

            if (empty($baseUrl) || empty($token) || empty($streamId)) {
                Log::error('Threat map stream: missing OpenCTI config');
                echo "event: stream-error\ndata: " . json_encode([
                    'error' => 'OpenCTI stream not configured',
                ]) . "\n\n";
                $this->flush();

                return;
            }

            // Start from 5 minutes ago to get recent events on connect
            $fromTimestamp = (int) ((microtime(true) - 300) * 1000);
            $streamUrl = "{$baseUrl}/stream/{$streamId}?from={$fromTimestamp}-0&recover={$fromTimestamp}-0";

            $seenIds = [];

            while (time() - $startedAt < $maxLifetimeSeconds) {
                if (connection_aborted()) {
                    break;
                }

                echo ": heartbeat\n\n";
                $this->flush();

                try {
                    $context = stream_context_create([
                        'http' => [
                            'method' => 'GET',
                            'header' => implode("\r\n", [
                                "Authorization: Bearer {$token}",
                                'Accept: text/event-stream',
                            ]),
                            'timeout' => 30,
                        ],
                    ]);

                    $stream = @fopen($streamUrl, 'r', false, $context);

                    if ($stream === false) {
                        Log::warning('Threat map stream: failed to connect to OpenCTI SSE');
                        echo "event: stream-error\ndata: " . json_encode([
                            'error' => 'Failed to connect to OpenCTI stream',
                        ]) . "\n\n";
                        $this->flush();
                        sleep(5);

                        continue;
                    }

                    stream_set_timeout($stream, 30);

                    $eventType = '';
                    $eventData = '';
                    // Persists across events intentionally — tracks reconnection cursor (SSE spec behavior)
                    $lastEventId = '';

                    while (! feof($stream)) {
                        if (connection_aborted()) {
                            break 2;
                        }

                        $line = fgets($stream);

                        if ($line === false) {
                            // Timeout or error — send heartbeat and reconnect
                            echo ": heartbeat\n\n";
                            $this->flush();

                            break;
                        }

                        $line = trim($line);

                        // Parse SSE fields
                        if (str_starts_with($line, 'event: ')) {
                            $eventType = substr($line, 7);
                        } elseif (str_starts_with($line, 'data: ')) {
                            $eventData .= ($eventData !== '' ? "\n" : '') . substr($line, 6);
                        } elseif (str_starts_with($line, 'id: ')) {
                            $lastEventId = substr($line, 4);
                        } elseif ($line === '' && $eventData !== '') {
                            // Empty line = end of SSE event, process it
                            if ($eventType === 'create' || $eventType === 'update') {
                                $this->processStreamEvent(
                                    $eventData,
                                    $service,
                                    $seenIds,
                                );
                            }

                            $eventType = '';
                            $eventData = '';

                            // Update reconnect cursor
                            if ($lastEventId !== '') {
                                $streamUrl = "{$baseUrl}/stream/{$streamId}?from={$lastEventId}&recover={$lastEventId}";
                            }

                            // Trim seen IDs to prevent unbounded growth
                            if (count($seenIds) > 500) {
                                $seenIds = array_slice($seenIds, -200, 200, true);
                            }
                        }
                    }

                    @fclose($stream);
                } catch (\Throwable $e) {
                    Log::warning('Threat map stream error', [
                        'exception' => get_class($e),
                        'message' => $e->getMessage(),
                    ]);

                    echo "event: stream-error\ndata: " . json_encode([
                        'error' => 'Internal stream error',
                    ]) . "\n\n";
                    $this->flush();
                }

                // Brief pause before reconnecting
                sleep(2);
            }

            // Max lifetime reached — tell frontend to reconnect
            echo "event: reconnect\ndata: {}\n\n";
            $this->flush();
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    /**
     * Parse and forward a single OpenCTI stream event to the frontend.
     */
    private function processStreamEvent(
        string $rawJson,
        ThreatMapService $service,
        array &$seenIds,
    ): void {
        $payload = json_decode($rawJson, true);

        if ($payload === null) {
            return;
        }

        $stixData = $payload['data'] ?? [];
        $stixType = $stixData['type'] ?? '';

        // Only process IPv4/IPv6 address observables
        if ($stixType !== 'ipv4-addr' && $stixType !== 'ipv6-addr') {
            return;
        }

        $id = $stixData['id'] ?? '';

        if ($id === '' || isset($seenIds[$id])) {
            return;
        }

        $seenIds[$id] = true;

        $parsed = $service->parseStreamEvent($stixData, $payload['message'] ?? '');

        if ($parsed === null) {
            return;
        }

        $geo = $service->resolveGeo($parsed['ip']);

        if ($geo !== null) {
            $parsed['lat'] = $geo['lat'];
            $parsed['lng'] = $geo['lng'];
            $parsed['city'] = $geo['city'];
            $parsed['country'] = $geo['country'];
            $parsed['countryCode'] = $geo['countryCode'];
        }

        echo "data: " . json_encode($parsed) . "\n\n";
        $this->flush();
    }

    private function flush(): void
    {
        if (function_exists('flush')) {
            @flush();
        }
    }
}
