<?php

namespace App\Http\Middleware;

use App\Models\Credit;
use Closure;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class DeductCredit
{
    public function handle(Request $request, Closure $next): Response
    {
        $credit = $this->resolveCredit($request);
        $this->lazyReset($credit);

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

    private function resolveCredit(Request $request): Credit
    {
        $user = $request->user();

        try {
            if ($user !== null) {
                return Credit::firstOrCreate(
                    ['user_id' => $user->id],
                    [
                        'ip_address' => null,
                        'remaining' => 10,
                        'limit' => 10,
                        'last_reset_at' => now('UTC')->startOfDay(),
                    ]
                );
            }

            return Credit::firstOrCreate(
                ['ip_address' => $request->ip(), 'user_id' => null],
                [
                    'remaining' => 1,
                    'limit' => 1,
                    'last_reset_at' => now('UTC')->startOfDay(),
                ]
            );
        } catch (QueryException) {
            // Race condition on duplicate key -- re-fetch
            if ($user !== null) {
                return Credit::where('user_id', $user->id)->firstOrFail();
            }

            return Credit::where('ip_address', $request->ip())
                ->whereNull('user_id')
                ->firstOrFail();
        }
    }

    private function lazyReset(Credit $credit): void
    {
        $todayStart = now('UTC')->startOfDay();

        if ($credit->last_reset_at < $todayStart) {
            $credit->update([
                'remaining' => $credit->limit,
                'last_reset_at' => $todayStart,
            ]);
        }
    }
}
