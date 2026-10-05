<?php

namespace App\Models;

use Database\Factories\RecitationSubmissionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A recitation the student entered before reciting it, waiting for the
 * teacher to add the mistakes and grade.
 *
 * @property array{memorization?: array{from_surah: int, from_ayah: int, to_surah: int, to_ayah: int}|null, revision?: array{from_surah: int, from_ayah: int, to_surah: int, to_ayah: int}|null} $portions
 */
#[Fillable(['student_id', 'halaqa_id', 'portions', 'notes'])]
class RecitationSubmission extends Model
{
    /** @use HasFactory<RecitationSubmissionFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'portions' => 'array',
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
     * @return BelongsTo<Halaqa, $this>
     */
    public function halaqa(): BelongsTo
    {
        return $this->belongsTo(Halaqa::class);
    }
}
