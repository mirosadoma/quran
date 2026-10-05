<?php

namespace App\Models;

use App\Enums\PrayerReminderType;
use Database\Factories\PrayerReminderFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A daily reminder of a voluntary prayer (night prayer, duha) at a time chosen by the user.
 */
#[Fillable(['user_id', 'prayer', 'remind_at', 'is_active', 'last_sent_on'])]
class PrayerReminder extends Model
{
    /** @use HasFactory<PrayerReminderFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'prayer' => PrayerReminderType::class,
            'is_active' => 'boolean',
            'last_sent_on' => 'date',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The reminder time as HH:MM.
     */
    public function time(): string
    {
        return substr((string) $this->remind_at, 0, 5);
    }
}
