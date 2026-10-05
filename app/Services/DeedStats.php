<?php

namespace App\Services;

use App\Enums\SinSeverity;
use App\Models\Deed;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * Day-by-day counts of a user's deeds. Good deeds and the sins the user repented of or expiated
 * count together; the sins left without repentance count on their own.
 */
class DeedStats
{
    /**
     * Today in the user's timezone. Calendar days are handled as UTC dates so that adding days
     * never meets a daylight saving change.
     */
    public function today(User $user): CarbonImmutable
    {
        return CarbonImmutable::parse(CarbonImmutable::now($user->displayTimezone())->toDateString(), 'UTC');
    }

    /**
     * A Y-m-d date of the query string, or null when it is missing or not a real date.
     */
    public function parseDate(mixed $value): ?CarbonImmutable
    {
        if (! is_string($value) || ! preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $parts) || ! checkdate((int) $parts[2], (int) $parts[3], (int) $parts[1])) {
            return null;
        }

        return CarbonImmutable::createFromFormat('!Y-m-d', $value, 'UTC');
    }

    /**
     * Counts for every day from $from to $to (inclusive), days without deeds included.
     *
     * @return list<array{date: string, good: int, bad: int, major: int, repented: int, unrepented: int, net: int}>
     */
    public function days(User $user, CarbonImmutable $from, CarbonImmutable $to): array
    {
        $deeds = $user->deeds()
            ->whereBetween('done_on', [$from->toDateString(), $to->toDateString()])
            ->get(['id', 'kind', 'severity', 'done_on', 'repented_at'])
            ->groupBy(fn (Deed $deed): string => $deed->done_on);

        $days = [];

        for ($date = $from; $date->lte($to); $date = $date->addDay()) {
            $days[] = $this->count($date->toDateString(), $deeds->get($date->toDateString(), collect()));
        }

        return $days;
    }

    /**
     * @param  Collection<int, Deed>  $deeds
     * @return array{date: string, good: int, bad: int, major: int, repented: int, unrepented: int, net: int}
     */
    public function count(string $date, Collection $deeds): array
    {
        $sins = $deeds->filter(fn (Deed $deed): bool => $deed->isSin());
        $repented = $sins->filter(fn (Deed $deed): bool => $deed->repented_at !== null)->count();
        $good = $deeds->count() - $sins->count();
        $unrepented = $sins->count() - $repented;

        return [
            'date' => $date,
            'good' => $good,
            'bad' => $sins->count(),
            'major' => $sins->filter(fn (Deed $deed): bool => $deed->severity === SinSeverity::Major)->count(),
            'repented' => $repented,
            'unrepented' => $unrepented,
            'net' => $good + $repented - $unrepented,
        ];
    }

    /**
     * @param  list<array{good: int, bad: int, major: int, repented: int, unrepented: int, net: int}>  $days
     * @return array{good: int, bad: int, major: int, repented: int, unrepented: int, net: int}
     */
    public function totals(array $days): array
    {
        $totals = ['good' => 0, 'bad' => 0, 'major' => 0, 'repented' => 0, 'unrepented' => 0, 'net' => 0];

        foreach ($days as $day) {
            foreach (array_keys($totals) as $key) {
                $totals[$key] += $day[$key];
            }
        }

        return $totals;
    }

    /**
     * Whether the days with deeds got better or worse: the average of the second half against the first.
     *
     * @param  list<array{good: int, bad: int, net: int}>  $days
     */
    public function trend(array $days): ?string
    {
        $recorded = array_values(array_filter($days, fn (array $day): bool => $day['good'] + $day['bad'] > 0));

        if (count($recorded) < 2) {
            return null;
        }

        $half = intdiv(count($recorded), 2);
        $average = fn (array $part): float => array_sum(array_column($part, 'net')) / max(1, count($part));
        $change = $average(array_slice($recorded, $half)) - $average(array_slice($recorded, 0, $half));

        return $change > 0.5 ? 'up' : ($change < -0.5 ? 'down' : 'steady');
    }
}
