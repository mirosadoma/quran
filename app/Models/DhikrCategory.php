<?php

namespace App\Models;

use Database\Factories\DhikrCategoryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A group of adhkar or duas, e.g. morning adhkar or Quranic duas.
 */
#[Table('adhkar_categories')]
#[Fillable(['name', 'slug', 'description', 'icon', 'color', 'sort_order', 'is_active'])]
class DhikrCategory extends Model
{
    /** @use HasFactory<DhikrCategoryFactory> */
    use HasFactory;

    /**
     * Icons the admin can choose from (Lucide names).
     */
    public const ICONS = ['sunrise', 'sunset', 'moon', 'sun', 'book-open', 'hand-heart', 'heart', 'sparkles', 'star', 'house', 'landmark', 'droplets', 'shield', 'graduation-cap'];

    /**
     * Accent colors the admin can choose from.
     */
    public const COLORS = ['emerald', 'gold', 'sky', 'violet', 'rose', 'teal', 'amber', 'indigo'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return HasMany<Dhikr, $this>
     */
    public function adhkar(): HasMany
    {
        return $this->hasMany(Dhikr::class)->orderBy('sort_order')->orderBy('id');
    }

    /**
     * Limit the query to the categories shown to everyone.
     */
    #[Scope]
    protected function active(Builder $query): void
    {
        $query->where('is_active', true);
    }
}
