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
        Schema::create('hadith_collections', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('name_en');
            $table->string('author');
            $table->string('author_en');
            $table->text('description')->nullable();
            $table->text('description_en')->nullable();
            $table->string('icon', 40)->default('book-open');
            $table->string('color', 20)->default('emerald');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hadith_collections');
    }
};
