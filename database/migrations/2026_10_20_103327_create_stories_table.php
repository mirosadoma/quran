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
        Schema::create('stories', function (Blueprint $table) {
            $table->id();
            // The library: "kids" or "prophets".
            $table->string('kind', 20);
            $table->string('slug');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->string('title');
            $table->string('title_en');
            $table->text('summary');
            $table->text('summary_en');
            $table->string('icon', 40)->nullable();
            $table->string('tone', 20)->nullable();
            // Sections of headings and paragraphs, with the Quran passages (surah and ayahs) read after them.
            $table->json('sections');
            $table->json('lessons');
            $table->string('audio')->nullable();
            $table->timestamps();

            $table->unique(['kind', 'slug']);
            $table->index(['kind', 'sort_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stories');
    }
};
