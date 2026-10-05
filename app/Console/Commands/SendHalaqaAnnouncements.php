<?php

namespace App\Console\Commands;

use App\Services\AnnouncementDispatcher;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('announcements:send')]
#[Description('Deliver the halaqa messages whose scheduled time or session has come')]
class SendHalaqaAnnouncements extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(AnnouncementDispatcher $dispatcher): int
    {
        $count = $dispatcher->deliverDue();

        $this->components->info("Delivered {$count} messages.");

        return self::SUCCESS;
    }
}
