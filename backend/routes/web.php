<?php

use App\Http\Controllers\Auth\SocialAuthController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Temporary: check outbound IP for whitelisting — remove after use
Route::get('/my-ip', fn () => file_get_contents('https://ifconfig.me'));

// Temporary: debug OpenCTI connectivity — remove after use
Route::get('/debug-opencti', function () {
    $url = config('services.opencti.url');
    $token = config('services.opencti.token');

    $result = [
        'url_set' => ! empty($url),
        'url_value' => $url ? substr($url, 0, 30) . '...' : null,
        'token_set' => ! empty($token),
        'token_length' => $token ? strlen($token) : 0,
    ];

    // Try connecting
    if ($url && $token) {
        try {
            $response = \Illuminate\Support\Facades\Http::withHeaders([
                'Authorization' => 'Bearer ' . $token,
            ])->timeout(10)->post($url . '/graphql', [
                'query' => '{ about { version } }',
            ]);

            $result['http_status'] = $response->status();
            $result['response_body'] = $response->json();
        } catch (\Exception $e) {
            $result['error'] = $e->getMessage();
        }
    }

    return response()->json($result, 200, [], JSON_PRETTY_PRINT);
});

// OAuth callback (browser redirect from provider — needs web middleware for session)
Route::get('/api/auth/{provider}/callback', [SocialAuthController::class, 'callback']);
