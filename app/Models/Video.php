<?php

namespace App\Models;

use Database\Factories\VideoFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['academy_id', 'halaqa_id', 'title', 'description', 'url', 'youtube_id', 'is_published', 'created_by'])]
class Video extends Model
{
    /** @use HasFactory<VideoFactory> */
    use HasFactory;

    /**
     * Extract the 11 character video ID from any YouTube URL format.
     */
    public static function youtubeId(?string $url): ?string
    {
        $url = trim((string) $url);

        if (preg_match('/^[A-Za-z0-9_-]{11}$/', $url) === 1) {
            return $url;
        }

        $pattern = '~(?:youtube(?:-nocookie)?\.com/(?:watch\?(?:.*&)?v=|embed/|shorts/|live/|v/)|youtu\.be/)([A-Za-z0-9_-]{11})~i';

        return preg_match($pattern, $url, $matches) === 1 ? $matches[1] : null;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
        ];
    }

    /**
     * The academy whose library holds the video (none: the platform's library, shown to everyone).
     *
     * @return BelongsTo<Academy, $this>
     */
    public function academy(): BelongsTo
    {
        return $this->belongsTo(Academy::class)->withTrashed();
    }

    /**
     * @return BelongsTo<Halaqa, $this>
     */
    public function halaqa(): BelongsTo
    {
        return $this->belongsTo(Halaqa::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Videos the user may watch: the platform's library, the general library of their academy, and
     * their halaqat.
     */
    #[Scope]
    protected function visibleTo(Builder $query, User $user): void
    {
        if ($user->isAdmin()) {
            return;
        }

        $query->where(function (Builder $query) use ($user): void {
            $query->where(fn (Builder $query) => $query->whereNull('academy_id')->whereNull('halaqa_id'))
                ->when($user->academy_id !== null, fn (Builder $query) => $query->orWhere(
                    fn (Builder $query) => $query->where('academy_id', $user->academy_id)->whereNull('halaqa_id'),
                ))
                ->orWhereIn('halaqa_id', $user->accessibleHalaqat()->select('id'));
        });

        if ($user->isStudent()) {
            $query->where('is_published', true);
        }
    }

    /**
     * The platform's published library, shown on the public site.
     */
    #[Scope]
    protected function public(Builder $query): void
    {
        $query->whereNull('academy_id')->whereNull('halaqa_id')->where('is_published', true);
    }
}
