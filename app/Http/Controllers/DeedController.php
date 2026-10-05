<?php

namespace App\Http\Controllers;

use App\Http\Requests\DeedRequest;
use App\Http\Resources\DeedResource;
use App\Models\Deed;
use App\Services\DeedStats;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DeedController extends Controller
{
    /**
     * Self-accounting: the good and bad deeds of a day, with how to repent of each sin.
     */
    public function index(Request $request, DeedStats $stats): Response
    {
        $user = $request->user();
        $today = $stats->today($user);
        $date = $stats->parseDate($request->query('date')) ?? $today;

        if ($date->isAfter($today)) {
            $date = $today;
        }

        $deeds = $user->deeds()->where('done_on', $date->toDateString())->orderByDesc('done_at')->get();

        return Inertia::render('deeds/index', [
            'date' => $date->toDateString(),
            'today' => $today->toDateString(),
            'deeds' => DeedResource::collection($deeds)->resolve(),
            'summary' => $stats->count($date->toDateString(), $deeds),
            'week' => $stats->days($user, $date->subDays(6), $date),
        ]);
    }

    public function store(DeedRequest $request): RedirectResponse
    {
        $deed = $request->user()->deeds()->create($request->deed());

        $this->toast($deed->isSin() ? __('Recorded. May Allah forgive you and accept your repentance.') : __('Recorded. May Allah accept it from you.'));

        return to_route('deeds.index', ['date' => $deed->done_on]);
    }

    public function update(DeedRequest $request, Deed $deed): RedirectResponse
    {
        $this->authorize('update', $deed);

        $deed->update($request->deed());

        if (! $deed->isSin()) {
            $deed->forceFill(['repented_at' => null])->save();
        }

        $this->toast(__('Saved.'));

        return to_route('deeds.index', ['date' => $deed->done_on]);
    }

    public function destroy(Deed $deed): RedirectResponse
    {
        $this->authorize('delete', $deed);

        $deed->delete();

        $this->toast(__('Deleted.'));

        return back();
    }

    /**
     * The user asked forgiveness for a sin or made its expiation (or takes it back).
     */
    public function repent(Deed $deed): RedirectResponse
    {
        $this->authorize('update', $deed);

        abort_unless($deed->isSin(), 422);

        $deed->forceFill(['repented_at' => $deed->repented_at ? null : now()])->save();

        $this->toast($deed->repented_at ? __('May Allah accept your repentance.') : __('Marked as not repented yet.'));

        return back();
    }
}
