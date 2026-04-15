<?php

namespace App\Http\Controllers\ThreatMap;

use App\Exceptions\OpenCtiConnectionException;
use App\Http\Controllers\Controller;
use App\Services\ThreatMapService;
use Illuminate\Http\JsonResponse;

class SnapshotController extends Controller
{
    /**
     * Return a cached snapshot of recent threat map events.
     *
     * GET /api/threat-map/snapshot
     */
    public function __invoke(): JsonResponse
    {
        try {
            $events = app(ThreatMapService::class)->getSnapshot();
        } catch (OpenCtiConnectionException) {
            return response()->json([
                'message' => 'Unable to load threat map data. Please try again.',
            ], 502);
        }

        $eventsCollection = collect($events);

        $countries = $eventsCollection
            ->pluck('countryCode')
            ->filter()
            ->unique()
            ->count();

        $types = $eventsCollection
            ->pluck('type')
            ->filter()
            ->unique()
            ->count();

        $countryCounts = $eventsCollection
            ->filter(fn ($e) => !empty($e['countryCode']))
            ->groupBy('countryCode')
            ->map(fn ($group) => [
                'code' => $group[0]['countryCode'],
                'name' => $group[0]['country'] ?? $group[0]['countryCode'],
                'count' => $group->count(),
            ])
            ->sortByDesc('count')
            ->values()
            ->slice(0, 10)
            ->all();

        return response()->json([
            'data' => [
                'events' => $events,
                'counters' => [
                    'threats' => count($events),
                    'countries' => $countries,
                    'types' => $types,
                ],
                'countryCounts' => $countryCounts,
            ],
        ]);
    }
}
