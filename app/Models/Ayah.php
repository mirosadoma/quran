<?php

namespace App\Models;

use Database\Factories\AyahFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\WithoutIncrementing;
use Illuminate\Database\Eloquent\Attributes\WithoutTimestamps;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One ayah of the Quran (Uthmani script, Madani mushaf of 604 pages).
 * The id is the ayah number in the whole Quran, from 1 to 6236.
 */
#[Fillable(['id', 'surah', 'ayah', 'page', 'juz', 'hizb_quarter', 'sajda', 'text', 'text_simple', 'text_search'])]
#[WithoutIncrementing]
#[WithoutTimestamps]
class Ayah extends Model
{
    /** @use HasFactory<AyahFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'surah' => 'integer',
            'ayah' => 'integer',
            'page' => 'integer',
            'juz' => 'integer',
            'hizb_quarter' => 'integer',
            'sajda' => 'boolean',
        ];
    }

    /**
     * @return HasMany<Tafsir, $this>
     */
    public function tafsirs(): HasMany
    {
        return $this->hasMany(Tafsir::class);
    }

    /**
     * @return HasMany<WordMeaning, $this>
     */
    public function meanings(): HasMany
    {
        return $this->hasMany(WordMeaning::class)->orderBy('position');
    }

    /**
     * The words of the ayah, in the order their positions refer to.
     *
     * @return list<string>
     */
    public function words(): array
    {
        return explode(' ', $this->text);
    }

    /**
     * "2:255" style reference.
     */
    public function key(): string
    {
        return "{$this->surah}:{$this->ayah}";
    }
}
