<?php

namespace App\Http\Controllers;

use App\Http\Requests\CommunityReplyRequest;
use App\Models\CommunityPost;
use App\Models\CommunityReply;
use App\Notifications\CommunityReplyPosted;
use App\Services\Notifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;

class CommunityReplyController extends Controller
{
    public function __construct(protected Notifier $notifier) {}

    /**
     * Reply to a question: a sheikh's answer, or a student's comment. The member who asked is notified.
     */
    public function store(CommunityReplyRequest $request, CommunityPost $post): RedirectResponse
    {
        $user = $request->user();

        $reply = $post->replies()->create([
            'user_id' => $user->id,
            'body' => $request->validated('body'),
            'is_answer' => CommunityReply::isAnswerBy($user),
        ]);

        if ($post->user_id !== null && $post->user_id !== $user->id) {
            $this->notifier->send($post->author, new CommunityReplyPosted($reply));
        }

        $this->toast($reply->is_answer ? __('Your answer was posted.') : __('Your comment was posted.'));

        return to_route('community.show', ['post' => $post, 'reply' => $reply->id]);
    }

    /**
     * Change a reply (only its author).
     */
    public function update(CommunityReplyRequest $request, CommunityReply $reply): RedirectResponse
    {
        $this->authorize('update', $reply);

        $reply->fill($request->safe()->only(['body']));

        if ($reply->isDirty()) {
            $reply->edited_at = now();
            $reply->save();
        }

        $this->toast(__('Saved.'));

        return back();
    }

    /**
     * Delete a reply (its author, or the administration).
     */
    public function destroy(CommunityReply $reply): RedirectResponse
    {
        $this->authorize('delete', $reply);

        $reply->delete();

        $this->toast(__('Deleted.'));

        return back();
    }

    /**
     * The member who asked marks the answer that answered the question (or takes the mark back).
     */
    public function accept(CommunityReply $reply): RedirectResponse
    {
        $this->authorize('accept', $reply);

        $accepted = $reply->accepted_at === null;

        DB::transaction(function () use ($reply, $accepted): void {
            $reply->post->replies()->whereKeyNot($reply->id)->whereNotNull('accepted_at')->update(['accepted_at' => null]);
            $reply->forceFill(['accepted_at' => $accepted ? now() : null])->save();
        });

        $this->toast($accepted ? __('Marked as the answer to your question.') : __('The answer is no longer marked.'));

        return back();
    }
}
