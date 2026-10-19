<?php

namespace App\Services\Exams;

use App\Exceptions\MeetingException;
use App\Models\ExamDay;
use App\Models\ExamExaminer;
use App\Models\User;
use App\Services\Meetings\Drivers\JitsiDriver;
use App\Services\Meetings\JoinTarget;

/**
 * The Jitsi rooms of an exam day: the main hall (opening word), and for every examiner a
 * waiting hall for their students and a private room where each student is examined alone.
 * The platform decides who may enter which room, so a student never sees the private room
 * before their turn.
 */
class ExamRooms
{
    public function __construct(protected JitsiDriver $jitsi) {}

    /**
     * Rooms open inside the platform (JaaS or a self-hosted server) or in a new tab (public server).
     */
    public function isEmbedded(): bool
    {
        return $this->jitsi->isEmbedded();
    }

    /**
     * Give the day its main hall when it does not have one yet.
     */
    public function ensureMainRoom(ExamDay $day): void
    {
        if (blank($day->main_room)) {
            $day->forceFill(['main_room' => $this->jitsi->newRoomName('exam-'.$day->id.'-main')])->save();
        }
    }

    /**
     * Give the examiner their waiting hall and private room when they do not have them yet.
     */
    public function ensureExaminerRooms(ExamExaminer $examiner): void
    {
        $attributes = [];

        if (blank($examiner->hall_room)) {
            $attributes['hall_room'] = $this->jitsi->newRoomName('exam-'.$examiner->exam_day_id.'-hall');
        }

        if (blank($examiner->private_room)) {
            $attributes['private_room'] = $this->jitsi->newRoomName('exam-'.$examiner->exam_day_id.'-private');
        }

        if ($attributes !== []) {
            $examiner->forceFill($attributes)->save();
        }
    }

    /**
     * How a user of the platform enters a room.
     *
     * @return array{type: string, url: string|null, embed: array<string, mixed>}
     *
     * @throws MeetingException
     */
    public function targetForUser(string $room, User $user, bool $moderator): array
    {
        return $this->describe($this->jitsi->joinTargetForRoom($room, $this->jitsi->participant($user), $moderator));
    }

    /**
     * How an examiner invited from outside enters a room.
     *
     * @return array{type: string, url: string|null, embed: array<string, mixed>}
     *
     * @throws MeetingException
     */
    public function targetForGuest(string $room, ExamExaminer $examiner): array
    {
        return $this->describe($this->jitsi->joinTargetForRoom($room, [
            'id' => 'examiner-'.$examiner->id,
            'name' => $examiner->name,
            'email' => $examiner->email,
            'locale' => app()->getLocale(),
        ], true));
    }

    /**
     * @return array{type: string, url: string|null, embed: array<string, mixed>}
     */
    protected function describe(JoinTarget $target): array
    {
        return ['type' => $target->type, 'url' => $target->url, 'embed' => $target->embed];
    }
}
