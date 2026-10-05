<?php

namespace Database\Seeders;

use App\Enums\Gender;
use App\Enums\HalaqaGender;
use App\Enums\HalaqaLevel;
use App\Enums\MeetingProvider;
use App\Enums\UserRole;
use App\Models\Academy;
use App\Models\Halaqa;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Demo data: the main academy (with the demo halaqat of DemoSeeder) and two more academies, each
 * with its manager, a teacher and a halaqa, so the public academies page and the join requests
 * have something to show. Every manager signs in with the password "password". Local environment only.
 */
class AcademySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $main = Academy::query()->firstWhere('slug', 'rattil') ?? Academy::query()->orderBy('id')->first() ?? new Academy(['slug' => 'rattil']);

        $main->fill([
            'slug' => 'rattil',
            'name' => 'أكاديمية رتّل',
            'tagline' => 'حلقات حفظ ومراجعة للأطفال والكبار',
            'description' => "أكاديمية لتحفيظ القرآن الكريم عن بُعد، بحلقات للأولاد والبنات والكبار، مع متابعة يومية للحفظ والمراجعة وتعليم أحكام التجويد.\nنستقبل الطلاب من كل الأعمار، ونرتّب لهم الحلقة المناسبة لمستواهم.",
            'email' => 'academy@rattil.test',
            'phone' => '+201000000100',
            'location' => 'القاهرة، مصر',
            'gender' => HalaqaGender::Mixed,
            'timezone' => config('app.user_timezone'),
            'is_active' => true,
            'accepts_requests' => true,
        ])->save();

        $this->manager($main, 'أ. محمد عبد العزيز', 'manager@rattil.test', '+201000000101', Gender::Male);

        $this->academy(
            [
                'slug' => 'noor-albayan',
                'name' => 'أكاديمية نور البيان',
                'tagline' => 'حلقات نسائية للحفظ والتجويد والإجازة',
                'description' => 'أكاديمية نسائية تهتم بتحفيظ القرآن للنساء والفتيات، مع دورات في التجويد ومتن الجزرية، وإعداد للإجازة برواية حفص عن عاصم.',
                'email' => 'noor@rattil.test',
                'location' => 'الإسكندرية، مصر',
                'gender' => HalaqaGender::Female,
            ],
            ['أ. هدى السيد', 'manager2@rattil.test', '+201000000201', Gender::Female],
            ['الأستاذة أسماء محمود', 'asmaa@rattil.test', '+201000000202', Gender::Female],
            ['حلقة التلاوة والتجويد للنساء', HalaqaGender::Female, HalaqaLevel::Beginner, 'violet', [[0, '19:00'], [3, '19:00']], 'تصحيح التلاوة وتعلّم أحكام التجويد خطوة بخطوة.'],
        );

        $this->academy(
            [
                'slug' => 'alfurqan',
                'name' => 'أكاديمية الفرقان',
                'tagline' => 'حفظ متقن ومراجعة منتظمة للشباب',
                'description' => 'أكاديمية للشباب والرجال تركز على الحفظ المتقن والمراجعة المنتظمة، بنظام حلقات صغيرة ومتابعة فردية لكل طالب.',
                'email' => 'furqan@rattil.test',
                'location' => 'الرياض، السعودية',
                'gender' => HalaqaGender::Male,
            ],
            ['أ. سعد العتيبي', 'manager3@rattil.test', '+966500000301', Gender::Male],
            ['الشيخ عبد الله الحربي', 'abdullah.teacher@rattil.test', '+966500000302', Gender::Male],
            ['حلقة حفظ جزء تبارك', HalaqaGender::Male, HalaqaLevel::Intermediate, 'teal', [[1, '20:30'], [5, '20:30']], 'حفظ جزء تبارك مع مراجعة يومية لجزء عمّ.'],
        );
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @param  array{0: string, 1: string, 2: string, 3: Gender}  $manager
     * @param  array{0: string, 1: string, 2: string, 3: Gender}  $teacher
     * @param  array{0: string, 1: HalaqaGender, 2: HalaqaLevel, 3: string, 4: list<array{0: int, 1: string}>, 5: string}  $halaqa
     */
    protected function academy(array $attributes, array $manager, array $teacher, array $halaqa): void
    {
        $academy = Academy::query()->updateOrCreate(['slug' => $attributes['slug']], [
            ...$attributes,
            'timezone' => config('app.user_timezone'),
            'is_active' => true,
            'accepts_requests' => true,
        ]);

        $this->manager($academy, ...$manager);

        $teacherUser = $this->account($academy, UserRole::Teacher, ...$teacher);

        Halaqa::query()->updateOrCreate(['academy_id' => $academy->id, 'name' => $halaqa[0]], [
            'teacher_id' => $teacherUser->id,
            'description' => $halaqa[5],
            'gender' => $halaqa[1],
            'level' => $halaqa[2],
            'capacity' => 10,
            'schedule' => array_map(fn (array $slot): array => ['day' => $slot[0], 'time' => $slot[1]], $halaqa[4]),
            'duration_minutes' => 60,
            'timezone' => config('app.user_timezone'),
            'meeting_provider' => MeetingProvider::tryFrom((string) config('meetings.default')) ?? MeetingProvider::Jitsi,
            'color' => $halaqa[3],
            'is_active' => true,
        ]);
    }

    protected function manager(Academy $academy, string $name, string $email, string $phone, Gender $gender): User
    {
        $manager = $this->account($academy, UserRole::Manager, $name, $email, $phone, $gender);

        $academy->forceFill(['manager_id' => $manager->id])->save();

        return $manager;
    }

    protected function account(Academy $academy, UserRole $role, string $name, string $email, string $phone, Gender $gender): User
    {
        return User::query()->updateOrCreate(['email' => $email], [
            'name' => $name,
            'phone' => $phone,
            'password' => 'password',
            'role' => $role,
            'academy_id' => $academy->id,
            'gender' => $gender,
            'timezone' => config('app.user_timezone'),
            'locale' => 'ar',
            'is_active' => true,
        ]);
    }
}
