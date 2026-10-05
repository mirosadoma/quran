<?php

namespace App\Services;

use App\Enums\AnnouncementDelivery;
use App\Enums\SessionStatus;
use App\Models\HalaqaAnnouncement;
use App\Models\HalaqaSession;
use App\Notifications\HalaqaAnnouncementPosted;
use Illuminate\Database\Eloquent\Builder;

/**
 * Delivers halaqa messages to the students: right away, when their scheduled
 * time comes, or when each chosen session starts.
 */
class AnnouncementDispatcher
{
    public function __construct(protected Notifier $notifier) {}

    /**
     * Notify the current students of the halaqa and mark the message as sent.
     */
    public function deliver(HalaqaAnnouncement $announcement, ?HalaqaSession $session = null): void
    {
        $announcement->loadMissing(['halaqa', 'author']);

        if ($announcement->halaqa === null) {
            return;
        }

        if ($announcement->sent_at === null) {
            $announcement->forceFill(['sent_at' => now()])->save();
        }

        if ($session !== null) {
            $announcement->sessions()->updateExistingPivot($session->id, ['sent_at' => now()]);
        }

        $this->notifier->send(
            $announcement->halaqa->students()->active()->get(),
            new HalaqaAnnouncementPosted($announcement, $session),
        );
    }

    /**
     * Messages waiting for this session, delivered when it starts.
     */
    public function deliverForSession(HalaqaSession $session): int
    {
        $announcements = $session->announcements()->wherePivotNull('sent_at')->get();

        foreach ($announcements as $announcement) {
            $this->deliver($announcement, $session);
        }

        return $announcements->count();
    }

    /**
     * Deliver every message whose time has come (run every minute by the scheduler).
     */
    public function deliverDue(): int
    {
        $count = 0;

        HalaqaAnnouncement::query()
            ->where('delivery', AnnouncementDelivery::Scheduled)
            ->whereNull('sent_at')
            ->where('scheduled_at', '<=', now())
            ->eachById(function (HalaqaAnnouncement $announcement) use (&$count): void {
                $this->deliver($announcement);
                $count++;
            });

        HalaqaSession::query()
            ->whereHas('announcements', fn (Builder $query) => $query->whereNull('halaqa_announcement_session.sent_at'))
            ->where('status', '!=', SessionStatus::Cancelled)
            ->where(fn (Builder $query) => $query->where('status', SessionStatus::Live)->orWhere('starts_at', '<=', now()))
            ->eachById(function (HalaqaSession $session) use (&$count): void {
                $count += $this->deliverForSession($session);
            });

        return $count;
    }
}
