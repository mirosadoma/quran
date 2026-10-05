<?php

namespace App\Http\Controllers;

use App\Http\Requests\VideoRequest;
use App\Http\Resources\VideoResource;
use App\Models\Halaqa;
use App\Models\User;
use App\Models\Video;
use App\Notifications\VideoPublished;
use App\Services\Notifier;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VideoController extends Controller
{
    public function __construct(protected Notifier $notifier) {}

    /**
     * The video library.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $halaqa = $request->query('halaqa');
        $search = trim((string) $request->query('search'));

        $videos = Video::query()
            ->visibleTo($user)
            ->with(['halaqa', 'creator'])
            ->when($halaqa === 'general', fn (Builder $query) => $query->whereNull('halaqa_id'))
            ->when(is_numeric($halaqa), fn (Builder $query) => $query->where('halaqa_id', (int) $halaqa))
            ->when($search !== '', fn (Builder $query) => $query->where('title', 'like', "%{$search}%"))
            ->latest()
            ->paginate(12)
            ->withQueryString();

        $openVideo = $request->integer('video')
            ? Video::query()->visibleTo($user)->with(['halaqa', 'creator'])->find($request->integer('video'))
            : null;

        $manageable = match (true) {
            $user->isAdmin() => Halaqa::query()->orderBy('name')->get(['id', 'name', 'color']),
            $user->isTeacher() => $user->teachingHalaqat()->orderBy('name')->get(['id', 'name', 'color']),
            default => collect(),
        };

        return Inertia::render('videos/index', [
            'videos' => $this->paginated($videos, VideoResource::class),
            'filters' => ['halaqa' => $halaqa, 'search' => $search],
            'halaqat' => $user->accessibleHalaqat()->orderBy('name')->get(['id', 'name', 'color']),
            'manageableHalaqat' => $manageable,
            'openVideo' => $openVideo ? (new VideoResource($openVideo))->resolve() : null,
            'can' => [
                'create' => $user->can('create', Video::class),
                'general' => $user->isAdmin(),
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

    protected function notifyStudents(Video $video): void
    {
        $students = $video->halaqa_id
            ? $video->halaqa->students()->active()->get()
            : User::query()->students()->active()->get();

        $this->notifier->send($students, new VideoPublished($video));
    }
}
