<?php

namespace App\Models;

use App\Enums\AlarmKind;
use Database\Factories\AlarmFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * An alarm of the user, like the ones of a phone: it rings at a time of the chosen days
 * until the user dismisses it (for memorization and revision, by confirming they studied).
 */
#[Fillable(['user_id', 'kind', 'title', 'ring_at', 'days', 'is_active', 'last_rang_on', 'last_dismissed_on'])]
class Alarm extends Model
{
    /** @use HasFactory<AlarmFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'kind' => AlarmKind::class,
            'days' => 'array',
            'is_active' => 'boolean',
            'last_rang_on' => 'date',
            'last_dismissed_on' => 'date',
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
     * The alarm time as HH:MM.
     */
    public function time(): string
    {
        return substr((string) $this->ring_at, 0, 5);
    }

    /**
     * Determine whether the alarm rings on the given weekday (0 = Sunday).
     */
    public function ringsOn(int $weekday): bool
    {
        $days = $this->days;

        return $days === null || $days === [] || in_array($weekday, array_map('intval', $days), true);
    }
}
