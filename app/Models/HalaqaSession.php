<?php

namespace App\Models;

use App\Enums\MeetingProvider;
use App\Enums\SessionSource;
use App\Enums\SessionStatus;
use App\Enums\UserRole;
use Carbon\CarbonInterface;
use Database\Factories\HalaqaSessionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

#[Fillable([
    'halaqa_id', 'teacher_id', 'title', 'starts_at', 'duration_minutes', 'status', 'source', 'slot_key', 'meeting_provider',
    'meeting_id', 'meeting_url', 'meeting_password', 'meeting_data', 'started_at', 'ended_at', 'reminder_sent_at',
    'cancel_reason', 'notes', 'recording_url', 'recording_path', 'created_by',
])]
#[Hidden(['meeting_data'])]
class HalaqaSession extends Model
{
    /** @use HasFactory<HalaqaSessionFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'reminder_sent_at' => 'datetime',
            'duration_minutes' => 'integer',
            'status' => SessionStatus::class,
            'source' => SessionSource::class,
            'meeting_provider' => MeetingProvider::class,
            'meeting_data' => 'array',
        ];
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
    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return HasMany<Attendance, $this>
     */
    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    /**
     * @return HasMany<ProgressRecord, $this>
     */
    public function progressRecords(): HasMany
    {
        return $this->hasMany(ProgressRecord::class);
    }

    /**
     * Limit the query to sessions the user may see.
     */
    #[Scope]
    protected function visibleTo(Builder $query, User $user): void
    {
        match ($user->role) {
            UserRole::Admin => null,
            UserRole::Teacher => $query->where(function (Builder $query) use ($user): void {
                $query->where('teacher_id', $user->id)
                    ->orWhereIn('halaqa_id', Halaqa::query()->select('id')->where('teacher_id', $user->id));
            }),
            UserRole::Student => $query->whereIn(
                'halaqa_id',
                DB::table('halaqa_student')->select('halaqa_id')->where('student_id', $user->id),
            ),
        };
    }

    /**
     * Messages of the halaqa delivered when this session starts.
     *
     * @return BelongsToMany<HalaqaAnnouncement, $this>
     */
    public function announcements(): BelongsToMany
    {
        return $this->belongsToMany(HalaqaAnnouncement::class, 'halaqa_announcement_session', 'halaqa_session_id', 'halaqa_announcement_id')
            ->withPivot('sent_at');
    }

    /**
     * Sessions that are not finished yet (scheduled or live, and not past their end).
     */
    #[Scope]
    protected function upcoming(Builder $query): void
    {
        $query->whereIn('status', [SessionStatus::Scheduled, SessionStatus::Live])
            ->where('starts_at', '>=', now()->subMinutes(240))
            ->whereRaw(static::endSql().' >= ?', [now()->toDateTimeString()]);
    }

    /**
     * SQL expression of the session end (start plus duration, plus extra minutes).
     */
    public static function endSql(int $extraMinutes = 0): string
    {
        $minutes = $extraMinutes > 0 ? "duration_minutes + {$extraMinutes}" : 'duration_minutes';

        return DB::connection()->getDriverName() === 'sqlite'
            ? "datetime(starts_at, '+' || ({$minutes}) || ' minutes')"
            : "DATE_ADD(starts_at, INTERVAL {$minutes} MINUTE)";
    }

    public function endsAt(): CarbonInterface
    {
        return $this->starts_at->copy()->addMinutes($this->duration_minutes);
    }

    public function displayTitle(): string
    {
        return $this->title ?: ($this->halaqa?->name ?? __('Session'));
    }

    /**
     * Determine whether the user manages this session (admin or its teacher).
     */
    public function isManagedBy(User $user): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->isTeacher()
            && ($this->teacher_id === $user->id || $this->halaqa?->teacher_id === $user->id);
    }

    /**
     * Determine whether the user can enter the meeting right now.
     */
    public function isJoinableBy(User $user): bool
    {
        if (! $this->status->isOpen()) {
            return false;
        }

        if ($this->isManagedBy($user)) {
            return now()->greaterThanOrEqualTo($this->starts_at->copy()->subMinutes(config('meetings.teacher_start_before_minutes')))
                && now()->lessThanOrEqualTo($this->endsAt()->copy()->addMinutes(60));
        }

        if (! $user->isStudent() || ! $this->halaqa?->hasMember($user)) {
            return false;
        }

        if ($this->status === SessionStatus::Live) {
            return true;
        }

        return now()->greaterThanOrEqualTo($this->starts_at->copy()->subMinutes(config('meetings.student_join_before_minutes')))
            && now()->lessThanOrEqualTo($this->endsAt());
    }
}
