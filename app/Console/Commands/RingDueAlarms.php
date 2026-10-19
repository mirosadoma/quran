<?php

namespace App\Console\Commands;

use App\Services\Alarms;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('alarms:ring')]
#[Description('Ring the alarms of the users whose time has come (memorization, revision, prayers, adhkar...)')]
class RingDueAlarms extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(Alarms $alarms): int
    {
        $count = $alarms->ringDue();

        $this->components->info("Rang {$count} alarms.");

        return self::SUCCESS;
    }
}
