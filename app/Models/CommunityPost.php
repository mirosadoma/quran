<?php

namespace App\Models;

use App\Services\CommunitySearch;
use Database\Factories\CommunityPostFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A question asked in the questions community, shared by the whole platform: the sheikhs
 * (teachers, managers and the administration) answer it and students comment on it.
 *
 * search_title and search_body keep the title and the body reduced for searching; they are
 * filled whenever the title or the body is set.
 */
#[Fillable(['user_id', 'title', 'body'])]
#[Hidden(['search_title', 'search_body'])]
class CommunityPost extends Model
{
    /** @use HasFactory<CommunityPostFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'edited_at' => 'datetime',
        ];
    }

    /**
     * The member who asked (none once their account is deleted).
     *
     * @return BelongsTo<User, $this>
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * The answers of the sheikhs and the comments.
     *
     * @return HasMany<CommunityReply, $this>
     */
    public function replies(): HasMany
    {
        return $this->hasMany(CommunityReply::class);
    }

    /**
     * @return HasMany<CommunityReply, $this>
     */
    public function answers(): HasMany
    {
        return $this->replies()->where('is_answer', true);
    }

    /**
     * @return HasMany<CommunityReply, $this>
     */
    public function comments(): HasMany
    {
        return $this->replies()->where('is_answer', false);
    }

    /**
     * Add answers_count, comments_count and solved (the asker accepted an answer).
     */
    #[Scope]
    protected function withReplyCounts(Builder $query): void
    {
        $query->withCount(['answers', 'comments'])
            ->withExists(['replies as solved' => fn (Builder $query) => $query->whereNotNull('accepted_at')]);
    }

    /**
     * Questions no sheikh answered yet (comments do not answer them).
     */
    #[Scope]
    protected function unanswered(Builder $query): void
    {
        $query->whereDoesntHave('answers');
    }

    /**
     * @return Attribute<never, string>
     */
    protected function title(): Attribute
    {
        return Attribute::set(fn (string $value): array => [
            'title' => $value,
            'search_title' => CommunitySearch::normalize($value),
        ]);
    }

    /**
     * @return Attribute<never, string>
     */
    protected function body(): Attribute
    {
        return Attribute::set(fn (string $value): array => [
            'body' => $value,
            'search_body' => CommunitySearch::normalize($value),
        ]);
    }
}
