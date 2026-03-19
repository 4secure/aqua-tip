<?php

namespace App\Http\Controllers\Dashboard;

use App\Exceptions\OpenCtiConnectionException;
use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IndicatorsController extends Controller
{
    /**
     * Return 10 most recent observables, optionally filtered by label.
     *
     * GET /api/dashboard/indicators?label=malware
     */
    public function __invoke(Request $request): JsonResponse
    {
        $label = $request->query('label');

        try {
            $indicators = app(DashboardService::class)->getIndicators($label);
        } catch (OpenCtiConnectionException) {
            return response()->json([
                'message' => 'Unable to load dashboard indicators. Please try again.',
            ], 502);
        }

        return response()->json(['data' => $indicators]);
    }
}
