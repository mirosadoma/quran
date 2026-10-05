<?php

namespace App\Notifications;

use App\Models\Setting;
use App\Notifications\Channels\WhatsAppChannel;

/**
 * Sends the login details to a user the admin just created.
 */
class AccountCreated extends AppNotification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(public string $password) {}

    /**
     * Only sent through mail and WhatsApp: the password must not be stored.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        $channels = [];

        if (filled($notifiable->email ?? null)) {
            $channels[] = 'mail';
        }

        if (filled($notifiable->phone ?? null)) {
            $channels[] = WhatsAppChannel::class;
        }

        return $channels;
    }

    public function title(object $notifiable): string
    {
        return __('Your account on :academy is ready', ['academy' => Setting::get('academy_name')]);
    }

    public function body(object $notifiable): string
    {
        return __('Sign in with :login and the password :password. You can change it from your profile.', [
            'login' => $notifiable->email ?: $notifiable->phone,
            'password' => $this->password,
        ]);
    }

    public function url(): ?string
    {
        return route('login');
    }

    public function whatsAppTemplate(): ?string
    {
        return 'account_created';
    }
}
