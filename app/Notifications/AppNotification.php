<?php

namespace App\Notifications;

use App\Models\Setting;
use App\Notifications\Channels\WhatsAppChannel;
use App\Services\Realtime;
use App\Services\WhatsApp\WhatsAppMessage;
use Carbon\CarbonInterface;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Base class for every platform notification. It is stored in the database
 * (bell icon), pushed in realtime when broadcasting is enabled, and sent by
 * email and WhatsApp according to the academy settings and user preferences.
 */
abstract class AppNotification extends Notification implements ShouldQueue
{
    use Queueable;

    abstract public function title(object $notifiable): string;

    abstract public function body(object $notifiable): string;

    public function url(): ?string
    {
        return null;
    }

    /**
     * Lucide icon name shown in the notification list.
     */
    public function icon(): string
    {
        return 'bell';
    }

    /**
     * Accent color: emerald, gold, sky, rose or slate.
     */
    public function color(): string
    {
        return 'emerald';
    }

    public function sendsMail(): bool
    {
        return true;
    }

    /**
     * Key of the WhatsApp template, or null to skip WhatsApp.
     */
    public function whatsAppTemplate(): ?string
    {
        return null;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        $channels = ['database'];

        if (Realtime::enabled()) {
            $channels[] = 'broadcast';
        }

        if ($this->sendsMail() && Setting::get('notify_email') && ($notifiable->notify_email ?? false) && filled($notifiable->email ?? null)) {
            $channels[] = 'mail';
        }

        if ($this->whatsAppTemplate() !== null
            && Setting::get('notify_whatsapp')
            && ($notifiable->notify_whatsapp ?? false)
            && filled($notifiable->routeNotificationFor('whatsapp', $this))) {
            $channels[] = WhatsAppChannel::class;
        }

        return $channels;
    }

    /**
     * Get the array representation stored in the database.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->title($notifiable),
            'body' => $this->body($notifiable),
            'url' => $this->url(),
            'icon' => $this->icon(),
            'color' => $this->color(),
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = $this->url();

        return (new MailMessage)
            ->subject($this->title($notifiable))
            ->greeting(__('Peace be upon you, :name', ['name' => $notifiable->name]))
            ->line($this->body($notifiable))
            ->when($url !== null, fn (MailMessage $mail) => $mail->action(__('Open the platform'), (string) $url))
            ->salutation(__('With best wishes,').' '.Setting::get('academy_name'));
    }

    public function toWhatsApp(object $notifiable): WhatsAppMessage
    {
        $text = '*'.$this->title($notifiable)."*\n".$this->body($notifiable);

        if ($this->url() !== null) {
            $text .= "\n".$this->url();
        }

        return WhatsAppMessage::make($text)->template($this->whatsAppTemplate());
    }

    /**
     * Format a date in the recipient's timezone and language.
     */
    protected function formatTime(CarbonInterface $time, object $notifiable): string
    {
        $locale = method_exists($notifiable, 'preferredLocale') ? $notifiable->preferredLocale() : app()->getLocale();

        return $time->copy()
            ->setTimezone($notifiable->timezone ?? config('app.user_timezone'))
            ->locale($locale)
            ->translatedFormat($locale === 'ar' ? 'l j F، g:i A' : 'l, j F, g:i A');
    }
}
