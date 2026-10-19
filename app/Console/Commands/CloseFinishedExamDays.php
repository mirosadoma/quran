<?php

namespace App\Console\Commands;

use App\Enums\ExamDayStatus;
use App\Models\ExamDay;
use App\Services\Exams\ExamDayLifecycle;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('exams:close')]
#[Description('Close the exam days whose end time has passed (days without an end time are closed by hand)')]
class CloseFinishedExamDays extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(ExamDayLifecycle $lifecycle): int
    {
        $days = ExamDay::query()
            ->where('status', '!=', ExamDayStatus::Closed)
            ->whereNotNull('ends_at')
            ->where('ends_at', '<=', now())
            ->get();

        foreach ($days as $day) {
            $lifecycle->close($day);
        }

        $this->components->info("Closed {$days->count()} exam days.");

        return self::SUCCESS;
    }
}
