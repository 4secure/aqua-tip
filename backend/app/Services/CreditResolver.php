<?php

namespace App\Services;

use App\Models\Credit;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;

class CreditResolver
{
    public const TRIAL_DAILY_LIMIT = 10;
    public const GUEST_DAILY_LIMIT = 1;

    public function resolve(Request $request): Credit
    {
        $user = $request->user();

        try {
            if ($user !== null) {
                $limit = $this->resolveLimit($user);

                return Credit::firstOrCreate(
                    ['user_id' => $user->id],
                    [
                        'ip_address' => null,
                        'remaining' => $limit,
                        'limit' => $limit,
                        'last_reset_at' => now('UTC')->startOfDay(),
                    ]
                );
            }

            return Credit::firstOrCreate(
                ['ip_address' => $request->ip(), 'user_id' => null],
                [
                    'remaining' => self::GUEST_DAILY_LIMIT,
                    'limit' => self::GUEST_DAILY_LIMIT,
                    'last_reset_at' => now('UTC')->startOfDay(),
                ]
            );
        } catch (QueryException) {
            // Race condition on duplicate key -- re-fetch
            if ($user !== null) {
                return Credit::where('user_id', $user->id)->firstOrFail();
            }

            return Credit::where('ip_address', $request->ip())
                ->whereNull('user_id')
                ->firstOrFail();
        }
    }

    public function lazyReset(Credit $credit, ?User $user): void
    {
        $todayStart = now('UTC')->startOfDay();

        if ($credit->last_reset_at >= $todayStart) {
            return;
        }

        // Apply pending downgrade and check trial expiry before resolving limit
        if ($user !== null) {
            $this->applyPendingDowngrade($user);
            $this->checkTrialExpiry($user);
        }

        $limit = $user !== null ? $this->resolveLimit($user) : self::GUEST_DAILY_LIMIT;

        $credit->update([
            'remaining' => $limit,
            'limit' => $limit,
            'last_reset_at' => $todayStart,
        ]);
    }

    public function resolveLimit(?User $user): int
    {
        if ($user === null) {
            return self::GUEST_DAILY_LIMIT;
        }

        // User has a plan -> use plan limit
        if ($user->plan_id !== null) {
            $user->loadMissing('plan');

            return $user->plan->daily_credit_limit;
        }

        // No plan + trial active -> trial limit
        if ($user->trial_ends_at !== null && $user->trial_ends_at->isFuture()) {
            return self::TRIAL_DAILY_LIMIT;
        }

        // No plan + trial expired -> fallback to Free tier limit
        return Plan::where('slug', 'free')->value('daily_credit_limit') ?? 3;
    }

    private function applyPendingDowngrade(User $user): void
    {
        if ($user->pending_plan_id !== null
            && $user->plan_change_at !== null
            && $user->plan_change_at->startOfDay()->lte(now('UTC')->startOfDay())
        ) {
            $user->update([
                'plan_id' => $user->pending_plan_id,
                'pending_plan_id' => null,
                'plan_change_at' => null,
            ]);
            $user->unsetRelation('plan');
        }
    }

    private function checkTrialExpiry(User $user): void
    {
        if ($user->plan_id === null
            && $user->trial_ends_at !== null
            && $user->trial_ends_at->isPast()
        ) {
            $freePlan = Plan::where('slug', 'free')->first();

            if ($freePlan) {
                $user->update(['plan_id' => $freePlan->id]);
                $user->unsetRelation('plan');
            }
        }
    }
}
