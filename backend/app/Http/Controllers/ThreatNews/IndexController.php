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
     * Query params: after, search, confidence, sort, order
     */
    public function __invoke(Request $request): JsonResponse
    {
        $after = $request->query('after');
        $search = $request->query('search');
        $confidence = $request->query('confidence');
        $sort = $request->query('sort', 'published');
        $order = $request->query('order', 'desc');

        try {
            $data = app(ThreatNewsService::class)->list(
                21,
                $after,
                $search,
                $confidence,
                $sort,
                $order,
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
