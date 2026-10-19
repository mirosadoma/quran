<?php

namespace App\Models;

use Database\Factories\ExamExaminerFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * Someone who listens to the students on an exam day: a teacher (or the manager) of the
 * platform, or an examiner invited from outside who enters with a link.
 */
#[Fillable(['exam_day_id', 'user_id', 'name', 'email', 'phone', 'token', 'hall_room', 'private_room', 'last_seen_at'])]
#[Hidden(['token'])]
class ExamExaminer extends Model
{
    /** @use HasFactory<ExamExaminerFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'last_seen_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<ExamDay, $this>
     */
    public function day(): BelongsTo
    {
        return $this->belongsTo(ExamDay::class, 'exam_day_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The students assigned to this examiner, in the order of their queue.
     *
     * @return HasMany<ExamEntry, $this>
     */
    public function entries(): HasMany
    {
        return $this->hasMany(ExamEntry::class, 'examiner_id')->orderBy('position')->orderBy('id');
    }

    /**
     * An examiner invited from outside the platform.
     */
    public function isExternal(): bool
    {
        return $this->user_id === null;
    }

    /**
     * The link an outside examiner enters with.
     */
    public function guestUrl(): ?string
    {
        return $this->token ? route('exams.guest.room', $this->token) : null;
    }

    public static function newToken(): string
    {
        return Str::random(48);
    }
}
