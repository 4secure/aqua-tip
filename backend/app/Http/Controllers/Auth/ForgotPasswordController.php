<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Password;

class ForgotPasswordController extends Controller
{
    /**
     * Send a password reset link to the given email.
     */
    public function __invoke(ForgotPasswordRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        // Only send reset link to password-based users
        if ($user && !$user->oauth_provider) {
            Password::sendResetLink($request->only('email'));
        }

        // Always return identical response (anti-enumeration)
        return response()->json([
            'message' => 'If an account exists with that email, a password reset link has been sent.',
        ]);
    }
}
