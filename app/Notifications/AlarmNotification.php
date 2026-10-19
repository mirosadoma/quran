<?php

namespace App\Notifications;

use App\Enums\AlarmKind;
use App\Models\Alarm;

/**
 * An alarm of the user ringing. Opening it brings the user to the platform, where it keeps
 * ringing on screen until they dismiss it.
 */
class AlarmNotification extends AppNotification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(public Alarm $alarm) {}

    public function title(object $notifiable): string
    {
        return $this->alarm->title;
    }

    public function body(object $notifiable): string
    {
        return match ($this->alarm->kind) {
            AlarmKind::Memorization => __('Time to memorize. Open the mushaf and recite your new portion.'),
            AlarmKind::Revision => __('Time to revise. Repeat what you memorized so it stays with you.'),
            AlarmKind::Prayer => __('Time for the prayer. Perform ablution and pray before it is late.'),
            AlarmKind::Dhikr => __('Time for your adhkar. A few minutes of remembrance bring peace to the heart.'),
            AlarmKind::Custom => __('Your alarm is ringing.'),
        };
    }

    public function url(): ?string
    {
        return route('alarms.index', ['ring' => $this->alarm->id]);
    }

    public function icon(): string
    {
        return $this->alarm->kind->icon();
    }

    public function color(): string
    {
        return $this->alarm->kind->isStudy() ? 'emerald' : 'gold';
    }

    public function sendsMail(): bool
    {
        return false;
    }

    /**
     * The push notification stays on screen until the user touches it, like an alarm.
     *
     * @return array<string, mixed>
     */
    public function toWebPush(object $notifiable): array
    {
        return [
            ...parent::toWebPush($notifiable),
            'tag' => 'alarm-'.$this->alarm->id,
            'sticky' => true,
        ];
    }
}
