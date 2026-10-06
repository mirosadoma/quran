<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class SpeechTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.transcriber' => ['url' => 'http://transcriber.test', 'token' => 'secret', 'timeout' => 30]]);
        Storage::fake('local');
    }

    public function test_a_text_is_read_aloud_once_then_kept(): void
    {
        Http::fake(['transcriber.test/speak' => Http::response('MP3-AUDIO', 200, ['Content-Type' => 'audio/mpeg'])]);
        $user = User::factory()->student()->create();

        foreach ([1, 2] as $time) {
            $response = $this->actingAs($user)->get(route('speech', ['text' => '  كان يونس   عليه السلام نبيا كريما. ']))->assertOk();

            $this->assertSame('audio/mpeg', $response->headers->get('Content-Type'));
            $this->assertStringContainsString('max-age=31536000', (string) $response->headers->get('Cache-Control'));
            $this->assertSame('MP3-AUDIO', $response->baseResponse->getFile()->getContent());
        }

        // The spaces do not make another text, and the second time the kept file is sent.
        Http::assertSentCount(1);
        Http::assertSent(fn (Request $request): bool => $request->url() === 'http://transcriber.test/speak'
            && $request['text'] === 'كان يونس عليه السلام نبيا كريما.'
            && $request->hasHeader('Authorization', 'Bearer secret'));
    }

    public function test_the_text_is_required_and_short(): void
    {
        Http::fake();
        $user = User::factory()->student()->create();

        $this->actingAs($user)->getJson(route('speech'))->assertUnprocessable()->assertJsonValidationErrors('text');
        $this->actingAs($user)->getJson(route('speech', ['text' => str_repeat('نص ', 300)]))->assertUnprocessable()->assertJsonValidationErrors('text');

        Http::assertNothingSent();
    }

    public function test_the_reader_is_told_when_the_voice_fails(): void
    {
        Http::fake(['transcriber.test/*' => Http::response(['message' => 'The voice is not available.'], 503)]);

        $this->actingAs(User::factory()->teacher()->create())
            ->getJson(route('speech', ['text' => 'نص']))
            ->assertServiceUnavailable();

        Storage::disk('local')->assertDirectoryEmpty('speech');
    }

    public function test_the_pages_know_when_the_voice_of_the_server_reads(): void
    {
        $user = User::factory()->student()->create();

        $this->actingAs($user)->get(route('kids.index'))->assertInertia(fn (AssertableInertia $page) => $page->where('narrator', true));

        config(['services.transcriber.url' => null]);

        $this->actingAs($user)->get(route('kids.index'))->assertInertia(fn (AssertableInertia $page) => $page->where('narrator', false));
        $this->actingAs($user)->getJson(route('speech', ['text' => 'نص']))->assertNotFound();
    }

    public function test_guests_cannot_use_the_voice(): void
    {
        Http::fake();

        $this->getJson(route('speech', ['text' => 'نص']))->assertUnauthorized();

        Http::assertNothingSent();
    }
}
