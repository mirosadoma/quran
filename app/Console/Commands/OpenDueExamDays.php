<?php

namespace App\Console\Commands;

use App\Enums\ExamDayStatus;
use App\Exceptions\ExamException;
use App\Models\ExamDay;
use App\Services\Exams\ExamDayLifecycle;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;

#[Signature('exams:open')]
#[Description('Open the exam days whose start time has come and invite their students and examiners')]
class OpenDueExamDays extends Command
{
    /**
     * A day without an end time is opened during this many hours after its start; after that the
     * manager opens it by hand (a server back after a long stop sends no invitations to old days).
     * A day with an end time is opened at any time before it ends, so a scheduler started late
     * (or stopped for a while) still opens it.
     */
    protected const WINDOW_HOURS = 5;

    /**
     * Execute the console command.
     */
    public function handle(ExamDayLifecycle $lifecycle): int
    {
        $days = ExamDay::query()
            ->with('exam')
            ->where('status', ExamDayStatus::Scheduled)
            ->where('starts_at', '<=', now())
            ->where(fn (Builder $query) => $query
                ->where('ends_at', '>', now())
                ->orWhere(fn (Builder $query) => $query->whereNull('ends_at')->where('starts_at', '>=', now()->subHours(self::WINDOW_HOURS))))
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
