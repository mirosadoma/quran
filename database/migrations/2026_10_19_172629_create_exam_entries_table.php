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
        Schema::create('exam_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_day_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('halaqa_id')->nullable()->constrained('halaqat')->nullOnDelete();
            $table->foreignId('examiner_id')->nullable()->constrained('exam_examiners')->nullOnDelete();
            // Order in the queue of the examiner.
            $table->unsignedSmallInteger('position')->default(0);
            // waiting, alerted, called, examined or absent (App\Enums\ExamEntryStatus).
            $table->string('status', 20)->default('waiting');
            $table->timestamp('alerted_at')->nullable();
            $table->timestamp('called_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            // The result: a grade (App\Enums\Grade) and a score out of the exam's max score.
            $table->string('grade', 20)->nullable();
            $table->unsignedSmallInteger('score')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('graded_by')->nullable()->constrained('exam_examiners')->nullOnDelete();
            $table->timestamp('graded_at')->nullable();
            // The student sees the result once it is published.
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->unique(['exam_day_id', 'student_id']);
            $table->index(['examiner_id', 'position']);
            $table->index(['student_id', 'published_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exam_entries');
    }
};
