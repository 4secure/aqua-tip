<?php

namespace App\Http\Controllers\ThreatActor;

use App\Exceptions\OpenCtiConnectionException;
use App\Http\Controllers\Controller;
use App\Services\ThreatActorService;
use Illuminate\Http\JsonResponse;

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
        } catch (OpenCtiConnectionException) {
            return response()->json([
                'message' => 'Unable to load enrichment data. Please try again.',
            ], 502);
        }

        return response()->json(['data' => $data]);
    }
}
