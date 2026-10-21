<?php

namespace App\Notifications;

use App\Models\Setting;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\HtmlString;

/**
 * The code (OTP) to choose a new password, sent by email at once (not queued: the user waits for it on the page)
 * in the user's language. Not stored with the notifications of the bell.
 */
class PasswordResetCode extends Notification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(public string $code, public int $minutes) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $academy = Setting::get('academy_name');

        return (new MailMessage)
            ->subject(__('Your code to reset the password: :code', ['code' => $this->code]))
            ->greeting(__('Peace be upon you, :name', ['name' => $notifiable->name]))
            ->line(__('Use this code to choose a new password for your account on :app:', ['app' => $academy]))
            ->line(new HtmlString('<span style="display:block;margin:8px 0;font-size:32px;font-weight:700;letter-spacing:10px;text-align:center;direction:ltr;">'.e($this->code).'</span>'))
            ->line(__('The code expires in :count minutes. Do not share it with anyone.', ['count' => $this->minutes]))
            ->line(__('If you did not request a password reset, no further action is required.'))
            ->salutation(__('With best wishes,').' '.$academy);
    }
}
