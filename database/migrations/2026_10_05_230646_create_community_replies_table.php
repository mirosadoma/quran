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
        Schema::create('community_replies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('community_post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->text('body');
            // The body reduced for searching (App\Services\CommunitySearch::normalize()).
            $table->text('search_body');
            // Written by a teacher, a manager or the administration (a sheikh's answer); a student's reply is a comment.
            $table->boolean('is_answer')->default(false);
            // The asker chose this answer as the one that answered the question.
            $table->timestamp('accepted_at')->nullable();
            // When the author last changed the reply.
            $table->timestamp('edited_at')->nullable();
            $table->timestamps();

            $table->index(['community_post_id', 'is_answer']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('community_replies');
    }
};
