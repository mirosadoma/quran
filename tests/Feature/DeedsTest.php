<?php

namespace Tests\Feature;

use App\Enums\DeedKind;
use App\Enums\SinSeverity;
use App\Models\Deed;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class DeedsTest extends TestCase
{
    use RefreshDatabase;

    protected User $student;

    protected function setUp(): void
    {
        parent::setUp();

        // 10:00 in Cairo (UTC+3 in October 2026).
        $this->travelTo(Carbon::parse('2026-10-06 07:00', 'UTC'));
        $this->student = User::factory()->student()->create(['timezone' => 'Africa/Cairo']);
    }

    public function test_every_user_opens_their_own_day(): void
    {
        Deed::factory()->for($this->student)->on('2026-10-06')->create(['title' => 'صليت الفجر في المسجد']);
        Deed::factory()->on('2026-10-06')->create(['title' => 'عمل مستخدم آخر']);

        foreach ([$this->student, User::factory()->teacher()->create(['timezone' => 'Africa/Cairo']), User::factory()->admin()->create(['timezone' => 'Africa/Cairo'])] as $user) {
            $this->actingAs($user)->get(route('deeds.index'))->assertOk()->assertInertia(fn (AssertableInertia $page) => $page
                ->component('deeds/index')
                ->where('date', '2026-10-06')
                ->where('today', '2026-10-06')
                ->has('week', 7));
        }

        $this->actingAs($this->student)
            ->get(route('deeds.index'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('deeds', 1)
                ->where('deeds.0.title', 'صليت الفجر في المسجد')
                ->where('summary.good', 1));
    }

    public function test_a_sin_takes_its_severity_from_the_catalog_and_its_time_from_the_users_timezone(): void
    {
        $this->actingAs($this->student)
            ->post(route('deeds.store'), [
                'kind' => 'bad',
                'title' => 'اغتبت زميلي في الشغل',
                'catalog_key' => 'backbiting',
                'severity' => 'minor',
                'date' => '2026-10-06',
                'time' => '09:15',
            ])
            ->assertRedirect(route('deeds.index', ['date' => '2026-10-06']));

        $deed = Deed::query()->sole();
        $this->assertSame(DeedKind::Bad, $deed->kind);
        $this->assertSame(SinSeverity::Major, $deed->severity);
        $this->assertSame('2026-10-06 06:15:00', $deed->done_at->utc()->toDateTimeString());
        $this->assertSame('2026-10-06', $deed->done_on);
        $this->assertNull($deed->repented_at);
    }

    public function test_a_sin_the_catalog_does_not_know_needs_its_kind(): void
    {
        $sin = ['kind' => 'bad', 'title' => 'عملت حاجة وحشة', 'date' => '2026-10-06', 'time' => '09:00'];

        $this->actingAs($this->student)->post(route('deeds.store'), $sin)->assertSessionHasErrors('severity');
        $this->actingAs($this->student)->post(route('deeds.store'), [...$sin, 'catalog_key' => 'unknown'])->assertSessionHasErrors('catalog_key');
        $this->actingAs($this->student)->post(route('deeds.store'), [...$sin, 'severity' => 'minor', 'time' => '11:30'])->assertSessionHasErrors('time');

        $this->actingAs($this->student)->post(route('deeds.store'), [...$sin, 'severity' => 'minor'])->assertSessionHasNoErrors();
        $this->assertSame(SinSeverity::Minor, Deed::query()->sole()->severity);

        // A good deed has no severity, and its catalog is the good deeds'.
        $this->actingAs($this->student)
            ->post(route('deeds.store'), ['kind' => 'good', 'title' => 'تصدقت', 'catalog_key' => 'backbiting', 'date' => '2026-10-06', 'time' => '09:00'])
            ->assertSessionHasErrors('catalog_key');
    }

    public function test_a_sin_is_marked_repented_and_back(): void
    {
        $sin = Deed::factory()->for($this->student)->sin()->on('2026-10-06')->create();
        $good = Deed::factory()->for($this->student)->on('2026-10-06')->create();

        $this->actingAs($this->student)->patch(route('deeds.repent', $sin))->assertRedirect();
        $this->assertNotNull($sin->fresh()->repented_at);

        $this->actingAs($this->student)->patch(route('deeds.repent', $sin));
        $this->assertNull($sin->fresh()->repented_at);

        $this->actingAs($this->student)->patch(route('deeds.repent', $good))->assertStatus(422);
    }

    public function test_deeds_are_private(): void
    {
        $deed = Deed::factory()->for($this->student)->sin()->on('2026-10-06')->create();
        $other = User::factory()->admin()->create();
        $update = ['kind' => 'bad', 'title' => 'تغيير', 'severity' => 'minor', 'date' => '2026-10-06', 'time' => '09:00'];

        $this->actingAs($other)->put(route('deeds.update', $deed), $update)->assertForbidden();
        $this->actingAs($other)->patch(route('deeds.repent', $deed))->assertForbidden();
        $this->actingAs($other)->delete(route('deeds.destroy', $deed))->assertForbidden();

        $this->actingAs($this->student)->put(route('deeds.update', $deed), $update)->assertRedirect();
        $this->assertSame('تغيير', $deed->fresh()->title);

        $this->actingAs($this->student)->delete(route('deeds.destroy', $deed))->assertRedirect();
        $this->assertModelMissing($deed);
    }

    public function test_reports_count_good_deeds_with_repented_sins_against_the_sins_left(): void
    {
        Deed::factory()->for($this->student)->on('2026-10-04')->count(2)->create();
        Deed::factory()->for($this->student)->sin(SinSeverity::Major, 'backbiting')->on('2026-10-04')->create();
        Deed::factory()->for($this->student)->sin()->repented()->on('2026-10-05')->create();
        Deed::factory()->for($this->student)->on('2026-10-06')->count(3)->create();
        // The previous week.
        Deed::factory()->for($this->student)->sin()->on('2026-09-29')->create();

        $this->actingAs($this->student)
            ->get(route('deeds.reports', ['range' => 'week']))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('deeds/reports')
                ->where('from', '2026-09-30')
                ->where('to', '2026-10-06')
                ->has('days', 7)
                ->where('days.4', ['date' => '2026-10-04', 'good' => 2, 'bad' => 1, 'major' => 1, 'repented' => 0, 'unrepented' => 1, 'net' => 1])
                ->where('days.5.net', 1)
                ->where('totals', ['good' => 5, 'bad' => 2, 'major' => 1, 'repented' => 1, 'unrepented' => 1, 'net' => 5])
                ->where('previous.bad', 1)
                ->where('trend', 'up')
                ->where('topSins.0.key', 'backbiting')
                ->where('topSins.0.unrepented', 1));
    }

    public function test_a_custom_period_is_kept_within_today_and_a_year(): void
    {
        $this->actingAs($this->student)
            ->get(route('deeds.reports', ['range' => 'custom', 'from' => '2026-10-10', 'to' => '2026-10-01']))
            ->assertInertia(fn (AssertableInertia $page) => $page->where('from', '2026-10-01')->where('to', '2026-10-06'));

        $this->actingAs($this->student)
            ->get(route('deeds.reports', ['range' => 'custom', 'from' => '2024-01-01', 'to' => '2026-10-06']))
            ->assertInertia(fn (AssertableInertia $page) => $page->where('from', '2025-10-06')->has('days', 366));

        $this->actingAs($this->student)
            ->get(route('deeds.reports', ['range' => 'custom', 'from' => '2026-13-40', 'to' => 'x']))
            ->assertInertia(fn (AssertableInertia $page) => $page->where('from', '2026-09-30')->where('to', '2026-10-06'));

        $this->actingAs($this->student)
            ->get(route('deeds.index', ['date' => '2027-01-01']))
            ->assertInertia(fn (AssertableInertia $page) => $page->where('date', '2026-10-06'));
    }
}
