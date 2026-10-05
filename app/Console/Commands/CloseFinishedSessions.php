<?php

namespace App\Console\Commands;

use App\Enums\SessionStatus;
use App\Models\HalaqaSession;
use App\Services\SessionLifecycle;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('sessions:close')]
#[Description('Mark sessions that ended more than 30 minutes ago as completed and record absences')]
class CloseFinishedSessions extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(SessionLifecycle $lifecycle): int
    {
        $sessions = HalaqaSession::query()
            ->with('halaqa')
            ->whereIn('status', [SessionStatus::Scheduled, SessionStatus::Live])
            ->whereRaw(HalaqaSession::endSql(30).' < ?', [now()->toDateTimeString()])
            ->limit(200)
            ->get();

        foreach ($sessions as $session) {
            $lifecycle->end($session);
        }

        $this->components->info("Closed {$sessions->count()} sessions.");

        return self::SUCCESS;
    }
}
