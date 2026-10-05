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
        Schema::create('progress_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('halaqa_id')->nullable()->constrained('halaqat')->nullOnDelete();
            $table->foreignId('halaqa_session_id')->nullable()->constrained('halaqa_sessions')->nullOnDelete();
            $table->foreignId('teacher_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type', 20);
            $table->unsignedTinyInteger('from_surah');
            $table->unsignedSmallInteger('from_ayah');
            $table->unsignedTinyInteger('to_surah');
            $table->unsignedSmallInteger('to_ayah');
            $table->unsignedSmallInteger('ayahs_count');
            $table->string('grade', 20)->nullable();
            $table->unsignedTinyInteger('mistakes')->default(0);
            $table->text('notes')->nullable();
            $table->date('recorded_on');
            $table->timestamps();

            $table->index(['student_id', 'recorded_on']);
            $table->index(['halaqa_id', 'recorded_on']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('progress_records');
    }
};
