<?php

namespace App\Http\Controllers\Dashboard;

use App\Exceptions\OpenCtiConnectionException;
use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;

class IndicatorsController extends Controller
{
    /**
     * Return 10 most recent observables.
     *
     * GET /api/dashboard/indicators
     */
    public function __invoke(): JsonResponse
    {
        try {
            $indicators = app(DashboardService::class)->getIndicators();
        } catch (OpenCtiConnectionException) {
            return response()->json([
                'message' => 'Unable to load dashboard indicators. Please try again.',
            ], 502);
        }

        return response()->json(['data' => $indicators]);
    }
}
