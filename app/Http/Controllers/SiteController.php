<?php

namespace App\Http\Controllers;

use App\Enums\HalaqaGender;
use App\Enums\JoinRequestStatus;
use App\Enums\TafsirEdition;
use App\Http\Resources\AcademyResource;
use App\Http\Resources\VideoResource;
use App\Models\Academy;
use App\Models\Ayah;
use App\Models\Halaqa;
use App\Models\Tafsir;
use App\Models\User;
use App\Models\Video;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The public website: what the platform offers, its academies and videos, and the pages every
 * visitor may read.
 */
class SiteController extends Controller
{
    /**
     * Ayahs about the Quran shown on the home page with their explanation (surah, ayah).
     *
     * @var list<array{0: int, 1: int}>
     */
    protected const AYAHS = [[54, 17], [17, 9], [73, 4], [35, 29]];

    public function home(): Response
    {
        return Inertia::render('site/home', [
            'stats' => $this->stats(),
            'ayahs' => $this->ayahs(),
            'academies' => AcademyResource::collection(
                Academy::query()->active()->withCount(['teachers', 'students', 'halaqat'])->orderByDesc('students_count')->limit(6)->get(),
            )->resolve(),
            'videos' => VideoResource::collection(Video::query()->public()->latest()->limit(3)->get())->resolve(),
        ]);
    }

    public function about(): Response
    {
        return Inertia::render('site/about', ['stats' => $this->stats()]);
    }

    /**
     * The contact form (the platform's email and phone are shared with every page).
     */
    public function contact(): Response
    {
        return Inertia::render('site/contact');
    }

    public function videos(Request $request): Response
    {
        $search = trim((string) $request->query('search'));

        $videos = Video::query()
            ->public()
            ->when($search !== '', fn (Builder $query) => $query->where('title', 'like', "%{$search}%"))
            ->latest()
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('site/videos', [
            'videos' => $this->paginated($videos, VideoResource::class),
            'filters' => ['search' => $search],
        ]);
    }

    public function academies(Request $request): Response
    {
        $search = trim((string) $request->query('search'));
        $gender = HalaqaGender::tryFrom((string) $request->query('gender'));

        $academies = Academy::query()
            ->active()
            ->when($search !== '', fn (Builder $query) => $query->where(fn (Builder $query) => $query
                ->where('name', 'like', "%{$search}%")
                ->orWhere('location', 'like', "%{$search}%")
                ->orWhere('tagline', 'like', "%{$search}%")))
            ->when($gender, fn (Builder $query, HalaqaGender $gender) => $query->where('gender', $gender))
            ->withCount(['teachers', 'students', 'halaqat'])
            ->orderByDesc('students_count')
            ->orderBy('name')
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('site/academies', [
            'academies' => $this->paginated($academies, AcademyResource::class),
            'filters' => ['search' => $search, 'gender' => $gender?->value],
        ]);
    }

    /**
     * An academy's page: what it teaches, its halaqat, and how to join it.
     */
    public function academy(Request $request, Academy $academy): Response
    {
        abort_unless($academy->is_active, 404);

        $user = $request->user();

        $halaqat = $academy->halaqat()
            ->active()
            ->with('teacher')
            ->withCount('students')
            ->orderBy('name')
            ->get()
            ->map(fn (Halaqa $halaqa): array => [
                'id' => $halaqa->id,
                'name' => $halaqa->name,
                'description' => $halaqa->description,
                'color' => $halaqa->color,
                'gender' => $halaqa->gender->value,
                'level' => $halaqa->level?->value,
                'schedule' => $halaqa->scheduleSlots(),
                'timezone' => $halaqa->timezone,
                'duration_minutes' => $halaqa->duration_minutes,
                'teacher' => $halaqa->teacher?->name,
                'students_count' => $halaqa->students_count,
                'capacity' => $halaqa->capacity,
            ]);

        return Inertia::render('site/academy', [
            'academy' => (new AcademyResource($academy->loadCount(['teachers', 'students', 'halaqat'])))->resolve(),
            'halaqat' => $halaqat,
            'membership' => $user === null ? null : [
                'member' => $user->academy_id === $academy->id,
                'in_another' => $user->academy_id !== null && $user->academy_id !== $academy->id,
                'can_join' => $user->isIndependent(),
                'pending' => $user->joinRequests()->where('academy_id', $academy->id)->where('status', JoinRequestStatus::Pending)->exists(),
            ],
        ]);
    }

    public function terms(): Response
    {
        return Inertia::render('site/terms');
    }

    public function faq(): Response
    {
        return Inertia::render('site/faq');
    }

    public function guide(): Response
    {
        return Inertia::render('site/guide');
    }

    /**
     * Public numbers of the platform (refreshed every ten minutes).
     *
     * @return array{academies: int, teachers: int, students: int, halaqat: int}
     */
    protected function stats(): array
    {
        return Cache::remember('site.stats', now()->addMinutes(10), fn (): array => [
            'academies' => Academy::query()->active()->count(),
            'teachers' => User::query()->teachers()->active()->count(),
            'students' => User::query()->students()->active()->count(),
            'halaqat' => Halaqa::query()->active()->count(),
        ]);
    }

    /**
     * The home page's ayahs with Al-Muyassar's explanation.
     *
     * @return list<array{surah: int, ayah: int, text: string, tafsir: string|null}>
     */
    protected function ayahs(): array
    {
        return Cache::remember('site.ayahs', now()->addDay(), function (): array {
            $ayahs = [];

            foreach (self::AYAHS as [$surah, $number]) {
                $ayah = Ayah::query()->where('surah', $surah)->where('ayah', $number)->first(['id', 'surah', 'ayah', 'text']);

                if ($ayah !== null) {
                    $ayahs[] = [
                        'surah' => $surah,
                        'ayah' => $number,
                        'text' => $ayah->text,
                        'tafsir' => Tafsir::query()->where('ayah_id', $ayah->id)->where('edition', TafsirEdition::Muyassar)->value('text'),
                    ];
                }
            }

            return $ayahs;
        });
    }
}
