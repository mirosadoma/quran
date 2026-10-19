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
        Schema::create('exam_day_halaqa', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_day_id')->constrained()->cascadeOnDelete();
            $table->foreignId('halaqa_id')->constrained('halaqat')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['exam_day_id', 'halaqa_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exam_day_halaqa');
    }
};
