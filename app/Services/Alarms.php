<?php

namespace App\Services;

use App\Models\Alarm;
use App\Notifications\AlarmNotification;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Collection;

/**
 * Rings the alarms whose time has come in each user's timezone (as a notification, so they
 * reach a closed app through push; the open app rings them on screen by itself).
 */
class Alarms
{
    /**
     * An alarm missed for longer than this (the scheduler was down) waits for the next day.
     */
    protected const GRACE_MINUTES = 30;

    /**
     * @return int the number of alarms rung
     */
    public function ringDue(?CarbonInterface $now = null): int
    {
        $now ??= now();
        $rung = 0;

        Alarm::query()
            ->with('user')
            ->where('is_active', true)
            ->chunkById(200, function (Collection $alarms) use ($now, &$rung): void {
                foreach ($alarms as $alarm) {
                    if ($this->isDue($alarm, $now)) {
                        $this->ring($alarm, $now);
                        $rung++;
                    }
                }
            });

        return $rung;
    }

    public function isDue(Alarm $alarm, CarbonInterface $now): bool
    {
        $user = $alarm->user;

        if ($user === null || ! $user->is_active) {
            return false;
        }

        $local = $now->copy()->setTimezone($user->displayTimezone());

        if (! $alarm->ringsOn($local->dayOfWeek)) {
            return false;
        }

        $due = $local->copy()->setTimeFromTimeString($alarm->time());
        $late = $due->diffInMinutes($local);

        return $late >= 0
            && $late <= self::GRACE_MINUTES
            && $alarm->last_rang_on?->toDateString() !== $local->toDateString()
            && $alarm->last_dismissed_on?->toDateString() !== $local->toDateString();
    }

    protected function ring(Alarm $alarm, CarbonInterface $now): void
    {
        $alarm->user->notify(new AlarmNotification($alarm));

        $alarm->forceFill([
            'last_rang_on' => $now->copy()->setTimezone($alarm->user->displayTimezone())->toDateString(),
        ])->saveQuietly();
    }
}
