<?php

namespace App\Models;

use App\Enums\AnnouncementDelivery;
use App\Enums\AnnouncementKind;
use Database\Factories\HalaqaAnnouncementFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * A message (advice, word, hadith or reminder) the teacher or the admin sends to
 * every student of a halaqa: right away, at a chosen time or at chosen sessions.
 */
#[Fillable(['halaqa_id', 'user_id', 'kind', 'title', 'body', 'delivery', 'scheduled_at', 'sent_at'])]
class HalaqaAnnouncement extends Model
{
    /** @use HasFactory<HalaqaAnnouncementFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'kind' => AnnouncementKind::class,
            'delivery' => AnnouncementDelivery::class,
            'scheduled_at' => 'datetime',
            'sent_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Halaqa, $this>
     */
    public function halaqa(): BelongsTo
    {
        return $this->belongsTo(Halaqa::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Sessions at which the message is delivered (delivery "sessions").
     *
     * @return BelongsToMany<HalaqaSession, $this>
     */
    public function sessions(): BelongsToMany
    {
        return $this->belongsToMany(HalaqaSession::class, 'halaqa_announcement_session', 'halaqa_announcement_id', 'halaqa_session_id')
            ->withPivot('sent_at')
            ->orderBy('starts_at');
    }

    /**
     * Limit the query to messages the students already received.
     */
    #[Scope]
    protected function sent(Builder $query): void
    {
        $query->whereNotNull('sent_at');
    }

    /**
     * Whether the message can still be edited: nothing was delivered yet.
     */
    public function isPending(): bool
    {
        return $this->sent_at === null;
    }
}
