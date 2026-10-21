<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database: the administration account and the content of the platform
     * everywhere, and the demo academy with its teachers, students, halaqat and sessions on the
     * developer's machine only (APP_ENV=local). The settings need no rows: Setting::defaults() applies
     * until the administration saves the settings page.
     */
    public function run(): void
    {
        $this->call([
            AdminSeeder::class,
            ContentSeeder::class,
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
