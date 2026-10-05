<?php

namespace App\Console\Commands;

use App\Enums\SessionStatus;
use App\Exceptions\MeetingException;
use App\Models\HalaqaSession;
use App\Models\Setting;
use App\Services\SessionLifecycle;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('sessions:start')]
#[Description('Open the sessions whose start time has come and notify their students and teacher')]
class StartDueSessions extends Command
{
    /**
     * Sessions are opened during this many minutes after their start time;
     * after that the teacher starts them by hand.
     */
    protected const WINDOW_MINUTES = 15;

    /**
     * Execute the console command.
     */
    public function handle(SessionLifecycle $lifecycle): int
    {
        if (! Setting::get('auto_start_sessions')) {
            return self::SUCCESS;
        }

        $sessions = HalaqaSession::query()
            ->with(['halaqa', 'teacher'])
            ->where('status', SessionStatus::Scheduled)
            ->whereBetween('starts_at', [now()->subMinutes(self::WINDOW_MINUTES), now()])
            ->get();

        $started = 0;

        foreach ($sessions as $session) {
            try {
                $lifecycle->start($session, automatic: true);
                $started++;
            } catch (MeetingException $exception) {
                report($exception);
            }
        }

        $this->components->info("Started {$started} sessions.");

        return self::SUCCESS;
    }
}
