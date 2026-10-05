<?php

namespace Database\Seeders;

use App\Enums\TafsirEdition;
use App\Models\Ayah;
use App\Models\Tafsir;
use App\Models\WordMeaning;
use App\Services\JalalaynGlosses;
use App\Services\Mushaf;
use Illuminate\Database\Seeder;

/**
 * Meanings of the rare words of the Quran, shown in green in the mushaf with a tooltip.
 *
 * They are taken from the glosses of Tafsir Al-Jalalayn (seeded by TafsirSeeder):
 * «أعجاز» أصول, «فتماروا» تجادلوا... (see App\Services\JalalaynGlosses for the rules).
 * Run AyahSeeder and TafsirSeeder first. Running it again refreshes these meanings and
 * keeps every meaning an admin wrote or removed from the mushaf.
 */
class WordMeaningSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(JalalaynGlosses $glosses, Mushaf $mushaf): void
    {
        $ayahs = Ayah::query()->orderBy('id')->get(['id', 'text'])->map(fn (Ayah $ayah): array => ['id' => $ayah->id, 'text' => $ayah->text])->all();
        $tafsir = Tafsir::query()->where('edition', TafsirEdition::Jalalayn)->pluck('text', 'ayah_id')->all();

        $manual = WordMeaning::query()
            ->where('source', WordMeaning::MANUAL)
            ->get(['ayah_id', 'position'])
            ->mapWithKeys(fn (WordMeaning $meaning): array => ["{$meaning->ayah_id}:{$meaning->position}" => true]);

        WordMeaning::query()->where('source', WordMeaning::JALALAYN)->delete();

        $rows = collect($glosses->extract($ayahs, $tafsir))
            ->reject(fn (array $meaning): bool => $manual->has("{$meaning['ayah_id']}:{$meaning['position']}"))
            ->map(fn (array $meaning): array => [
                ...$meaning,
                'word' => mb_substr($meaning['word'], 0, 100),
                'source' => WordMeaning::JALALAYN,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

        foreach ($rows->chunk(500) as $chunk) {
            WordMeaning::query()->insert($chunk->values()->all());
        }

        $mushaf->flush();
    }
}
