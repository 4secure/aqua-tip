<?php

namespace App\Http\Controllers\Dashboard;

use App\Exceptions\OpenCtiConnectionException;
use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;

class CategoriesController extends Controller
{
    /**
     * Return top 6 label distribution from recent observables.
     *
     * GET /api/dashboard/categories
     */
    public function __invoke(): JsonResponse
    {
        try {
            $categories = app(DashboardService::class)->getCategories();
        } catch (OpenCtiConnectionException) {
            return response()->json([
                'message' => 'Unable to load dashboard categories. Please try again.',
            ], 502);
        }

        return response()->json(['data' => $categories]);
    }
}
