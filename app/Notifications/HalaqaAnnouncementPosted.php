<?php

namespace App\Notifications;

use App\Models\HalaqaAnnouncement;
use App\Models\HalaqaSession;
use Illuminate\Support\Str;

class HalaqaAnnouncementPosted extends AppNotification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(public HalaqaAnnouncement $announcement, public ?HalaqaSession $session = null) {}

    public function title(object $notifiable): string
    {
        if (filled($this->announcement->title)) {
            return $this->announcement->title;
        }

        return __(':kind from :name', [
            'kind' => $this->announcement->kind->label(),
            'name' => $this->announcement->author?->name ?? $this->announcement->halaqa?->name,
        ]);
    }

    public function body(object $notifiable): string
    {
        return Str::limit($this->announcement->body, 500);
    }

    /**
     * Opens the messages tab of the halaqa.
     */
    public function url(): ?string
    {
        return route('halaqat.show', ['halaqa' => $this->announcement->halaqa_id, 'tab' => 'messages']);
    }

    public function icon(): string
    {
        return 'megaphone';
    }

    public function color(): string
    {
        return 'emerald';
    }

    public function whatsAppTemplate(): ?string
    {
        return 'halaqa_message';
    }
}
