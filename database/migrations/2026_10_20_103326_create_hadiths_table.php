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
        Schema::create('hadiths', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hadith_collection_id')->constrained()->cascadeOnDelete();
            $table->foreignId('hadith_book_id')->nullable()->constrained()->nullOnDelete();
            // The number of the hadith in its collection; a hadith told in several parts keeps its number (part 2, 3...).
            $table->unsignedInteger('number');
            $table->unsignedTinyInteger('part')->default(1);
            $table->mediumText('text');
            // The text reduced to bare letters (no diacritics, one form of alef...), searched with LIKE.
            $table->mediumText('text_search');
            $table->string('grade')->nullable();
            $table->string('grader')->nullable();

            $table->unique(['hadith_collection_id', 'number', 'part']);
            $table->index(['hadith_book_id', 'number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hadiths');
    }
};
