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
        Schema::create('mushaf_highlights', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('ayah_id');
            $table->string('color', 20);
            $table->string('note', 500)->nullable();
            $table->timestamps();

            $table->foreign('ayah_id')->references('id')->on('ayahs')->cascadeOnDelete();
            $table->unique(['user_id', 'ayah_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mushaf_highlights');
    }
};
