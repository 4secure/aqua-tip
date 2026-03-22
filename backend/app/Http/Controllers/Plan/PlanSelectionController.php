<?php

namespace App\Http\Controllers\Plan;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Services\CreditResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlanSelectionController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plan' => 'required|string|in:free,basic,pro',
        ]);

        $user = $request->user();
        $newPlan = Plan::where('slug', $validated['plan'])->firstOrFail();

        // Same plan check
        if ($user->plan_id === $newPlan->id) {
            return response()->json(['message' => 'Already on this plan']);
        }

        $currentSortOrder = $user->plan?->sort_order ?? 0;

        // Upgrade: new plan is higher tier
        if ($newPlan->sort_order > $currentSortOrder) {
            $oldLimit = $user->plan?->daily_credit_limit ?? CreditResolver::TRIAL_DAILY_LIMIT;
            $difference = $newPlan->daily_credit_limit - $oldLimit;

            $user->update([
                'plan_id' => $newPlan->id,
                'pending_plan_id' => null,
                'plan_change_at' => null,
            ]);

            // Boost existing credit if record exists
            $credit = $user->credit;
            if ($credit !== null) {
                $credit->update([
                    'remaining' => min($credit->remaining + $difference, $newPlan->daily_credit_limit),
                    'limit' => $newPlan->daily_credit_limit,
                ]);
            }

            return response()->json([
                'message' => 'Plan upgraded',
                'plan' => [
                    'id' => $newPlan->id,
                    'slug' => $newPlan->slug,
                    'name' => $newPlan->name,
                    'daily_credit_limit' => $newPlan->daily_credit_limit,
                ],
            ]);
        }

        // Downgrade: new plan is lower or equal tier
        $user->update([
            'pending_plan_id' => $newPlan->id,
            'plan_change_at' => now()->addDays(30),
        ]);

        return response()->json([
            'message' => 'Downgrade scheduled',
            'pending_plan' => [
                'id' => $newPlan->id,
                'slug' => $newPlan->slug,
                'name' => $newPlan->name,
            ],
            'plan_change_at' => $user->plan_change_at->toIso8601String(),
        ]);
    }
}
