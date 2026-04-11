<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('auth', function (Request $request) {
            return [
                Limit::perMinute(5)->by($request->input('email', '')),
                Limit::perMinute(20)->by($request->ip()),
            ];
        });

        // 30 requests/min for search and credit endpoints (per D-03, D-04)
        RateLimiter::for('api-search', function (Request $request) {
            return Limit::perMinute(30)->by(
                $request->user()?->id ?: $request->ip()
            );
        });

        // 10 requests/min for OAuth redirect (per D-05)
        RateLimiter::for('oauth-redirect', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        // 20 requests/day for email verification resend (per D-06)
        RateLimiter::for('email-verify-daily', function (Request $request) {
            return Limit::perDay(20)->by(
                $request->user()?->id ?: $request->ip()
            );
        });

        VerifyEmail::createUrlUsing(function ($notifiable) {
            $verifyUrl = URL::temporarySignedRoute(
                'verification.verify',
                Carbon::now()->addMinutes(Config::get('auth.verification.expire', 60)),
                [
                    'id' => $notifiable->getKey(),
                    'hash' => sha1($notifiable->getEmailForVerification()),
                ]
            );

            return config('services.frontend_url') . '/verify-email?verify_url=' . urlencode($verifyUrl);
        });

        ResetPassword::createUrlUsing(function (User $user, string $token) {
            return config('services.frontend_url') . '/reset-password?token=' . $token . '&email=' . urlencode($user->email);
        });
    }
}
