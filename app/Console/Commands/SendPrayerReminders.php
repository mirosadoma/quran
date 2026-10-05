<?php

namespace App\Console\Commands;

use App\Services\PrayerReminders;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('prayers:remind')]
#[Description('Remind users of the night prayer and duha at the time each of them chose')]
class SendPrayerReminders extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(PrayerReminders $reminders): int
    {
        $count = $reminders->sendDue();

        $this->components->info("Sent {$count} prayer reminders.");

        return self::SUCCESS;
    }
}
