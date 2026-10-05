<?php

namespace Tests\Unit;

use App\Services\JalalaynGlosses;
use PHPUnit\Framework\TestCase;

class JalalaynGlossesTest extends TestCase
{
    /**
     * @param  array<int, string>  $texts  ayah text by id
     * @param  array<int, string>  $tafsir  Al-Jalalayn text by ayah id
     * @return array<string, string> meaning by "ayah:position"
     */
    protected function meanings(array $texts, array $tafsir): array
    {
        $ayahs = array_map(fn (int $id, string $text): array => ['id' => $id, 'text' => $text], array_keys($texts), $texts);
        $found = (new JalalaynGlosses)->extract($ayahs, $tafsir);

        return array_column(array_map(fn (array $meaning): array => ['key' => $meaning['ayah_id'].':'.$meaning['position'], 'meaning' => $meaning['meaning']], $found), 'meaning', 'key');
    }

    public function test_the_gloss_of_a_rare_word_is_its_meaning_at_its_position(): void
    {
        $meanings = $this->meanings(
            [1 => 'كَلَّا لَا تُطِعْهُ وَٱسْجُدْ وَٱقْتَرِب ۩'],
            [1 => '«كلا» ردع له «لا تطعه» في ترك الصلاة «واسجد» صلِّ لله «واقترب» منه بطاعته.'],
        );

        $this->assertSame('صلِّ لله', $meanings['1:3']);
        // "في ترك الصلاة" and "منه بطاعته" continue the sentence of the ayah.
        $this->assertArrayNotHasKey('1:2', $meanings);
        $this->assertArrayNotHasKey('1:4', $meanings);
    }

    public function test_the_gloss_of_a_short_phrase_belongs_to_its_last_word_when_it_has_its_form(): void
    {
        $meanings = $this->meanings(
            [
                1 => 'قُلُوبٌۭ يَوْمَئِذٍۢ وَاجِفَةٌ',
                2 => 'حُرِّمَتْ عَلَيْكُمُ ٱلْمَيْتَةُ وَٱلدَّمُ',
            ],
            [
                1 => '«قلوب يومئذ واجفة» خائفة قلقة.',
                2 => '«حرمت عليكم الميتة» أي أكلها «والدم» أي المسفوح.',
            ],
        );

        $this->assertSame('خائفة قلقة', $meanings['1:2']);
        // "أكلها" is what is forbidden, not the meaning of الميتة.
        $this->assertArrayNotHasKey('2:2', $meanings);
        $this->assertSame('المسفوح', $meanings['2:3']);
    }

    public function test_grammar_notes_after_a_meaning_are_dropped_and_grammar_alone_is_rejected(): void
    {
        $meanings = $this->meanings(
            [
                1 => 'جَنَّٰتُ عَدْنٍۢ',
                2 => 'يُبَشِّرُكَ',
            ],
            [
                1 => '«جنات عدن» إقامة بدل من الجنة.',
                2 => '«يُبشِّرك» مثقلا ومخففا.',
            ],
        );

        $this->assertSame('إقامة', $meanings['1:1']);
        $this->assertArrayNotHasKey('2:0', $meanings);
    }

    public function test_common_words_get_no_meaning(): void
    {
        $texts = array_fill(1, 13, 'ذِكْرٌۭ');

        $meanings = $this->meanings($texts, [1 => '«ذكر» عظة.']);

        $this->assertSame([], $meanings);
    }

    public function test_bare_letters_ignore_diacritics_and_letter_forms(): void
    {
        $this->assertSame('الكتب', JalalaynGlosses::bare('ٱلْكِتَٰبُ'));
        $this->assertSame('يايها', JalalaynGlosses::bare('يَٰٓأَيُّهَا'));
        $this->assertSame('رحمه', JalalaynGlosses::bare('رَحْمَةٌ'));
    }
}
