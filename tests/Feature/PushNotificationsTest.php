<?php

namespace Tests\Feature;

use App\Models\Halaqa;
use App\Models\PushSubscription;
use App\Models\Setting;
use App\Models\User;
use App\Notifications\AddedToHalaqa;
use App\Notifications\Channels\WebPushChannel;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class PushNotificationsTest extends TestCase
{
    use RefreshDatabase;

    protected const FCM_URL = 'https://fcm.googleapis.com/v1/projects/wird-test/messages:send';

    /**
     * The RSA key pair of the fake service account, made once for the whole class.
     *
     * @var array{private: string, public: string}|null
     */
    protected static ?array $serviceAccountKeys = null;

    protected string $credentialsPath;

    protected User $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->credentialsPath = (string) tempnam(sys_get_temp_dir(), 'firebase');

        file_put_contents($this->credentialsPath, (string) json_encode([
            'type' => 'service_account',
            'project_id' => 'wird-test',
            'client_email' => 'firebase-adminsdk@wird-test.iam.gserviceaccount.com',
            'private_key' => $this->serviceAccountKeys()['private'],
        ]));

        config([
            'services.firebase.credentials' => $this->credentialsPath,
            'services.firebase.api_key' => 'AIza-test-key',
            'services.firebase.app_id' => '1:1234:web:abcd',
            'services.firebase.messaging_sender_id' => '1234',
            'services.firebase.vapid_key' => 'BHsTydwtUH5VBuGozCYu6P5aXhrT1nNhmON3d81vKVTjnuvMAqyq2S73DWBq-Xa4qs8APkdDQ2oGIhycrXfPPF0',
        ]);

        Http::preventStrayRequests();

        $this->student = User::factory()->student()->create();
    }

    protected function tearDown(): void
    {
        if (is_file($this->credentialsPath)) {
            unlink($this->credentialsPath);
        }

        parent::tearDown();
    }

    /**
     * On Windows PHP needs its bundled openssl.cnf to create keys.
     *
     * @return array{private: string, public: string}
     */
    protected function serviceAccountKeys(): array
    {
        if (static::$serviceAccountKeys === null) {
            $options = ['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA];
            $config = dirname(PHP_BINARY).'/extras/ssl/openssl.cnf';

            if (is_file($config)) {
                $options['config'] = $config;
            }

            $key = openssl_pkey_new($options);
            openssl_pkey_export($key, $private, null, $options);

            static::$serviceAccountKeys = ['private' => $private, 'public' => openssl_pkey_get_details($key)['key']];
        }

        return static::$serviceAccountKeys;
    }

    /**
     * @param  array<string, mixed>  $body
     */
    protected function fakeFirebase(int $status = 200, array $body = ['name' => 'projects/wird-test/messages/1']): void
    {
        Http::fake([
            'oauth2.googleapis.com/token' => Http::response(['access_token' => 'google-access-token', 'expires_in' => 3599, 'token_type' => 'Bearer']),
            'fcm.googleapis.com/*' => Http::response($body, $status),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function pushedPayload(Request $request): array
    {
        return json_decode($request['message']['data']['payload'], true);
    }

    public function test_a_device_registers_its_token_and_belongs_to_whoever_signs_in_on_it(): void
    {
        $token = 'dKq3Lw7xR0e:APA91bHk2-test_token';

        $this->actingAs($this->student)->postJson(route('push-subscriptions.store'), ['token' => $token])->assertCreated();

        $sister = User::factory()->student()->create();
        $this->actingAs($sister)->postJson(route('push-subscriptions.store'), ['token' => $token])->assertCreated();

        $this->assertSame(1, PushSubscription::query()->count());
        $this->assertTrue(PushSubscription::query()->first()->user->is($sister));
        $this->assertSame($token, PushSubscription::query()->first()->token);
    }

    public function test_only_firebase_tokens_are_accepted(): void
    {
        $this->actingAs($this->student)
            ->postJson(route('push-subscriptions.store'), ['token' => 'https://push.example.com/<script>'])
            ->assertJsonValidationErrors('token');
    }

    public function test_a_device_unsubscribes_only_itself(): void
    {
        $mine = PushSubscription::factory()->for($this->student)->create();
        $other = PushSubscription::factory()->for(User::factory()->student())->create();

        $this->actingAs($this->student)->deleteJson(route('push-subscriptions.destroy'), ['token' => $other->token])->assertNoContent();
        $this->actingAs($this->student)->deleteJson(route('push-subscriptions.destroy'), ['token' => $mine->token])->assertNoContent();

        $this->assertModelMissing($mine);
        $this->assertModelExists($other);
    }

    public function test_notifications_are_sent_through_firebase_with_the_service_account(): void
    {
        $this->fakeFirebase();
        $subscription = PushSubscription::factory()->for($this->student)->create();

        $this->student->notify(new AddedToHalaqa(Halaqa::factory()->create()));

        $notification = $this->student->notifications()->first();

        Http::assertSent(function (Request $request): bool {
            if ($request->url() !== 'https://oauth2.googleapis.com/token') {
                return false;
            }

            $this->assertSame('urn:ietf:params:oauth:grant-type:jwt-bearer', $request['grant_type']);

            $claims = JWT::decode($request['assertion'], new Key($this->serviceAccountKeys()['public'], 'RS256'));
            $this->assertSame('firebase-adminsdk@wird-test.iam.gserviceaccount.com', $claims->iss);
            $this->assertSame('https://www.googleapis.com/auth/firebase.messaging', $claims->scope);

            return true;
        });

        Http::assertSent(function (Request $request) use ($subscription, $notification): bool {
            if ($request->url() !== self::FCM_URL) {
                return false;
            }

            $this->assertSame('Bearer google-access-token', $request->header('Authorization')[0]);
            $this->assertSame($subscription->token, $request['message']['token']);
            $this->assertSame('86400', $request['message']['webpush']['headers']['TTL']);

            $payload = $this->pushedPayload($request);
            $this->assertSame($notification->data['title'], $payload['title']);
            $this->assertSame(route('notifications.open', $notification->id, false), $payload['url']);
            $this->assertSame('rtl', $payload['dir']);

            return true;
        });

        $this->assertNotNull($subscription->fresh()->last_used_at);
    }

    public function test_the_access_token_is_reused_between_notifications(): void
    {
        $this->fakeFirebase();
        PushSubscription::factory()->for($this->student)->count(2)->create();

        $this->student->notify(new AddedToHalaqa(Halaqa::factory()->create()));
        $this->student->notify(new AddedToHalaqa(Halaqa::factory()->create()));

        Http::assertSentCount(5);
        Http::assertSent(fn (Request $request): bool => $request->url() === 'https://oauth2.googleapis.com/token');
        $this->assertCount(4, Http::recorded(fn (Request $request): bool => $request->url() === self::FCM_URL));
    }

    public function test_devices_firebase_forgot_are_removed(): void
    {
        $this->fakeFirebase(404, ['error' => [
            'code' => 404,
            'status' => 'NOT_FOUND',
            'details' => [['@type' => 'type.googleapis.com/google.firebase.fcm.v1.FcmError', 'errorCode' => 'UNREGISTERED']],
        ]]);
        $subscription = PushSubscription::factory()->for($this->student)->create();

        $this->student->notify(new AddedToHalaqa(Halaqa::factory()->create()));

        $this->assertModelMissing($subscription);
        $this->assertSame(1, $this->student->notifications()->count());
    }

    public function test_devices_are_kept_when_firebase_fails_for_another_reason(): void
    {
        $this->fakeFirebase(503, ['error' => ['code' => 503, 'status' => 'UNAVAILABLE']]);
        $subscription = PushSubscription::factory()->for($this->student)->create();

        $this->student->notify(new AddedToHalaqa(Halaqa::factory()->create()));

        $this->assertModelExists($subscription);
        $this->assertNull($subscription->fresh()->last_used_at);
    }

    public function test_push_is_used_only_for_subscribed_users_when_it_is_turned_on(): void
    {
        $notification = new AddedToHalaqa(Halaqa::factory()->create());

        $this->assertNotContains(WebPushChannel::class, $notification->via($this->student));

        PushSubscription::factory()->for($this->student)->create();
        $this->assertContains(WebPushChannel::class, $notification->via($this->student));

        Setting::put(['notify_push' => false]);
        $this->assertNotContains(WebPushChannel::class, $notification->via($this->student));
    }

    public function test_the_test_notification_reaches_the_users_devices_without_waiting_for_the_queue(): void
    {
        config(['queue.default' => 'database']);
        $this->fakeFirebase();
        PushSubscription::factory()->for($this->student)->create();

        $this->actingAs($this->student)->postJson(route('push-subscriptions.test'))->assertOk()->assertJson(['devices' => 1, 'delivered' => 1]);

        Http::assertSent(fn (Request $request): bool => $request->url() === self::FCM_URL
            && $this->pushedPayload($request)['url'] === route('dashboard', absolute: false));
        $this->assertSame(0, $this->student->notifications()->count());
    }

    public function test_the_test_notification_tells_when_firebase_refused_it(): void
    {
        $this->fakeFirebase(403, ['error' => ['code' => 403, 'status' => 'PERMISSION_DENIED']]);
        PushSubscription::factory()->for($this->student)->create();

        $this->actingAs($this->student)->postJson(route('push-subscriptions.test'))->assertOk()->assertJson(['devices' => 1, 'delivered' => 0]);
    }

    public function test_the_test_notification_needs_firebase(): void
    {
        unlink($this->credentialsPath);

        $this->actingAs($this->student)->postJson(route('push-subscriptions.test'))->assertStatus(422);
    }

    public function test_signing_out_stops_the_pushes_to_that_device_only(): void
    {
        $phone = PushSubscription::factory()->for($this->student)->create();
        $laptop = PushSubscription::factory()->for($this->student)->create();

        $this->actingAs($this->student)->post(route('logout'), ['push_token' => $phone->token])->assertRedirect(route('login'));

        $this->assertGuest();
        $this->assertModelMissing($phone);
        $this->assertModelExists($laptop);
    }

    public function test_opening_a_pushed_notification_marks_it_read_and_goes_to_its_page(): void
    {
        $halaqa = Halaqa::factory()->create();
        $this->student->notify(new AddedToHalaqa($halaqa));
        $notification = $this->student->notifications()->first();

        $this->actingAs($this->student)->get(route('notifications.open', $notification->id))->assertRedirect($notification->data['url']);

        $this->assertNotNull($notification->fresh()->read_at);

        $this->actingAs(User::factory()->student()->create())
            ->get(route('notifications.open', $notification->id))
            ->assertRedirect(route('notifications.index'));
    }

    public function test_signed_in_users_get_only_the_public_firebase_settings(): void
    {
        $this->actingAs($this->student)
            ->get(route('dashboard'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('push.firebase', 5)
                ->where('push.firebase.projectId', 'wird-test')
                ->where('push.firebase.apiKey', 'AIza-test-key')
                ->where('push.firebase.appId', '1:1234:web:abcd')
                ->where('push.firebase.messagingSenderId', '1234')
                ->where('push.firebase.vapidKey', config('services.firebase.vapid_key')));

        Setting::put(['notify_push' => false]);

        $this->actingAs($this->student)
            ->get(route('dashboard'))
            ->assertInertia(fn (AssertableInertia $page) => $page->where('push.firebase', null));
    }
}
