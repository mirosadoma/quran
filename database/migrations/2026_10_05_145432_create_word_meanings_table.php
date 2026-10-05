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
        Schema::create('word_meanings', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('ayah_id');
            // Index of the word in the ayah text split by spaces (0 for the first word).
            $table->unsignedSmallInteger('position');
            $table->string('word', 100);
            $table->string('meaning', 500);
            // Where the meaning comes from: "jalalayn" (extracted by the seeder) or "manual" (written by an admin).
            $table->string('source', 20);
            $table->timestamps();

            $table->foreign('ayah_id')->references('id')->on('ayahs')->cascadeOnDelete();
            $table->unique(['ayah_id', 'position']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('word_meanings');
    }
};
