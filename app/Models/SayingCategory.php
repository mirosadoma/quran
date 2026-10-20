<?php

namespace App\Models;

use Database\Factories\SayingCategoryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A group of transmitted sayings: hadith qudsi, words of the Prophet ﷺ, of the companions, of the scholars, or stories.
 */
#[Fillable(['slug', 'name', 'description', 'icon', 'color', 'sort_order'])]
class SayingCategory extends Model
{
    /** @use HasFactory<SayingCategoryFactory> */
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
     * @return HasMany<Saying, $this>
     */
    public function sayings(): HasMany
    {
        return $this->hasMany(Saying::class)->orderBy('sort_order')->orderBy('id');
    }

    /**
     * The categories in the order of the page.
     */
    #[Scope]
    protected function ordered(Builder $query): void
    {
        $query->orderBy('sort_order')->orderBy('id');
    }

    /**
     * What the page shows of the category, with its sayings when they are loaded.
     *
     * @return array{id: int, slug: string, name: string, description: string|null, icon: string, color: string, sayings: list<array<string, mixed>>}
     */
    public function toPageArray(): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'description' => $this->description,
            'icon' => $this->icon,
            'color' => $this->color,
            'sayings' => $this->relationLoaded('sayings') ? $this->sayings->map(fn (Saying $saying): array => $saying->toPageArray())->values()->all() : [],
        ];
    }
}
