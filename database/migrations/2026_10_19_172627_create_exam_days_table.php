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
        Schema::create('exam_days', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained()->cascadeOnDelete();
            $table->timestamp('starts_at');
            // Null: the day stays open until the manager closes it.
            $table->timestamp('ends_at')->nullable();
            // scheduled, live or closed (App\Enums\ExamDayStatus).
            $table->string('status', 20)->default('scheduled');
            // opening (everyone in the main hall) or examining (App\Enums\ExamDayPhase).
            $table->string('phase', 20)->default('opening');
            // Jitsi room of the main hall.
            $table->string('main_room')->nullable();
            $table->timestamp('opened_at')->nullable();
            $table->timestamp('examining_started_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamp('reminder_day_before_sent_at')->nullable();
            $table->timestamp('reminder_sent_at')->nullable();
            $table->foreignId('opened_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'starts_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exam_days');
    }
};
