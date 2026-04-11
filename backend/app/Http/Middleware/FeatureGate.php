<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class FeatureGate
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        $isTrialActive = $user->plan_id === null
            && $user->trial_ends_at !== null
            && $user->trial_ends_at->isFuture();

        if ($isTrialActive) {
            return $next($request);
        }

        if ($user->plan && $user->plan->slug !== 'free') {
            return $next($request);
        }

        return response()->json([
            'error' => 'upgrade_required',
            'message' => 'Upgrade your plan to access this feature',
        ], 403);
    }
}
