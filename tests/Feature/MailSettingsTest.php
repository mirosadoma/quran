<?php

namespace Tests\Feature;

use App\Mail\TestEmail;
use App\Models\Setting;
use App\Models\User;
use App\Services\MailSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class MailSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_the_admin_saves_the_smtp_settings_and_the_mailer_uses_them_at_once(): void
    {
        Artisan::spy();
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->put(route('settings.mail.update'), [
                'mail_mailer' => 'smtp',
                'mail_host' => 'smtp.example.com',
                'mail_port' => 465,
                'mail_username' => 'apikey',
                'mail_password' => 'very-secret',
                'mail_encryption' => 'ssl',
                'mail_from_address' => 'no-reply@example.com',
                'mail_from_name' => 'منصة وِرد',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame('smtp.example.com', Setting::get('mail_host'));
        // The password is kept encrypted.
        $this->assertNotSame('very-secret', Setting::get('mail_password'));
        $this->assertSame('very-secret', app(MailSettings::class)->password());

        // The settings reach the mail configuration when the mailer is made.
        $this->app->forgetInstance('mail.manager');
        $this->app->make('mail.manager');

        $this->assertSame('smtp', config('mail.default'));
        $this->assertSame('smtp.example.com', config('mail.mailers.smtp.host'));
        $this->assertSame(465, config('mail.mailers.smtp.port'));
        $this->assertSame('apikey', config('mail.mailers.smtp.username'));
        $this->assertSame('very-secret', config('mail.mailers.smtp.password'));
        $this->assertSame('smtps', config('mail.mailers.smtp.scheme'));
        $this->assertSame('no-reply@example.com', config('mail.from.address'));
        $this->assertSame('منصة وِرد', config('mail.from.name'));

        // The server is told: the configuration cache is cleared and the queue workers restart.
        Artisan::shouldHaveReceived('call')->with('config:clear')->once();
        Artisan::shouldHaveReceived('call')->with('queue:restart')->once();
    }

    public function test_an_empty_password_keeps_the_saved_one_and_env_keeps_the_env_file(): void
    {
        Artisan::spy();
        $admin = User::factory()->admin()->create();
        $settings = ['mail_mailer' => 'smtp', 'mail_host' => 'smtp.example.com', 'mail_port' => 587, 'mail_username' => 'me', 'mail_encryption' => 'tls'];

        $this->actingAs($admin)->put(route('settings.mail.update'), [...$settings, 'mail_password' => 'first']);
        $this->actingAs($admin)->put(route('settings.mail.update'), [...$settings, 'mail_password' => ''])->assertSessionHasNoErrors();

        $this->assertSame('first', app(MailSettings::class)->password());

        // Back to the .env file: nothing of the mail configuration is replaced.
        $this->actingAs($admin)->put(route('settings.mail.update'), ['mail_mailer' => 'env', 'mail_encryption' => 'tls'])->assertSessionHasNoErrors();
        $this->app->forgetInstance('mail.manager');
        $this->app->make('mail.manager');

        $this->assertSame(config('mail.default'), app(MailSettings::class)->effective()['mailer']);
        $this->assertNotSame('smtp.example.com', config('mail.mailers.smtp.host'));
    }

    public function test_smtp_needs_a_host_and_a_port_and_only_the_admin_changes_the_settings(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->put(route('settings.mail.update'), ['mail_mailer' => 'smtp', 'mail_host' => '', 'mail_port' => '', 'mail_encryption' => 'tls'])
            ->assertSessionHasErrors(['mail_host', 'mail_port']);

        $this->actingAs(User::factory()->manager()->create())
            ->put(route('settings.mail.update'), ['mail_mailer' => 'log', 'mail_encryption' => 'tls'])
            ->assertForbidden();
    }

    public function test_the_settings_page_shows_the_email_settings_without_the_password(): void
    {
        Artisan::spy();
        $admin = User::factory()->admin()->create();
        $this->actingAs($admin)->put(route('settings.mail.update'), [
            'mail_mailer' => 'smtp', 'mail_host' => 'smtp.example.com', 'mail_port' => 587, 'mail_username' => 'me', 'mail_password' => 'secret', 'mail_encryption' => 'tls',
        ]);

        $this->actingAs($admin)
            ->get(route('settings.edit'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('mail.mailer', 'smtp')
                ->where('mail.host', 'smtp.example.com')
                ->where('mail.password_set', true)
                ->where('mail.effective.mailer', 'smtp')
                ->missing('mail.password')
                ->missing('settings.mail_password')
                ->missing('settings.mail_host'));
    }

    public function test_the_test_email_goes_to_the_admin(): void
    {
        Mail::fake();
        $admin = User::factory()->admin()->create(['email' => 'admin@example.com']);

        $this->actingAs($admin)->post(route('settings.mail.test'))->assertRedirect();

        Mail::assertSent(TestEmail::class, fn (TestEmail $mail): bool => $mail->hasTo('admin@example.com'));

        // Without an email there is nowhere to send it.
        $this->actingAs(User::factory()->admin()->create(['email' => null, 'phone' => '+201000000009']))->post(route('settings.mail.test'))->assertRedirect();
        Mail::assertSentCount(1);
    }
}
