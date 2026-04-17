<?php

namespace App\Http\Controllers\ThreatMap;

use App\Exceptions\OpenCtiConnectionException;
use App\Http\Controllers\Controller;
use App\Services\ThreatMapService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SnapshotController extends Controller
{
    /**
     * Accepted `?limit` values per MAPCFG-01 (matches frontend buffer-size
     * dropdown presets). Any other value silently defaults to 100 per D-01
     * (no 422, no validation error — public endpoint consumed by dashboard).
     */
    private const ALLOWED_LIMITS = [100, 500, 1000, 2000];
    private const DEFAULT_LIMIT = 100;

    /**
     * Return a cached snapshot of recent threat map events.
     *
     * GET /api/threat-map/snapshot?limit={100|500|1000|2000}
     *
     * Per MAPBUF-06 / D-05: `countries`, `types`, and `countryCounts`
     * aggregation runs over the full resized event array, so counters
     * automatically reflect the active buffer size.
     */
    public function __invoke(Request $request): JsonResponse
    {
        // Pitfall 4: $request->integer() returns 0 for missing / non-numeric values.
        // The whitelist check is the single source of truth — do NOT special-case zero.
        $requested = $request->integer('limit');
        $limit = in_array($requested, self::ALLOWED_LIMITS, true)
            ? $requested
            : self::DEFAULT_LIMIT;

        try {
            $events = app(ThreatMapService::class)->getSnapshot($limit);
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
