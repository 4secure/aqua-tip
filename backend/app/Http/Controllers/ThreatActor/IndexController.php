<?php

namespace App\Http\Controllers\ThreatActor;

use App\Exceptions\OpenCtiConnectionException;
use App\Http\Controllers\Controller;
use App\Services\ThreatActorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IndexController extends Controller
{
    /**
     * List threat actors (intrusion sets) from OpenCTI.
     *
     * GET /api/threat-actors
     * Query params: after, search, motivation, sort, order
     */
    public function __invoke(Request $request): JsonResponse
    {
        $after = $request->query('after');
        $search = $request->query('search');
        $motivation = $request->query('motivation');
        $sort = $request->query('sort', 'modified');
        $order = $request->query('order', 'desc');

        try {
            $data = app(ThreatActorService::class)->list(
                24,
                $after,
                $search,
                $motivation,
                $sort,
                $order,
            );
        } catch (OpenCtiConnectionException) {
            return response()->json([
                'message' => 'Unable to load threat actors. Please try again.',
            ], 502);
        }

        return response()->json([
            'data' => $data,
        ]);
    }
}
