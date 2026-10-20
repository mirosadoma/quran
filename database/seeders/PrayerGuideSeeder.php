<?php

namespace Database\Seeders;

use App\Models\PrayerGuide;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

/**
 * How to pray the voluntary prayers (qiyam, duha, the rawatib, istikhara...): their facts, steps,
 * virtues and du'as, from database/data/prayers.json in the order of the file.
 * Running it again refreshes the guides from the file.
 */
class PrayerGuideSeeder extends Seeder
{
    /**
     * @param  string|null  $file  The JSON file of the guides (database/data/prayers.json by default).
     */
    public function __construct(protected ?string $file = null) {}

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $guides = json_decode(File::get($this->file ?? database_path('data/prayers.json')), true, flags: JSON_THROW_ON_ERROR);

        foreach ($guides as $order => $guide) {
            PrayerGuide::query()->updateOrCreate(['slug' => $guide['slug']], [
                'sort_order' => $order + 1,
                'icon' => $guide['icon'] ?? 'sparkles',
                'tone' => $guide['tone'] ?? 'emerald',
                'reminder' => $guide['reminder'] ?? null,
                'title' => (string) $guide['title']['ar'],
                'title_en' => (string) ($guide['title']['en'] ?? $guide['title']['ar']),
                'summary' => (string) $guide['summary']['ar'],
                'summary_en' => (string) ($guide['summary']['en'] ?? $guide['summary']['ar']),
                'facts' => array_values($guide['facts'] ?? []),
                'steps' => array_values($guide['steps'] ?? []),
                'virtues' => array_values($guide['virtues'] ?? []),
                'duas' => array_values($guide['duas'] ?? []),
            ]);
        }
    }
}
