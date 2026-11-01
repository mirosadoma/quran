<?php

namespace App\Http\Controllers;

use App\Http\Requests\CommunityPostRequest;
use App\Http\Resources\CommunityPostResource;
use App\Http\Resources\CommunityReplyResource;
use App\Models\CommunityPost;
use App\Models\CommunityReply;
use App\Services\CommunitySearch;
use App\Services\ContentCache;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CommunityPostController extends Controller
{
    /**
     * Filters of the list of questions (besides "all").
     */
    protected const FILTERS = ['unanswered', 'mine'];

    public function __construct(protected CommunitySearch $search, protected ContentCache $cache) {}

    /**
     * The questions community: the newest questions, or the best matches of a search.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $filter = in_array($request->query('filter'), self::FILTERS, true) ? $request->query('filter') : 'all';
        $search = is_string($request->query('search')) ? mb_substr(trim($request->query('search')), 0, CommunitySearch::MAX_LENGTH) : '';
        $terms = $this->search->terms($search);

        $query = fn (): Builder => CommunityPost::query()
            ->with('author')
            ->withReplyCounts()
            ->when($filter === 'unanswered', fn (Builder $query) => $query->unanswered())
            ->when($filter === 'mine', fn (Builder $query) => $query->whereBelongsTo($user, 'author'))
            ->tap(fn (Builder $query) => $this->search->apply($query, $terms))
            ->latest()
            ->orderByDesc('id');
        // Kept for each reader (what they may change) until a question or a reply changes; a search asks the database.
        $reader = "{$user->id}.{$user->role->value}";
        $posts = $terms['words'] === []
            ? $this->cache->page('community', "list.{$reader}.{$filter}", $request, 15, $query, fn (CommunityPost $post): array => (new CommunityPostResource($post))->resolve())
            : $this->paginated($query()->paginate(15)->withQueryString(), CommunityPostResource::class);

        return Inertia::render('community/index', [
            'posts' => $posts,
            'filters' => ['search' => $search, 'filter' => $filter],
            // The words the results were matched on, to highlight them.
            'highlight' => $terms['words'],
            'counts' => [
                ...$this->cache->remember('community', 'counts', fn (): array => [
                    'all' => CommunityPost::query()->count(),
                    'unanswered' => CommunityPost::query()->unanswered()->count(),
                ]),
                'mine' => $this->cache->remember('community', "counts.mine.{$user->id}", fn (): int => CommunityPost::query()->whereBelongsTo($user, 'author')->count()),
            ],
        ]);
    }

    /**
     * A question with the answers of the sheikhs (the accepted one first) and the comments.
     */
    public function show(Request $request, CommunityPost $post): Response
    {
        $user = $request->user();
        // Kept for each reader (what they may change or accept) until a question or a reply changes.
        $page = $this->cache->remember('community', "post.{$post->id}.{$user->id}.{$user->role->value}", function () use ($post): array {
            $post->load('author')->loadCount(['answers', 'comments'])->loadExists(['replies as solved' => fn (Builder $query) => $query->whereNotNull('accepted_at')]);

            $replies = $post->replies()
                ->with('author')
                ->orderByRaw('accepted_at is null')
                ->oldest()
                ->orderBy('id')
                ->get();

            $replies->each->setRelation('post', $post);

            return [
                'post' => (new CommunityPostResource($post))->resolve(),
                'answers' => CommunityReplyResource::collection($replies->where('is_answer', true)->values())->resolve(),
                'comments' => CommunityReplyResource::collection($replies->where('is_answer', false)->values())->resolve(),
                'similar' => $this->summaries($this->search->similar($post->title, except: $post)),
            ];
        });

        return Inertia::render('community/show', [
            ...$page,
            // The reply to scroll to (opened from a notification).
            'focus' => $request->integer('reply') ?: null,
            'can' => ['answer' => CommunityReply::isAnswerBy($request->user())],
        ]);
    }

    /**
     * Ask a question.
     */
    public function store(CommunityPostRequest $request): RedirectResponse
    {
        $post = CommunityPost::query()->create([
            ...$request->safe()->only(['title', 'body']),
            'user_id' => $request->user()->id,
        ]);

        $this->toast(__('Your question was posted. The sheikhs will answer it, God willing.'));

        return to_route('community.show', $post);
    }

    /**
     * Change the question (only its author).
     */
    public function update(CommunityPostRequest $request, CommunityPost $post): RedirectResponse
    {
        $this->authorize('update', $post);

        $post->fill($request->safe()->only(['title', 'body']));

        if ($post->isDirty()) {
            $post->edited_at = now();
            $post->save();
        }

        $this->toast(__('Saved.'));

        return back();
    }

    /**
     * Delete the question with its replies (its author, or the administration).
     */
    public function destroy(CommunityPost $post): RedirectResponse
    {
        $this->authorize('delete', $post);

        $post->delete();

        $this->toast(__('Question deleted.'));

        return to_route('community.index');
    }

    /**
     * Questions like the one being written, to find it answered before asking it again.
     */
    public function similar(Request $request): JsonResponse
    {
        $validated = $request->validate(['q' => ['required', 'string', 'max:'.CommunitySearch::MAX_LENGTH]]);

        return response()->json(['posts' => $this->summaries($this->search->similar($validated['q']))]);
    }

    /**
     * @param  Collection<int, CommunityPost>  $posts
     * @return list<array{id: int, title: string, answers_count: int, solved: bool}>
     */
    protected function summaries(Collection $posts): array
    {
        return $posts->map(fn (CommunityPost $post): array => [
            'id' => $post->id,
            'title' => $post->title,
            'answers_count' => (int) $post->answers_count,
            'solved' => (bool) $post->solved,
        ])->values()->all();
    }
}
