<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Step 1: Make price_cents nullable (per D-04 — Enterprise signals "Contact Us" via null)
        Schema::table('plans', function (Blueprint $table) {
            $table->unsignedInteger('price_cents')->nullable()->default(null)->change();
        });

        // Step 2: Update plan values inline (per D-01 through D-07)
        DB::table('plans')->where('slug', 'free')->update([
            'daily_credit_limit' => 5,
            'price_cents' => 0,
            'features' => json_encode([
                '5 searches per day',
                'All threat lookups',
                'Full indicator data',
                'Search history',
                'Priority data access',
                'Dark web monitoring',
            ]),
        ]);

        DB::table('plans')->where('slug', 'basic')->update([
            'daily_credit_limit' => 30,
            'price_cents' => 1000,
            'features' => json_encode([
                '30 searches per day',
                'All threat lookups',
                'Full indicator data',
                'Search history',
                'Priority data access',
                'Dark web monitoring',
            ]),
        ]);

        DB::table('plans')->where('slug', 'pro')->update([
            'daily_credit_limit' => 50,
            'price_cents' => 2900,
            'features' => json_encode([
                '50 searches per day',
                'All threat lookups',
                'Full indicator data',
                'Search history',
                'Priority data access',
                'Dark web monitoring',
            ]),
        ]);

        DB::table('plans')->where('slug', 'enterprise')->update([
            'daily_credit_limit' => 200,
            'price_cents' => null,
            'features' => json_encode([
                '200 searches per day',
                'All threat lookups',
                'Full indicator data',
                'Search history',
                'Priority data access',
                'Dark web monitoring',
                'API access',
            ]),
        ]);

        // Step 3: Sync credit records (per D-08, D-09)
        // Uses driver-aware SQL: PostgreSQL supports UPDATE...FROM, SQLite uses subqueries.
        $driver = DB::connection()->getDriverName();
        $now = now()->toDateTimeString();

        if ($driver === 'pgsql') {
            // 3a. Users WITH a plan — reset to their plan's new daily limit
            DB::statement("
                UPDATE credits
                SET remaining = plans.daily_credit_limit,
                    \"limit\" = plans.daily_credit_limit,
                    last_reset_at = '{$now}'
                FROM users
                JOIN plans ON users.plan_id = plans.id
                WHERE credits.user_id = users.id
            ");

            // 3b. Active trial users (no plan, trial not expired) — set to 10
            DB::statement("
                UPDATE credits
                SET remaining = 10,
                    \"limit\" = 10,
                    last_reset_at = '{$now}'
                FROM users
                WHERE credits.user_id = users.id
                  AND users.plan_id IS NULL
                  AND users.trial_ends_at > '{$now}'
            ");

            // 3c. Expired trial / no-plan users — fallback to Free tier limit of 5
            DB::statement("
                UPDATE credits
                SET remaining = 5,
                    \"limit\" = 5,
                    last_reset_at = '{$now}'
                FROM users
                WHERE credits.user_id = users.id
                  AND users.plan_id IS NULL
                  AND (users.trial_ends_at IS NULL OR users.trial_ends_at <= '{$now}')
            ");
        } else {
            // SQLite-compatible: use subqueries instead of UPDATE...FROM
            // 3a. Users WITH a plan
            DB::statement("
                UPDATE credits
                SET remaining = (
                    SELECT plans.daily_credit_limit FROM users
                    JOIN plans ON users.plan_id = plans.id
                    WHERE users.id = credits.user_id
                ),
                \"limit\" = (
                    SELECT plans.daily_credit_limit FROM users
                    JOIN plans ON users.plan_id = plans.id
                    WHERE users.id = credits.user_id
                ),
                last_reset_at = '{$now}'
                WHERE user_id IN (
                    SELECT users.id FROM users WHERE users.plan_id IS NOT NULL
                )
            ");

            // 3b. Active trial users
            DB::statement("
                UPDATE credits
                SET remaining = 10,
                    \"limit\" = 10,
                    last_reset_at = '{$now}'
                WHERE user_id IN (
                    SELECT users.id FROM users
                    WHERE users.plan_id IS NULL
                      AND users.trial_ends_at > '{$now}'
                )
            ");

            // 3c. Expired trial / no-plan users
            DB::statement("
                UPDATE credits
                SET remaining = 5,
                    \"limit\" = 5,
                    last_reset_at = '{$now}'
                WHERE user_id IN (
                    SELECT users.id FROM users
                    WHERE users.plan_id IS NULL
                      AND (users.trial_ends_at IS NULL OR users.trial_ends_at <= '{$now}')
                )
            ");
        }
    }

    public function down(): void
    {
        // Revert Enterprise price_cents from null to 0
        DB::table('plans')->where('slug', 'enterprise')->update(['price_cents' => 0]);

        // Revert price_cents column to non-nullable with default 0
        Schema::table('plans', function (Blueprint $table) {
            $table->unsignedInteger('price_cents')->default(0)->change();
        });

        // Note: Credit sync is not reversible — users' credit records remain at their
        // current values. The lazy reset in CreditResolver will re-sync on next access.
    }
};
