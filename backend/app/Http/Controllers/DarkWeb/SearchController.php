<?php

namespace App\Http\Controllers\DarkWeb;

use App\Http\Controllers\Controller;
use App\Http\Requests\DarkWebSearchRequest;
use App\Models\DarkWebTask;
use App\Models\SearchLog;
use App\Services\DarkWebProviderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SearchController extends Controller
{
    /**
     * Start a dark web breach search (submit to LeaksCheck, return task_id).
     */
    public function __invoke(DarkWebSearchRequest $request): JsonResponse
    {
        $credit = $request->attributes->get('credit');

        try {
            $taskId = app(DarkWebProviderService::class)->startSearch(
                $request->validated('query'),
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

        DarkWebTask::firstOrCreate(
            ['task_id' => $taskId],
            ['user_id' => $request->user()->id],
        );

        return response()->json([
            'task_id' => $taskId,
            'credits' => $this->creditsPayload($credit),
        ]);
    }

    /**
     * Check the status of a running dark web search task.
     */
    public function status(Request $request, string $taskId): JsonResponse
    {
        $validated = $request->validate([
            // task_id comes from URL, just validate format
        ]);

        if (empty($taskId) || strlen($taskId) > 256) {
            return response()->json(['message' => 'Invalid task ID.'], 422);
        }

        $task = DarkWebTask::where('task_id', $taskId)->first();

        if (!$task || $task->user_id !== $request->user()->id) {
            return response()->json([
                'message' => 'Forbidden.',
            ], 403);
        }

        try {
            $result = app(DarkWebProviderService::class)->checkStatus($taskId);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Failed to check search status.',
                'status' => 'ERROR',
            ], 502);
        }

        return response()->json([
            'status' => $result['status'],
            'data' => [
                'found' => $result['found'],
                'results' => $result['results'],
            ],
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
