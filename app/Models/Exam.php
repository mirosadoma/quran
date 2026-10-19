<?php

namespace App\Models;

use App\Enums\ExamDayStatus;
use App\Enums\UserRole;
use Database\Factories\ExamFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Support\Facades\DB;

/**
 * An exam of an academy: one or more days, each with its halaqat, its examiners and the
 * queue of students examined one by one in a private room.
 */
#[Fillable(['academy_id', 'title', 'description', 'max_score', 'created_by'])]
class Exam extends Model
{
    /** @use HasFactory<ExamFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'max_score' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Academy, $this>
     */
    public function academy(): BelongsTo
    {
        return $this->belongsTo(Academy::class)->withTrashed();
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return HasMany<ExamDay, $this>
     */
    public function days(): HasMany
    {
        return $this->hasMany(ExamDay::class)->orderBy('starts_at');
    }

    /**
     * Every student entry of every day.
     *
     * @return HasManyThrough<ExamEntry, ExamDay, $this>
     */
    public function entries(): HasManyThrough
    {
        return $this->hasManyThrough(ExamEntry::class, ExamDay::class);
    }

    /**
     * Limit the query to the exams the user may see: the administration all of them, a manager
     * those of their academy, a teacher those they examine in or that include their halaqat,
     * and a student those they are examined in.
     */
    #[Scope]
    protected function visibleTo(Builder $query, User $user): void
    {
        match ($user->role) {
            UserRole::Admin => null,
            UserRole::Manager => $query->where('academy_id', $user->academy_id),
            UserRole::Teacher => $query->where(function (Builder $query) use ($user): void {
                $query->whereIn('id', DB::table('exam_days')
                    ->join('exam_examiners', 'exam_examiners.exam_day_id', '=', 'exam_days.id')
                    ->where('exam_examiners.user_id', $user->id)
                    ->select('exam_days.exam_id'))
                    ->orWhereIn('id', DB::table('exam_days')
                        ->join('exam_day_halaqa', 'exam_day_halaqa.exam_day_id', '=', 'exam_days.id')
                        ->join('halaqat', 'halaqat.id', '=', 'exam_day_halaqa.halaqa_id')
                        ->where('halaqat.teacher_id', $user->id)
                        ->select('exam_days.exam_id'));
            }),
            UserRole::Student => $query->whereIn('id', DB::table('exam_days')
                ->join('exam_entries', 'exam_entries.exam_day_id', '=', 'exam_days.id')
                ->where('exam_entries.student_id', $user->id)
                ->select('exam_days.exam_id')),
        };
    }

    /**
     * Determine whether the user runs this exam (the administration or the manager of its academy).
     */
    public function isManagedBy(User $user): bool
    {
        return $user->managesAcademy($this->academy_id);
    }

    /**
     * The state of the exam from its days: draft (no days), live, upcoming or finished.
     */
    public function state(): string
    {
        $days = $this->relationLoaded('days') ? $this->days : $this->days()->get();

        if ($days->isEmpty()) {
            return 'draft';
        }

        if ($days->contains(fn (ExamDay $day): bool => $day->status === ExamDayStatus::Live)) {
            return 'live';
        }

        if ($days->every(fn (ExamDay $day): bool => $day->status === ExamDayStatus::Closed)) {
            return 'finished';
        }

        return 'upcoming';
    }

    /**
     * The percentage of a score out of the exam's maximum.
     */
    public function percentOf(?int $score): ?float
    {
        if ($score === null || $this->max_score <= 0) {
            return null;
        }

        return round($score / $this->max_score * 100, 1);
    }
}
