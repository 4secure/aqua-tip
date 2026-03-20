<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('plan_id')->nullable()->after('trial_ends_at')->constrained('plans')->nullOnDelete();
            $table->string('timezone', 100)->nullable()->after('plan_id');
            $table->string('organization', 255)->nullable()->after('timezone');
            $table->string('role', 255)->nullable()->after('organization');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['plan_id']);
            $table->dropColumn(['role', 'organization', 'timezone', 'plan_id']);
        });
    }
};
