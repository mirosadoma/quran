<?php

namespace App\Models;

use App\Enums\HighlightColor;
use Database\Factories\MushafHighlightFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * An ayah the reader marked with a color, with an optional note.
 */
#[Fillable(['user_id', 'ayah_id', 'color', 'note'])]
class MushafHighlight extends Model
{
    /** @use HasFactory<MushafHighlightFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'ayah_id' => 'integer',
            'color' => HighlightColor::class,
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
            'ayah_id' => $this->ayah_id,
            'surah' => $this->ayah?->surah,
            'ayah' => $this->ayah?->ayah,
            'page' => $this->ayah?->page,
            'color' => $this->color->value,
            'note' => $this->note,
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
