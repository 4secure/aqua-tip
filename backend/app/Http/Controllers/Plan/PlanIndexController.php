<?php

namespace App\Http\Controllers\Plan;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\JsonResponse;

class PlanIndexController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $plans = Plan::where('is_active', true)
            ->orderBy('sort_order')
            ->get([
                'id', 'slug', 'name', 'daily_credit_limit',
                'price_cents', 'features', 'description', 'is_popular',
            ]);

        return response()->json($plans);
    }
}
