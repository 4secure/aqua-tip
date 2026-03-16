<?php

use App\Http\Controllers\Auth\SocialAuthController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Temporary: check outbound IP for whitelisting — remove after use
Route::get('/my-ip', fn () => file_get_contents('https://ifconfig.me'));

// OAuth callback (browser redirect from provider — needs web middleware for session)
Route::get('/api/auth/{provider}/callback', [SocialAuthController::class, 'callback']);
