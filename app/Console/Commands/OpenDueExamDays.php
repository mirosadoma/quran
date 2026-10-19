<?php

namespace App\Console\Commands;

use App\Enums\ExamDayStatus;
use App\Exceptions\ExamException;
use App\Models\ExamDay;
use App\Services\Exams\ExamDayLifecycle;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('exams:open')]
#[Description('Open the exam days whose start time has come and invite their students and examiners')]
class OpenDueExamDays extends Command
{
    /**
     * Days are opened during this many minutes after their start time; after that the manager
     * opens them by hand.
     */
    protected const WINDOW_MINUTES = 30;

    /**
     * Execute the console command.
     */
    public function handle(ExamDayLifecycle $lifecycle): int
    {
        $days = ExamDay::query()
            ->with('exam')
            ->where('status', ExamDayStatus::Scheduled)
            ->whereBetween('starts_at', [now()->subMinutes(self::WINDOW_MINUTES), now()])
            ->get();

        $opened = 0;

        foreach ($days as $day) {
            try {
                $lifecycle->open($day);
                $opened++;
            } catch (ExamException $exception) {
                report($exception);
            }
        }

        $this->components->info("Opened {$opened} exam days.");

        return self::SUCCESS;
    }
}
