<?php

namespace App\Http\Controllers\Credit;

use App\Http\Controllers\Controller;
use App\Models\Credit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CreditStatusController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $credit = $this->resolveCredit($request);
        $this->lazyReset($credit);

        return response()->json([
            'remaining' => $credit->remaining,
            'limit' => $credit->limit,
            'resets_at' => now('UTC')->addDay()->startOfDay()->toIso8601String(),
        ]);
    }

    private function resolveCredit(Request $request): Credit
    {
        $user = $request->user();

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
