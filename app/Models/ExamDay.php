<?php

namespace App\Models;

use App\Enums\ExamDayPhase;
use App\Enums\ExamDayStatus;
use Carbon\CarbonInterface;
use Database\Factories\ExamDayFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One day of an exam: its halaqat, its examiners (each with a waiting hall and a private room)
 * and the students examined that day.
 */
#[Fillable([
    'exam_id', 'starts_at', 'ends_at', 'status', 'phase', 'main_room', 'opened_at', 'examining_started_at', 'closed_at',
    'reminder_day_before_sent_at', 'reminder_sent_at', 'opened_by',
])]
class ExamDay extends Model
{
    /** @use HasFactory<ExamDayFactory> */
    use HasFactory;

    /**
     * Examiners and the manager may enter the rooms this many minutes before the day starts.
     */
    public const EARLY_MINUTES = 60;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'status' => ExamDayStatus::class,
            'phase' => ExamDayPhase::class,
            'opened_at' => 'datetime',
            'examining_started_at' => 'datetime',
            'closed_at' => 'datetime',
            'reminder_day_before_sent_at' => 'datetime',
            'reminder_sent_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Exam, $this>
     */
    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function opener(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opened_by');
    }

    /**
     * The halaqat examined on this day.
     *
     * @return BelongsToMany<Halaqa, $this>
     */
    public function halaqat(): BelongsToMany
    {
        return $this->belongsToMany(Halaqa::class, 'exam_day_halaqa', 'exam_day_id', 'halaqa_id')->withTimestamps();
    }

    /**
     * @return HasMany<ExamExaminer, $this>
     */
    public function examiners(): HasMany
    {
        return $this->hasMany(ExamExaminer::class)->orderBy('id');
    }

    /**
     * @return HasMany<ExamEntry, $this>
     */
    public function entries(): HasMany
    {
        return $this->hasMany(ExamEntry::class)->orderBy('position')->orderBy('id');
    }

    /**
     * Days that are live or still to come, soonest first.
     */
    #[Scope]
    protected function upcoming(Builder $query): void
    {
        $query->where('status', '!=', ExamDayStatus::Closed)->orderBy('starts_at');
    }

    public function isLive(): bool
    {
        return $this->status === ExamDayStatus::Live;
    }

    public function isClosed(): bool
    {
        return $this->status === ExamDayStatus::Closed;
    }

    /**
     * When the day closes by itself (null: only by hand).
     */
    public function endsAt(): ?CarbonInterface
    {
        return $this->ends_at;
    }

    /**
     * Determine whether the user runs this day (the administration or the manager of the academy).
     */
    public function isManagedBy(User $user): bool
    {
        $exam = $this->relationLoaded('exam') ? $this->exam : $this->exam()->first();

        return $exam !== null && $exam->isManagedBy($user);
    }

    /**
     * The examiner row of the user on this day, if they examine.
     */
    public function examinerFor(User $user): ?ExamExaminer
    {
        $examiners = $this->relationLoaded('examiners') ? $this->examiners : $this->examiners()->get();

        return $examiners->first(fn (ExamExaminer $examiner): bool => $examiner->user_id === $user->id);
    }

    /**
     * The entry of the student on this day, if they are examined.
     */
    public function entryFor(User $user): ?ExamEntry
    {
        $entries = $this->relationLoaded('entries') ? $this->entries : $this->entries()->get();

        return $entries->first(fn (ExamEntry $entry): bool => $entry->student_id === $user->id);
    }

    /**
     * Determine whether the rooms of the day can be entered right now: the day is live, or it is
     * about to start and the user runs it or examines in it.
     */
    public function isEnterableBy(User $user): bool
    {
        if ($this->isClosed()) {
            return false;
        }

        if ($this->isLive()) {
            return $this->isManagedBy($user) || $this->examinerFor($user) !== null || $this->entryFor($user) !== null;
        }

        return ($this->isManagedBy($user) || $this->examinerFor($user) !== null)
            && now()->greaterThanOrEqualTo($this->starts_at->copy()->subMinutes(self::EARLY_MINUTES));
    }

    /**
     * Determine whether an outside examiner's link works right now.
     */
    public function isOpenForGuests(): bool
    {
        return ! $this->isClosed() && now()->greaterThanOrEqualTo($this->starts_at->copy()->subMinutes(self::EARLY_MINUTES));
    }
}
