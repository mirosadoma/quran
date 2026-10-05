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
        Schema::create('prayer_reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // qiyam or duha (App\Enums\PrayerReminderType).
            $table->string('prayer', 20);
            // Every day at this time of the user's timezone.
            $table->time('remind_at');
            $table->boolean('is_active')->default(true);
            // The user's local date of the last reminder, so each day is reminded once.
            $table->date('last_sent_on')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'prayer']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('prayer_reminders');
    }
};
