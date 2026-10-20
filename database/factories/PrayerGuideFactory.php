<?php

namespace Database\Factories;

use App\Models\PrayerGuide;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PrayerGuide>
 */
class PrayerGuideFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'slug' => fake()->unique()->slug(2),
            'sort_order' => 1,
            'icon' => 'sparkles',
            'tone' => 'emerald',
            'reminder' => null,
            'title' => 'صلاة الضحى',
            'title_en' => 'Duha prayer',
            'summary' => 'ركعتان بعد ارتفاع الشمس.',
            'summary_en' => 'Two rak\'ahs after the sun has risen.',
            'facts' => [['label' => ['ar' => 'الوقت', 'en' => 'Time'], 'value' => ['ar' => 'من ارتفاع الشمس إلى قبيل الظهر', 'en' => 'From sunrise until shortly before noon']]],
            'steps' => [['ar' => 'توضأ ثم صلِّ ركعتين.', 'en' => 'Make wudu, then pray two rak\'ahs.']],
            'virtues' => [['text' => 'يُصبح على كل سُلامى من أحدكم صدقة... ويُجزئ من ذلك ركعتان يركعهما من الضحى.', 'source' => 'رواه مسلم']],
            'duas' => [],
        ];
    }
}
