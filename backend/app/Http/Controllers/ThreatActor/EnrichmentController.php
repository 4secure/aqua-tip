<?php

namespace App\Http\Controllers\ThreatActor;

use App\Exceptions\OpenCtiConnectionException;
use App\Exceptions\OpenCtiQueryException;
use App\Http\Controllers\Controller;
use App\Services\ThreatActorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class EnrichmentController extends Controller
{
    /**
     * Get enrichment data for a single threat actor (intrusion set).
     *
     * GET /api/threat-actors/{id}/enrichment
     */
    public function __invoke(string $id): JsonResponse
    {
        try {
            $data = app(ThreatActorService::class)->enrichment($id);
        } catch (OpenCtiConnectionException $e) {
            Log::error('OpenCTI enrichment connection failed', [
                'threat_actor_id' => $id,
                'exception' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Service temporarily unavailable.',
            ], 502);
        } catch (OpenCtiQueryException $e) {
            Log::error('OpenCTI enrichment query failed', [
                'threat_actor_id' => $id,
                'exception' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Service temporarily unavailable.',
            ], 502);
        }

        return response()->json(['data' => $data]);
    }
}
