<?php

namespace App\Http\Controllers\SearchHistory;

use App\Http\Controllers\Controller;
use App\Models\SearchLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IndexController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $query = $request->user()->searchLogs()
            ->select(['id', 'query', 'type', 'module', 'created_at'])
            ->latest('created_at')
            ->limit(20);

        if ($request->has('module') && in_array($request->query('module'), SearchLog::VALID_MODULES, true)) {
            $query->where('module', $request->query('module'));
        }

        $results = $query->get();

        return response()->json([
            'data' => $results,
            'meta' => [
                'total' => $results->count(),
                'limit' => 20,
            ],
        ]);
    }
}
