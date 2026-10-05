<?php

namespace App\Models;

use App\Enums\TafsirEdition;
use Database\Factories\TafsirFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\WithoutTimestamps;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The explanation of one ayah in one tafsir book.
 */
#[Fillable(['edition', 'ayah_id', 'text'])]
#[WithoutTimestamps]
class Tafsir extends Model
{
    /** @use HasFactory<TafsirFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'edition' => TafsirEdition::class,
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
