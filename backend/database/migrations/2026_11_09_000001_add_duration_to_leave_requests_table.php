<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            // full = one or more whole days (existing behaviour)
            // half / short = a single day with a time range
            $table->enum('duration_type', ['full', 'half', 'short'])->default('full')->after('leave_type');
            $table->time('start_time')->nullable()->after('end_date');
            $table->time('end_time')->nullable()->after('start_time');
        });
    }

    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->dropColumn(['duration_type', 'start_time', 'end_time']);
        });
    }
};
