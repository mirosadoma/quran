<?php

namespace App\Models;

use Database\Factories\WordMeaningFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The meaning of one word of an ayah, shown when the reader points at it in the mushaf.
 * "position" is the index of the word in the ayah text split by spaces.
 */
#[Fillable(['ayah_id', 'position', 'word', 'meaning', 'source'])]
class WordMeaning extends Model
{
    /** @use HasFactory<WordMeaningFactory> */
    use HasFactory;

    /**
     * Meanings written by an admin; the seeder never replaces them.
     */
    public const MANUAL = 'manual';

    /**
     * Meanings taken from the glosses of Tafsir Al-Jalalayn.
     */
    public const JALALAYN = 'jalalayn';

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'ayah_id' => 'integer',
            'position' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Ayah, $this>
     */
    public function ayah(): BelongsTo
    {
        return $this->belongsTo(Ayah::class);
    }
}
