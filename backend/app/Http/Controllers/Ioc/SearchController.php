<?php

namespace App\Http\Controllers\Ioc;

use App\Http\Controllers\Controller;
use App\Http\Requests\IocSearchRequest;
use App\Models\SearchLog;
use App\Services\IocDetectorService;
use App\Services\MockThreatDataService;
use Illuminate\Http\JsonResponse;

class SearchController extends Controller
{
    public function __invoke(IocSearchRequest $request): JsonResponse
    {
        $query = $request->validated('query');
        $type = IocDetectorService::detect($query);
        $data = MockThreatDataService::generate($type, $query);

        SearchLog::create([
            'user_id' => $request->user()?->id,
            'ip_address' => $request->ip(),
            'module' => 'ioc_search',
            'query' => $query,
        ]);

        $credit = $request->attributes->get('credit');

        return response()->json([
            'data' => $data,
            'credits' => [
                'remaining' => $credit->remaining,
                'limit' => $credit->limit,
                'resets_at' => now('UTC')->addDay()->startOfDay()->toIso8601String(),
            ],
        ]);
    }
}
