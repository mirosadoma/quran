<?php

namespace App\Notifications;

use App\Models\CommunityReply;
use Illuminate\Support\Str;

/**
 * To the member who asked: a sheikh answered their question, or someone commented on it.
 */
class CommunityReplyPosted extends AppNotification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(public CommunityReply $reply) {}

    public function title(object $notifiable): string
    {
        $name = $this->reply->author?->name ?? __('Deleted user');

        return $this->reply->is_answer
            ? __(':name answered your question', ['name' => $name])
            : __(':name commented on your question', ['name' => $name]);
    }

    public function body(object $notifiable): string
    {
        return Str::limit($this->reply->body, 300);
    }

    /**
     * Opens the question at the reply.
     */
    public function url(): ?string
    {
        return route('community.show', ['post' => $this->reply->community_post_id, 'reply' => $this->reply->id]);
    }

    public function icon(): string
    {
        return 'message-circle-question';
    }

    public function color(): string
    {
        return $this->reply->is_answer ? 'gold' : 'sky';
    }

    public function sendsMail(): bool
    {
        return false;
    }
}
