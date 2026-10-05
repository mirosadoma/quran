<?php

namespace App\Models;

use App\Enums\JoinRequestStatus;
use Database\Factories\AcademyJoinRequestFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A student without an academy asks to join one; its manager accepts or declines.
 */
#[Fillable(['academy_id', 'user_id', 'status', 'message', 'response', 'decided_by', 'decided_at'])]
class AcademyJoinRequest extends Model
{
    /** @use HasFactory<AcademyJoinRequestFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => JoinRequestStatus::class,
            'decided_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Academy, $this>
     */
    public function academy(): BelongsTo
    {
        return $this->belongsTo(Academy::class)->withTrashed();
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function decider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }

    #[Scope]
    protected function pending(Builder $query): void
    {
        $query->where('status', JoinRequestStatus::Pending);
    }

    public function isPending(): bool
    {
        return $this->status === JoinRequestStatus::Pending;
    }
}
