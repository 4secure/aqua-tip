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
use App\Http\Controllers\DarkWeb\SearchController as DarkWebSearchController;
use App\Http\Controllers\IpSearch\SearchController;
use App\Http\Controllers\ThreatSearch\SearchController as ThreatSearchController;
use App\Http\Controllers\OpenCti\HealthController as OpenCtiHealthController;
use App\Http\Controllers\ThreatActor\EnrichmentController as ThreatActorEnrichmentController;
use App\Http\Controllers\ThreatActor\IndexController as ThreatActorIndexController;
use App\Http\Controllers\ThreatMap\SnapshotController as ThreatMapSnapshotController;
use App\Http\Controllers\ThreatMap\StreamController as ThreatMapStreamController;
use App\Http\Controllers\ThreatNews\IndexController as ThreatNewsIndexController;
use App\Http\Controllers\ThreatNews\LabelsController as ThreatNewsLabelsController;
use App\Http\Controllers\Dashboard\CountsController as DashboardCountsController;
use App\Http\Controllers\Dashboard\IndicatorsController as DashboardIndicatorsController;
use App\Http\Controllers\Dashboard\CategoriesController as DashboardCategoriesController;
use App\Http\Controllers\Plan\PlanIndexController;
use App\Http\Controllers\Plan\PlanSelectionController;
use App\Http\Controllers\Profile\UpdateController as ProfileUpdateController;
use App\Http\Controllers\SearchHistory\IndexController as SearchHistoryIndexController;
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
    Route::put('/profile', ProfileUpdateController::class);
    Route::post('/logout', LogoutController::class);

    // Dark web search (authenticated + credit-gated)
    Route::post('/dark-web/search', DarkWebSearchController::class)->middleware('deduct-credit');
    Route::get('/dark-web/status/{taskId}', [DarkWebSearchController::class, 'status']);

    // OpenCTI health check
    Route::get('/opencti/health', OpenCtiHealthController::class);

    // Threat actors & threat news (browse pages, no credit gating)
    Route::get('/threat-actors', ThreatActorIndexController::class);
    Route::get('/threat-actors/{id}/enrichment', ThreatActorEnrichmentController::class);
    Route::get('/threat-news', ThreatNewsIndexController::class);
    Route::get('/threat-news/labels', ThreatNewsLabelsController::class);

    // Threat map stream (authenticated, no credit gating)
    Route::get('/threat-map/stream', ThreatMapStreamController::class);

    // Search history (authenticated, no credit gating)
    Route::get('/search-history', SearchHistoryIndexController::class);

    // Plan selection (authenticated)
    Route::post('/plan', PlanSelectionController::class);
});

// Plan listing (public, no auth required)
Route::get('/plans', PlanIndexController::class);

// IP search (guests + authenticated users, credit-gated)
Route::post('/ip-search', SearchController::class)->middleware('deduct-credit');

// Threat search (guests + authenticated users, credit-gated)
Route::post('/threat-search', ThreatSearchController::class)->middleware('deduct-credit');

// Credit status (read-only, no deduction)
Route::get('/credits', CreditStatusController::class);

// Threat map snapshot (public, used by dashboard map)
Route::get('/threat-map/snapshot', ThreatMapSnapshotController::class);

// Dashboard stats (public, no auth, no credit gating)
Route::get('/dashboard/counts', DashboardCountsController::class);
Route::get('/dashboard/indicators', DashboardIndicatorsController::class);
Route::get('/dashboard/categories', DashboardCategoriesController::class);
