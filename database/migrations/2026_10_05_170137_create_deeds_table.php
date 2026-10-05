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
        Schema::create('deeds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // good or bad (App\Enums\DeedKind).
            $table->string('kind', 10);
            $table->string('title');
            $table->text('notes')->nullable();
            // The matching entry of resources/data/deeds.json, when there is one.
            $table->string('catalog_key', 40)->nullable();
            // Sins only: minor or major (App\Enums\SinSeverity).
            $table->string('severity', 10)->nullable();
            $table->dateTime('done_at');
            // The user's local date of done_at, to count the deeds day by day.
            $table->date('done_on');
            // When the user asked forgiveness or made the expiation of a sin.
            $table->dateTime('repented_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'done_on']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('deeds');
    }
};
