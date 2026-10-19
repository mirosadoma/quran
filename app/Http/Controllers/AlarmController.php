<?php

namespace App\Http\Controllers;

use App\Http\Requests\AlarmRequest;
use App\Http\Resources\AlarmResource;
use App\Models\Alarm;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The alarms of the user: memorization, revision, prayers, adhkar, or anything they name.
 */
class AlarmController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('alarms/index', [
            'alarms' => AlarmResource::collection($request->user()->alarms()->orderBy('ring_at')->get())->resolve(),
            'ring' => $request->integer('ring') ?: null,
        ]);
    }

    public function store(AlarmRequest $request): RedirectResponse
    {
        $alarm = $request->user()->alarms()->create($request->alarmAttributes());

        $this->toast(__(':title will ring at :time.', ['title' => $alarm->title, 'time' => $alarm->time()]));

        return back();
    }

    public function update(AlarmRequest $request, Alarm $alarm): RedirectResponse
    {
        $attributes = $request->alarmAttributes();

        // A new time may ring again today (to try it right away).
        if ($alarm->time() !== substr((string) $attributes['ring_at'], 0, 5)) {
            $attributes['last_rang_on'] = null;
            $attributes['last_dismissed_on'] = null;
        }

        $alarm->update($attributes);

        $this->toast($alarm->is_active ? __('Alarm saved.') : __('Alarm turned off.'));

        return back();
    }

    public function destroy(Alarm $alarm): RedirectResponse
    {
        $this->authorize('delete', $alarm);

        $alarm->delete();

        $this->toast(__('Alarm deleted.'));

        return back();
    }

    /**
     * The user dismissed the ringing alarm (for memorization and revision: they confirmed they studied).
     */
    public function dismiss(Request $request, Alarm $alarm): RedirectResponse
    {
        $this->authorize('update', $alarm);

        $alarm->forceFill(['last_dismissed_on' => now($request->user()->displayTimezone())->toDateString()])->save();

        return back();
    }
}
