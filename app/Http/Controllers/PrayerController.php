<?php

namespace App\Http\Controllers;

use App\Enums\PrayerReminderType;
use App\Models\PrayerReminder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
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
        abort_unless(in_array($slug, $this->slugs(), true), 404);

        return $this->page($request, $slug);
    }

    protected function page(Request $request, ?string $slug): Response
    {
        $saved = $request->user()->prayerReminders()->get()->keyBy(fn (PrayerReminder $reminder): string => $reminder->prayer->value);

        $reminders = collect(PrayerReminderType::cases())->mapWithKeys(fn (PrayerReminderType $type): array => [
            $type->value => [
                'is_active' => (bool) $saved->get($type->value)?->is_active,
                'time' => $saved->get($type->value)?->time() ?? $type->defaultTime(),
            ],
        ]);

        return Inertia::render('prayers/index', [
            'slug' => $slug,
            'reminders' => $reminders,
            'timezone' => $request->user()->displayTimezone(),
        ]);
    }

    /**
     * Prayers of the guide (resources/data/prayers.json, shown by the page).
     *
     * @return list<string>
     */
    protected function slugs(): array
    {
        return Cache::rememberForever('prayers.slugs', fn (): array => array_column(
            json_decode((string) file_get_contents(resource_path('data/prayers.json')), true),
            'slug',
        ));
    }
}
