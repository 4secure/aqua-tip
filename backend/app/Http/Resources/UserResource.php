<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'avatar_url' => $this->avatar_url,
            'phone' => $this->phone,
            'email_verified' => $this->email_verified_at !== null,
            'onboarding_completed' => $this->onboarding_completed_at !== null,
            'timezone' => $this->timezone,
            'organization' => $this->organization,
            'role' => $this->role,
            'plan' => $this->when(
                $this->relationLoaded('plan') && $this->plan !== null,
                fn () => [
                    'id' => $this->plan->id,
                    'slug' => $this->plan->slug,
                    'name' => $this->plan->name,
                    'daily_credit_limit' => $this->plan->daily_credit_limit,
                    'features' => $this->plan->features,
                ]
            ),
            'trial_active' => $this->trial_ends_at !== null
                && $this->trial_ends_at->isFuture()
                && $this->plan_id === null,
            'trial_days_left' => $this->trial_ends_at !== null
                ? max(0, (int) now()->diffInDays($this->trial_ends_at, false))
                : 0,
            'pending_plan' => $this->when(
                $this->relationLoaded('pendingPlan') && $this->pendingPlan !== null,
                fn () => [
                    'id' => $this->pendingPlan->id,
                    'slug' => $this->pendingPlan->slug,
                    'name' => $this->pendingPlan->name,
                    'daily_credit_limit' => $this->pendingPlan->daily_credit_limit,
                ]
            ),
            'plan_change_at' => $this->plan_change_at?->toIso8601String(),
            'oauth_provider' => $this->oauth_provider,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
