<?php

use App\Http\Controllers\Auth\ForgotPasswordController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Auth\ResendVerificationController;
use App\Http\Controllers\Auth\ResetPasswordController;
use App\Http\Controllers\Auth\SocialAuthController;
use App\Http\Controllers\Auth\UserController;
use App\Http\Controllers\Auth\VerifyEmailController;
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

// Auth required but NOT verified (for unverified users to verify)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/email/verify/{id}/{hash}', VerifyEmailController::class)
        ->middleware('signed')
        ->name('verification.verify');
    Route::post('/email/verification-notification', ResendVerificationController::class)
        ->middleware('throttle:6,1')
        ->name('verification.send');
});

// Auth + verified required (protected feature routes)
Route::middleware(['auth:sanctum', 'verified'])->group(function () {
    Route::get('/user', UserController::class);
    Route::post('/logout', LogoutController::class);
});
