<?php

namespace App\Console\Commands;

use App\Models\Halaqa;
use App\Services\SessionScheduler;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('sessions:generate {--days= : Number of days to schedule ahead (default from settings)}')]
#[Description('Create upcoming sessions (and their meeting links) from every halaqa weekly schedule')]
class GenerateSessions extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(SessionScheduler $scheduler): int
    {
        $days = $this->option('days') !== null ? (int) $this->option('days') : null;
        $created = 0;

        Halaqa::query()->active()->with('teacher')->each(function (Halaqa $halaqa) use ($scheduler, $days, &$created): void {
            $created += $scheduler->generate($halaqa, $days);
        });

        $this->components->info("Created {$created} sessions.");

        return self::SUCCESS;
    }
}
