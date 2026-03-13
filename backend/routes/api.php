<?php

use App\Http\Controllers\Auth\ForgotPasswordController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Auth\ResendVerificationController;
use App\Http\Controllers\Auth\ResetPasswordController;
use App\Http\Controllers\Auth\SocialAuthController;
use App\Http\Controllers\Auth\UserController;
use App\Http\Controllers\Auth\OnboardingController;
use App\Http\Controllers\Auth\VerifyEmailCodeController;
use App\Http\Controllers\Auth\VerifyEmailController;
use App\Http\Controllers\Credit\CreditStatusController;
use App\Http\Controllers\Ioc\SearchController;
use Illuminate\Support\Facades\Route;

// Guest auth routes with rate limiting
Route::middleware('throttle:auth')->group(function () {
    Route::post('/register', RegisterController::class);
    Route::post('/login', LoginController::class);
    Route::post('/forgot-password', ForgotPasswordController::class)->name('password.email');
    Route::post('/reset-password', ResetPasswordController::class)->name('password.update');
});

// OAuth redirect URL (called via XHR from frontend)
Route::get('/auth/{provider}/redirect', [SocialAuthController::class, 'redirect']);

// Auth required (for unverified users to verify, fetch profile, and log out)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/email/verify/{id}/{hash}', VerifyEmailController::class)
        ->middleware('signed')
        ->name('verification.verify');
    Route::post('/email/verification-notification', ResendVerificationController::class)
        ->middleware('throttle:6,1')
        ->name('verification.send');
    Route::post('/email/verify-code', VerifyEmailCodeController::class);
    Route::post('/onboarding', OnboardingController::class);
    Route::get('/user', UserController::class);
    Route::post('/logout', LogoutController::class);
});

// IOC search (guests + authenticated users, credit-gated)
Route::post('/ioc/search', SearchController::class)->middleware('deduct-credit');

// Credit status (read-only, no deduction)
Route::get('/credits', CreditStatusController::class);
