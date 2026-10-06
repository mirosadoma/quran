<?php

namespace Database\Seeders;

use App\Enums\Gender;
use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::query()->updateOrCreate(['email' => 'admin@rattil.test'], [
            'name' => 'إدارة المنصة',
            'phone' => '+201000000000',
            'password' => 'password',
            'role' => UserRole::Admin,
            'gender' => Gender::Male,
            'timezone' => config('app.user_timezone'),
            'locale' => 'ar',
            'is_active' => true,
        ]);

        // Content of the platform: the mushaf, its tafsir, word meanings and reciters, and the adhkar.
        $this->call([
            AyahSeeder::class,
            TafsirSeeder::class,
            WordMeaningSeeder::class,
            ReciterSeeder::class,
            DhikrCategorySeeder::class,
            DhikrSeeder::class,
        ]);

        if (app()->environment('local')) {
            $this->call([
                AcademySeeder::class,
                DemoSeeder::class,
                RecitationSubmissionSeeder::class,
                HalaqaAnnouncementSeeder::class,
                DeedSeeder::class,
                AcademyJoinRequestSeeder::class,
                ContactMessageSeeder::class,
                CommunityPostSeeder::class,
            ]);
        }
    }
}
