<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('staff_code')->nullable()->unique();      // e.g. STF001
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->enum('role', ['admin', 'staff', 'lecturer', 'intern'])->default('staff');
            $table->string('nic')->nullable();
            $table->string('phone')->nullable();
            $table->string('position')->nullable();
            $table->string('employment_type')->nullable();           // Full-time, Part-time...
            $table->string('university')->nullable();                // interns only
            $table->date('joined_date')->nullable();
            $table->string('photo')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->string('qr_token')->nullable()->unique();        // text stored inside the QR code
            $table->rememberToken();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
