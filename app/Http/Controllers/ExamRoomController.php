<?php

namespace App\Http\Controllers;

use App\Enums\ExamDayPhase;
use App\Enums\ExamEntryStatus;
use App\Exceptions\MeetingException;
use App\Http\Resources\ExamDayResource;
use App\Models\ExamDay;
use App\Models\ExamExaminer;
use App\Models\User;
use App\Services\Exams\ExamRooms;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The live room of an exam day: the main hall, the halls of the examiners and their private
 * rooms, with the queue of students next to them.
 */
class ExamRoomController extends Controller
{
    public function __construct(protected ExamRooms $rooms) {}

    public function room(Request $request, ExamDay $day): Response|RedirectResponse
    {
        $user = $request->user();

        $day->load(['exam', 'halaqat', 'examiners.user', 'examiners.day']);

        $this->authorize('view', $day->exam);

        if (! $day->isEnterableBy($user)) {
            $this->toast($day->isClosed() ? __('This exam day is closed.') : __('The exam day is not open yet.'), 'error');

            return redirect()->route('exams.show', $day->exam_id);
        }

        $manages = $day->isManagedBy($user);
        $examiner = $day->examinerFor($user);

        $day->load(['entries' => fn ($query) => $query
            ->when(! $manages && $examiner === null, fn ($query) => $query->where('student_id', $user->id))
            ->with(['student', 'halaqa', 'examiner', 'day.exam'])]);

        $entry = $day->entryFor($user);

        if ($examiner !== null) {
            $examiner->forceFill(['last_seen_at' => now()])->saveQuietly();
        }

        try {
            $rooms = $this->roomsFor($day, $user, $manages, $examiner, $entry?->status, $entry?->examiner_id);
        } catch (MeetingException $exception) {
            $this->toast($exception->getMessage(), 'error');

            return redirect()->route('exams.show', $day->exam_id);
        }

        return Inertia::render('exams/room', [
            'day' => (new ExamDayResource($day))->resolve(),
            'viewer' => [
                'kind' => $manages ? 'manager' : ($examiner !== null ? 'examiner' : 'student'),
                'examiner_id' => $examiner?->id,
                'name' => $user->name,
            ],
            'rooms' => $rooms,
            'embedded' => $this->rooms->isEmbedded(),
            'guestToken' => null,
        ]);
    }

    /**
     * The rooms the user may enter right now.
     *
     * @return list<array{key: string, label: string, examiner_id: int|null, target: array{type: string, url: string|null, embed: array<string, mixed>}}>
     *
     * @throws MeetingException
     */
    protected function roomsFor(ExamDay $day, User $user, bool $manages, ?ExamExaminer $examiner, ?ExamEntryStatus $status, ?int $entryExaminerId): array
    {
        $this->rooms->ensureMainRoom($day);
        $rooms = [];

        $add = function (string $key, string $label, ?int $examinerId, string $room, bool $moderator) use (&$rooms, $user): void {
            $rooms[] = [
                'key' => $key,
                'label' => $label,
                'examiner_id' => $examinerId,
                'target' => $this->rooms->targetForUser($room, $user, $moderator),
            ];
        };

        if ($manages) {
            $add('main', __('Main hall'), null, (string) $day->main_room, true);

            foreach ($day->examiners as $other) {
                $this->rooms->ensureExaminerRooms($other);
                $add("hall-{$other->id}", __('Hall of :name', ['name' => $other->name]), $other->id, (string) $other->hall_room, true);
                $add("private-{$other->id}", __('Private room of :name', ['name' => $other->name]), $other->id, (string) $other->private_room, true);
            }

            return $rooms;
        }

        if ($examiner !== null) {
            $this->rooms->ensureExaminerRooms($examiner);
            $add('main', __('Main hall'), null, (string) $day->main_room, false);
            $add("hall-{$examiner->id}", __('My hall'), $examiner->id, (string) $examiner->hall_room, true);
            $add("private-{$examiner->id}", __('My private room'), $examiner->id, (string) $examiner->private_room, true);

            return $rooms;
        }

        // A student: the main hall during the opening word, then the hall of their examiner, and
        // the private room only once they are called.
        $mine = $entryExaminerId !== null ? $day->examiners->firstWhere('id', $entryExaminerId) : null;

        if ($day->phase === ExamDayPhase::Opening || $mine === null) {
            $add('main', __('Main hall'), null, (string) $day->main_room, false);
        }

        if ($mine !== null && $day->phase === ExamDayPhase::Examining) {
            $this->rooms->ensureExaminerRooms($mine);
            $add("hall-{$mine->id}", __('Hall of :name', ['name' => $mine->name]), $mine->id, (string) $mine->hall_room, false);

            if ($status === ExamEntryStatus::Called) {
                $add("private-{$mine->id}", __('Private room of :name', ['name' => $mine->name]), $mine->id, (string) $mine->private_room, false);
            }
        }

        return $rooms;
    }
}
