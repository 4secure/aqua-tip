<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ip_geo', function (Blueprint $table) {
            $table->string('ip')->primary();
            $table->string('country_code', 2)->index();
            $table->string('country_name')->nullable();
            $table->string('city')->nullable();
            $table->float('lat');
            $table->float('lng');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ip_geo');
    }
};
