<?php

namespace App\Notifications;

use App\Models\Video;

class VideoPublished extends AppNotification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(public Video $video) {}

    public function title(object $notifiable): string
    {
        return __('New video lesson');
    }

    public function body(object $notifiable): string
    {
        return $this->video->title;
    }

    public function url(): ?string
    {
        return route('videos.index', ['video' => $this->video->id]);
    }

    public function icon(): string
    {
        return 'circle-play';
    }

    public function color(): string
    {
        return 'sky';
    }

    public function sendsMail(): bool
    {
        return false;
    }
}
