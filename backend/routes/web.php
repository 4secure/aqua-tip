<?php

use App\Http\Controllers\Auth\SocialAuthController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// OAuth callback (browser redirect from provider — needs web middleware for session)
Route::get('/api/auth/{provider}/callback', [SocialAuthController::class, 'callback']);
