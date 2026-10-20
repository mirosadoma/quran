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
        Schema::create('prayer_guides', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->string('icon', 40)->default('sparkles');
            $table->string('tone', 20)->default('emerald');
            // The daily reminder of the prayer (qiyam, duha), when it has one.
            $table->string('reminder', 20)->nullable();
            $table->string('title');
            $table->string('title_en');
            $table->text('summary');
            $table->text('summary_en');
            // Facts (time, rak'ahs...), steps, virtues (hadiths and ayahs) and du'as, in Arabic and English.
            $table->json('facts');
            $table->json('steps');
            $table->json('virtues');
            $table->json('duas');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('prayer_guides');
    }
};
