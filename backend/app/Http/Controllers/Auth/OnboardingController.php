<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;

class OnboardingController extends Controller
{
    /**
     * Complete user onboarding with name, phone, timezone, organization, and role.
     */
    public function __invoke(Request $request): UserResource
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'phone' => ['required', 'string', 'min:5', 'max:20'],
            'timezone' => ['required', 'string', 'timezone:all'],
            'organization' => ['nullable', 'string', 'max:255'],
            'role' => ['nullable', 'string', 'max:255'],
        ]);

        $user = $request->user();

        $user->update([
            'name' => $validated['name'],
            'phone' => $validated['phone'],
            'timezone' => $validated['timezone'],
            'organization' => $validated['organization'] ?? null,
            'role' => $validated['role'] ?? null,
            'onboarding_completed_at' => now(),
        ]);

        return new UserResource($user->fresh());
    }
}
