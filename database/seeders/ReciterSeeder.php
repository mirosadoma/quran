<?php

namespace Database\Seeders;

use App\Models\Reciter;
use Illuminate\Database\Seeder;

/**
 * The sheikhs the reader can listen to in the mushaf (Hafs from Asim, murattal).
 * Audio is streamed from everyayah.com: one MP3 per ayah named SSSAAA.mp3,
 * so the player can recite an ayah, a page, a range or a whole surah.
 * To add a reciter, add a row with the folder of his recitation on everyayah.com.
 */
class ReciterSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $reciters = [
            [
                'slug' => 'husary',
                'name' => 'محمود خليل الحصري',
                'name_en' => 'Mahmoud Khalil Al-Husary',
                'description' => 'مرتّل · حفص عن عاصم',
                'audio_url' => 'https://everyayah.com/data/Husary_128kbps/',
            ],
            [
                'slug' => 'yasser-al-dosari',
                'name' => 'ياسر الدوسري',
                'name_en' => 'Yasser Al-Dosari',
                'description' => 'مرتّل · حفص عن عاصم',
                'audio_url' => 'https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/',
            ],
            [
                'slug' => 'sudais',
                'name' => 'عبد الرحمن السديس',
                'name_en' => 'Abdul Rahman Al-Sudais',
                'description' => 'مرتّل · حفص عن عاصم',
                'audio_url' => 'https://everyayah.com/data/Abdurrahmaan_As-Sudais_192kbps/',
            ],
        ];

        foreach ($reciters as $order => $reciter) {
            Reciter::query()->updateOrCreate(
                ['slug' => $reciter['slug']],
                [...$reciter, 'sort_order' => $order + 1, 'is_active' => true],
            );
        }
    }
}
