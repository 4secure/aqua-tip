<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Part A: Reset all existing users to a fresh 30-day trial
        $trialEnd = now()->addDays(30)->toDateTimeString();
        DB::table('users')->update(['trial_ends_at' => $trialEnd]);

        // Part B: Pre-create credit rows for users who don't have one
        $usersWithoutCredits = DB::table('users')
            ->leftJoin('credits', 'users.id', '=', 'credits.user_id')
            ->whereNull('credits.id')
            ->pluck('users.id');

        $now = now()->toDateTimeString();
        $rows = $usersWithoutCredits->map(fn ($id) => [
            'user_id' => $id,
            'ip_address' => null,
            'remaining' => 10,
            'limit' => 10,
            'last_reset_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ])->all();

        if (!empty($rows)) {
            DB::table('credits')->insert($rows);
        }
    }

    public function down(): void
    {
        // One-way data migration: original trial_ends_at values cannot be restored.
        // Credit rows created here are harmless to leave in place.
    }
};
