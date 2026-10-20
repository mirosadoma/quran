<?php

namespace App\Models;

use Database\Factories\SunnahCategoryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A group of neglected sunnahs, e.g. the sunnahs of eating or of sleep.
 */
#[Fillable(['slug', 'name', 'description', 'icon', 'color', 'sort_order'])]
class SunnahCategory extends Model
{
    /** @use HasFactory<SunnahCategoryFactory> */
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
     * @return HasMany<Sunnah, $this>
     */
    public function sunnahs(): HasMany
    {
        return $this->hasMany(Sunnah::class)->orderBy('sort_order')->orderBy('id');
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
     * What the page shows of the category, with its sunnahs when they are loaded.
     *
     * @return array{id: int, slug: string, name: string, description: string|null, icon: string, color: string, sunnahs: list<array<string, mixed>>}
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
            'sunnahs' => $this->relationLoaded('sunnahs') ? $this->sunnahs->map(fn (Sunnah $sunnah): array => $sunnah->toPageArray())->values()->all() : [],
        ];
    }
}
