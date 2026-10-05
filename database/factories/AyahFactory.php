<?php

namespace Database\Factories;

use App\Models\Ayah;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Ayah>
 */
class AyahFactory extends Factory
{
    /**
     * Ayah numbers handed out so far (ids are not auto-incremented).
     */
    protected static int $number = 0;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $number = ++static::$number;

        return [
            'id' => $number,
            'surah' => 1,
            'ayah' => $number,
            'page' => 1,
            'juz' => 1,
            'hizb_quarter' => 1,
            'sajda' => false,
            'text' => 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ',
            'text_search' => 'الحمد لله رب العالمين',
        ];
    }
}
