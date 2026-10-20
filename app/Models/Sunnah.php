<?php

namespace App\Models;

use Database\Factories\SunnahFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One neglected sunnah: how it is done, the hadith it comes from and where that hadith is narrated.
 */
#[Fillable(['sunnah_category_id', 'slug', 'title', 'text', 'evidence', 'source', 'hadith_collection', 'hadith_number', 'sort_order'])]
class Sunnah extends Model
{
    /** @use HasFactory<SunnahFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'hadith_number' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<SunnahCategory, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(SunnahCategory::class, 'sunnah_category_id');
    }

    /**
     * What the page shows of the sunnah.
     *
     * @return array{id: int, slug: string, title: string, text: string, evidence: string, source: string, hadith: array{collection: string, number: int}|null}
     */
    public function toPageArray(): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'title' => $this->title,
            'text' => $this->text,
            'evidence' => $this->evidence,
            'source' => $this->source,
            'hadith' => $this->hadith_collection !== null && $this->hadith_number !== null
                ? ['collection' => $this->hadith_collection, 'number' => $this->hadith_number]
                : null,
        ];
    }
}
