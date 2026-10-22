<?php

namespace App\Models;

use App\Enums\CodePurpose;
use Database\Factories\SentCodeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A code (OTP) the platform sent to a user, kept encrypted for KEEP_HOURS so the administration can
 * give it to the user when the email or the message did not arrive.
 */
#[Fillable(['user_id', 'purpose', 'channel', 'destination', 'code', 'expires_at', 'used_at', 'blocked_at'])]
#[Hidden(['code'])]
class SentCode extends Model
{
    /** @use HasFactory<SentCodeFactory> */
    use HasFactory, Prunable;

    public const KEEP_HOURS = 2;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'purpose' => CodePurpose::class,
            'code' => 'encrypted',
            'expires_at' => 'datetime',
            'used_at' => 'datetime',
            'blocked_at' => 'datetime',
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
     * The codes sent in the last KEEP_HOURS.
     */
    #[Scope]
    protected function recent(Builder $query): void
    {
        $query->where('created_at', '>=', now()->subHours(self::KEEP_HOURS));
    }

    /**
     * Older codes are deleted (php artisan model:prune, scheduled).
     *
     * @return Builder<static>
     */
    public function prunable(): Builder
    {
        return static::query()->where('created_at', '<', now()->subHours(self::KEEP_HOURS));
    }
}
