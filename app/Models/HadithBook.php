<?php

namespace App\Models;

use Database\Factories\HadithBookFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\WithoutTimestamps;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A book (kitab) of a collection of hadith, e.g. "كتاب الإيمان" of Sahih al-Bukhari.
 */
#[Fillable(['hadith_collection_id', 'number', 'name', 'name_en'])]
#[WithoutTimestamps]
class HadithBook extends Model
{
    /** @use HasFactory<HadithBookFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'number' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<HadithCollection, $this>
     */
    public function collection(): BelongsTo
    {
        return $this->belongsTo(HadithCollection::class, 'hadith_collection_id');
    }

    /**
     * @return HasMany<Hadith, $this>
     */
    public function hadiths(): HasMany
    {
        return $this->hasMany(Hadith::class)->orderBy('number')->orderBy('part');
    }

    /**
     * What the pages show of the book.
     *
     * @return array{id: int, number: int, name: string, name_en: string|null, hadiths_count: int|null}
     */
    public function toPageArray(): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'name' => $this->name,
            'name_en' => $this->name_en,
            'hadiths_count' => isset($this->hadiths_count) ? (int) $this->hadiths_count : null,
        ];
    }
}
