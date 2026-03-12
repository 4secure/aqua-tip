<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class SocialAuthController extends Controller
{
    private const ALLOWED_PROVIDERS = ['google', 'github'];

    /**
     * Redirect to the OAuth provider.
     */
    public function redirect(string $provider): JsonResponse
    {
        if (! in_array($provider, self::ALLOWED_PROVIDERS, true)) {
            return response()->json(['message' => 'Unsupported provider.'], 422);
        }

        $url = Socialite::driver($provider)->stateless()->redirect()->getTargetUrl();

        return response()->json(['url' => $url]);
    }

    /**
     * Handle the OAuth callback.
     */
    public function callback(string $provider, Request $request): mixed
    {
        if (! in_array($provider, self::ALLOWED_PROVIDERS, true)) {
            return $this->redirectWithError('Unsupported provider.');
        }

        try {
            $socialUser = Socialite::driver($provider)->stateless()->user();
        } catch (\Throwable) {
            return $this->redirectWithError('Authentication failed. Please try again.');
        }

        $user = User::where('oauth_provider', $provider)
            ->where('oauth_id', $socialUser->getId())
            ->first();

        if (! $user) {
            $user = User::where('email', $socialUser->getEmail())
                ->whereNull('oauth_provider')
                ->first();

            if ($user) {
                $user->update([
                    'oauth_provider' => $provider,
                    'oauth_id' => $socialUser->getId(),
                    'avatar_url' => $socialUser->getAvatar(),
                ]);
            } else {
                $user = User::create([
                    'name' => $socialUser->getName() ?? $socialUser->getNickname() ?? 'User',
                    'email' => $socialUser->getEmail(),
                    'password' => bcrypt(Str::random(32)),
                    'oauth_provider' => $provider,
                    'oauth_id' => $socialUser->getId(),
                    'avatar_url' => $socialUser->getAvatar(),
                    'email_verified_at' => now(),
                ]);
            }
        } else {
            $user->update([
                'avatar_url' => $socialUser->getAvatar(),
            ]);
        }

        Auth::login($user);
        $request->session()->regenerate();

        $frontendUrl = config('services.frontend_url');

        return redirect("{$frontendUrl}/dashboard");
    }

    private function redirectWithError(string $message): mixed
    {
        $frontendUrl = config('services.frontend_url');
        $encoded = urlencode($message);

        return redirect("{$frontendUrl}/login?error={$encoded}");
    }
}
