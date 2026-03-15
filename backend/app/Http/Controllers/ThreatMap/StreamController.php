<?php

namespace App\Http\Controllers\ThreatMap;

use App\Http\Controllers\Controller;
use App\Services\ThreatMapService;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StreamController extends Controller
{
    /**
     * Stream threat map events to the frontend via SSE.
     *
     * GET /api/threat-map/stream
     *
     * Polls OpenCTI GraphQL for recent IP observables every 10 seconds,
     * emitting new events as SSE data frames. Uses the same auth as all
     * other OpenCTI queries (Bearer token on GraphQL), avoiding the
     * separate "Access streams" capability required by /stream/live.
     */
    public function __invoke(): StreamedResponse
    {
        $service = app(ThreatMapService::class);

        return response()->stream(function () use ($service) {
            while (ob_get_level()) {
                ob_end_flush();
            }

            @set_time_limit(0);

            echo "retry: 10000\n\n";
            $this->flush();

            $seenIds = [];
            $cursor = now()->subMinutes(2)->toIso8601String();

            while (true) {
                if (connection_aborted()) {
                    break;
                }

                try {
                    $events = $service->pollRecentEvents($cursor);

                    foreach ($events as $event) {
                        $id = $event['id'];

                        if (isset($seenIds[$id])) {
                            continue;
                        }

                        $seenIds[$id] = true;

                        $geo = $service->resolveGeo($event['ip']);

                        if ($geo !== null) {
                            $event['lat'] = $geo['lat'];
                            $event['lng'] = $geo['lng'];
                            $event['city'] = $geo['city'];
                            $event['country'] = $geo['country'];
                            $event['countryCode'] = $geo['countryCode'];
                        }

                        echo "data: " . json_encode($event) . "\n\n";
                        $this->flush();
                    }

                    // Advance cursor to latest event timestamp
                    if (! empty($events)) {
                        $cursor = $events[0]['timestamp'];
                    }
                } catch (\Throwable) {
                    // Query failed — send heartbeat and retry next cycle
                }

                echo ": heartbeat\n\n";
                $this->flush();

                // Trim seen IDs to prevent unbounded growth
                if (count($seenIds) > 500) {
                    $seenIds = array_slice($seenIds, -200, 200, true);
                }

                sleep(10);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    private function flush(): void
    {
        if (function_exists('flush')) {
            @flush();
        }
    }
}
