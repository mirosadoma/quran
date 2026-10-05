<?php

namespace Tests\Feature;

use App\Models\Academy;
use App\Models\AcademyJoinRequest;
use App\Models\ContactMessage;
use App\Models\Halaqa;
use App\Models\User;
use App\Notifications\ContactMessageReceived;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class SiteTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_pages_of_the_website_open_for_visitors(): void
    {
        $pages = [
            'home' => 'site/home',
            'site.about' => 'site/about',
            'site.contact' => 'site/contact',
            'site.videos' => 'site/videos',
            'site.academies' => 'site/academies',
            'site.terms' => 'site/terms',
            'site.faq' => 'site/faq',
            'site.guide' => 'site/guide',
        ];

        foreach ($pages as $name => $component) {
            $this->get(route($name))
                ->assertOk()
                ->assertInertia(fn (AssertableInertia $page) => $page->component($component));
        }
    }

    public function test_the_home_page_shows_the_numbers_and_the_active_academies(): void
    {
        $academy = Academy::factory()->create();
        Academy::factory()->inactive()->create();
        Halaqa::factory()->for($academy)->create();

        $this->get(route('home'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('stats.academies', 1)
                ->where('stats.halaqat', 1)
                ->has('academies', 1)
                ->where('academies.0.id', $academy->id));
    }

    public function test_the_academies_page_lists_only_active_academies_and_filters_them(): void
    {
        Academy::factory()->create(['name' => 'أكاديمية النور', 'gender' => 'female']);
        Academy::factory()->create(['name' => 'أكاديمية الهدى', 'gender' => 'male']);
        Academy::factory()->inactive()->create();

        $this->get(route('site.academies'))
            ->assertInertia(fn (AssertableInertia $page) => $page->has('academies.data', 2));

        $this->get(route('site.academies', ['gender' => 'female']))
            ->assertInertia(fn (AssertableInertia $page) => $page->has('academies.data', 1)->where('academies.data.0.name', 'أكاديمية النور'));

        $this->get(route('site.academies', ['search' => 'الهدى']))
            ->assertInertia(fn (AssertableInertia $page) => $page->has('academies.data', 1)->where('academies.data.0.name', 'أكاديمية الهدى'));
    }

    public function test_the_page_of_an_academy_shows_its_halaqat_and_how_the_visitor_can_join(): void
    {
        $academy = Academy::factory()->create();
        Halaqa::factory()->for($academy)->create(['name' => 'حلقة الفجر']);
        Halaqa::factory()->for($academy)->create(['is_active' => false]);

        $this->get(route('site.academy', $academy->slug))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('site/academy')
                ->has('halaqat', 1)
                ->where('halaqat.0.name', 'حلقة الفجر')
                ->where('membership', null));

        $student = User::factory()->student()->create();
        AcademyJoinRequest::factory()->for($academy)->for($student)->create();

        $this->actingAs($student)
            ->get(route('site.academy', $academy->slug))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('membership.can_join', true)
                ->where('membership.pending', true)
                ->where('membership.member', false));

        $this->get(route('site.academy', Academy::factory()->inactive()->create()->slug))->assertNotFound();
    }

    public function test_a_visitor_writes_to_the_administration_from_the_contact_page(): void
    {
        Notification::fake();
        $admin = User::factory()->admin()->create();

        $this->post(route('site.contact.store'), [
            'name' => 'زائر',
            'phone' => '+201001112233',
            'subject' => 'سؤال',
            'message' => 'كيف أسجل ابني في حلقة لحفظ جزء عمّ؟',
        ])->assertRedirect();

        $message = ContactMessage::query()->sole();
        $this->assertSame('زائر', $message->name);
        $this->assertNull($message->read_at);

        Notification::assertSentTo($admin, ContactMessageReceived::class);
    }

    public function test_the_contact_form_needs_a_way_to_reply_and_rejects_robots(): void
    {
        $this->post(route('site.contact.store'), ['name' => 'زائر', 'message' => 'رسالة بلا وسيلة للرد عليها'])
            ->assertSessionHasErrors(['email', 'phone']);

        $this->post(route('site.contact.store'), [
            'name' => 'Robot',
            'email' => 'robot@example.com',
            'message' => 'Buy cheap things now from our website',
            'website' => 'https://spam.example.com',
        ])->assertSessionHasErrors('website');

        $this->assertSame(0, ContactMessage::query()->count());
    }

    public function test_the_administration_reads_and_deletes_the_contact_messages(): void
    {
        $admin = User::factory()->admin()->create();
        $message = ContactMessage::factory()->create();

        $this->actingAs($admin)
            ->get(route('contact-messages.index'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->component('contact-messages/index')->where('unread', 1)->has('messages.data', 1));

        $this->actingAs($admin)->patch(route('contact-messages.read', $message))->assertRedirect();
        $this->assertNotNull($message->fresh()->read_at);

        $this->actingAs($admin)->delete(route('contact-messages.destroy', $message))->assertRedirect();
        $this->assertModelMissing($message);
    }

    public function test_only_the_administration_sees_the_contact_messages(): void
    {
        $manager = User::factory()->manager()->create();

        $this->actingAs($manager)->get(route('contact-messages.index'))->assertForbidden();
    }

    public function test_the_dashboard_lives_under_admin_and_asks_visitors_to_sign_in(): void
    {
        $this->assertStringEndsWith('/admin/dashboard', route('dashboard'));

        $this->get(route('dashboard'))->assertRedirect(route('login'));
    }
}
