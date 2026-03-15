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

        $countries = collect($events)
            ->pluck('countryCode')
            ->filter()
            ->unique()
            ->count();

        $types = collect($events)
            ->pluck('type')
            ->filter()
            ->unique()
            ->count();

        return response()->json([
            'data' => [
                'events' => $events,
                'counters' => [
                    'threats' => count($events),
                    'countries' => $countries,
                    'types' => $types,
                ],
            ],
        ]);
    }
}
