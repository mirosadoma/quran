<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class InstallLinkTest extends TestCase
{
    use RefreshDatabase;

    public function test_anyone_can_open_the_install_link(): void
    {
        $this->get(route('install'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->component('install')->where('auth.user', null));

        $this->actingAs(User::factory()->student()->create())
            ->get(route('install'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->component('install'));
    }

    public function test_the_manifest_names_the_app_and_its_icons(): void
    {
        $this->get(route('manifest'))
            ->assertOk()
            ->assertHeader('Content-Type', 'application/manifest+json')
            ->assertJsonPath('display', 'standalone')
            ->assertJsonPath('icons.0.sizes', '192x192')
            ->assertJsonPath('icons.2.purpose', 'maskable');
    }
}
