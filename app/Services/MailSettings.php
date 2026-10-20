<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Process;
use Throwable;

/**
 * The outgoing email settings the administration keeps in the settings table instead of the .env file:
 * which mailer sends, the SMTP server and the sender. They are put into the mail configuration the moment
 * the mailer is first used (AppServiceProvider), so a change works at once on the whole server.
 */
class MailSettings
{
    /**
     * "env" keeps what the .env file says; "smtp" and "log" replace it.
     */
    public const MAILERS = ['env', 'smtp', 'log'];

    public const ENCRYPTIONS = ['tls', 'ssl', 'none'];

    /**
     * The settings keys of the email (all start with "mail_").
     *
     * @return list<string>
     */
    public static function keys(): array
    {
        return array_values(array_filter(array_keys(Setting::defaults()), fn (string $key): bool => str_starts_with($key, 'mail_')));
    }

    /**
     * Put the saved settings into the mail configuration (nothing while the settings are kept in .env).
     */
    public function apply(Repository $config): void
    {
        try {
            $mailer = (string) Setting::get('mail_mailer');

            if (! in_array($mailer, ['smtp', 'log'], true)) {
                return;
            }

            $config->set('mail.default', $mailer);

            if ($mailer === 'smtp') {
                $config->set('mail.mailers.smtp.host', (string) Setting::get('mail_host'));
                $config->set('mail.mailers.smtp.port', (int) Setting::get('mail_port'));
                $config->set('mail.mailers.smtp.username', Setting::get('mail_username') ?: null);
                $config->set('mail.mailers.smtp.password', $this->password());
                $config->set('mail.mailers.smtp.scheme', Setting::get('mail_encryption') === 'ssl' ? 'smtps' : 'smtp');
            }

            if (filled(Setting::get('mail_from_address'))) {
                $config->set('mail.from.address', Setting::get('mail_from_address'));
            }

            if (filled(Setting::get('mail_from_name'))) {
                $config->set('mail.from.name', Setting::get('mail_from_name'));
            }
        } catch (QueryException) {
            // No settings table yet (the platform is being installed): the .env settings stay.
        }
    }

    /**
     * The SMTP password, kept encrypted.
     */
    public function password(): ?string
    {
        $stored = Setting::get('mail_password');

        if (blank($stored)) {
            return null;
        }

        try {
            return Crypt::decryptString((string) $stored);
        } catch (DecryptException) {
            return null;
        }
    }

    /**
     * Save the settings; an empty password keeps the saved one.
     *
     * @param  array<string, mixed>  $values
     */
    public function save(array $values): void
    {
        $password = $values['mail_password'] ?? null;
        unset($values['mail_password']);

        if (filled($password)) {
            $values['mail_password'] = Crypt::encryptString((string) $password);
        }

        Setting::put($values);
    }

    /**
     * Make the whole server use the new settings: the configuration cache is cleared (and built again when
     * it was in use), and the queue workers restart, since a running worker keeps the mailer it first made.
     */
    public function refresh(): void
    {
        $cached = app()->configurationIsCached();

        Artisan::call('config:clear');
        Artisan::call('queue:restart');

        if ($cached) {
            // In its own process: config:cache replaces the application instance of the process it runs in.
            try {
                Process::path(base_path())->timeout(60)->run(['php', 'artisan', 'config:cache']);
            } catch (Throwable $exception) {
                report($exception);
            }
        }
    }

    /**
     * The mailer that sends now, and the sender (the .env values when nothing replaces them).
     *
     * @return array{mailer: string, from: string|null}
     */
    public function effective(): array
    {
        $mailer = (string) Setting::get('mail_mailer');

        return [
            'mailer' => in_array($mailer, ['smtp', 'log'], true) ? $mailer : (string) config('mail.default'),
            'from' => Setting::get('mail_from_address') ?: config('mail.from.address'),
        ];
    }

    /**
     * What the settings page shows (never the password itself).
     *
     * @return array<string, mixed>
     */
    public function summary(): array
    {
        return [
            'mailer' => Setting::get('mail_mailer'),
            'host' => Setting::get('mail_host'),
            'port' => (int) Setting::get('mail_port'),
            'username' => Setting::get('mail_username'),
            'password_set' => filled(Setting::get('mail_password')),
            'encryption' => Setting::get('mail_encryption'),
            'from_address' => Setting::get('mail_from_address'),
            'from_name' => Setting::get('mail_from_name'),
            'env' => [
                'mailer' => (string) config('mail.default'),
                'host' => config('mail.mailers.smtp.host'),
                'from' => config('mail.from.address'),
            ],
            'effective' => $this->effective(),
        ];
    }
}
