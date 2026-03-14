<?php

namespace App\Http\Controllers\OpenCti;

use App\Exceptions\OpenCtiConnectionException;
use App\Exceptions\OpenCtiQueryException;
use App\Http\Controllers\Controller;
use App\Services\OpenCtiService;
use Illuminate\Http\JsonResponse;

class HealthController extends Controller
{
    public function __invoke(OpenCtiService $service): JsonResponse
    {
        try {
            $result = $service->healthCheck();

            return response()->json($result);
        } catch (OpenCtiConnectionException|OpenCtiQueryException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 503);
        }
    }
}
