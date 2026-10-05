<?php

namespace App\Models;

use Database\Factories\DhikrFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One dhikr or dua with how many times to repeat it and its source.
 */
#[Table('adhkar')]
#[Fillable(['dhikr_category_id', 'title', 'text', 'repeat', 'reference', 'virtue', 'sort_order', 'is_active'])]
class Dhikr extends Model
{
    /** @use HasFactory<DhikrFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'repeat' => 'integer',
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<DhikrCategory, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(DhikrCategory::class, 'dhikr_category_id');
    }

    /**
     * Limit the query to the adhkar shown to everyone.
     */
    #[Scope]
    protected function active(Builder $query): void
    {
        $query->where('is_active', true);
    }
}
