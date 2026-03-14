<?php

namespace App\Http\Controllers\IpSearch;

use App\Http\Controllers\Controller;
use App\Http\Requests\IpSearchRequest;
use App\Models\SearchLog;
use App\Services\IpSearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class SearchController extends Controller
{
    public function __invoke(IpSearchRequest $request): JsonResponse
    {
        $query = $request->validated('query');
        $credit = $request->attributes->get('credit');

        try {
            $data = app(IpSearchService::class)->search($query);
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
            'module' => 'ip_search',
            'query' => $query,
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
