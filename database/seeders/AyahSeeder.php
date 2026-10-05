<?php

namespace Database\Seeders;

use App\Models\Ayah;
use App\Services\Mushaf;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

/**
 * The full Quran text for the mushaf: 6236 ayahs in the Uthmani script with their
 * page in the Madani mushaf (604 pages), juz, hizb quarter and sajda.
 *
 * Data: database/data/quran/ayahs.json, built from the Tanzil Quran text
 * (tanzil.net, editions quran-uthmani and quran-simple-clean through api.alquran.cloud).
 * The basmala opening each surah is shown by the reader, so it is not part of the first ayah.
 * "text_clean" (common spelling, no diacritics) is kept as text_simple to check a recitation
 * against it, and reduced to bare letters into text_search, used by the mushaf search.
 */
class AyahSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(Mushaf $mushaf): void
    {
        $ayahs = json_decode(File::get(database_path('data/quran/ayahs.json')), true, flags: JSON_THROW_ON_ERROR);

        foreach (array_chunk($ayahs, 500) as $chunk) {
            Ayah::query()->upsert(
                array_map(fn (array $ayah): array => [
                    'id' => $ayah['id'],
                    'surah' => $ayah['surah'],
                    'ayah' => $ayah['ayah'],
                    'page' => $ayah['page'],
                    'juz' => $ayah['juz'],
                    'hizb_quarter' => $ayah['hizb_quarter'],
                    'sajda' => $ayah['sajda'],
                    'text' => $ayah['text'],
                    'text_simple' => $ayah['text_clean'],
                    'text_search' => Mushaf::normalize($ayah['text_clean']),
                ], $chunk),
                ['id'],
            );
        }

        $mushaf->flush();
    }
}
