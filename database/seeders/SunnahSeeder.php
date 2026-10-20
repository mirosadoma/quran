<?php

namespace Database\Seeders;

use App\Models\Sunnah;
use App\Models\SunnahCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

/**
 * The neglected sunnahs of the Prophet ﷺ grouped by category (eating, sleep, prayer, the home...), each with
 * how it is done, its hadith and where it is narrated, from database/data/sunnahs.json. The hadiths point to
 * their collection and number in the hadith tables (HadithSeeder), so the whole hadith can be read.
 * Running it again refreshes the categories and the sunnahs from the file (matched by slug).
 */
class SunnahSeeder extends Seeder
{
    /**
     * @param  string|null  $file  The JSON file of the categories (database/data/sunnahs.json by default).
     */
    public function __construct(protected ?string $file = null) {}

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = json_decode(File::get($this->file ?? database_path('data/sunnahs.json')), true, flags: JSON_THROW_ON_ERROR);

        foreach ($categories as $order => $data) {
            $category = SunnahCategory::query()->updateOrCreate(['slug' => $data['slug']], [
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'icon' => $data['icon'] ?? 'sparkles',
                'color' => $data['color'] ?? 'emerald',
                'sort_order' => $order + 1,
            ]);

            foreach ($data['items'] as $position => $item) {
                Sunnah::query()->updateOrCreate(['slug' => $item['slug']], [
                    'sunnah_category_id' => $category->id,
                    'title' => $item['title'],
                    'text' => $item['text'],
                    'evidence' => $item['evidence'],
                    'source' => $item['source'],
                    'hadith_collection' => $item['hadith']['collection'] ?? null,
                    'hadith_number' => $item['hadith']['number'] ?? null,
                    'sort_order' => $position + 1,
                ]);
            }
        }
    }
}
