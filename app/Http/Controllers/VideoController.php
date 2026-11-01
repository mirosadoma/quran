<?php

namespace App\Http\Controllers;

use App\Http\Requests\VideoRequest;
use App\Http\Resources\VideoResource;
use App\Models\Halaqa;
use App\Models\User;
use App\Models\Video;
use App\Notifications\VideoPublished;
use App\Services\ContentCache;
use App\Services\Notifier;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VideoController extends Controller
{
    public function __construct(protected Notifier $notifier, protected ContentCache $cache) {}

    /**
     * The video library.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $halaqa = $request->query('halaqa');
        $search = trim((string) $request->query('search'));

        $halaqat = $user->accessibleHalaqat()->orderBy('name')->get(['id', 'name', 'color']);
        $query = fn (): Builder => Video::query()
            ->visibleTo($user)
            ->with(['halaqa', 'creator'])
            ->when($halaqa === 'general', fn (Builder $query) => $query->whereNull('halaqa_id'))
            ->when(is_numeric($halaqa), fn (Builder $query) => $query->where('halaqa_id', (int) $halaqa))
            ->when($search !== '', fn (Builder $query) => $query->where('title', 'like', "%{$search}%"))
            ->latest();
        // Kept for each reader (what they may see and manage) until a video changes; a search asks the database.
        $reader = implode('.', [$user->id, $user->role->value, $user->academy_id ?? 0, md5($halaqat->pluck('id')->sort()->implode(','))]);
        $videos = $search === ''
            ? $this->cache->page('videos', "library.{$reader}.".match (true) {
                $halaqa === 'general' => 'general',
                is_numeric($halaqa) => (int) $halaqa,
                default => 'all',
            }, $request, 12, $query, fn (Video $video): array => (new VideoResource($video))->resolve())
            : $this->paginated($query()->paginate(12)->withQueryString(), VideoResource::class);

        $openVideo = $request->integer('video')
            ? Video::query()->visibleTo($user)->with(['halaqa', 'creator'])->find($request->integer('video'))
            : null;

        $manageable = match (true) {
            $user->managesAcademies() => $user->accessibleHalaqat()->orderBy('name')->get(['id', 'name', 'color']),
            $user->isTeacher() => $user->teachingHalaqat()->orderBy('name')->get(['id', 'name', 'color']),
            default => collect(),
        };

        return Inertia::render('videos/index', [
            'videos' => $videos,
            'filters' => ['halaqa' => $halaqa, 'search' => $search],
            'halaqat' => $halaqat,
            'manageableHalaqat' => $manageable,
            'openVideo' => $openVideo ? (new VideoResource($openVideo))->resolve() : null,
            'can' => [
                'create' => $user->can('create', Video::class),
                'general' => $user->managesAcademies(),
            ],
        ]);
    }

    /**
     * Add a video to the library.
     */
    public function store(VideoRequest $request): RedirectResponse
    {
        $video = Video::query()->create([
            'title' => $request->input('title'),
            'description' => $request->input('description'),
            'url' => $request->input('url'),
            'youtube_id' => Video::youtubeId($request->input('url')),
            'academy_id' => $this->academyOf($request),
            'halaqa_id' => $request->integer('halaqa_id') ?: null,
            'is_published' => $request->boolean('is_published', true),
            'created_by' => $request->user()->id,
        ]);

        if ($video->is_published && $request->boolean('notify', true)) {
            $this->notifyStudents($video);
        }

        $this->toast(__('Video added.'));

        return back();
    }

    /**
     * Update a video.
     */
    public function update(VideoRequest $request, Video $video): RedirectResponse
    {
        $this->authorize('update', $video);

        $wasPublished = $video->is_published;

        $video->update([
            'title' => $request->input('title'),
            'description' => $request->input('description'),
            'url' => $request->input('url'),
            'youtube_id' => Video::youtubeId($request->input('url')),
            'academy_id' => $this->academyOf($request, $video),
            'halaqa_id' => $request->integer('halaqa_id') ?: null,
            'is_published' => $request->boolean('is_published', true),
        ]);

        if (! $wasPublished && $video->is_published && $request->boolean('notify', true)) {
            $this->notifyStudents($video);
        }

        $this->toast(__('Video updated.'));

        return back();
    }

    /**
     * Delete a video.
     */
    public function destroy(Video $video): RedirectResponse
    {
        $this->authorize('delete', $video);

        $video->delete();

        $this->toast(__('Video deleted.'));

        return back();
    }

    /**
     * The library of the video: its halaqa's academy; otherwise the platform's library for the
     * administration (or the library it already was in), the manager's academy for a manager.
     */
    protected function academyOf(VideoRequest $request, ?Video $video = null): ?int
    {
        if ($request->integer('halaqa_id')) {
            return Halaqa::query()->whereKey($request->integer('halaqa_id'))->value('academy_id');
        }

        return $request->user()->isAdmin() ? $video?->academy_id : $request->user()->academy_id;
    }

    protected function notifyStudents(Video $video): void
    {
        $students = $video->halaqa_id
            ? $video->halaqa->students()->active()->get()
            : User::query()->students()->active()->inAcademy($video->academy_id)->get();

        $this->notifier->send($students, new VideoPublished($video));
    }
}
