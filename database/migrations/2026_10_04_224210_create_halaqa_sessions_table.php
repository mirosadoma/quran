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
        Schema::create('halaqa_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('halaqa_id')->constrained('halaqat')->cascadeOnDelete();
            $table->foreignId('teacher_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title')->nullable();
            $table->timestamp('starts_at');
            $table->unsignedSmallInteger('duration_minutes')->default(60);
            $table->string('status', 20)->default('scheduled');
            $table->string('source', 20)->default('manual');
            $table->string('slot_key', 20)->nullable();
            $table->string('meeting_provider', 20);
            $table->string('meeting_id')->nullable();
            $table->text('meeting_url')->nullable();
            $table->string('meeting_password')->nullable();
            $table->json('meeting_data')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->timestamp('reminder_sent_at')->nullable();
            $table->string('cancel_reason')->nullable();
            $table->text('notes')->nullable();
            $table->text('recording_url')->nullable();
            $table->string('recording_path')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['halaqa_id', 'starts_at']);
            $table->index(['halaqa_id', 'slot_key']);
            $table->index(['status', 'starts_at']);
            $table->index('meeting_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('halaqa_sessions');
    }
};
