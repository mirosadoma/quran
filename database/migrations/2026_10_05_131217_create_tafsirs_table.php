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
        Schema::create('tafsirs', function (Blueprint $table) {
            $table->id();
            $table->string('edition', 30);
            $table->unsignedSmallInteger('ayah_id');
            $table->text('text');

            $table->foreign('ayah_id')->references('id')->on('ayahs')->cascadeOnDelete();
            $table->unique(['edition', 'ayah_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tafsirs');
    }
};
