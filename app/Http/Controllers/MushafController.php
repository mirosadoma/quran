<?php

namespace App\Http\Controllers;

use App\Enums\TafsirEdition;
use App\Models\Ayah;
use App\Models\MushafBookmark;
use App\Models\MushafHighlight;
use App\Models\Reciter;
use App\Services\Mushaf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

class MushafController extends Controller
{
    public function __construct(protected Mushaf $mushaf) {}

    /**
     * The mushaf reader, opened at the requested place or where the user stopped.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $focus = $request->filled('surah')
            ? Ayah::query()->where('surah', $request->integer('surah'))->where('ayah', max(1, $request->integer('ayah', 1)))->first(['id', 'page'])
            : null;

        $page = $focus?->page ?? ($request->integer('page') ?: ($user->mushaf_page ?: 1));

        return Inertia::render('mushaf/index', [
            'initialPage' => min(max($page, 1), Mushaf::PAGES),
            'focusAyahId' => $focus?->id,
            'ready' => Ayah::query()->exists(),
            'index' => $this->mushaf->index(),
            'reciters' => Reciter::query()->available()->get()->map(fn (Reciter $reciter): array => $reciter->toPlayerArray())->values(),
            'tafsirs' => collect(TafsirEdition::cases())
                ->map(fn (TafsirEdition $edition): array => ['value' => $edition->value, 'label' => $edition->label()])
                ->values(),
            'bookmarks' => $user->mushafBookmarks()
                ->with('ayah:id,surah,ayah')
                ->latest()
                ->get()
                ->map(fn (MushafBookmark $bookmark): array => $bookmark->toReaderArray())
                ->values(),
            'highlights' => $user->mushafHighlights()
                ->with('ayah:id,surah,ayah,page')
                ->latest('updated_at')
                ->get()
                ->map(fn (MushafHighlight $highlight): array => $highlight->toReaderArray())
                ->values(),
        ]);
    }

    /**
     * Ayahs of one page (the same for every reader, so the browser may cache it).
     */
    public function page(int $page): JsonResponse
    {
        abort_unless($page >= 1 && $page <= Mushaf::PAGES, 404);

        return response()
            ->json(['page' => $page, 'ayahs' => $this->mushaf->page($page)])
            ->header('Cache-Control', 'private, max-age=86400');
    }

    /**
     * Tafsir of an ayah in the chosen book.
     */
    public function tafsir(Request $request, Ayah $ayah): JsonResponse
    {
        $edition = TafsirEdition::tryFrom((string) $request->query('edition')) ?? TafsirEdition::Muyassar;

        return response()->json([
            'ayah' => $ayah->only(['id', 'surah', 'ayah', 'page', 'text']),
            'edition' => $edition->value,
            'text' => $this->mushaf->tafsir($ayah, $edition),
        ]);
    }

    /**
     * Search the Quran text.
     */
    public function search(Request $request): JsonResponse
    {
        $validated = $request->validate(['q' => ['required', 'string', 'max:100']]);

        return response()->json(['results' => $this->mushaf->search($validated['q'])]);
    }

    /**
     * Remember the page the user is reading to reopen it next time.
     */
    public function position(Request $request): HttpResponse
    {
        $validated = $request->validate(['page' => ['required', 'integer', 'between:1,'.Mushaf::PAGES]]);

        $request->user()->forceFill(['mushaf_page' => $validated['page']])->saveQuietly();

        return response()->noContent();
    }
}
