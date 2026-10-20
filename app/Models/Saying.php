<?php

namespace App\Models;

use App\Enums\SayingKind;
use Database\Factories\SayingFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One transmitted saying or story, with who said it, where it is found and its lesson.
 */
#[Fillable(['saying_category_id', 'slug', 'kind', 'title', 'text', 'attribution', 'source', 'lesson', 'hadith_collection', 'hadith_number', 'sort_order'])]
class Saying extends Model
{
    /** @use HasFactory<SayingFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'kind' => SayingKind::class,
            'hadith_number' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<SayingCategory, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(SayingCategory::class, 'saying_category_id');
    }

    /**
     * What the page shows of the saying.
     *
     * @return array{id: int, slug: string, kind: string, title: string|null, text: string, attribution: string, source: string|null, lesson: string|null, hadith: array{collection: string, number: int}|null}
     */
    public function toPageArray(): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'kind' => $this->kind->value,
            'title' => $this->title,
            'text' => $this->text,
            'attribution' => $this->attribution,
            'source' => $this->source,
            'lesson' => $this->lesson,
            'hadith' => $this->hadith_collection !== null && $this->hadith_number !== null
                ? ['collection' => $this->hadith_collection, 'number' => $this->hadith_number]
                : null,
        ];
    }
}
