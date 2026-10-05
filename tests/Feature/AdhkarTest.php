<?php

namespace Tests\Feature;

use App\Models\Dhikr;
use App\Models\DhikrCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class AdhkarTest extends TestCase
{
    use RefreshDatabase;

    public function test_everyone_sees_only_the_enabled_adhkar(): void
    {
        $category = DhikrCategory::factory()->create(['name' => 'أذكار الصباح']);
        Dhikr::factory()->for($category, 'category')->create(['text' => 'سُبْحَانَ اللَّهِ']);
        Dhikr::factory()->for($category, 'category')->inactive()->create(['text' => 'نص مخفي']);
        DhikrCategory::factory()->inactive()->create();

        foreach ([User::factory()->student()->create(), User::factory()->teacher()->create()] as $user) {
            $this->actingAs($user)
                ->get(route('adhkar.index'))
                ->assertOk()
                ->assertInertia(fn (AssertableInertia $page) => $page
                    ->component('adhkar/index')
                    ->has('categories', 1)
                    ->has('categories.0.adhkar', 1)
                    ->where('categories.0.adhkar.0.text', 'سُبْحَانَ اللَّهِ')
                    ->where('can.manage', false));
        }

        $this->actingAs(User::factory()->admin()->create())
            ->get(route('adhkar.index'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('categories', 2)
                ->has('categories.0.adhkar', 2)
                ->where('can.manage', true));
    }

    public function test_the_admin_manages_categories_and_adhkar(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->post(route('adhkar.categories.store'), ['name' => 'أذكار السفر', 'icon' => 'star', 'color' => 'sky', 'is_active' => true])
            ->assertSessionHasNoErrors();

        $category = DhikrCategory::query()->sole();
        $this->assertNotEmpty($category->slug);

        $this->actingAs($admin)
            ->post(route('adhkar.store'), [
                'dhikr_category_id' => $category->id,
                'text' => 'اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ',
                'repeat' => 1,
                'reference' => 'رواه مسلم',
                'is_active' => true,
            ])
            ->assertSessionHasNoErrors();

        $dhikr = Dhikr::query()->sole();
        $this->assertSame(1, $dhikr->sort_order);

        $this->actingAs($admin)->put(route('adhkar.update', $dhikr), [
            'dhikr_category_id' => $category->id,
            'text' => $dhikr->text,
            'repeat' => 3,
        ])->assertSessionHasNoErrors();

        $this->assertSame(3, $dhikr->fresh()->repeat);

        $this->actingAs($admin)->patch(route('adhkar.toggle', $dhikr));
        $this->assertFalse($dhikr->fresh()->is_active);

        $this->actingAs($admin)->patch(route('adhkar.categories.toggle', $category));
        $this->assertFalse($category->fresh()->is_active);

        $this->actingAs($admin)->delete(route('adhkar.categories.destroy', $category));
        $this->assertModelMissing($category);
        $this->assertModelMissing($dhikr);
    }

    public function test_only_the_admin_can_change_the_adhkar(): void
    {
        $category = DhikrCategory::factory()->create();
        $dhikr = Dhikr::factory()->for($category, 'category')->create();

        foreach ([User::factory()->teacher()->create(), User::factory()->student()->create()] as $user) {
            $this->actingAs($user)->post(route('adhkar.categories.store'), ['name' => 'x', 'icon' => 'star', 'color' => 'sky'])->assertForbidden();
            $this->actingAs($user)->patch(route('adhkar.toggle', $dhikr))->assertForbidden();
            $this->actingAs($user)->delete(route('adhkar.destroy', $dhikr))->assertForbidden();
        }

        $this->assertModelExists($dhikr);
    }

    public function test_a_dhikr_needs_its_text_and_a_valid_repeat(): void
    {
        $category = DhikrCategory::factory()->create();

        $this->actingAs(User::factory()->admin()->create())
            ->post(route('adhkar.store'), ['dhikr_category_id' => $category->id, 'text' => '', 'repeat' => 0])
            ->assertSessionHasErrors(['text', 'repeat']);
    }
}
