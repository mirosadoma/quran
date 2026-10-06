<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class RecitationTranscriptionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.transcriber' => ['url' => 'http://transcriber.test/', 'token' => 'secret', 'timeout' => 30]]);
    }

    public function test_a_recited_passage_comes_back_as_text_with_its_diacritics(): void
    {
        Http::fake(['transcriber.test/transcribe' => Http::response(['text' => ' الْحَمْدَ لِلَّهِ رَبُّ الْعَالَمِينَ '])]);
        $wav = $this->wav();

        $this->actingAs(User::factory()->student()->create())
            ->postJson(route('recitation.transcribe'), ['audio' => UploadedFile::fake()->createWithContent('segment.wav', $wav)])
            ->assertOk()
            ->assertExactJson(['text' => 'الْحَمْدَ لِلَّهِ رَبُّ الْعَالَمِينَ']);

        Http::assertSent(fn (Request $request): bool => $request->url() === 'http://transcriber.test/transcribe'
            && $request->hasHeader('Authorization', 'Bearer secret')
            && $request->hasHeader('Content-Type', 'audio/wav')
            && $request->body() === $wav);
    }

    public function test_a_passage_still_being_read_is_sent_as_partial(): void
    {
        Http::fake(['transcriber.test/*' => Http::response(['text' => 'قُلْ هُوَ'])]);

        $this->actingAs(User::factory()->student()->create())
            ->postJson(route('recitation.transcribe'), ['audio' => UploadedFile::fake()->createWithContent('segment.wav', $this->wav()), 'partial' => '1'])
            ->assertOk()
            ->assertExactJson(['text' => 'قُلْ هُوَ']);

        Http::assertSent(fn (Request $request): bool => $request->url() === 'http://transcriber.test/transcribe?partial=1');
    }

    public function test_a_busy_service_skips_partial_passages_without_reporting_them(): void
    {
        Http::fake(['transcriber.test/*' => Http::response(['message' => 'Busy'], 503)]);
        Exceptions::fake();

        $this->actingAs(User::factory()->student()->create())
            ->postJson(route('recitation.transcribe'), ['audio' => UploadedFile::fake()->createWithContent('segment.wav', $this->wav()), 'partial' => '1'])
            ->assertServiceUnavailable();

        Exceptions::assertNothingReported();
    }

    public function test_only_a_wav_recording_is_accepted(): void
    {
        Http::fake();
        $user = User::factory()->student()->create();

        $this->actingAs($user)
            ->postJson(route('recitation.transcribe'), ['audio' => UploadedFile::fake()->createWithContent('notes.txt', 'not a recording')])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('audio');

        $this->actingAs($user)
            ->postJson(route('recitation.transcribe'))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('audio');

        Http::assertNothingSent();
    }

    public function test_the_reader_is_told_when_the_service_fails(): void
    {
        Http::fake(['transcriber.test/*' => Http::response(['message' => 'Busy'], 503)]);

        $this->actingAs(User::factory()->teacher()->create())
            ->postJson(route('recitation.transcribe'), ['audio' => UploadedFile::fake()->createWithContent('segment.wav', $this->wav())])
            ->assertServiceUnavailable()
            ->assertJsonStructure(['message']);
    }

    public function test_the_vowels_are_not_checked_without_the_service(): void
    {
        config(['services.transcriber.url' => null]);
        Http::fake();
        $user = User::factory()->student()->create();

        $this->actingAs($user)
            ->postJson(route('recitation.transcribe'), ['audio' => UploadedFile::fake()->createWithContent('segment.wav', $this->wav())])
            ->assertNotFound();

        $this->actingAs($user)->get(route('kids.index'))->assertInertia(fn (AssertableInertia $page) => $page->where('vowelCheck', false));
        $this->actingAs($user)->get(route('mushaf.index'))->assertInertia(fn (AssertableInertia $page) => $page->where('vowelCheck', false));
        Http::assertNothingSent();
    }

    public function test_the_mushaf_and_kids_pages_know_when_the_vowels_are_checked(): void
    {
        $user = User::factory()->student()->create();

        $this->actingAs($user)->get(route('kids.index'))->assertInertia(fn (AssertableInertia $page) => $page->where('vowelCheck', true));
        $this->actingAs($user)->get(route('mushaf.index'))->assertInertia(fn (AssertableInertia $page) => $page->where('vowelCheck', true));
    }

    public function test_guests_cannot_send_recordings(): void
    {
        Http::fake();

        $this->postJson(route('recitation.transcribe'), ['audio' => UploadedFile::fake()->createWithContent('segment.wav', $this->wav())])
            ->assertUnauthorized();

        Http::assertNothingSent();
    }

    /**
     * A tenth of a second of silence, 16 kHz mono PCM, as the browser sends it.
     */
    protected function wav(): string
    {
        $samples = pack('v*', ...array_fill(0, 1600, 0));

        return 'RIFF'.pack('V', 36 + strlen($samples)).'WAVE'
            .'fmt '.pack('VvvVVvv', 16, 1, 1, 16000, 32000, 2, 16)
            .'data'.pack('V', strlen($samples)).$samples;
    }
}
