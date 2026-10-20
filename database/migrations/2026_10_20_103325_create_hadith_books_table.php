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
        Schema::create('hadith_books', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hadith_collection_id')->constrained()->cascadeOnDelete();
            // The number of the book (kitab) inside its collection: "كتاب الإيمان" is book 2 of Sahih al-Bukhari.
            $table->unsignedSmallInteger('number');
            $table->string('name');
            $table->string('name_en')->nullable();

            $table->unique(['hadith_collection_id', 'number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hadith_books');
    }
};
