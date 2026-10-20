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
        Schema::create('sunnahs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sunnah_category_id')->constrained()->cascadeOnDelete();
            $table->string('slug')->unique();
            $table->string('title');
            // How the sunnah is done.
            $table->text('text');
            // The hadith it comes from, and where it is narrated.
            $table->text('evidence');
            $table->string('source');
            // The hadith in the hadith tables (slug of the collection and number), to read it whole.
            $table->string('hadith_collection', 40)->nullable();
            $table->unsignedInteger('hadith_number')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['sunnah_category_id', 'sort_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sunnahs');
    }
};
