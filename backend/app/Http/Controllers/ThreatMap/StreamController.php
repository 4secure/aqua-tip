<?php

namespace App\Http\Controllers\ThreatMap;

use App\Http\Controllers\Controller;
use App\Services\ThreatMapService;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StreamController extends Controller
{
    /**
     * Relay OpenCTI SSE events to the authenticated frontend client.
     *
     * GET /api/threat-map/stream
     *
     * Sets proper SSE headers and streams parsed/enriched STIX events.
     * Sends heartbeat comments every 30 seconds. Stops when client disconnects.
     */
    public function __invoke(): StreamedResponse
    {
        $service = app(ThreatMapService::class);

        return response()->stream(function () use ($service) {
            // Disable output buffering for real-time streaming
            while (ob_get_level()) {
                ob_end_flush();
            }

            @set_time_limit(0);

            // Set browser reconnect interval to 10 seconds
            echo "retry: 10000\n\n";

            if (function_exists('flush')) {
                @flush();
            }

            $baseUrl = config('services.opencti.url');
            $token = config('services.opencti.token');

            if (empty($baseUrl) || empty($token)) {
                echo "data: " . json_encode(['error' => 'OpenCTI not configured']) . "\n\n";

                return;
            }

            try {
                $response = Http::withHeaders([
                    'Authorization' => 'Bearer ' . $token,
                    'Accept' => 'text/event-stream',
                ])->withOptions([
                    'stream' => true,
                    'timeout' => 0,
                    'read_timeout' => 0,
                ])->get($baseUrl . '/stream');

                $body = $response->getBody();
                $lastHeartbeat = time();

                while (! $body->eof()) {
                    // Check if client disconnected
                    if (connection_aborted()) {
                        break;
                    }

                    $line = '';

                    // Read a line from the stream
                    while (! $body->eof()) {
                        $char = $body->read(1);

                        if ($char === "\n") {
                            break;
                        }

                        $line .= $char;
                    }

                    // Send heartbeat every 30 seconds
                    if (time() - $lastHeartbeat >= 30) {
                        echo ": heartbeat\n\n";

                        if (function_exists('flush')) {
                            @flush();
                        }

                        $lastHeartbeat = time();
                    }

                    // Parse SSE data lines
                    if (! str_starts_with($line, 'data: ')) {
                        continue;
                    }

                    $jsonStr = substr($line, 6);
                    $raw = json_decode($jsonStr, true);

                    if (! is_array($raw)) {
                        continue;
                    }

                    // Parse the STIX event data
                    $eventData = $raw['data'] ?? $raw;
                    $parsed = $service->parseStixEvent($eventData);

                    if ($parsed === null) {
                        continue;
                    }

                    // Enrich with geo coordinates
                    $geo = $service->resolveGeo($parsed['ip']);

                    if ($geo !== null) {
                        $parsed['lat'] = $geo['lat'];
                        $parsed['lng'] = $geo['lng'];
                        $parsed['city'] = $geo['city'];
                        $parsed['country'] = $geo['country'];
                        $parsed['countryCode'] = $geo['countryCode'];
                    }

                    echo "data: " . json_encode($parsed) . "\n\n";

                    if (function_exists('flush')) {
                        @flush();
                    }
                }
            } catch (\Throwable) {
                echo "data: " . json_encode(['error' => 'Stream connection lost']) . "\n\n";

                if (function_exists('flush')) {
                    @flush();
                }
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }
}
