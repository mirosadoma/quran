<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The codes (OTP) the platform sent in the last hours, so the administration can give one to a
     * user whose email or message did not arrive. Kept two hours, then pruned.
     */
    public function up(): void
    {
        Schema::create('sent_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // What the code is for (password_reset), how it was sent (email) and to which address.
            $table->string('purpose', 40);
            $table->string('channel', 20);
            $table->string('destination');
            // The code itself, encrypted.
            $table->text('code');
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            // Too many wrong tries: the code stopped working.
            $table->timestamp('blocked_at')->nullable();
            $table->timestamps();

            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sent_codes');
    }
};
