<?php

namespace Database\Seeders;

use App\Services\ContentCache;
use Illuminate\Database\Seeder;

/**
 * The content of the platform, the same on every server: the mushaf, its tafsir, word meanings and reciters,
 * the adhkar, the stories, the guide of the prayers, the books of hadith, the sunnahs and the sayings.
 * Safe to run again (php artisan db:seed --class=ContentSeeder --force): it refreshes the content from
 * database/data and never touches the accounts, the academies or their halaqat.
 */
class ContentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(ContentCache $cache): void
    {
        $this->call([
            AyahSeeder::class,
            TafsirSeeder::class,
            WordMeaningSeeder::class,
            ReciterSeeder::class,
            DhikrCategorySeeder::class,
            DhikrSeeder::class,
            StorySeeder::class,
            PrayerGuideSeeder::class,
            HadithSeeder::class,
            SunnahSeeder::class,
            SayingSeeder::class,
        ]);

        // The seeders write many rows at once (no model events): the cached content is built again.
        $cache->flushAll();
    }
}
