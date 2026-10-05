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
        Schema::create('halaqa_announcements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('halaqa_id')->constrained('halaqat')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('kind', 20);
            $table->string('title')->nullable();
            $table->text('body');
            $table->string('delivery', 20);
            $table->timestamp('scheduled_at')->nullable();
            // First time the students received it; null while it is still waiting.
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->index(['halaqa_id', 'sent_at']);
            $table->index(['delivery', 'sent_at', 'scheduled_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('halaqa_announcements');
    }
};
