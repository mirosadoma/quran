<?php

namespace App\Services;

use App\Enums\SessionSource;
use App\Enums\SessionStatus;
use App\Models\Halaqa;
use App\Models\HalaqaSession;
use App\Models\Setting;
use App\Services\Meetings\MeetingManager;
use Carbon\CarbonImmutable;

/**
 * Creates upcoming sessions from each halaqa's weekly schedule.
 */
class SessionScheduler
{
    public function __construct(protected MeetingManager $meetings) {}

    /**
     * Create the missing sessions for the coming days.
     */
    public function generate(Halaqa $halaqa, ?int $days = null): int
    {
        $slots = $halaqa->scheduleSlots();

        if (! $halaqa->is_active || $slots === []) {
            return 0;
        }

        $timezone = $halaqa->timezone ?: config('app.user_timezone');
        $days ??= (int) Setting::get('generate_days_ahead', 14);

        $today = CarbonImmutable::now($timezone)->startOfDay();
        $from = $today;

        if ($halaqa->starts_on !== null) {
            $startsOn = CarbonImmutable::parse($halaqa->starts_on->toDateString(), $timezone);

            if ($startsOn->greaterThan($from)) {
                $from = $startsOn;
            }
        }

        $until = $today->addDays($days);

        // Each generated session remembers its original slot ("Y-m-d H:i" in the halaqa timezone),
        // so a slot is never generated twice even after its session was moved or cancelled.
        $existing = $halaqa->sessions()
            ->whereNotNull('slot_key')
            ->where('slot_key', '>=', $from->format('Y-m-d'))
            ->pluck('slot_key')
            ->flip();

        $created = 0;

        for ($date = $from; $date->lessThanOrEqualTo($until); $date = $date->addDay()) {
            foreach ($slots as $slot) {
                if ($slot['day'] !== $date->dayOfWeek) {
                    continue;
                }

                $slotKey = $date->format('Y-m-d').' '.$slot['time'];
                [$hour, $minute] = array_map('intval', explode(':', $slot['time']));
                $startsAt = $date->setTime($hour, $minute)->utc();

                if ($startsAt->isPast() || isset($existing[$slotKey])) {
                    continue;
                }

                $session = $halaqa->sessions()->create([
                    'teacher_id' => $halaqa->teacher_id,
                    'starts_at' => $startsAt,
                    'duration_minutes' => $halaqa->duration_minutes,
                    'status' => SessionStatus::Scheduled,
                    'source' => SessionSource::Schedule,
                    'slot_key' => $slotKey,
                    'meeting_provider' => $halaqa->meeting_provider,
                ]);

                $session->setRelation('halaqa', $halaqa);
                $this->meetings->tryEnsure($session);

                $existing[$slotKey] = true;
                $created++;
            }
        }

        return $created;
    }

    /**
     * Rebuild future scheduled sessions after the halaqa schedule changed.
     */
    public function regenerate(Halaqa $halaqa): int
    {
        $halaqa->sessions()
            ->where('source', SessionSource::Schedule)
            ->where('status', SessionStatus::Scheduled)
            ->where('starts_at', '>', now())
            ->whereDoesntHave('attendances')
            ->whereDoesntHave('progressRecords')
            ->get()
            ->each(function (HalaqaSession $session): void {
                $this->meetings->release($session);
                $session->delete();
            });

        return $this->generate($halaqa);
    }

    /**
     * Generate sessions for every active halaqa.
     */
    public function generateAll(): int
    {
        $created = 0;

        Halaqa::query()->active()->with('teacher')->each(function (Halaqa $halaqa) use (&$created): void {
            $created += $this->generate($halaqa);
        });

        return $created;
    }
}
