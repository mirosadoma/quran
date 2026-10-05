<?php

namespace App\Http\Controllers;

use App\Enums\AnnouncementDelivery;
use App\Enums\SessionStatus;
use App\Http\Requests\HalaqaAnnouncementRequest;
use App\Models\Halaqa;
use App\Models\HalaqaAnnouncement;
use App\Services\AnnouncementDispatcher;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;

class HalaqaAnnouncementController extends Controller
{
    public function __construct(protected AnnouncementDispatcher $dispatcher) {}

    /**
     * Send a message to the students of the halaqa now, or schedule it.
     */
    public function store(HalaqaAnnouncementRequest $request, Halaqa $halaqa): RedirectResponse
    {
        $this->authorize('manage', $halaqa);

        $announcement = DB::transaction(function () use ($request, $halaqa): HalaqaAnnouncement {
            $announcement = $halaqa->announcements()->create([
                ...$this->attributes($request),
                'user_id' => $request->user()->id,
            ]);

            $announcement->sessions()->sync($this->sessionIds($request));

            return $announcement;
        });

        $this->dispatchOrToast($announcement);

        return back();
    }

    /**
     * Change a message that was not delivered yet.
     */
    public function update(HalaqaAnnouncementRequest $request, HalaqaAnnouncement $announcement): RedirectResponse
    {
        $this->authorize('update', $announcement);

        DB::transaction(function () use ($request, $announcement): void {
            $announcement->update($this->attributes($request));
            $announcement->sessions()->sync($this->sessionIds($request));
        });

        $this->dispatchOrToast($announcement, updated: true);

        return back();
    }

    /**
     * Delete a message (it disappears from the halaqa page).
     */
    public function destroy(HalaqaAnnouncement $announcement): RedirectResponse
    {
        $this->authorize('delete', $announcement);

        $announcement->delete();

        $this->toast(__('Message deleted.'));

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    protected function attributes(HalaqaAnnouncementRequest $request): array
    {
        $delivery = $request->deliveryMode();

        return [
            'kind' => $request->input('kind'),
            'title' => $request->input('title'),
            'body' => $request->input('body'),
            'delivery' => $delivery,
            'scheduled_at' => $delivery === AnnouncementDelivery::Scheduled ? $request->scheduledAt() : null,
        ];
    }

    /**
     * @return list<int>
     */
    protected function sessionIds(HalaqaAnnouncementRequest $request): array
    {
        if ($request->deliveryMode() !== AnnouncementDelivery::Sessions) {
            return [];
        }

        return array_values(array_unique(array_map('intval', $request->input('session_ids', []))));
    }

    /**
     * Deliver a message meant for now (or for a session already live) and tell the author what happens next.
     */
    protected function dispatchOrToast(HalaqaAnnouncement $announcement, bool $updated = false): void
    {
        if ($announcement->delivery === AnnouncementDelivery::Now) {
            $this->dispatcher->deliver($announcement);
            $this->toast(__('Message sent to the students.'));

            return;
        }

        if ($announcement->delivery === AnnouncementDelivery::Sessions) {
            $live = $announcement->sessions()->where('status', SessionStatus::Live)->get();

            foreach ($live as $session) {
                $this->dispatcher->deliver($announcement, $session);
            }
        }

        $this->toast($updated ? __('Message updated.') : __('Message scheduled.'));
    }
}
