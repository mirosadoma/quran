<?php

namespace App\Models;

use App\Enums\ExamEntryStatus;
use App\Enums\Grade;
use Database\Factories\ExamEntryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A student on an exam day: their place in the queue of their examiner, and their result.
 */
#[Fillable([
    'exam_day_id', 'student_id', 'halaqa_id', 'examiner_id', 'position', 'status', 'alerted_at', 'called_at', 'finished_at',
    'grade', 'score', 'notes', 'graded_by', 'graded_at', 'published_at',
])]
class ExamEntry extends Model
{
    /** @use HasFactory<ExamEntryFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'status' => ExamEntryStatus::class,
            'alerted_at' => 'datetime',
            'called_at' => 'datetime',
            'finished_at' => 'datetime',
            'grade' => Grade::class,
            'score' => 'integer',
            'graded_at' => 'datetime',
            'published_at' => 'datetime',
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
    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /**
     * @return BelongsTo<Halaqa, $this>
     */
    public function halaqa(): BelongsTo
    {
        return $this->belongsTo(Halaqa::class);
    }

    /**
     * @return BelongsTo<ExamExaminer, $this>
     */
    public function examiner(): BelongsTo
    {
        return $this->belongsTo(ExamExaminer::class, 'examiner_id');
    }

    /**
     * @return BelongsTo<ExamExaminer, $this>
     */
    public function grader(): BelongsTo
    {
        return $this->belongsTo(ExamExaminer::class, 'graded_by');
    }

    public function isGraded(): bool
    {
        return $this->grade !== null || $this->score !== null;
    }

    public function isPublished(): bool
    {
        return $this->published_at !== null;
    }

    /**
     * The score as a percentage of the exam's maximum.
     */
    public function percent(): ?float
    {
        $exam = $this->relationLoaded('day') && $this->day?->relationLoaded('exam') ? $this->day->exam : $this->day?->exam;

        return $exam?->percentOf($this->score);
    }
}
