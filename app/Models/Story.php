<?php

namespace App\Models;

use App\Enums\StoryKind;
use Database\Factories\StoryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * A story for children or the story of a prophet: sections of paragraphs with the Quran passages
 * read after them (only references: the text comes from the ayahs table), and its lessons.
 */
#[Fillable(['kind', 'slug', 'sort_order', 'title', 'title_en', 'summary', 'summary_en', 'icon', 'tone', 'sections', 'lessons', 'audio'])]
class Story extends Model
{
    /** @use HasFactory<StoryFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'kind' => StoryKind::class,
            'sort_order' => 'integer',
            'sections' => 'array',
            'lessons' => 'array',
        ];
    }

    /**
     * The stories of one library.
     */
    #[Scope]
    protected function ofKind(Builder $query, StoryKind $kind): void
    {
        $query->where('kind', $kind->value);
    }

    /**
     * The stories in the order of their library.
     */
    #[Scope]
    protected function ordered(Builder $query): void
    {
        $query->orderBy('sort_order')->orderBy('slug');
    }
}
