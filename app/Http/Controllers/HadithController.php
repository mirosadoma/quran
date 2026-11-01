<?php

namespace App\Http\Controllers;

use App\Models\Hadith;
use App\Models\HadithBook;
use App\Models\HadithCollection;
use App\Services\ContentCache;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HadithController extends Controller
{
    /**
     * Hadiths shown on a page of a book or of a search.
     */
    public const PER_PAGE = 20;

    /**
     * The books, their hadiths and the hadith of the day are kept until the hadith change (see
     * ContentCache); a search always asks the database.
     */
    public function __construct(protected ContentCache $cache) {}

    /**
     * The books of hadith with the hadith of the day, or the hadiths of all the books matching a search.
     */
    public function index(Request $request): Response
    {
        $search = $this->search($request);
        $words = Hadith::searchWords($search);
        $collections = $this->cache->remember('hadith', 'collections', fn (): array => HadithCollection::query()
            ->ordered()
            ->withCount(['books', 'hadiths'])
            ->get()
            ->map(fn (HadithCollection $collection): array => $collection->toPageArray())
            ->values()
            ->all());
        $scope = is_string($request->query('collection')) ? collect($collections)->firstWhere('slug', $request->query('collection')) : null;

        return Inertia::render('hadith/index', [
            'collections' => $collections,
            'filters' => ['search' => $search, 'collection' => $scope['slug'] ?? null],
            // The words the results were matched on, to highlight them.
            'highlight' => $words,
            'results' => $words === [] ? null : Hadith::query()
                ->with(['collection', 'book'])
                ->when($scope, fn (Builder $query) => $query->where('hadith_collection_id', $scope['id']))
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
        $books = $this->cache->remember('hadith', "collection.{$collection->id}.books", fn (): array => $collection->books()
            ->withCount('hadiths')
            ->get()
            ->map(fn (HadithBook $item): array => $item->toPageArray())
            ->values()
            ->all());
        $book = null;

        if ($request->filled('book')) {
            $book = collect($books)->firstWhere('number', $request->integer('book'));

            abort_if($book === null, 404);
        } elseif ($words === []) {
            $book = $books[0] ?? null;
        }

        $query = fn (): Builder => Hadith::query()
            ->with('book')
            ->where('hadith_collection_id', $collection->id)
            ->when($words !== [], fn (Builder $query) => $query->matching($words))
            ->when($book, fn (Builder $query) => $query->where('hadith_book_id', $book['id']))
            ->ordered();
        $hadiths = $words === []
            ? $this->cache->page('hadith', "collection.{$collection->id}.book.".($book['id'] ?? 0), $request, self::PER_PAGE, $query, fn (Hadith $hadith): array => $hadith->toPageArray())
            : $query()->paginate(self::PER_PAGE)->withQueryString()->through(fn (Hadith $hadith): array => $hadith->toPageArray());

        return Inertia::render('hadith/show', [
            'collection' => $this->collectionArray($collection),
            'books' => $books,
            'book' => $book,
            'filters' => ['search' => $search, 'book' => $book['number'] ?? null],
            'highlight' => $words,
            'hadiths' => $hadiths,
        ]);
    }

    /**
     * One hadith by its number (every part of it), with the numbers before and after it.
     */
    public function hadith(HadithCollection $collection, int $number): Response
    {
        $page = $this->cache->remember('hadith', "collection.{$collection->id}.hadith.{$number}", function () use ($collection, $number): ?array {
            $hadiths = Hadith::query()
                ->with('book')
                ->where('hadith_collection_id', $collection->id)
                ->where('number', $number)
                ->ordered()
                ->get();

            if ($hadiths->isEmpty()) {
                return null;
            }

            $neighbour = fn (string $operator, string $direction): ?int => Hadith::query()
                ->where('hadith_collection_id', $collection->id)
                ->where('number', $operator, $number)
                ->orderBy('number', $direction)
                ->value('number');

            return [
                'hadiths' => $hadiths->map(fn (Hadith $hadith): array => $hadith->toPageArray())->values()->all(),
                'previous' => $neighbour('<', 'desc'),
                'next' => $neighbour('>', 'asc'),
            ];
        });

        abort_if($page === null, 404);

        return Inertia::render('hadith/hadith', ['collection' => $this->collectionArray($collection), ...$page]);
    }

    /**
     * A collection with the number of its books and hadiths.
     *
     * @return array<string, mixed>
     */
    protected function collectionArray(HadithCollection $collection): array
    {
        return $this->cache->remember('hadith', "collection.{$collection->id}", fn (): array => $collection->loadCount(['books', 'hadiths'])->toPageArray());
    }

    /**
     * A hadith for the day from Riyad as-Salihin or the Forty of an-Nawawi: the same for everyone all day long.
     *
     * @return array<string, mixed>|null
     */
    protected function hadithOfTheDay(): ?array
    {
        return $this->cache->remember('hadith', 'daily.'.now()->toDateString(), function (): ?array {
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
