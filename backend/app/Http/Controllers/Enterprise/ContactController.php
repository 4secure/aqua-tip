<?php

namespace App\Http\Controllers\Enterprise;

use App\Http\Controllers\Controller;
use App\Mail\EnterpriseContactMail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class ContactController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'message' => 'nullable|string|max:2000',
            'plan_name' => 'required|string|max:100',
        ]);

        $user = $request->user();

        $contactData = [
            ...$validated,
            'user_plan' => $user?->plan?->slug,
            'trial_active' => $user?->trial_active ?? false,
            'user_email' => $user?->email,
        ];

        Mail::to(config('app.admin_email'))->send(new EnterpriseContactMail($contactData));

        return response()->json(['message' => 'Message sent successfully']);
    }
}
