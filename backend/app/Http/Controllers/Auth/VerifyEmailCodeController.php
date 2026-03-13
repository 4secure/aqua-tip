<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class VerifyEmailCodeController extends Controller
{
    /**
     * Verify user email with a 6-digit code.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email already verified.']);
        }

        $cacheKey = "email_verify_code:{$user->id}";
        $cachedCode = Cache::get($cacheKey);

        if ($cachedCode === null || $cachedCode !== $request->code) {
            return response()->json(
                ['message' => 'Invalid or expired verification code.'],
                422
            );
        }

        $user->markEmailAsVerified();
        Cache::forget($cacheKey);

        return response()->json(['message' => 'Email verified successfully.']);
    }
}
