<?php

namespace App\Http\Controllers;

use App\Enums\DeedKind;
use App\Models\Deed;
use App\Services\DeedStats;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DeedReportController extends Controller
{
    /**
     * Longest custom period, in days.
     */
    protected const MAX_DAYS = 366;

    /**
     * How a user's deeds changed over a day, a week, a month or a chosen period.
     */
    public function __invoke(Request $request, DeedStats $stats): Response
    {
        $user = $request->user();
        $today = $stats->today($user);
        $range = in_array($request->query('range'), ['day', 'week', 'month', 'custom'], true) ? $request->query('range') : 'week';

        [$from, $to] = match ($range) {
            'day' => [$today, $today],
            'month' => [$today->subDays(29), $today],
            'custom' => $this->customPeriod($request, $stats, $today) ?? [$today->subDays(6), $today],
            default => [$today->subDays(6), $today],
        };

        $days = $stats->days($user, $from, $to);
        $length = (int) $from->diffInDays($to) + 1;

        $sins = $user->deeds()
            ->where('kind', DeedKind::Bad)
            ->whereBetween('done_on', [$from->toDateString(), $to->toDateString()])
            ->get(['catalog_key', 'severity', 'repented_at']);

        $topSins = $sins->groupBy(fn (Deed $deed): string => $deed->catalog_key ?? '')
            ->map(fn ($group, string $key): array => [
                'key' => $key === '' ? null : $key,
                'severity' => $group->first()->severity?->value,
                'count' => $group->count(),
                'unrepented' => $group->whereNull('repented_at')->count(),
            ])
            ->sortByDesc('count')
            ->take(5)
            ->values();

        return Inertia::render('deeds/reports', [
            'range' => $range,
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'today' => $today->toDateString(),
            'days' => $days,
            'totals' => $stats->totals($days),
            'previous' => $stats->totals($stats->days($user, $from->subDays($length), $from->subDay())),
            'trend' => $stats->trend($days),
            'topSins' => $topSins,
        ]);
    }

    /**
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}|null
     */
    protected function customPeriod(Request $request, DeedStats $stats, CarbonImmutable $today): ?array
    {
        $from = $stats->parseDate($request->query('from'));
        $to = $stats->parseDate($request->query('to'));

        if (! $from || ! $to) {
            return null;
        }

        if ($from->isAfter($to)) {
            [$from, $to] = [$to, $from];
        }

        $to = $to->isAfter($today) ? $today : $to;
        $from = $from->isAfter($to) ? $to : $from;

        if ($from->diffInDays($to) >= self::MAX_DAYS) {
            $from = $to->subDays(self::MAX_DAYS - 1);
        }

        return [$from, $to];
    }
}
