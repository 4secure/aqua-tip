<?php

namespace App\Http\Controllers\ThreatNews;

use App\Exceptions\OpenCtiConnectionException;
use App\Http\Controllers\Controller;
use App\Services\ThreatNewsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IndexController extends Controller
{
    /**
     * List threat intelligence reports from OpenCTI.
     *
     * GET /api/threat-news
     * Query params: after, search, confidence, sort, order, date_start, date_end
     */
    public function __invoke(Request $request): JsonResponse
    {
        $after = $request->query('after');
        $search = $request->query('search');
        $confidence = $request->query('confidence');
        $label = $request->query('label');
        $sort = $request->query('sort', 'published');
        $order = $request->query('order', 'desc');
        $dateStart = $request->query('date_start');
        $dateEnd = $request->query('date_end');

        $first = ($dateStart && $dateEnd) ? 500 : 20;

        try {
            $data = app(ThreatNewsService::class)->list(
                $first,
                $after,
                $search,
                $confidence,
                $label,
                $sort,
                $order,
                $dateStart,
                $dateEnd,
            );
        } catch (OpenCtiConnectionException) {
            return response()->json([
                'message' => 'Unable to load threat news. Please try again.',
            ], 502);
        }

        return response()->json([
            'data' => $data,
        ]);
    }
}
