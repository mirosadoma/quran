<?php

namespace App\Http\Controllers;

use App\Enums\PrayerReminderType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class PrayerReminderController extends Controller
{
    /**
     * Turn a daily prayer reminder on or off, or change its time.
     */
    public function update(Request $request, string $prayer): RedirectResponse
    {
        $type = PrayerReminderType::tryFrom($prayer);

        abort_if($type === null, 404);

        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
            'time' => ['required', 'date_format:H:i'],
        ]);

        $reminder = $request->user()->prayerReminders()->firstOrNew(['prayer' => $type->value]);
        $timeChanged = $reminder->time() !== $validated['time'];

        $reminder->fill(['is_active' => $validated['is_active'], 'remind_at' => $validated['time']]);

        // A new time may be reminded again today (to try it right away).
        if ($timeChanged) {
            $reminder->last_sent_on = null;
        }

        $reminder->save();

        $this->toast($validated['is_active']
            ? __('You will be reminded of :prayer every day at :time.', ['prayer' => $type->label(), 'time' => $validated['time']])
            : __('The reminder of :prayer is off.', ['prayer' => $type->label()]));

        return back();
    }
}
