<?php

use App\Models\SentCode;
use Illuminate\Support\Facades\Schedule;

Schedule::command('sessions:generate')->dailyAt('00:15')->withoutOverlapping();
Schedule::command('sessions:remind')->everyMinute()->withoutOverlapping();
Schedule::command('sessions:start')->everyMinute()->withoutOverlapping();
Schedule::command('announcements:send')->everyMinute()->withoutOverlapping();
Schedule::command('prayers:remind')->everyMinute()->withoutOverlapping();
Schedule::command('sessions:close')->everyTenMinutes()->withoutOverlapping();
Schedule::command('exams:remind')->everyMinute()->withoutOverlapping();
Schedule::command('exams:open')->everyMinute()->withoutOverlapping();
Schedule::command('exams:close')->everyFiveMinutes()->withoutOverlapping();
Schedule::command('alarms:ring')->everyMinute()->withoutOverlapping();
// The sent codes (OTP) are kept two hours only.
Schedule::command('model:prune', ['--model' => [SentCode::class]])->everyTenMinutes()->withoutOverlapping();
