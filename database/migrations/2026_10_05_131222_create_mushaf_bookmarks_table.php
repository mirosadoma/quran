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
        Schema::create('mushaf_bookmarks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('page');
            $table->unsignedSmallInteger('ayah_id')->nullable();
            $table->string('label', 120)->nullable();
            $table->timestamps();

            $table->foreign('ayah_id')->references('id')->on('ayahs')->nullOnDelete();
            $table->index(['user_id', 'page']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mushaf_bookmarks');
    }
};
