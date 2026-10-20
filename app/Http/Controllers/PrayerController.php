<?php

namespace App\Http\Controllers;

use App\Enums\PrayerReminderType;
use App\Models\PrayerGuide;
use App\Models\PrayerReminder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PrayerController extends Controller
{
    /**
     * The voluntary prayers: how to pray them, their virtues and du'as, and the daily reminders.
     */
    public function index(Request $request): Response
    {
        return $this->page($request, null);
    }

    /**
     * One prayer of the guide (the reminder notifications open it).
     */
    public function show(Request $request, string $slug): Response
    {
        $guide = PrayerGuide::query()->where('slug', $slug)->first();

        abort_if($guide === null, 404);

        return $this->page($request, $guide);
    }

    protected function page(Request $request, ?PrayerGuide $guide): Response
    {
        $saved = $request->user()->prayerReminders()->get()->keyBy(fn (PrayerReminder $reminder): string => $reminder->prayer->value);

        $reminders = collect(PrayerReminderType::cases())->mapWithKeys(fn (PrayerReminderType $type): array => [
            $type->value => [
                'is_active' => (bool) $saved->get($type->value)?->is_active,
                'time' => $saved->get($type->value)?->time() ?? $type->defaultTime(),
            ],
        ]);

        return Inertia::render('prayers/index', [
            'slug' => $guide?->slug,
            'guides' => PrayerGuide::query()->ordered()->get()->map(fn (PrayerGuide $item): array => $item->toSummaryArray())->values(),
            'guide' => $guide?->toGuideArray(),
            'reminders' => $reminders,
            'timezone' => $request->user()->displayTimezone(),
        ]);
    }
}
