<?php

namespace App\Http\Controllers\ThreatCampaign;

use App\Exceptions\OpenCtiConnectionException;
use App\Http\Controllers\Controller;
use App\Services\ThreatCampaignService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IndexController extends Controller
{
    /**
     * List OpenCTI campaigns.
     *
     * GET /api/threat-campaigns
     * Query params: after, search, sort, order
     */
    public function __invoke(Request $request): JsonResponse
    {
        $after = $request->query('after');
        $search = $request->query('search');
        $sort = $request->query('sort', 'modified');
        $order = $request->query('order', 'desc');

        try {
            $data = app(ThreatCampaignService::class)->list(
                24,
                $after,
                $search,
                $sort,
                $order,
            );
        } catch (OpenCtiConnectionException) {
            return response()->json([
                'message' => 'Unable to load campaigns. Please try again.',
            ], 502);
        }

        return response()->json([
            'data' => $data,
        ]);
    }
}
