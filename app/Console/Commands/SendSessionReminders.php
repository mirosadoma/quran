<?php

namespace App\Console\Commands;

use App\Enums\SessionStatus;
use App\Models\HalaqaSession;
use App\Models\Setting;
use App\Notifications\SessionReminder;
use App\Services\Meetings\MeetingManager;
use App\Services\Notifier;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('sessions:remind')]
#[Description('Remind teachers and students shortly before their sessions start')]
class SendSessionReminders extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(MeetingManager $meetings, Notifier $notifier): int
    {
        $minutes = (int) Setting::get('reminder_minutes', 15);

        if ($minutes <= 0) {
            return self::SUCCESS;
        }

        $sessions = HalaqaSession::query()
            ->with(['halaqa.students', 'teacher'])
            ->where('status', SessionStatus::Scheduled)
            ->whereNull('reminder_sent_at')
            ->whereBetween('starts_at', [now(), now()->addMinutes($minutes)])
            ->get();

        foreach ($sessions as $session) {
            $session->forceFill(['reminder_sent_at' => now()])->save();
            $meetings->tryEnsure($session);

            $recipients = $session->halaqa->students->where('is_active', true)->values();

            if ($session->teacher !== null) {
                $recipients->push($session->teacher);
            }

            $notifier->send($recipients, new SessionReminder($session));
        }

        $this->components->info("Sent reminders for {$sessions->count()} sessions.");

        return self::SUCCESS;
    }
}
