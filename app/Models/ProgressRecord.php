<?php

namespace App\Models;

use App\Enums\Grade;
use App\Enums\ProgressType;
use App\Observers\ProgressRecordObserver;
use Database\Factories\ProgressRecordFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'student_id', 'halaqa_id', 'halaqa_session_id', 'teacher_id', 'group_uuid', 'type', 'from_surah', 'from_ayah', 'to_surah',
    'to_ayah', 'ayahs_count', 'grade', 'mistakes', 'notes', 'recorded_on',
])]
#[ObservedBy(ProgressRecordObserver::class)]
class ProgressRecord extends Model
{
    /** @use HasFactory<ProgressRecordFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => ProgressType::class,
            'grade' => Grade::class,
            'from_surah' => 'integer',
            'from_ayah' => 'integer',
            'to_surah' => 'integer',
            'to_ayah' => 'integer',
            'ayahs_count' => 'integer',
            'mistakes' => 'integer',
            'recorded_on' => 'date',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    /**
     * @return BelongsTo<Halaqa, $this>
     */
    public function halaqa(): BelongsTo
    {
        return $this->belongsTo(Halaqa::class);
    }

    /**
     * @return BelongsTo<HalaqaSession, $this>
     */
    public function session(): BelongsTo
    {
        return $this->belongsTo(HalaqaSession::class, 'halaqa_session_id');
    }

    /**
     * Every record saved together with this one (memorization and revision of the same recitation).
     *
     * @return HasMany<ProgressRecord, $this>
     */
    public function groupRecords(): HasMany
    {
        return $this->hasMany(ProgressRecord::class, 'group_uuid', 'group_uuid')->orderBy('type');
    }

    /**
     * The records of the recitation this record belongs to, itself included.
     *
     * @return Collection<int, ProgressRecord>
     */
    public function recitationRecords(): Collection
    {
        if ($this->group_uuid === null) {
            return new Collection([$this]);
        }

        return $this->relationLoaded('groupRecords') ? $this->groupRecords : $this->groupRecords()->get();
    }
}
