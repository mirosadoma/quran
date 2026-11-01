<?php

namespace App\Services;

use App\Models\CommunityPost;
use App\Models\CommunityReply;
use App\Models\Dhikr;
use App\Models\DhikrCategory;
use App\Models\Hadith;
use App\Models\HadithBook;
use App\Models\HadithCollection;
use App\Models\Halaqa;
use App\Models\PrayerGuide;
use App\Models\Saying;
use App\Models\SayingCategory;
use App\Models\Story;
use App\Models\Sunnah;
use App\Models\SunnahCategory;
use App\Models\Video;
use Closure;
use Illuminate\Cache\CacheManager;
use Illuminate\Contracts\Cache\Repository;
use Illuminate\Contracts\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * The content read far more than it changes (hadith, adhkar, sayings, sunnahs, prayers, stories, videos,
 * the questions community), kept forever on the disk in a store per section (config/cache.php: content).
 * Saving or deleting one of its models empties the store of its section (ContentCacheObserver), and the
 * ContentSeeder empties them all: the next visit builds the section again.
 */
class ContentCache
{
    /**
     * The section of each model kept here.
     *
     * @var array<class-string<Model>, string>
     */
    public const SECTIONS = [
        Hadith::class => 'hadith',
        HadithBook::class => 'hadith',
        HadithCollection::class => 'hadith',
        Dhikr::class => 'adhkar',
        DhikrCategory::class => 'adhkar',
        Saying::class => 'sayings',
        SayingCategory::class => 'sayings',
        Sunnah::class => 'sunnahs',
        SunnahCategory::class => 'sunnahs',
        PrayerGuide::class => 'prayers',
        Story::class => 'stories',
        Video::class => 'videos',
        // The videos show the name and color of their halaqa.
        Halaqa::class => 'videos',
        CommunityPost::class => 'community',
        CommunityReply::class => 'community',
    ];

    /**
     * @var array<string, Repository>
     */
    protected array $stores = [];

    public function __construct(protected CacheManager $cache) {}

    /**
     * The value kept under a key of a section, or the callback's value kept from now on.
     *
     * @template TValue
     *
     * @param  Closure(): TValue  $callback
     * @return TValue
     */
    public function remember(string $section, string $key, Closure $callback): mixed
    {
        return $this->store($section)->rememberForever($key, $callback);
    }

    /**
     * One page of a list, kept as its rows and total; the paginator (and its links) is made for each
     * request, so it fits the address the site was opened at.
     *
     * @param  Closure(): Builder  $query
     * @param  Closure(mixed): array<string, mixed>  $row
     */
    public function page(string $section, string $key, Request $request, int $perPage, Closure $query, Closure $row): LengthAwarePaginator
    {
        $page = max(1, $request->integer('page', 1));
        $kept = $this->remember($section, "{$key}.{$perPage}.{$page}", function () use ($query, $row, $perPage, $page): array {
            $paginator = $query()->paginate($perPage, ['*'], 'page', $page);

            return ['rows' => $paginator->getCollection()->map($row)->values()->all(), 'total' => $paginator->total()];
        });

        return (new LengthAwarePaginator($kept['rows'], $kept['total'], $perPage, $page, ['path' => $request->url()]))->withQueryString();
    }

    /**
     * Forget everything kept of a section.
     */
    public function flush(string $section): void
    {
        $this->store($section)->flush();
    }

    /**
     * Forget everything kept of the section of a model.
     */
    public function flushModel(Model $model): void
    {
        $section = self::SECTIONS[$model::class] ?? null;

        if ($section !== null) {
            $this->flush($section);
        }
    }

    /**
     * Forget every section (after seeding the content).
     */
    public function flushAll(): void
    {
        foreach (array_unique(self::SECTIONS) as $section) {
            $this->flush($section);
        }
    }

    protected function store(string $section): Repository
    {
        $config = config('cache.stores.content');

        return $this->stores[$section] ??= $this->cache->build([...$config, 'path' => $config['path'].DIRECTORY_SEPARATOR.$section]);
    }
}
