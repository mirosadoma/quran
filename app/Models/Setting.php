<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

#[Fillable(['key', 'value'])]
class Setting extends Model
{
    protected const CACHE_KEY = 'app-settings';

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'value' => 'json',
        ];
    }

    /**
     * Default values for every known setting.
     *
     * @return array<string, mixed>
     */
    public static function defaults(): array
    {
        return [
            'academy_name' => 'وِرد',
            'academy_tagline' => null,
            'academy_logo' => null,
            'contact_email' => null,
            'contact_phone' => null,
            'default_timezone' => config('app.user_timezone'),
            'meeting_provider' => config('meetings.default'),
            'generate_days_ahead' => 14,
            'reminder_minutes' => 15,
            'late_after_minutes' => 10,
            'auto_mark_absent' => true,
            'auto_start_sessions' => true,
            'notify_email' => true,
            'notify_whatsapp' => false,
            'notify_push' => true,
            // Where the companion (the lantern avatar) shows: the public website and the panel of every role.
            'companion_site' => true,
            'companion_admin' => true,
            'companion_manager' => true,
            'companion_teacher' => true,
            'companion_student' => true,
            'google_meet' => null,
            // Outgoing email (App\Services\MailSettings): "env" keeps the .env file, "smtp" and "log" replace it.
            'mail_mailer' => 'env',
            'mail_host' => null,
            'mail_port' => 587,
            'mail_username' => null,
            'mail_password' => null,
            'mail_encryption' => 'tls',
            'mail_from_address' => null,
            'mail_from_name' => null,
        ];
    }

    /**
     * All stored values keyed by setting name.
     *
     * @return array<string, mixed>
     */
    public static function stored(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, fn (): array => static::query()->pluck('value', 'key')->all());
    }

    /**
     * Get a setting value, falling back to its default.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        $value = static::stored()[$key] ?? null;

        return static::cast($key, $value ?? $default ?? static::defaults()[$key] ?? null);
    }

    /**
     * Store several settings at once.
     *
     * @param  array<string, mixed>  $values
     */
    public static function put(array $values): void
    {
        foreach ($values as $key => $value) {
            static::query()->updateOrCreate(['key' => $key], ['value' => static::cast($key, $value)]);
        }

        Cache::forget(self::CACHE_KEY);
    }

    /**
     * Keep the switches true or false: the settings form sends them as "1" and "0".
     */
    protected static function cast(string $key, mixed $value): mixed
    {
        return is_bool(static::defaults()[$key] ?? null) && $value !== null
            ? filter_var($value, FILTER_VALIDATE_BOOLEAN)
            : $value;
    }
}
