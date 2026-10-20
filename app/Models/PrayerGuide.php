<?php

namespace App\Models;

use Database\Factories\PrayerGuideFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * How to pray one of the voluntary prayers (qiyam, duha, the rawatib, istikhara...):
 * its facts, steps, virtues and du'as, in Arabic and English.
 */
#[Fillable(['slug', 'sort_order', 'icon', 'tone', 'reminder', 'title', 'title_en', 'summary', 'summary_en', 'facts', 'steps', 'virtues', 'duas'])]
class PrayerGuide extends Model
{
    /** @use HasFactory<PrayerGuideFactory> */
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
            'facts' => 'array',
            'steps' => 'array',
            'virtues' => 'array',
            'duas' => 'array',
        ];
    }

    /**
     * The guides in the order of the prayers page.
     */
    #[Scope]
    protected function ordered(Builder $query): void
    {
        $query->orderBy('sort_order')->orderBy('id');
    }

    /**
     * What the list of the prayers page shows of the guide.
     *
     * @return array{slug: string, icon: string, tone: string, reminder: string|null, title: array{ar: string, en: string}, summary: array{ar: string, en: string}}
     */
    public function toSummaryArray(): array
    {
        return [
            'slug' => $this->slug,
            'icon' => $this->icon,
            'tone' => $this->tone,
            'reminder' => $this->reminder,
            'title' => ['ar' => $this->title, 'en' => $this->title_en ?: $this->title],
            'summary' => ['ar' => $this->summary, 'en' => $this->summary_en ?: $this->summary],
        ];
    }

    /**
     * The whole guide, as its page shows it.
     *
     * @return array{slug: string, icon: string, tone: string, reminder: string|null, title: array{ar: string, en: string}, summary: array{ar: string, en: string}, facts: list<array{label: array{ar: string, en: string}, value: array{ar: string, en: string}}>, steps: list<array{ar: string, en: string}>, virtues: list<array{text: string, source: string}>, duas: list<array{title: array{ar: string, en: string}, text: string, source: string}>}
     */
    public function toGuideArray(): array
    {
        return [
            ...$this->toSummaryArray(),
            'facts' => array_values($this->facts ?? []),
            'steps' => array_values($this->steps ?? []),
            'virtues' => array_values($this->virtues ?? []),
            'duas' => array_values($this->duas ?? []),
        ];
    }
}
