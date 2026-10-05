<?php

namespace Tests\Feature;

use App\Models\Ayah;
use App\Models\Reciter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class KidsTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_user_opens_kids_memorization_with_the_reciters(): void
    {
        Ayah::factory()->create(['id' => 6221, 'surah' => 114, 'ayah' => 1, 'page' => 604, 'text' => 'قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ', 'text_simple' => 'قل أعوذ برب الناس']);
        Reciter::factory()->create(['name' => 'محمود خليل الحصري']);

        foreach ([User::factory()->student()->create(), User::factory()->teacher()->create(), User::factory()->admin()->create()] as $user) {
            $this->actingAs($user)
                ->get(route('kids.index'))
                ->assertOk()
                ->assertInertia(fn (AssertableInertia $page) => $page
                    ->component('kids/index')
                    ->where('ready', true)
                    ->has('reciters', 1));
        }
    }

    public function test_the_page_says_when_the_quran_text_is_missing(): void
    {
        $this->actingAs(User::factory()->student()->create())
            ->get(route('kids.index'))
            ->assertInertia(fn (AssertableInertia $page) => $page->where('ready', false));
    }

    public function test_guests_are_sent_to_the_login_page(): void
    {
        $this->get(route('kids.index'))->assertRedirect(route('login'));
    }
}
