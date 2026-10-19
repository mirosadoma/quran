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
        Schema::create('alarms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // memorization, revision, prayer, dhikr or custom (App\Enums\AlarmKind).
            $table->string('kind', 20);
            $table->string('title', 100);
            // At this time of the user's timezone.
            $table->time('ring_at');
            // Weekdays (0 = Sunday ... 6 = Saturday); null rings every day.
            $table->json('days')->nullable();
            $table->boolean('is_active')->default(true);
            // The user's local dates of the last ring and the last dismissal, so each day rings once.
            $table->date('last_rang_on')->nullable();
            $table->date('last_dismissed_on')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('alarms');
    }
};
