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
            'academy_name' => 'رتّل',
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
            'notify_email' => true,
            'notify_whatsapp' => false,
            'google_meet' => null,
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

        return $value ?? $default ?? static::defaults()[$key] ?? null;
    }

    /**
     * Store several settings at once.
     *
     * @param  array<string, mixed>  $values
     */
    public static function put(array $values): void
    {
        foreach ($values as $key => $value) {
            static::query()->updateOrCreate(['key' => $key], ['value' => $value]);
        }

        Cache::forget(self::CACHE_KEY);
    }
}
