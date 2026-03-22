<?php

namespace App\Http\Middleware;

use App\Services\CreditResolver;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class DeductCredit
{
    public function __construct(private CreditResolver $creditResolver)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $credit = $this->creditResolver->resolve($request);
        $this->creditResolver->lazyReset($credit, $request->user());

        $affected = DB::table('credits')
            ->where('id', $credit->id)
            ->where('remaining', '>', 0)
            ->update(['remaining' => DB::raw('remaining - 1')]);

        if ($affected === 0) {
            $isGuest = $request->user() === null;

            return response()->json([
                'message' => $isGuest
                    ? 'Sign in for more lookups'
                    : 'Daily limit reached',
                'remaining' => 0,
                'limit' => $credit->limit,
                'resets_at' => now('UTC')->addDay()->startOfDay()->toIso8601String(),
                'is_guest' => $isGuest,
            ], 429);
        }

        $credit->refresh();
        $request->attributes->set('credit', $credit);

        return $next($request);
    }
}
