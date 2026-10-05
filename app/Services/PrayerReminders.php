<?php

namespace App\Services;

use App\Models\PrayerReminder;
use App\Notifications\PrayerReminderNotification;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Collection;

/**
 * Sends the daily prayer reminders whose time has come in each user's timezone.
 */
class PrayerReminders
{
    /**
     * A reminder missed for longer than this (the scheduler was down) waits for the next day.
     */
    protected const GRACE_MINUTES = 30;

    /**
     * @return int the number of reminders sent
     */
    public function sendDue(?CarbonInterface $now = null): int
    {
        $now ??= now();
        $sent = 0;

        PrayerReminder::query()
            ->with('user')
            ->where('is_active', true)
            ->chunkById(200, function (Collection $reminders) use ($now, &$sent): void {
                foreach ($reminders as $reminder) {
                    if ($this->isDue($reminder, $now)) {
                        $this->send($reminder, $now);
                        $sent++;
                    }
                }
            });

        return $sent;
    }

    public function isDue(PrayerReminder $reminder, CarbonInterface $now): bool
    {
        $user = $reminder->user;

        if ($user === null || ! $user->is_active) {
            return false;
        }

        $local = $now->copy()->setTimezone($user->displayTimezone());
        $due = $local->copy()->setTimeFromTimeString($reminder->time());
        $late = $due->diffInMinutes($local);

        return $late >= 0
            && $late <= self::GRACE_MINUTES
            && $reminder->last_sent_on?->toDateString() !== $local->toDateString();
    }

    protected function send(PrayerReminder $reminder, CarbonInterface $now): void
    {
        $reminder->user->notify(new PrayerReminderNotification($reminder->prayer));

        $reminder->forceFill([
            'last_sent_on' => $now->copy()->setTimezone($reminder->user->displayTimezone())->toDateString(),
        ])->saveQuietly();
    }
}
