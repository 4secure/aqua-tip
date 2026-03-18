<?php

namespace App\Http\Controllers\Dashboard;

use App\Exceptions\OpenCtiConnectionException;
use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;

class CountsController extends Controller
{
    /**
     * Return observable counts by entity type.
     *
     * GET /api/dashboard/counts
     */
    public function __invoke(): JsonResponse
    {
        try {
            $counts = app(DashboardService::class)->getCounts();
        } catch (OpenCtiConnectionException) {
            return response()->json([
                'message' => 'Unable to load dashboard counts. Please try again.',
            ], 502);
        }

        return response()->json(['data' => $counts]);
    }
}
