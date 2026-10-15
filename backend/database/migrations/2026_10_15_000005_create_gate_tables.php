<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gate_devices', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('device_key', 64)->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();
        });

        Schema::create('gate_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('scan_type', ['in', 'out']);
            $table->timestamp('scanned_at');
            $table->foreignId('gate_device_id')->nullable()->constrained('gate_devices')->nullOnDelete();
            $table->timestamps();

            $table->index(['user_id', 'scanned_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gate_logs');
        Schema::dropIfExists('gate_devices');
    }
};
