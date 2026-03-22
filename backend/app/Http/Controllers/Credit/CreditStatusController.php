<?php

namespace App\Http\Controllers\Credit;

use App\Http\Controllers\Controller;
use App\Services\CreditResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CreditStatusController extends Controller
{
    public function __construct(private CreditResolver $creditResolver)
    {
    }

    public function __invoke(Request $request): JsonResponse
    {
        $credit = $this->creditResolver->resolve($request);
        $this->creditResolver->lazyReset($credit, $request->user());

        return response()->json([
            'remaining' => $credit->remaining,
            'limit' => $credit->limit,
            'resets_at' => now('UTC')->addDay()->startOfDay()->toIso8601String(),
            'is_guest' => $request->user() === null,
        ]);
    }
}
