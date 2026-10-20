<?php

namespace App\Models;

use Database\Factories\HadithCollectionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A book of hadith (Sahih al-Bukhari, Sahih Muslim...) with its books (kutub) and hadiths.
 */
#[Fillable(['slug', 'name', 'name_en', 'author', 'author_en', 'description', 'description_en', 'icon', 'color', 'sort_order'])]
class HadithCollection extends Model
{
    /** @use HasFactory<HadithCollectionFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return HasMany<HadithBook, $this>
     */
    public function books(): HasMany
    {
        return $this->hasMany(HadithBook::class)->orderBy('number');
    }

    /**
     * @return HasMany<Hadith, $this>
     */
    public function hadiths(): HasMany
    {
        return $this->hasMany(Hadith::class);
    }

    /**
     * The collections in the order of the hadith page.
     */
    #[Scope]
    protected function ordered(Builder $query): void
    {
        $query->orderBy('sort_order')->orderBy('id');
    }

    /**
     * What the pages show of the collection.
     *
     * @return array{id: int, slug: string, name: string, name_en: string, author: string, author_en: string, description: string|null, description_en: string|null, icon: string, color: string, books_count: int|null, hadiths_count: int|null}
     */
    public function toPageArray(): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'name_en' => $this->name_en,
            'author' => $this->author,
            'author_en' => $this->author_en,
            'description' => $this->description,
            'description_en' => $this->description_en,
            'icon' => $this->icon,
            'color' => $this->color,
            'books_count' => isset($this->books_count) ? (int) $this->books_count : null,
            'hadiths_count' => isset($this->hadiths_count) ? (int) $this->hadiths_count : null,
        ];
    }
}
