<?php

namespace App\Models;

use Database\Factories\ReciterFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * A sheikh whose recitation can be played in the mushaf, one audio file per ayah.
 */
#[Fillable(['name', 'name_en', 'slug', 'description', 'audio_url', 'is_active', 'sort_order'])]
class Reciter extends Model
{
    /** @use HasFactory<ReciterFactory> */
    use HasFactory;

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
     * Limit the query to reciters shown in the mushaf, in display order.
     */
    #[Scope]
    protected function available(Builder $query): void
    {
        $query->where('is_active', true)->orderBy('sort_order')->orderBy('id');
    }

    /**
     * @return array{id: int, name: string, name_en: string|null, description: string|null, audio_url: string}
     */
    public function toPlayerArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'name_en' => $this->name_en,
            'description' => $this->description,
            'audio_url' => rtrim($this->audio_url, '/').'/',
        ];
    }
}
