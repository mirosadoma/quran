<?php

namespace App\Models;

use App\Services\Mushaf;
use Database\Factories\HadithFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Attributes\WithoutTimestamps;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One hadith of a collection, with its number, its book and its grade (when the collection is not one of the two Sahihs).
 */
#[Fillable(['hadith_collection_id', 'hadith_book_id', 'number', 'part', 'text', 'text_search', 'grade', 'grader'])]
#[WithoutTimestamps]
class Hadith extends Model
{
    /** @use HasFactory<HadithFactory> */
    use HasFactory;

    /**
     * Longest search accepted.
     */
    public const SEARCH_MAX_LENGTH = 100;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'number' => 'integer',
            'part' => 'integer',
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
     * @return BelongsTo<HadithBook, $this>
     */
    public function book(): BelongsTo
    {
        return $this->belongsTo(HadithBook::class, 'hadith_book_id');
    }

    /**
     * The hadiths of the collection in their order.
     */
    #[Scope]
    protected function ordered(Builder $query): void
    {
        $query->orderBy('number')->orderBy('part');
    }

    /**
     * The hadiths holding every word of the search, whatever its diacritics or letter forms.
     *
     * @param  list<string>  $words  Words already reduced with Mushaf::normalize().
     */
    #[Scope]
    protected function matching(Builder $query, array $words): void
    {
        foreach ($words as $word) {
            $query->where('text_search', 'like', '%'.addcslashes($word, '%_\\').'%');
        }
    }

    /**
     * The words of a search reduced like the text_search column (none for a blank search).
     *
     * @return list<string>
     */
    public static function searchWords(string $search): array
    {
        $normalized = Mushaf::normalize(mb_substr(trim($search), 0, self::SEARCH_MAX_LENGTH));
        // Punctuation is never part of a word, and one letter alone would match every hadith.
        $letters = preg_replace('/[^\p{L}\p{N}\s]+/u', ' ', $normalized) ?? $normalized;

        return array_values(array_filter(explode(' ', $letters), fn (string $word): bool => mb_strlen($word) > 1));
    }

    /**
     * "402", or "402.2" for the second part of hadith 402.
     */
    public function label(): string
    {
        return $this->part > 1 ? "{$this->number}.{$this->part}" : (string) $this->number;
    }

    /**
     * What the pages show of the hadith (with its collection and book when they are loaded).
     *
     * @return array{id: int, number: int, part: int, label: string, text: string, grade: string|null, grader: string|null, book: array{number: int, name: string, name_en: string|null}|null, collection: array{slug: string, name: string, name_en: string, color: string}|null}
     */
    public function toPageArray(): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'part' => $this->part,
            'label' => $this->label(),
            'text' => $this->text,
            'grade' => $this->grade,
            'grader' => $this->grader,
            'book' => $this->relationLoaded('book') && $this->book !== null
                ? ['number' => $this->book->number, 'name' => $this->book->name, 'name_en' => $this->book->name_en]
                : null,
            'collection' => $this->relationLoaded('collection') && $this->collection !== null
                ? ['slug' => $this->collection->slug, 'name' => $this->collection->name, 'name_en' => $this->collection->name_en, 'color' => $this->collection->color]
                : null,
        ];
    }
}
