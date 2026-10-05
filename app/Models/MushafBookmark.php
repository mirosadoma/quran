<?php

namespace App\Models;

use Database\Factories\MushafBookmarkFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A place in the mushaf (a page, or an ayah on it) the reader wants to come back to.
 */
#[Fillable(['user_id', 'page', 'ayah_id', 'label'])]
class MushafBookmark extends Model
{
    /** @use HasFactory<MushafBookmarkFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'page' => 'integer',
            'ayah_id' => 'integer',
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
     * @return BelongsTo<Ayah, $this>
     */
    public function ayah(): BelongsTo
    {
        return $this->belongsTo(Ayah::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function toReaderArray(): array
    {
        return [
            'id' => $this->id,
            'page' => $this->page,
            'ayah_id' => $this->ayah_id,
            'surah' => $this->ayah?->surah,
            'ayah' => $this->ayah?->ayah,
            'label' => $this->label,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
