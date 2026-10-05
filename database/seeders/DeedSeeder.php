<?php

namespace Database\Seeders;

use App\Enums\DeedKind;
use App\Enums\SinSeverity;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Demo data: two weeks of self-accounting for the demo student, so the day view and the reports
 * have something to show. Deeds are private, so only that student sees them. Local environment only.
 */
class DeedSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $student = User::query()->where('email', 'student@rattil.test')->first();

        if ($student === null || $student->deeds()->exists()) {
            return;
        }

        $timezone = $student->displayTimezone();

        $record = function (int $daysAgo, string $time, DeedKind $kind, string $title, string $key, ?SinSeverity $severity = null, bool $repented = false) use ($student, $timezone): void {
            $local = now($timezone)->subDays($daysAgo)->setTimeFromTimeString($time);

            $student->deeds()->create([
                'kind' => $kind,
                'title' => $title,
                'catalog_key' => $key,
                'severity' => $severity,
                'done_at' => $local->copy()->utc(),
                'done_on' => $local->toDateString(),
                'repented_at' => $repented ? $local->copy()->addHours(2)->utc() : null,
            ]);
        };

        foreach (range(13, 0) as $daysAgo) {
            $record($daysAgo, '13:00', DeedKind::Good, 'صليت الصلوات في وقتها', 'prayer-on-time');

            if ($daysAgo % 2 === 0) {
                $record($daysAgo, '07:30', DeedKind::Good, 'قرأت وردي من القرآن', 'quran');
            }

            if ($daysAgo % 3 === 0) {
                $record($daysAgo, '15:20', DeedKind::Bad, 'اغتبت زميلًا في الدرس', 'backbiting', SinSeverity::Major, $daysAgo > 3);
            }

            if ($daysAgo % 4 === 1) {
                $record($daysAgo, '18:00', DeedKind::Bad, 'كذبت على صاحبي في أمر بسيط', 'lying', SinSeverity::Minor, $daysAgo > 5);
            }

            if ($daysAgo % 5 === 0) {
                $record($daysAgo, '21:40', DeedKind::Good, 'تصدقت على محتاج', 'charity');
            }
        }
    }
}
