<?php

namespace App\Console\Commands;

use App\Enums\ExamDayStatus;
use App\Models\ExamDay;
use App\Services\Exams\ExamDayLifecycle;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;

#[Signature('exams:remind')]
#[Description('Remind students and examiners of their exam the day before and an hour before it starts')]
class RemindExams extends Command
{
    /**
     * The second reminder is sent this many minutes before the day starts.
     */
    protected const BEFORE_MINUTES = 60;

    /**
     * Execute the console command.
     */
    public function handle(ExamDayLifecycle $lifecycle): int
    {
        $sent = 0;

        $dayBefore = ExamDay::query()
            ->with('exam')
            ->where('status', ExamDayStatus::Scheduled)
            ->whereNull('reminder_day_before_sent_at')
            ->whereBetween('starts_at', [now()->addHours(23), now()->addHours(25)])
            ->get();

        foreach ($dayBefore as $day) {
            $lifecycle->remind($day, dayBefore: true);
            $sent++;
        }

        $soon = ExamDay::query()
            ->with('exam')
            ->where('status', ExamDayStatus::Scheduled)
            ->whereNull('reminder_sent_at')
            ->whereBetween('starts_at', [now(), now()->addMinutes(self::BEFORE_MINUTES)])
            ->tap(fn (Builder $query) => $query)
            ->get();

        foreach ($soon as $day) {
            $lifecycle->remind($day, dayBefore: false);
            $sent++;
        }

        $this->components->info("Sent reminders for {$sent} exam days.");

        return self::SUCCESS;
    }
}
