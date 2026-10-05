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
        Schema::create('ayahs', function (Blueprint $table) {
            // The ayah number in the whole Quran (1 to 6236).
            $table->unsignedSmallInteger('id')->primary();
            $table->unsignedTinyInteger('surah');
            $table->unsignedSmallInteger('ayah');
            $table->unsignedSmallInteger('page');
            $table->unsignedTinyInteger('juz');
            $table->unsignedTinyInteger('hizb_quarter');
            $table->boolean('sajda')->default(false);
            $table->text('text');
            $table->text('text_search');

            $table->unique(['surah', 'ayah']);
            $table->index('page');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ayahs');
    }
};
