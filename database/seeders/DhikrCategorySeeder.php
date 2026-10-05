<?php

namespace Database\Seeders;

use App\Models\DhikrCategory;
use Illuminate\Database\Seeder;

/**
 * The categories of the adhkar and duas page. The admin can rename, reorder,
 * disable or delete them later from the page itself.
 * Their adhkar are added by DhikrSeeder (matched by slug).
 */
class DhikrCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            ['slug' => 'morning', 'name' => 'أذكار الصباح', 'description' => 'تُقال بعد صلاة الفجر حتى طلوع الشمس', 'icon' => 'sunrise', 'color' => 'gold'],
            ['slug' => 'evening', 'name' => 'أذكار المساء', 'description' => 'تُقال من بعد العصر حتى غروب الشمس', 'icon' => 'sunset', 'color' => 'violet'],
            ['slug' => 'after-prayer', 'name' => 'أذكار بعد الصلاة', 'description' => 'تُقال بعد السلام من الصلاة المفروضة', 'icon' => 'landmark', 'color' => 'teal'],
            ['slug' => 'sleep', 'name' => 'أذكار النوم', 'description' => 'تُقال عند النوم', 'icon' => 'moon', 'color' => 'indigo'],
            ['slug' => 'waking', 'name' => 'أذكار الاستيقاظ', 'description' => 'تُقال عند الاستيقاظ من النوم', 'icon' => 'sun', 'color' => 'amber'],
            ['slug' => 'quran-duas', 'name' => 'أدعية من القرآن الكريم', 'description' => 'أدعية الأنبياء والصالحين كما وردت في القرآن', 'icon' => 'book-open', 'color' => 'emerald'],
            ['slug' => 'prophetic-duas', 'name' => 'أدعية نبوية', 'description' => 'أدعية جامعة من السنة الصحيحة', 'icon' => 'hand-heart', 'color' => 'rose'],
            ['slug' => 'knowledge', 'name' => 'أدعية طلب العلم وحفظ القرآن', 'description' => 'قبل الدرس والحفظ والمراجعة', 'icon' => 'graduation-cap', 'color' => 'sky'],
            ['slug' => 'daily', 'name' => 'أذكار اليوم والليلة', 'description' => 'المنزل والمسجد والوضوء والطعام', 'icon' => 'house', 'color' => 'gold'],
            ['slug' => 'tasbih', 'name' => 'التسبيح والاستغفار', 'description' => 'أذكار خفيفة على اللسان ثقيلة في الميزان', 'icon' => 'sparkles', 'color' => 'emerald'],
        ];

        foreach ($categories as $order => $category) {
            DhikrCategory::query()->firstOrCreate(
                ['slug' => $category['slug']],
                [...$category, 'sort_order' => $order + 1, 'is_active' => true],
            );
        }
    }
}
