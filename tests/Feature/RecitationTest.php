<?php

namespace Tests\Feature;

use App\Enums\ProgressType;
use App\Models\Halaqa;
use App\Models\ProgressRecord;
use App\Models\RecitationSubmission;
use App\Models\User;
use App\Notifications\ProgressRecorded;
use App\Notifications\RecitationSubmitted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class RecitationTest extends TestCase
{
    use RefreshDatabase;

    protected User $teacher;

    protected User $student;

    protected Halaqa $halaqa;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();

        $this->teacher = User::factory()->teacher()->create();
        $this->student = User::factory()->student()->create();
        $this->halaqa = Halaqa::factory()->create(['teacher_id' => $this->teacher->id]);
        $this->halaqa->students()->attach($this->student);
    }

    public function test_memorization_and_revision_are_recorded_together(): void
    {
        $this->actingAs($this->teacher)
            ->post(route('progress.store'), [
                'student_id' => $this->student->id,
                'halaqa_id' => $this->halaqa->id,
                'memorization' => ['from_surah' => 67, 'from_ayah' => 1, 'to_surah' => 67, 'to_ayah' => 10, 'grade' => 'excellent', 'mistakes' => 1],
                'revision' => ['from_surah' => 78, 'from_ayah' => 1, 'to_surah' => 78, 'to_ayah' => 40, 'grade' => 'good', 'mistakes' => 3],
                'notes' => 'Well done',
            ])
            ->assertSessionHasNoErrors();

        $records = ProgressRecord::query()->orderBy('type')->get();

        $this->assertCount(2, $records);
        $this->assertNotNull($records[0]->group_uuid);
        $this->assertSame($records[0]->group_uuid, $records[1]->group_uuid);
        $this->assertSame(ProgressType::Memorization, $records[0]->type);
        $this->assertSame(10, $records[0]->ayahs_count);
        $this->assertSame(1, $records[0]->mistakes);
        $this->assertSame(ProgressType::Revision, $records[1]->type);
        $this->assertSame(40, $records[1]->ayahs_count);
        $this->assertSame(3, $records[1]->mistakes);

        Notification::assertSentToTimes($this->student, ProgressRecorded::class, 1);
    }

    public function test_revision_only_creates_a_single_record(): void
    {
        $this->actingAs($this->teacher)
            ->post(route('progress.store'), [
                'student_id' => $this->student->id,
                'revision' => ['from_surah' => 78, 'from_ayah' => 1, 'to_surah' => 78, 'to_ayah' => 40, 'grade' => 'good', 'mistakes' => 0],
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame(1, ProgressRecord::query()->count());
        $this->assertSame(ProgressType::Revision, ProgressRecord::query()->first()->type);
    }

    public function test_a_recitation_needs_at_least_one_valid_portion(): void
    {
        $this->actingAs($this->teacher)
            ->post(route('progress.store'), ['student_id' => $this->student->id])
            ->assertSessionHasErrors('portions');

        $this->actingAs($this->teacher)
            ->post(route('progress.store'), [
                'student_id' => $this->student->id,
                'memorization' => ['from_surah' => 1, 'from_ayah' => 1, 'to_surah' => 1, 'to_ayah' => 9, 'grade' => 'good'],
            ])
            ->assertSessionHasErrors('memorization.to_ayah');

        $this->assertSame(0, ProgressRecord::query()->count());
    }

    public function test_updating_a_recitation_adds_changes_and_removes_portions(): void
    {
        $memorization = ProgressRecord::factory()->create([
            'student_id' => $this->student->id,
            'halaqa_id' => $this->halaqa->id,
            'teacher_id' => $this->teacher->id,
            'group_uuid' => null,
        ]);

        $this->actingAs($this->teacher)
            ->put(route('progress.update', $memorization), [
                'memorization' => ['from_surah' => 67, 'from_ayah' => 1, 'to_surah' => 67, 'to_ayah' => 5, 'grade' => 'excellent', 'mistakes' => 0],
                'revision' => ['from_surah' => 114, 'from_ayah' => 1, 'to_surah' => 114, 'to_ayah' => 6, 'grade' => 'good', 'mistakes' => 2],
            ])
            ->assertSessionHasNoErrors();

        $memorization->refresh();
        $revision = ProgressRecord::query()->where('type', ProgressType::Revision)->first();

        $this->assertSame(5, $memorization->ayahs_count);
        $this->assertNotNull($memorization->group_uuid);
        $this->assertSame($memorization->group_uuid, $revision->group_uuid);
        $this->assertSame($this->student->id, $revision->student_id);
        $this->assertSame($this->halaqa->id, $revision->halaqa_id);

        $this->actingAs($this->teacher)
            ->put(route('progress.update', $memorization), [
                'revision' => ['from_surah' => 114, 'from_ayah' => 1, 'to_surah' => 114, 'to_ayah' => 6, 'grade' => 'good', 'mistakes' => 2],
            ])
            ->assertSessionHasNoErrors();

        $this->assertModelMissing($memorization);
        $this->assertModelExists($revision);
    }

    public function test_deleting_a_recitation_deletes_all_of_its_portions(): void
    {
        [$first, $second] = ProgressRecord::factory()->count(2)->sequence(['type' => ProgressType::Memorization], ['type' => ProgressType::Revision])->create([
            'student_id' => $this->student->id,
            'halaqa_id' => $this->halaqa->id,
            'teacher_id' => $this->teacher->id,
            'group_uuid' => 'a7a7bd5e-4b4d-4b7a-9a37-6c1f0e8f8c11',
        ]);
        $other = ProgressRecord::factory()->create(['student_id' => $this->student->id, 'halaqa_id' => $this->halaqa->id]);

        $this->actingAs($this->teacher)->delete(route('progress.destroy', $first))->assertRedirect();

        $this->assertModelMissing($first);
        $this->assertModelMissing($second);
        $this->assertModelExists($other);
    }

    public function test_student_enters_a_recitation_and_the_teacher_is_notified(): void
    {
        $this->actingAs($this->student)
            ->put(route('halaqat.recitation.update', $this->halaqa), [
                'memorization' => ['from_surah' => 67, 'from_ayah' => 1, 'to_surah' => 67, 'to_ayah' => 10],
                'revision' => ['from_surah' => 78, 'from_ayah' => 1, 'to_surah' => 78, 'to_ayah' => 40],
                'notes' => 'Ready',
            ])
            ->assertSessionHasNoErrors();

        $submission = RecitationSubmission::query()->sole();

        $this->assertSame($this->student->id, $submission->student_id);
        $this->assertSame(10, $submission->portions['memorization']['to_ayah']);
        $this->assertSame(78, $submission->portions['revision']['from_surah']);
        Notification::assertSentTo($this->teacher, RecitationSubmitted::class);

        $this->actingAs($this->student)
            ->put(route('halaqat.recitation.update', $this->halaqa), [
                'revision' => ['from_surah' => 78, 'from_ayah' => 1, 'to_surah' => 78, 'to_ayah' => 20],
            ])
            ->assertSessionHasNoErrors();

        $submission->refresh();

        $this->assertSame(1, RecitationSubmission::query()->count());
        $this->assertNull($submission->portions['memorization']);
        $this->assertSame(20, $submission->portions['revision']['to_ayah']);
    }

    public function test_only_students_of_the_halaqa_can_enter_a_recitation(): void
    {
        $outsider = User::factory()->student()->create();
        $portion = ['memorization' => ['from_surah' => 67, 'from_ayah' => 1, 'to_surah' => 67, 'to_ayah' => 10]];

        $this->actingAs($outsider)->put(route('halaqat.recitation.update', $this->halaqa), $portion)->assertForbidden();
        $this->actingAs($this->teacher)->put(route('halaqat.recitation.update', $this->halaqa), $portion)->assertForbidden();

        $this->assertSame(0, RecitationSubmission::query()->count());
    }

    public function test_grading_a_submission_records_it_and_clears_it(): void
    {
        $submission = RecitationSubmission::factory()->create(['student_id' => $this->student->id, 'halaqa_id' => $this->halaqa->id]);

        $this->actingAs($this->teacher)
            ->get(route('progress.student', $this->student))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('submissions', 1)
                ->where('submissions.0.id', $submission->id)
                ->where('submissions.0.memorization.to_ayah', 10));

        $this->actingAs($this->teacher)
            ->post(route('progress.store'), [
                'student_id' => $this->student->id,
                'halaqa_id' => $this->halaqa->id,
                'submission_id' => $submission->id,
                'memorization' => ['from_surah' => 67, 'from_ayah' => 1, 'to_surah' => 67, 'to_ayah' => 10, 'grade' => 'very_good', 'mistakes' => 2],
                'revision' => ['from_surah' => 78, 'from_ayah' => 1, 'to_surah' => 78, 'to_ayah' => 40, 'grade' => 'excellent', 'mistakes' => 0],
            ])
            ->assertSessionHasNoErrors();

        $this->assertModelMissing($submission);
        $this->assertSame(2, ProgressRecord::query()->where('student_id', $this->student->id)->count());
    }

    public function test_student_sees_only_their_own_submission_and_the_teacher_sees_all(): void
    {
        $other = User::factory()->student()->create();
        $this->halaqa->students()->attach($other);
        RecitationSubmission::factory()->create(['student_id' => $other->id, 'halaqa_id' => $this->halaqa->id]);
        $mine = RecitationSubmission::factory()->create(['student_id' => $this->student->id, 'halaqa_id' => $this->halaqa->id]);

        $this->actingAs($this->student)
            ->get(route('halaqat.show', $this->halaqa))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('submissions', 1)
                ->where('submissions.0.id', $mine->id)
                ->where('can.submit', true));

        $this->actingAs($this->teacher)
            ->get(route('halaqat.show', ['halaqa' => $this->halaqa, 'tab' => 'students', 'submission' => $mine->id]))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('submissions', 2)
                ->where('focus.tab', 'students')
                ->where('focus.submission', $mine->id));
    }

    public function test_student_cannot_remove_another_students_submission(): void
    {
        $other = User::factory()->student()->create();
        $submission = RecitationSubmission::factory()->create(['student_id' => $other->id, 'halaqa_id' => $this->halaqa->id]);

        $this->actingAs($this->student)->delete(route('recitation-submissions.destroy', $submission))->assertForbidden();
        $this->actingAs($this->teacher)->delete(route('recitation-submissions.destroy', $submission))->assertRedirect();

        $this->assertModelMissing($submission);
    }
}
