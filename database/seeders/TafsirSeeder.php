<?php

namespace Database\Seeders;

use App\Enums\TafsirEdition;
use App\Models\Tafsir;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

/**
 * The tafsir shown when a reader taps an ayah, one file per book in database/data/quran:
 * - tafsir-muyassar.json: التفسير الميسر (King Fahd Glorious Quran Printing Complex)
 * - tafsir-jalalayn.json: تفسير الجلالين
 * (editions ar.muyassar and ar.jalalayn through api.alquran.cloud).
 *
 * Run AyahSeeder first: every row points to its ayah.
 */
class TafsirSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        foreach (TafsirEdition::cases() as $edition) {
            $rows = json_decode(File::get(database_path("data/quran/tafsir-{$edition->value}.json")), true, flags: JSON_THROW_ON_ERROR);

            foreach (array_chunk($rows, 500) as $chunk) {
                Tafsir::query()->upsert(
                    array_map(fn (array $row): array => [
                        'edition' => $edition->value,
                        'ayah_id' => $row['ayah_id'],
                        'text' => $row['text'],
                    ], $chunk),
                    ['edition', 'ayah_id'],
                    ['text'],
                );
            }
        }
    }
}
