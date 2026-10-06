<?php

namespace App\Models;

use App\Enums\UserRole;
use App\Services\CommunitySearch;
use Database\Factories\CommunityReplyFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A reply to a question of the community: the answer of a sheikh (written by a teacher, a manager
 * or the administration, decided when it is written) or the comment of a student.
 *
 * search_body keeps the body reduced for searching; it is filled whenever the body is set.
 */
#[Fillable(['community_post_id', 'user_id', 'body', 'is_answer'])]
#[Hidden(['search_body'])]
class CommunityReply extends Model
{
    /** @use HasFactory<CommunityReplyFactory> */
    use HasFactory;

    /**
     * Whether what the user replies is a sheikh's answer rather than a comment.
     */
    public static function isAnswerBy(User $user): bool
    {
        return $user->hasRole(UserRole::Teacher, UserRole::Manager, UserRole::Admin);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_answer' => 'boolean',
            'accepted_at' => 'datetime',
            'edited_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<CommunityPost, $this>
     */
    public function post(): BelongsTo
    {
        return $this->belongsTo(CommunityPost::class, 'community_post_id');
    }

    /**
     * The member who replied (none once their account is deleted).
     *
     * @return BelongsTo<User, $this>
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
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
