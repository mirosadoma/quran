<?php

namespace App\Http\Controllers;

use App\Models\Hadith;
use App\Models\HadithBook;
use App\Models\HadithCollection;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class HadithController extends Controller
{
    /**
     * Hadiths shown on a page of a book or of a search.
     */
    public const PER_PAGE = 20;

    /**
     * The books of hadith with the hadith of the day, or the hadiths of all the books matching a search.
     */
    public function index(Request $request): Response
    {
        $search = $this->search($request);
        $words = Hadith::searchWords($search);
        $collections = HadithCollection::query()->ordered()->withCount(['books', 'hadiths'])->get();
        $scope = is_string($request->query('collection')) ? $collections->firstWhere('slug', $request->query('collection')) : null;

        return Inertia::render('hadith/index', [
            'collections' => $collections->map(fn (HadithCollection $collection): array => $collection->toPageArray())->values(),
            'filters' => ['search' => $search, 'collection' => $scope?->slug],
            // The words the results were matched on, to highlight them.
            'highlight' => $words,
            'results' => $words === [] ? null : Hadith::query()
                ->with(['collection', 'book'])
                ->when($scope, fn (Builder $query) => $query->where('hadith_collection_id', $scope->id))
                ->matching($words)
                ->orderBy('hadith_collection_id')
                ->ordered()
                ->paginate(self::PER_PAGE)
                ->withQueryString()
                ->through(fn (Hadith $hadith): array => $hadith->toPageArray()),
            'daily' => $words === [] ? $this->hadithOfTheDay() : null,
        ]);
    }

    /**
     * One collection: its books (kutub) with the hadiths of one of them, or the hadiths matching a search in it.
     */
    public function show(Request $request, HadithCollection $collection): Response
    {
        $search = $this->search($request);
        $words = Hadith::searchWords($search);
        $books = $collection->books()->withCount('hadiths')->get();
        $book = null;

        if ($request->filled('book')) {
            $book = $books->firstWhere('number', $request->integer('book'));

            abort_if($book === null, 404);
        } elseif ($words === []) {
            $book = $books->first();
        }

        $hadiths = Hadith::query()
            ->with('book')
            ->where('hadith_collection_id', $collection->id)
            ->when($words !== [], fn (Builder $query) => $query->matching($words))
            ->when($book, fn (Builder $query) => $query->where('hadith_book_id', $book->id))
            ->ordered()
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(fn (Hadith $hadith): array => $hadith->toPageArray());

        return Inertia::render('hadith/show', [
            'collection' => $collection->loadCount(['books', 'hadiths'])->toPageArray(),
            'books' => $books->map(fn (HadithBook $item): array => $item->toPageArray())->values(),
            'book' => $book?->toPageArray(),
            'filters' => ['search' => $search, 'book' => $book?->number],
            'highlight' => $words,
            'hadiths' => $hadiths,
        ]);
    }

    /**
     * One hadith by its number (every part of it), with the numbers before and after it.
     */
    public function hadith(HadithCollection $collection, int $number): Response
    {
        $hadiths = Hadith::query()
            ->with('book')
            ->where('hadith_collection_id', $collection->id)
            ->where('number', $number)
            ->ordered()
            ->get();

        abort_if($hadiths->isEmpty(), 404);

        $neighbour = fn (string $operator, string $direction): ?int => Hadith::query()
            ->where('hadith_collection_id', $collection->id)
            ->where('number', $operator, $number)
            ->orderBy('number', $direction)
            ->value('number');

        return Inertia::render('hadith/hadith', [
            'collection' => $collection->loadCount(['books', 'hadiths'])->toPageArray(),
            'hadiths' => $hadiths->map(fn (Hadith $hadith): array => $hadith->toPageArray())->values(),
            'previous' => $neighbour('<', 'desc'),
            'next' => $neighbour('>', 'asc'),
        ]);
    }

    /**
     * A hadith for the day from Riyad as-Salihin or the Forty of an-Nawawi: the same for everyone all day long.
     *
     * @return array<string, mixed>|null
     */
    protected function hadithOfTheDay(): ?array
    {
        return Cache::remember('hadith.daily.'.now()->toDateString(), now()->endOfDay(), function (): ?array {
            $query = Hadith::query()
                ->with(['collection', 'book'])
                ->whereHas('collection', fn (Builder $query) => $query->whereIn('slug', ['riyad-as-salihin', 'nawawi-40']));
            $count = (clone $query)->count();

            if ($count === 0) {
                return null;
            }

            return $query->orderBy('hadith_collection_id')->ordered()->skip(now()->dayOfYear % $count)->first()?->toPageArray();
        });
    }

    /**
     * What was typed in the search box (blank when nothing was).
     */
    protected function search(Request $request): string
    {
        $search = $request->query('search');

        return is_string($search) ? mb_substr(trim($search), 0, Hadith::SEARCH_MAX_LENGTH) : '';
    }
}
