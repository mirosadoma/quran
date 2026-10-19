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
        Schema::create('exam_examiners', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_day_id')->constrained()->cascadeOnDelete();
            // A teacher (or the manager) of the platform; null for an examiner invited from outside.
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone', 30)->nullable();
            // Access token of an outside examiner (their link works during the exam day only).
            $table->string('token', 64)->nullable()->unique();
            // Jitsi rooms: the waiting hall of the examiner's students, and the private room.
            $table->string('hall_room')->nullable();
            $table->string('private_room')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();

            $table->index(['exam_day_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exam_examiners');
    }
};
