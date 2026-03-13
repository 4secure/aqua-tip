<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('credits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('ip_address', 45)->nullable();
            $table->unsignedInteger('remaining');
            $table->unsignedInteger('limit');
            $table->timestamp('last_reset_at');
            $table->timestamps();

            $table->unique('user_id');
            $table->index('ip_address');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('credits');
    }
};
