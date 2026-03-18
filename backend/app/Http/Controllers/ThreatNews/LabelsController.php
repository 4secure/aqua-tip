<?php

namespace App\Http\Controllers\ThreatNews;

use App\Exceptions\OpenCtiConnectionException;
use App\Http\Controllers\Controller;
use App\Services\ThreatNewsService;
use Illuminate\Http\JsonResponse;

class LabelsController extends Controller
{
    /**
     * List all available report labels from OpenCTI.
     *
     * GET /api/threat-news/labels
     */
    public function __invoke(): JsonResponse
    {
        try {
            $labels = app(ThreatNewsService::class)->labels();
        } catch (OpenCtiConnectionException) {
            return response()->json([
                'message' => 'Unable to load labels. Please try again.',
            ], 502);
        }

        return response()->json([
            'data' => $labels,
        ]);
    }
}
