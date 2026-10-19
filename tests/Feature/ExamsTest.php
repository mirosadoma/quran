<?php

namespace Tests\Feature;

use App\Enums\ExamDayPhase;
use App\Enums\ExamDayStatus;
use App\Enums\ExamEntryStatus;
use App\Enums\Grade;
use App\Models\Academy;
use App\Models\Exam;
use App\Models\ExamDay;
use App\Models\ExamEntry;
use App\Models\ExamExaminer;
use App\Models\Halaqa;
use App\Models\User;
use App\Notifications\ExamCreated;
use App\Notifications\ExamDayOpened;
use App\Notifications\ExamExaminingStarted;
use App\Notifications\ExamReminder;
use App\Notifications\ExamResultPublished;
use App\Notifications\ExamScheduled;
use App\Notifications\ExamTurnNow;
use App\Notifications\ExamTurnSoon;
use App\Services\Exams\ExamDayLifecycle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class ExamsTest extends TestCase
{
    use RefreshDatabase;

    protected Academy $academy;

    protected User $manager;

    protected User $teacher;

    protected Halaqa $halaqa;

    /** @var list<User> */
    protected array $students;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();

        $this->academy = Academy::factory()->create();
        $this->manager = User::factory()->manager($this->academy)->create();
        $this->teacher = User::factory()->teacher()->inAcademy($this->academy)->create();
        $this->halaqa = Halaqa::factory()->create(['academy_id' => $this->academy->id, 'teacher_id' => $this->teacher->id]);
        $this->students = User::factory()->student()->inAcademy($this->academy)->count(3)->create()->all();
        $this->halaqa->students()->attach(collect($this->students)->pluck('id'));
    }

    protected function examWithDay(array $dayAttributes = []): ExamDay
    {
        $exam = Exam::factory()->create(['academy_id' => $this->academy->id, 'created_by' => $this->manager->id]);
        $day = ExamDay::factory()->create(['exam_id' => $exam->id, ...$dayAttributes]);
        $day->halaqat()->attach($this->halaqa);

        foreach ($this->students as $index => $student) {
            ExamEntry::factory()->create(['exam_day_id' => $day->id, 'student_id' => $student->id, 'halaqa_id' => $this->halaqa->id, 'position' => $index + 1]);
        }

        return $day;
    }

    public function test_the_manager_creates_an_exam_and_the_teachers_and_students_are_told(): void
    {
        $this->actingAs($this->manager)
            ->post(route('exams.store'), [
                'title' => 'اختبار نهاية الفصل',
                'description' => 'اختبار شفوي في الأجزاء المحفوظة.',
                'max_score' => 50,
                'days' => [
                    ['date' => now()->addMonth()->toDateString(), 'start_time' => '17:00', 'end_time' => '', 'halaqa_ids' => [$this->halaqa->id]],
                    ['date' => now()->addMonth()->addDay()->toDateString(), 'start_time' => '17:00', 'end_time' => '19:00', 'halaqa_ids' => [$this->halaqa->id]],
                ],
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $exam = Exam::query()->sole();

        $this->assertSame($this->academy->id, $exam->academy_id);
        $this->assertSame(50, $exam->max_score);
        $this->assertCount(2, $exam->days);
        $this->assertNull($exam->days[0]->ends_at);
        $this->assertNotNull($exam->days[1]->ends_at);
        $this->assertSame([$this->halaqa->id], $exam->days[0]->halaqat()->pluck('halaqat.id')->all());
        // Every student of the halaqa is examined on both days.
        $this->assertSame(3, $exam->days[0]->entries()->count());
        $this->assertSame(3, $exam->days[1]->entries()->count());

        Notification::assertSentTo($this->teacher, ExamCreated::class);
        Notification::assertSentToTimes($this->students[0], ExamScheduled::class, 2);
        Notification::assertNotSentTo($this->manager, ExamCreated::class);
    }

    public function test_an_exam_needs_at_least_one_day_with_halaqat_of_the_academy(): void
    {
        $other = Halaqa::factory()->create();

        $this->actingAs($this->manager)
            ->post(route('exams.store'), ['title' => 'اختبار', 'max_score' => 100, 'days' => []])
            ->assertSessionHasErrors('days');

        $this->actingAs($this->manager)
            ->post(route('exams.store'), [
                'title' => 'اختبار',
                'max_score' => 100,
                'days' => [['date' => now()->addWeek()->toDateString(), 'start_time' => '17:00', 'end_time' => '16:00', 'halaqa_ids' => [$other->id]]],
            ])
            ->assertSessionHasErrors(['days.0.halaqa_ids.0']);

        $this->actingAs($this->manager)
            ->post(route('exams.store'), [
                'title' => 'اختبار',
                'max_score' => 100,
                'days' => [['date' => now()->addWeek()->toDateString(), 'start_time' => '17:00', 'end_time' => '16:00', 'halaqa_ids' => [$this->halaqa->id]]],
            ])
            ->assertSessionHasErrors(['days.0.end_time']);

        $this->actingAs($this->teacher)->post(route('exams.store'), ['title' => 'اختبار', 'max_score' => 100, 'days' => []])->assertForbidden();
    }

    public function test_examiners_come_from_the_platform_or_from_outside_with_a_link(): void
    {
        $day = $this->examWithDay();

        $this->actingAs($this->manager)
            ->post(route('exams.examiners.store', $day), ['user_id' => $this->teacher->id])
            ->assertSessionHasNoErrors();

        $this->actingAs($this->manager)
            ->post(route('exams.examiners.store', $day), ['name' => 'الشيخ محمود', 'email' => 'mahmoud@example.com'])
            ->assertSessionHasNoErrors();

        $internal = ExamExaminer::query()->where('user_id', $this->teacher->id)->sole();
        $external = ExamExaminer::query()->whereNull('user_id')->sole();

        $this->assertNull($internal->token);
        $this->assertSame($this->teacher->name, $internal->name);
        $this->assertNotNull($external->token);
        $this->assertNotNull($external->hall_room);
        $this->assertNotNull($external->private_room);
        $this->assertNotSame($external->hall_room, $external->private_room);

        // The same teacher cannot be added twice; an outside examiner needs a name.
        $this->actingAs($this->manager)->post(route('exams.examiners.store', $day), ['user_id' => $this->teacher->id])->assertSessionHasErrors('user_id');
        $this->actingAs($this->manager)->post(route('exams.examiners.store', $day), ['email' => 'x@example.com'])->assertSessionHasErrors('name');

        // The manager sees the link of the outside examiner on the exam page.
        $this->actingAs($this->manager)
            ->get(route('exams.show', $day->exam_id))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('exams/show')
                ->where('exam.days.0.examiners.1.guest_url', $external->guestUrl())
                ->where('exam.days.0.examiners.1.is_external', true));
    }

    public function test_students_are_shared_evenly_among_the_examiners(): void
    {
        $day = $this->examWithDay();
        ExamExaminer::factory()->forUser($this->teacher)->create(['exam_day_id' => $day->id]);
        $second = ExamExaminer::factory()->create(['exam_day_id' => $day->id]);

        $this->actingAs($this->manager)->post(route('exams.days.auto-assign', $day))->assertRedirect();

        $counts = $day->entries()->get()->groupBy('examiner_id')->map->count();

        $this->assertCount(2, $counts);
        $this->assertSame([1, 2], $counts->values()->sort()->values()->all());

        // Every examiner's queue is numbered 1, 2, 3...
        foreach ($counts->keys() as $examinerId) {
            $positions = $day->entries()->where('examiner_id', $examinerId)->orderBy('position')->pluck('position')->all();
            $this->assertSame(range(1, count($positions)), $positions);
        }

        // The manager moves everyone to the second examiner in their own order.
        $entries = $day->entries()->get();

        $this->actingAs($this->manager)
            ->put(route('exams.days.distribution', $day), [
                'assignments' => $entries->map(fn (ExamEntry $entry, int $index): array => ['entry_id' => $entry->id, 'examiner_id' => $second->id, 'position' => 10 - $index])->all(),
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame([$second->id], $day->entries()->distinct()->pluck('examiner_id')->all());
        $this->assertSame([1, 2, 3], $day->entries()->orderBy('position')->pluck('position')->all());
        $this->assertSame($entries->last()->id, $day->entries()->orderBy('position')->first()->id);
    }

    public function test_the_day_opens_with_an_opening_word_and_then_the_examining_starts(): void
    {
        $day = $this->examWithDay(['starts_at' => now()->subMinutes(5)]);
        $examiner = ExamExaminer::factory()->forUser($this->teacher)->create(['exam_day_id' => $day->id]);
        $day->entries()->update(['examiner_id' => $examiner->id]);

        $this->actingAs($this->manager)->post(route('exams.days.open', $day))->assertRedirect();

        $day->refresh();
        $this->assertSame(ExamDayStatus::Live, $day->status);
        $this->assertSame(ExamDayPhase::Opening, $day->phase);
        $this->assertNotNull($day->main_room);
        Notification::assertSentTo($this->students[0], ExamDayOpened::class);
        Notification::assertSentTo($this->teacher, ExamDayOpened::class);
        Notification::assertNotSentTo($this->manager, ExamDayOpened::class);

        $this->actingAs($this->manager)->post(route('exams.days.start-examining', $day))->assertRedirect();

        $this->assertSame(ExamDayPhase::Examining, $day->fresh()->phase);
        Notification::assertSentTo($this->students[1], ExamExaminingStarted::class, function (ExamExaminingStarted $notification): bool {
            return str_contains($notification->body($this->students[1]), $this->teacher->name);
        });
    }

    public function test_an_examiner_alerts_calls_and_finishes_their_students_one_by_one(): void
    {
        $day = $this->examWithDay(['starts_at' => now()->subMinutes(5)]);
        $examiner = ExamExaminer::factory()->forUser($this->teacher)->create(['exam_day_id' => $day->id]);
        $day->entries()->update(['examiner_id' => $examiner->id]);
        app(ExamDayLifecycle::class)->open($day, $this->manager);
        [$first, $second] = $day->entries()->get()->all();

        $this->actingAs($this->teacher)->post(route('exams.entries.alert', $first))->assertRedirect();
        $this->assertSame(ExamEntryStatus::Alerted, $first->fresh()->status);
        Notification::assertSentTo($first->student, ExamTurnSoon::class);

        $this->actingAs($this->teacher)->post(route('exams.entries.call', $first))->assertRedirect();
        $this->assertSame(ExamEntryStatus::Called, $first->fresh()->status);
        Notification::assertSentTo($first->student, ExamTurnNow::class);

        // One student at a time in the private room.
        $this->actingAs($this->teacher)->post(route('exams.entries.call', $second))->assertRedirect();
        $this->assertSame(ExamEntryStatus::Waiting, $second->fresh()->status);

        $this->actingAs($this->teacher)
            ->post(route('exams.entries.finish', $first), ['grade' => 'very_good', 'score' => 88, 'notes' => 'تحسين المدود'])
            ->assertSessionHasNoErrors();

        $first->refresh();
        $this->assertSame(ExamEntryStatus::Examined, $first->status);
        $this->assertSame(Grade::VeryGood, $first->grade);
        $this->assertSame(88, $first->score);
        $this->assertSame(88.0, $first->percent());
        $this->assertSame($examiner->id, $first->graded_by);
        $this->assertNull($first->published_at);

        // Finishing without a result keeps the student examined but ungraded; the result is recorded later.
        $this->actingAs($this->teacher)->post(route('exams.entries.call', $second))->assertRedirect();
        $this->actingAs($this->teacher)->post(route('exams.entries.finish', $second))->assertRedirect();
        $this->assertSame(ExamEntryStatus::Examined, $second->fresh()->status);
        $this->assertFalse($second->fresh()->isGraded());

        $this->actingAs($this->manager)->put(route('exams.entries.grade', $second), ['grade' => 'good', 'score' => 120])->assertSessionHasErrors('score');
        $this->actingAs($this->manager)->put(route('exams.entries.grade', $second), ['grade' => 'good', 'score' => 70])->assertSessionHasNoErrors();
        $this->assertSame(Grade::Good, $second->fresh()->grade);

        // Another teacher of the academy cannot act on these students.
        $outsider = User::factory()->teacher()->inAcademy($this->academy)->create();
        $this->actingAs($outsider)->post(route('exams.entries.alert', $second))->assertForbidden();
    }

    public function test_results_reach_students_only_when_the_manager_sends_them(): void
    {
        $day = $this->examWithDay(['starts_at' => now()->subHour()]);
        $entry = $day->entries()->first();
        $entry->update(['status' => ExamEntryStatus::Examined, 'grade' => Grade::Excellent, 'score' => 95, 'graded_at' => now()]);
        $student = $entry->student;

        $this->actingAs($student)
            ->get(route('exams.show', $day->exam_id))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('exam.days.0.my_entry.grade', null)
                ->where('exam.days.0.my_entry.score', null)
                ->where('exam.days.0.my_entry.is_graded', true)
                ->has('exam.days.0.entries', 1)
                ->where('can.view_results', false));

        $this->actingAs($this->teacher)->post(route('exams.entries.publish', $entry))->assertForbidden();
        $this->actingAs($this->manager)->post(route('exams.entries.publish', $entry))->assertRedirect();

        $this->assertNotNull($entry->fresh()->published_at);
        Notification::assertSentTo($student, ExamResultPublished::class, function (ExamResultPublished $notification) use ($student): bool {
            return str_contains($notification->body($student), '95') && str_contains($notification->body($student), Grade::Excellent->label());
        });

        $this->actingAs($student)
            ->get(route('exams.show', $day->exam_id))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('exam.days.0.my_entry.grade', 'excellent')
                ->where('exam.days.0.my_entry.percent', 95));

        // Sending everything only sends the graded results that were not sent yet.
        $other = $day->entries()->whereKeyNot($entry->id)->first();
        $other->update(['grade' => Grade::Good, 'score' => 60, 'graded_at' => now()]);
        $this->actingAs($this->manager)->post(route('exams.days.publish-all', $day))->assertRedirect();
        Notification::assertSentToTimes($student, ExamResultPublished::class, 1);
        Notification::assertSentTo($other->student, ExamResultPublished::class);
        $this->assertSame(1, $day->entries()->whereNull('published_at')->count());
    }

    public function test_an_outside_examiner_enters_with_their_link_during_the_exam_day_only(): void
    {
        $day = $this->examWithDay(['starts_at' => now()->addDays(2)]);
        $examiner = ExamExaminer::factory()->create(['exam_day_id' => $day->id]);
        $day->entries()->update(['examiner_id' => $examiner->id]);
        $entry = $day->entries()->first();

        $this->get(route('exams.guest.room', $examiner->token))->assertForbidden();
        $this->get(route('exams.guest.room', 'not-a-real-token-at-all-not-a-real-token-at-all'))->assertNotFound();

        $day->update(['starts_at' => now()->subMinutes(5)]);
        app(ExamDayLifecycle::class)->open($day, $this->manager);

        $this->get(route('exams.guest.room', $examiner->token))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('exams/room')
                ->where('viewer.kind', 'examiner')
                ->where('viewer.examiner_id', $examiner->id)
                ->where('guestToken', $examiner->token)
                ->has('rooms', 3));

        $this->post(route('exams.guest.call', [$examiner->token, $entry]))->assertRedirect();
        $this->assertSame(ExamEntryStatus::Called, $entry->fresh()->status);

        $this->post(route('exams.guest.finish', [$examiner->token, $entry]), ['grade' => 'acceptable', 'score' => 55])->assertSessionHasNoErrors();
        $this->assertSame($examiner->id, $entry->fresh()->graded_by);

        // The link is useless once the day is closed, and never works for another examiner's students.
        $other = ExamExaminer::factory()->create(['exam_day_id' => $day->id]);
        $this->post(route('exams.guest.alert', [$other->token, $entry]))->assertForbidden();

        app(ExamDayLifecycle::class)->close($day, $this->manager);
        $this->get(route('exams.guest.room', $examiner->token))->assertForbidden();
    }

    public function test_the_room_opens_the_right_doors_for_everyone(): void
    {
        $day = $this->examWithDay(['starts_at' => now()->subMinutes(5)]);
        $examiner = ExamExaminer::factory()->forUser($this->teacher)->create(['exam_day_id' => $day->id]);
        $day->entries()->update(['examiner_id' => $examiner->id]);
        $student = $this->students[0];

        // Not open yet: students wait, the manager and examiners may go in early.
        $this->actingAs($student)->get(route('exams.room', $day))->assertRedirect(route('exams.show', $day->exam_id));
        $this->actingAs($this->teacher)->get(route('exams.room', $day))->assertOk();

        app(ExamDayLifecycle::class)->open($day, $this->manager);

        $this->actingAs($this->manager)
            ->get(route('exams.room', $day))
            ->assertInertia(fn (AssertableInertia $page) => $page->where('viewer.kind', 'manager')->has('rooms', 3)->has('day.entries', 3));

        // During the opening word the student only sees the main hall.
        $this->actingAs($student)
            ->get(route('exams.room', $day))
            ->assertInertia(fn (AssertableInertia $page) => $page->where('viewer.kind', 'student')->has('rooms', 1)->where('rooms.0.key', 'main')->has('day.entries', 1));

        app(ExamDayLifecycle::class)->startExamining($day);

        $this->actingAs($student)
            ->get(route('exams.room', $day))
            ->assertInertia(fn (AssertableInertia $page) => $page->has('rooms', 1)->where('rooms.0.key', "hall-{$examiner->id}"));

        $this->actingAs($this->teacher)->post(route('exams.entries.call', $day->entryFor($student)));

        $this->actingAs($student)
            ->get(route('exams.room', $day))
            ->assertInertia(fn (AssertableInertia $page) => $page->has('rooms', 2)->where('rooms.1.key', "private-{$examiner->id}"));

        // Someone outside the exam cannot enter.
        $this->actingAs(User::factory()->student()->inAcademy($this->academy)->create())->get(route('exams.room', $day))->assertForbidden();
    }

    public function test_closing_the_day_marks_the_students_who_were_not_examined_absent(): void
    {
        $day = $this->examWithDay(['starts_at' => now()->subHour()]);
        app(ExamDayLifecycle::class)->open($day, $this->manager);
        $examined = $day->entries()->first();
        $examined->update(['status' => ExamEntryStatus::Examined, 'grade' => Grade::Good]);

        $this->actingAs($this->manager)->post(route('exams.days.close', $day))->assertRedirect(route('exams.show', $day->exam_id));

        $this->assertSame(ExamDayStatus::Closed, $day->fresh()->status);
        $this->assertSame(2, $day->entries()->where('status', ExamEntryStatus::Absent)->count());
        $this->assertSame(ExamEntryStatus::Examined, $examined->fresh()->status);

        // An absent student can still be graded, and nothing happens in a closed day.
        $absent = $day->entries()->where('status', ExamEntryStatus::Absent)->first();
        $this->actingAs($this->manager)->put(route('exams.entries.grade', $absent), ['grade' => 'weak', 'score' => 10])->assertSessionHasNoErrors();
        $this->assertSame(Grade::Weak, $absent->fresh()->grade);
        $this->actingAs($this->manager)->post(route('exams.days.open', $day))->assertRedirect();
        $this->assertSame(ExamDayStatus::Closed, $day->fresh()->status);
    }

    public function test_the_commands_remind_open_and_close_the_days(): void
    {
        $this->travelTo(now()->startOfMinute());

        $tomorrow = $this->examWithDay(['starts_at' => now()->addDay()]);
        $soon = $this->examWithDay(['starts_at' => now()->addMinutes(30)]);
        $due = $this->examWithDay(['starts_at' => now()->subMinutes(2)]);
        $finished = $this->examWithDay(['starts_at' => now()->subHours(3), 'ends_at' => now()->subMinute(), 'status' => ExamDayStatus::Live]);
        $endless = $this->examWithDay(['starts_at' => now()->subHours(3), 'status' => ExamDayStatus::Live]);

        $this->artisan('exams:remind')->assertSuccessful();
        $this->artisan('exams:open')->assertSuccessful();
        $this->artisan('exams:close')->assertSuccessful();

        $this->assertNotNull($tomorrow->fresh()->reminder_day_before_sent_at);
        $this->assertNull($tomorrow->fresh()->reminder_sent_at);
        $this->assertNotNull($soon->fresh()->reminder_sent_at);
        Notification::assertSentTo($this->students[0], ExamReminder::class, fn (ExamReminder $notification): bool => $notification->dayBefore);
        Notification::assertSentTo($this->students[0], ExamReminder::class, fn (ExamReminder $notification): bool => ! $notification->dayBefore);

        $this->assertSame(ExamDayStatus::Live, $due->fresh()->status);
        $this->assertSame(ExamDayStatus::Scheduled, $soon->fresh()->status);
        $this->assertSame(ExamDayStatus::Closed, $finished->fresh()->status);
        $this->assertSame(ExamDayStatus::Live, $endless->fresh()->status);
    }

    public function test_everyone_sees_only_the_exams_they_take_part_in(): void
    {
        $day = $this->examWithDay();
        $foreign = Exam::factory()->create();
        ExamDay::factory()->create(['exam_id' => $foreign->id]);

        $this->actingAs($this->manager)
            ->get(route('exams.index'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->component('exams/index')->has('exams.data', 1)->where('can.create', true));

        // The teacher of a halaqa of the day, and its students, see it; nobody else does.
        $this->actingAs($this->teacher)->get(route('exams.show', $day->exam_id))->assertOk();
        $this->actingAs($this->students[0])->get(route('exams.show', $day->exam_id))->assertOk();
        $this->actingAs(User::factory()->teacher()->inAcademy($this->academy)->create())->get(route('exams.show', $day->exam_id))->assertForbidden();
        $this->actingAs($this->manager)->get(route('exams.show', $foreign))->assertForbidden();
        $this->actingAs(User::factory()->student()->create())->get(route('exams.index'))->assertForbidden();

        $this->actingAs($this->students[0])
            ->get(route('exams.index'))
            ->assertInertia(fn (AssertableInertia $page) => $page->has('exams.data', 1)->where('can.create', false));
    }

    public function test_the_manager_updates_the_days_and_new_halaqat_students_are_told(): void
    {
        $day = $this->examWithDay(['starts_at' => now()->addWeek()]);
        $second = Halaqa::factory()->create(['academy_id' => $this->academy->id]);
        $newStudent = User::factory()->student()->inAcademy($this->academy)->create();
        $second->students()->attach($newStudent);

        $this->actingAs($this->manager)
            ->put(route('exams.update', $day->exam_id), [
                'title' => 'اختبار معدّل',
                'max_score' => 100,
                'days' => [
                    ['id' => $day->id, 'date' => now()->addWeek()->toDateString(), 'start_time' => '18:00', 'end_time' => '', 'halaqa_ids' => [$this->halaqa->id, $second->id]],
                ],
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('exams.show', $day->exam_id));

        $this->assertSame('اختبار معدّل', $day->exam->fresh()->title);
        $this->assertSame(4, $day->entries()->count());
        Notification::assertSentTo($newStudent, ExamScheduled::class);
        Notification::assertNotSentTo($this->students[0], ExamScheduled::class);
    }
}
