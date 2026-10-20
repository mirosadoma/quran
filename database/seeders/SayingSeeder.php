<?php

namespace Database\Seeders;

use App\Enums\SayingKind;
use App\Models\Saying;
use App\Models\SayingCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

/**
 * The transmitted sayings grouped by category: hadith qudsi, words of the Prophet ﷺ, of the companions, of
 * the scholars, and stories with their lesson, from database/data/sayings.json. The ones taken from a hadith
 * point to its collection and number in the hadith tables (HadithSeeder), so the whole hadith can be read.
 * Running it again refreshes the categories and the sayings from the file (matched by slug).
 */
class SayingSeeder extends Seeder
{
    /**
     * @param  string|null  $file  The JSON file of the categories (database/data/sayings.json by default).
     */
    public function __construct(protected ?string $file = null) {}

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = json_decode(File::get($this->file ?? database_path('data/sayings.json')), true, flags: JSON_THROW_ON_ERROR);

        foreach ($categories as $order => $data) {
            $category = SayingCategory::query()->updateOrCreate(['slug' => $data['slug']], [
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'icon' => $data['icon'] ?? 'quote',
                'color' => $data['color'] ?? 'emerald',
                'sort_order' => $order + 1,
            ]);

            foreach ($data['items'] as $position => $item) {
                Saying::query()->updateOrCreate(['slug' => $item['slug']], [
                    'saying_category_id' => $category->id,
                    'kind' => SayingKind::tryFrom($item['kind'] ?? '') ?? SayingKind::Saying,
                    'title' => $item['title'] ?? null,
                    'text' => $item['text'],
                    'attribution' => $item['attribution'],
                    'source' => $item['source'] ?? null,
                    'lesson' => $item['lesson'] ?? null,
                    'hadith_collection' => $item['hadith']['collection'] ?? null,
                    'hadith_number' => $item['hadith']['number'] ?? null,
                    'sort_order' => $position + 1,
                ]);
            }
        }
    }
}
