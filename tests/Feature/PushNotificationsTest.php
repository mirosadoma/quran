<?php

namespace Tests\Feature;

use App\Models\Halaqa;
use App\Models\PushSubscription;
use App\Models\Setting;
use App\Models\User;
use App\Notifications\AddedToHalaqa;
use App\Notifications\Channels\WebPushChannel;
use App\Services\WebPush\WebPush;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class PushNotificationsTest extends TestCase
{
    use RefreshDatabase;

    /**
     * The browser's side of a subscription: its P-256 key pair and auth secret.
     *
     * @var array{public_key: string, private_key: string, auth: string}
     */
    protected array $browser;

    protected User $student;

    protected function setUp(): void
    {
        parent::setUp();

        $vapid = WebPush::generateKeys();

        config([
            'services.webpush.public_key' => $vapid['public_key'],
            'services.webpush.private_key' => $vapid['private_key'],
            'services.webpush.subject' => 'mailto:admin@rattil.test',
        ]);

        $this->browser = [...WebPush::generateKeys(), 'auth' => WebPush::base64UrlEncode(random_bytes(16))];
        $this->student = User::factory()->student()->create();
    }

    protected function subscribe(User $user, string $endpoint = 'https://fcm.googleapis.com/fcm/send/device-1'): PushSubscription
    {
        return PushSubscription::factory()->for($user)->create([
            'endpoint' => $endpoint,
            'endpoint_hash' => PushSubscription::hashEndpoint($endpoint),
            'public_key' => $this->browser['public_key'],
            'auth_token' => $this->browser['auth'],
        ]);
    }

    /**
     * Decrypt a pushed message the way the browser does (RFC 8291).
     *
     * @return array<string, mixed>
     */
    protected function decrypt(string $body): array
    {
        $salt = substr($body, 0, 16);
        $keyLength = ord($body[20]);
        $senderKey = substr($body, 21, $keyLength);
        $record = substr($body, 21 + $keyLength);

        $browserPublic = WebPush::base64UrlDecode($this->browser['public_key']);
        $private = openssl_pkey_get_private(WebPush::privateKeyPem(WebPush::base64UrlDecode($this->browser['private_key']), $browserPublic));
        $shared = openssl_pkey_derive(openssl_pkey_get_public(WebPush::publicKeyPem($senderKey)), $private, 32);

        $ikm = hash_hkdf('sha256', $shared, 32, "WebPush: info\0".$browserPublic.$senderKey, WebPush::base64UrlDecode($this->browser['auth']));
        $key = hash_hkdf('sha256', $ikm, 16, "Content-Encoding: aes128gcm\0", $salt);
        $nonce = hash_hkdf('sha256', $ikm, 12, "Content-Encoding: nonce\0", $salt);

        $plaintext = openssl_decrypt(substr($record, 0, -16), 'aes-128-gcm', $key, OPENSSL_RAW_DATA, $nonce, substr($record, -16));

        $this->assertIsString($plaintext, 'The message could not be decrypted with the browser keys.');

        return json_decode(rtrim($plaintext, "\x02"), true);
    }

    /**
     * The VAPID token is signed with the platform's private key and names the push service.
     */
    protected function assertSignedFor(Request $request): void
    {
        $this->assertMatchesRegularExpression('/^vapid t=([\w-]+)\.([\w-]+)\.([\w-]+), k=([\w-]+)$/', $request->header('Authorization')[0]);
        preg_match('/^vapid t=([\w-]+)\.([\w-]+)\.([\w-]+), k=([\w-]+)$/', $request->header('Authorization')[0], $parts);

        [, $header, $claims, $signature, $key] = $parts;
        $this->assertSame(config('services.webpush.public_key'), $key);
        $this->assertSame('https://fcm.googleapis.com', json_decode(WebPush::base64UrlDecode($claims), true)['aud']);

        $raw = WebPush::base64UrlDecode($signature);
        $integer = fn (string $value): string => "\x02".chr(strlen($value = ltrim($value, "\0")) + (ord($value[0]) > 0x7F ? 1 : 0)).(ord($value[0]) > 0x7F ? "\0" : '').$value;
        $der = $integer(substr($raw, 0, 32)).$integer(substr($raw, 32));
        $der = "\x30".chr(strlen($der)).$der;

        $this->assertSame(1, openssl_verify("{$header}.{$claims}", $der, WebPush::publicKeyPem(WebPush::base64UrlDecode($key)), OPENSSL_ALGO_SHA256));
    }

    public function test_a_device_subscribes_and_belongs_to_whoever_signs_in_on_it(): void
    {
        $subscription = ['endpoint' => 'https://fcm.googleapis.com/fcm/send/device-1', 'keys' => ['p256dh' => $this->browser['public_key'], 'auth' => $this->browser['auth']]];

        $this->actingAs($this->student)->postJson(route('push-subscriptions.store'), $subscription)->assertCreated();

        $sister = User::factory()->student()->create();
        $this->actingAs($sister)->postJson(route('push-subscriptions.store'), $subscription)->assertCreated();

        $this->assertSame(1, PushSubscription::query()->count());
        $this->assertTrue(PushSubscription::query()->first()->user->is($sister));
    }

    public function test_only_secure_push_addresses_are_accepted(): void
    {
        $this->actingAs($this->student)
            ->postJson(route('push-subscriptions.store'), ['endpoint' => 'http://push.example.com/1', 'keys' => ['p256dh' => $this->browser['public_key'], 'auth' => $this->browser['auth']]])
            ->assertJsonValidationErrors('endpoint');
    }

    public function test_a_device_unsubscribes_only_itself(): void
    {
        $mine = $this->subscribe($this->student);
        $other = $this->subscribe(User::factory()->student()->create(), 'https://fcm.googleapis.com/fcm/send/device-2');

        $this->actingAs($this->student)->deleteJson(route('push-subscriptions.destroy'), ['endpoint' => $other->endpoint])->assertNoContent();
        $this->actingAs($this->student)->deleteJson(route('push-subscriptions.destroy'), ['endpoint' => $mine->endpoint])->assertNoContent();

        $this->assertModelMissing($mine);
        $this->assertModelExists($other);
    }

    public function test_notifications_are_pushed_encrypted_and_signed(): void
    {
        Http::fake(['fcm.googleapis.com/*' => Http::response('', 201)]);
        $subscription = $this->subscribe($this->student);
        $halaqa = Halaqa::factory()->create();

        $this->student->notify(new AddedToHalaqa($halaqa));

        $notification = $this->student->notifications()->first();

        Http::assertSentCount(1);
        Http::assertSent(function (Request $request) use ($notification): bool {
            $this->assertSame('aes128gcm', $request->header('Content-Encoding')[0]);
            $this->assertSame('86400', $request->header('TTL')[0]);
            $this->assertSignedFor($request);

            $payload = $this->decrypt($request->body());
            $this->assertSame($notification->data['title'], $payload['title']);
            $this->assertSame(route('notifications.open', $notification->id, false), $payload['url']);
            $this->assertSame('rtl', $payload['dir']);

            return true;
        });

        $this->assertNotNull($subscription->fresh()->last_used_at);
    }

    public function test_devices_the_push_service_forgot_are_removed(): void
    {
        Http::fake(['*' => Http::response('', 410)]);
        $subscription = $this->subscribe($this->student);

        $this->student->notify(new AddedToHalaqa(Halaqa::factory()->create()));

        $this->assertModelMissing($subscription);
        $this->assertSame(1, $this->student->notifications()->count());
    }

    public function test_push_is_used_only_for_subscribed_users_when_it_is_turned_on(): void
    {
        $notification = new AddedToHalaqa(Halaqa::factory()->create());

        $this->assertNotContains(WebPushChannel::class, $notification->via($this->student));

        $this->subscribe($this->student);
        $this->assertContains(WebPushChannel::class, $notification->via($this->student));

        Setting::put(['notify_push' => false]);
        $this->assertNotContains(WebPushChannel::class, $notification->via($this->student));
    }

    public function test_the_test_notification_reaches_the_users_devices(): void
    {
        Http::fake(['fcm.googleapis.com/*' => Http::response('', 201)]);
        $this->subscribe($this->student);

        $this->actingAs($this->student)->postJson(route('push-subscriptions.test'))->assertOk()->assertJson(['devices' => 1]);

        Http::assertSent(fn (Request $request): bool => $this->decrypt($request->body())['url'] === route('dashboard', absolute: false));
        $this->assertSame(0, $this->student->notifications()->count());
    }

    public function test_the_test_notification_needs_the_keys(): void
    {
        config(['services.webpush.private_key' => null]);

        $this->actingAs($this->student)->postJson(route('push-subscriptions.test'))->assertStatus(422);
    }

    public function test_signing_out_stops_the_pushes_to_that_device_only(): void
    {
        $phone = $this->subscribe($this->student);
        $laptop = $this->subscribe($this->student, 'https://fcm.googleapis.com/fcm/send/laptop');

        $this->actingAs($this->student)->post(route('logout'), ['push_endpoint' => $phone->endpoint])->assertRedirect(route('login'));

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

    public function test_signed_in_users_get_the_key_to_subscribe(): void
    {
        $this->actingAs($this->student)
            ->get(route('dashboard'))
            ->assertInertia(fn (AssertableInertia $page) => $page->where('push.public_key', config('services.webpush.public_key')));

        Setting::put(['notify_push' => false]);

        $this->actingAs($this->student)
            ->get(route('dashboard'))
            ->assertInertia(fn (AssertableInertia $page) => $page->where('push.public_key', null));
    }
}
