<?php

namespace Tests\Feature;

use App\Models\Halaqa;
use App\Models\HalaqaSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class SessionRecordingsTest extends TestCase
{
    use RefreshDatabase;

    protected User $teacher;

    protected User $student;

    protected Halaqa $halaqa;

    protected HalaqaSession $session;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        config(['meetings.recordings_disk' => 'public']);

        $this->teacher = User::factory()->teacher()->create();
        $this->student = User::factory()->student()->create();
        $this->halaqa = Halaqa::factory()->create(['teacher_id' => $this->teacher->id]);
        $this->halaqa->students()->attach($this->student);
        $this->session = HalaqaSession::factory()->completed()->create(['halaqa_id' => $this->halaqa->id, 'teacher_id' => $this->teacher->id]);
    }

    /**
     * Upload a video in the given number of chunks, returning the last response.
     */
    protected function upload(User $as, HalaqaSession $session, string $name = 'lesson.webm', int $chunks = 2, string $uploadId = 'upload-0001')
    {
        $content = str_repeat('x', 1000);
        $size = strlen($content);
        $chunkSize = (int) ceil($size / $chunks);
        $response = null;

        for ($index = 0; $index < $chunks; $index++) {
            $piece = substr($content, $index * $chunkSize, $chunkSize);

            $response = $this->actingAs($as)->postJson(route('sessions.recording.chunks', $session), [
                'upload_id' => $uploadId,
                'index' => $index,
                'total' => $chunks,
                'size' => $size,
                'name' => $name,
                'chunk' => UploadedFile::fake()->createWithContent('chunk.bin', $piece),
            ]);

            if (! $response->isSuccessful()) {
                return $response;
            }
        }

        return $response;
    }

    public function test_the_teacher_uploads_the_recording_in_chunks_and_students_watch_it_in_the_halaqa(): void
    {
        $response = $this->upload($this->teacher, $this->session);

        $response->assertOk()->assertJsonPath('done', true);

        $path = $this->session->fresh()->recording_path;
        $this->assertNotNull($path);
        $this->assertStringEndsWith('.webm', $path);
        Storage::disk('public')->assertExists($path);
        $this->assertSame(1000, strlen((string) Storage::disk('public')->get($path)));

        $this->actingAs($this->student)
            ->get(route('sessions.show', $this->session))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('session.recording_kind', 'file')
                ->where('session.recording_file_url', Storage::disk('public')->url($path))
                ->where('recordingUpload', null));

        $this->actingAs($this->student)
            ->get(route('halaqat.show', ['halaqa' => $this->halaqa->id, 'tab' => 'recordings']))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('focus.tab', 'recordings')
                ->has('recordings', 1)
                ->where('recordings.0.id', $this->session->id));
    }

    public function test_a_new_video_replaces_the_old_one_and_removing_it_deletes_the_file(): void
    {
        $this->upload($this->teacher, $this->session)->assertOk();
        $old = $this->session->fresh()->recording_path;

        $this->upload($this->teacher, $this->session, 'again.mp4', 3, 'upload-0002')->assertOk();
        $new = $this->session->fresh()->recording_path;

        $this->assertNotSame($old, $new);
        Storage::disk('public')->assertMissing($old);
        Storage::disk('public')->assertExists($new);

        $this->actingAs($this->teacher)->delete(route('sessions.recording.destroy', $this->session))->assertRedirect();

        $this->assertNull($this->session->fresh()->recording_path);
        Storage::disk('public')->assertMissing($new);
    }

    public function test_only_videos_are_accepted_and_only_from_the_teacher_or_the_manager(): void
    {
        $this->upload($this->teacher, $this->session, 'notes.pdf', 1)->assertUnprocessable()->assertJsonValidationErrors('file');
        $this->assertNull($this->session->fresh()->recording_path);

        $this->upload($this->student, $this->session)->assertForbidden();
        $this->upload(User::factory()->teacher()->create(), $this->session)->assertForbidden();
        $this->actingAs($this->student)->delete(route('sessions.recording.destroy', $this->session))->assertForbidden();

        // A chunk after the first one without a part file: the upload must start again.
        $this->actingAs($this->teacher)->postJson(route('sessions.recording.chunks', $this->session), [
            'upload_id' => 'upload-0009',
            'index' => 1,
            'total' => 2,
            'size' => 10,
            'name' => 'lesson.mp4',
            'chunk' => UploadedFile::fake()->createWithContent('chunk.bin', 'xxxxx'),
        ])->assertUnprocessable();
    }

    public function test_the_recordings_of_the_halaqa_are_listed_in_the_order_of_the_sessions(): void
    {
        $later = HalaqaSession::factory()->completed()->create(['halaqa_id' => $this->halaqa->id, 'starts_at' => now()->subDay(), 'recording_url' => 'https://example.com/later']);
        $earlier = HalaqaSession::factory()->completed()->create(['halaqa_id' => $this->halaqa->id, 'starts_at' => now()->subDays(10), 'recording_path' => 'recordings/earlier.mp4']);
        HalaqaSession::factory()->completed()->create(['halaqa_id' => $this->halaqa->id, 'starts_at' => now()->subDays(5)]);

        $this->actingAs($this->teacher)
            ->get(route('halaqat.show', $this->halaqa))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('recordings', 2)
                ->where('recordings.0.id', $earlier->id)
                ->where('recordings.0.recording_kind', 'file')
                ->where('recordings.1.id', $later->id)
                ->where('recordings.1.recording_kind', 'link')
                ->where('recordings.1.recording_url', 'https://example.com/later'));
    }
}
