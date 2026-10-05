<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('halaqat', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->foreignId('teacher_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('gender', 10)->default('mixed');
            $table->string('level', 20)->nullable();
            $table->unsignedSmallInteger('capacity')->nullable();
            $table->json('schedule')->nullable();
            $table->unsignedSmallInteger('duration_minutes')->default(60);
            $table->string('timezone', 64);
            $table->string('meeting_provider', 20);
            $table->string('meeting_url')->nullable();
            $table->string('color', 20)->default('emerald');
            $table->date('starts_on')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('halaqat');
    }
};
