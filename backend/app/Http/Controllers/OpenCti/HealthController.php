<?php

namespace App\Http\Controllers\OpenCti;

use App\Exceptions\OpenCtiConnectionException;
use App\Exceptions\OpenCtiQueryException;
use App\Http\Controllers\Controller;
use App\Services\OpenCtiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class HealthController extends Controller
{
    public function __invoke(OpenCtiService $service): JsonResponse
    {
        try {
            $result = $service->healthCheck();

            return response()->json($result);
        } catch (OpenCtiConnectionException|OpenCtiQueryException $e) {
            Log::error('OpenCTI health check failed', [
                'exception' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Service temporarily unavailable.',
            ], 503);
        }
    }
}
