<?php

namespace App\Http\Controllers\DarkWeb;

use App\Http\Controllers\Controller;
use App\Http\Requests\DarkWebSearchRequest;
use App\Models\SearchLog;
use App\Services\DarkWebProviderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class SearchController extends Controller
{
    public function __invoke(DarkWebSearchRequest $request): JsonResponse
    {
        $credit = $request->attributes->get('credit');

        try {
            $data = app(DarkWebProviderService::class)->search(
                $request->validated('query'),
                $request->validated('type'),
            );
        } catch (\Throwable) {
            // Refund the credit that was deducted by middleware
            DB::table('credits')
                ->where('id', $credit->id)
                ->increment('remaining');

            $credit->refresh();

            return response()->json([
                'message' => 'Something went wrong. No credit was deducted.',
                'credits' => $this->creditsPayload($credit),
            ], 502);
        }

        SearchLog::create([
            'user_id' => $request->user()?->id,
            'ip_address' => $request->ip(),
            'module' => 'dark_web',
            'query' => $request->validated('query'),
        ]);

        return response()->json([
            'data' => $data,
            'credits' => $this->creditsPayload($credit),
        ]);
    }

    /**
     * Build the credits response payload.
     */
    private function creditsPayload(object $credit): array
    {
        return [
            'remaining' => $credit->remaining,
            'limit' => $credit->limit,
            'resets_at' => now('UTC')->addDay()->startOfDay()->toIso8601String(),
        ];
    }
}
