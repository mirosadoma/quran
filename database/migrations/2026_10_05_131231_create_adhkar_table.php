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
        Schema::create('adhkar', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dhikr_category_id')->constrained('adhkar_categories')->cascadeOnDelete();
            $table->string('title')->nullable();
            $table->text('text');
            $table->unsignedSmallInteger('repeat')->default(1);
            $table->string('reference')->nullable();
            $table->text('virtue')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['dhikr_category_id', 'sort_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('adhkar');
    }
};
