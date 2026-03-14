<?php

namespace App\Http\Controllers\IpSearch;

use App\Http\Controllers\Controller;
use App\Http\Requests\IpSearchRequest;
use App\Models\SearchLog;
use Illuminate\Http\JsonResponse;

class SearchController extends Controller
{
    public function __invoke(IpSearchRequest $request): JsonResponse
    {
        $query = $request->validated('query');

        SearchLog::create([
            'user_id' => $request->user()?->id,
            'ip_address' => $request->ip(),
            'module' => 'ip_search',
            'query' => $query,
        ]);

        $credit = $request->attributes->get('credit');

        return response()->json([
            'data' => [
                'ip' => $query,
                'message' => 'OpenCTI integration pending',
            ],
            'credits' => [
                'remaining' => $credit->remaining,
                'limit' => $credit->limit,
                'resets_at' => now('UTC')->addDay()->startOfDay()->toIso8601String(),
            ],
        ]);
    }
}
