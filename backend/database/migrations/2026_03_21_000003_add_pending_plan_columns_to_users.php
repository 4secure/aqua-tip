<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('pending_plan_id')
                ->nullable()
                ->after('plan_id')
                ->constrained('plans')
                ->nullOnDelete();
            $table->timestamp('plan_change_at')
                ->nullable()
                ->after('pending_plan_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['pending_plan_id']);
            $table->dropColumn(['plan_change_at', 'pending_plan_id']);
        });
    }
};
