<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('sessions:generate')->dailyAt('00:15')->withoutOverlapping();
Schedule::command('sessions:remind')->everyMinute()->withoutOverlapping();
Schedule::command('sessions:start')->everyMinute()->withoutOverlapping();
Schedule::command('announcements:send')->everyMinute()->withoutOverlapping();
Schedule::command('sessions:close')->everyTenMinutes()->withoutOverlapping();
