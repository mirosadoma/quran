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
        Schema::create('sayings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('saying_category_id')->constrained()->cascadeOnDelete();
            $table->string('slug')->unique();
            // A saying, or a story told with its lesson.
            $table->string('kind', 20)->default('saying');
            $table->string('title')->nullable();
            $table->text('text');
            // Who said it, or who narrated it.
            $table->string('attribution');
            $table->string('source')->nullable();
            $table->text('lesson')->nullable();
            // The hadith in the hadith tables (slug of the collection and number), to read it whole.
            $table->string('hadith_collection', 40)->nullable();
            $table->unsignedInteger('hadith_number')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['saying_category_id', 'sort_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sayings');
    }
};
