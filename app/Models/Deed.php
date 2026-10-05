<?php

namespace App\Models;

use App\Enums\DeedKind;
use App\Enums\SinSeverity;
use Database\Factories\DeedFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A good or bad deed a user records to hold themselves to account. Private to its user.
 *
 * done_on is the user's local date as Y-m-d text (no date cast, so it is stored the same in every database).
 */
#[Fillable(['user_id', 'kind', 'title', 'notes', 'catalog_key', 'severity', 'done_at', 'done_on', 'repented_at'])]
class Deed extends Model
{
    /** @use HasFactory<DeedFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'kind' => DeedKind::class,
            'severity' => SinSeverity::class,
            'done_at' => 'datetime',
            'repented_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isSin(): bool
    {
        return $this->kind === DeedKind::Bad;
    }
}
