<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Push notifications go through Firebase Cloud Messaging: a device is now known by its
     * Firebase token. Subscriptions made with the platform's own VAPID keys cannot receive
     * Firebase messages, so they are dropped; open apps register again by themselves.
     */
    public function up(): void
    {
        Schema::dropIfExists('push_subscriptions');

        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // The Firebase Cloud Messaging registration token of one browser or installed app.
            $table->text('token');
            $table->char('token_hash', 64)->unique();
            $table->string('user_agent')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations. The Firebase tokens are dropped: devices subscribe again.
     */
    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');

        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // The push service address of one browser or installed app.
            $table->text('endpoint');
            $table->char('endpoint_hash', 64)->unique();
            $table->string('public_key', 120);
            $table->string('auth_token', 60);
            $table->string('user_agent')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();
        });
    }
};
