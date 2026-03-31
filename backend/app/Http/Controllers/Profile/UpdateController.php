<?php

namespace App\Http\Controllers\Profile;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;

class UpdateController extends Controller
{
    /**
     * Update authenticated user's profile fields.
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
        ]);

        return new UserResource($user->fresh()->load(['plan', 'pendingPlan']));
    }
}
