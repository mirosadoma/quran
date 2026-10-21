<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class CompanionSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_the_admin_hides_the_companion_by_area_and_the_switches_stay_off(): void
    {
        $admin = User::factory()->admin()->create();

        // The settings form sends its switches as form data: "1" and "0".
        $this->actingAs($admin)
            ->put(route('settings.update'), [
                'academy_name' => 'وِرد',
                'default_timezone' => 'Africa/Cairo',
                'meeting_provider' => 'jitsi',
                'generate_days_ahead' => '14',
                'reminder_minutes' => '15',
                'late_after_minutes' => '10',
                'notify_push' => '0',
                'companion_site' => '0',
                'companion_admin' => '1',
                'companion_manager' => '1',
                'companion_teacher' => '0',
                'companion_student' => '1',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertFalse(Setting::get('companion_site'));
        $this->assertFalse(Setting::get('companion_teacher'));
        $this->assertTrue(Setting::get('companion_student'));
        $this->assertFalse(Setting::get('notify_push'));

        $this->actingAs($admin)
            ->get(route('settings.edit'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('settings.companion_site', false)
                ->where('settings.companion_teacher', false)
                ->where('settings.companion_student', true)
                ->where('settings.notify_push', false));
    }

    public function test_every_page_tells_whether_the_companion_shows_on_the_website_and_in_the_panel_of_the_role(): void
    {
        Setting::put(['companion_site' => false, 'companion_teacher' => false]);

        $this->get(route('home'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('companion.site', false)
                ->where('companion.panel', false));

        $this->actingAs(User::factory()->teacher()->create())
            ->get(route('dashboard'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('companion.site', false)
                ->where('companion.panel', false));

        $this->actingAs(User::factory()->student()->create())
            ->get(route('dashboard'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('companion.site', false)
                ->where('companion.panel', true));
    }

    public function test_the_companion_shows_everywhere_until_the_admin_hides_it(): void
    {
        $this->actingAs(User::factory()->manager()->create())
            ->get(route('dashboard'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('companion.site', true)
                ->where('companion.panel', true));
    }

    public function test_only_the_admin_changes_where_the_companion_shows(): void
    {
        $this->actingAs(User::factory()->manager()->create())
            ->put(route('settings.update'), ['companion_manager' => '0'])
            ->assertForbidden();

        $this->assertTrue(Setting::get('companion_manager'));
    }
}
