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
        Schema::create('halaqa_announcement_session', function (Blueprint $table) {
            $table->id();
            $table->foreignId('halaqa_announcement_id')->constrained()->cascadeOnDelete();
            $table->foreignId('halaqa_session_id')->constrained()->cascadeOnDelete();
            // When the message was delivered at this session.
            $table->timestamp('sent_at')->nullable();

            $table->unique(['halaqa_announcement_id', 'halaqa_session_id'], 'announcement_session_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('halaqa_announcement_session');
    }
};
