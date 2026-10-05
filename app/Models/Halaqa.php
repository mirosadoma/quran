<?php

namespace App\Models;

use App\Enums\HalaqaGender;
use App\Enums\HalaqaLevel;
use App\Enums\MeetingProvider;
use App\Enums\UserRole;
use Database\Factories\HalaqaFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

#[Table('halaqat')]
#[Fillable([
    'name', 'description', 'teacher_id', 'gender', 'level', 'capacity', 'schedule', 'duration_minutes',
    'timezone', 'meeting_provider', 'meeting_url', 'color', 'starts_on', 'is_active',
])]
class Halaqa extends Model
{
    /** @use HasFactory<HalaqaFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'gender' => HalaqaGender::class,
            'level' => HalaqaLevel::class,
            'schedule' => 'array',
            'capacity' => 'integer',
            'duration_minutes' => 'integer',
            'meeting_provider' => MeetingProvider::class,
            'starts_on' => 'date',
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function students(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'halaqa_student', 'halaqa_id', 'student_id')->withTimestamps();
    }

    /**
     * @return HasMany<HalaqaSession, $this>
     */
    public function sessions(): HasMany
    {
        return $this->hasMany(HalaqaSession::class);
    }

    /**
     * @return HasMany<Video, $this>
     */
    public function videos(): HasMany
    {
        return $this->hasMany(Video::class);
    }

    /**
     * @return HasMany<Message, $this>
     */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    /**
     * @return HasMany<ProgressRecord, $this>
     */
    public function progressRecords(): HasMany
    {
        return $this->hasMany(ProgressRecord::class);
    }

    /**
     * @return HasMany<RecitationSubmission, $this>
     */
    public function recitationSubmissions(): HasMany
    {
        return $this->hasMany(RecitationSubmission::class);
    }

    /**
     * @return HasMany<HalaqaAnnouncement, $this>
     */
    public function announcements(): HasMany
    {
        return $this->hasMany(HalaqaAnnouncement::class);
    }

    /**
     * Limit the query to halaqat the given user may access.
     */
    #[Scope]
    protected function visibleTo(Builder $query, User $user): void
    {
        match ($user->role) {
            UserRole::Admin => null,
            UserRole::Teacher => $query->where('teacher_id', $user->id),
            UserRole::Student => $query->whereIn(
                'id',
                DB::table('halaqa_student')->select('halaqa_id')->where('student_id', $user->id),
            ),
        };
    }

    #[Scope]
    protected function active(Builder $query): void
    {
        $query->where('is_active', true);
    }

    /**
     * Determine whether the user belongs to this halaqa (admins always do).
     */
    public function hasMember(User $user): bool
    {
        return match ($user->role) {
            UserRole::Admin => true,
            UserRole::Teacher => $this->teacher_id === $user->id,
            UserRole::Student => in_array($this->id, $user->enrolledHalaqaIds(), true),
        };
    }

    /**
     * Normalized weekly schedule slots sorted by weekday and time.
     *
     * @return list<array{day: int, time: string}>
     */
    public function scheduleSlots(): array
    {
        return collect($this->schedule ?? [])
            ->filter(fn ($slot): bool => is_array($slot) && isset($slot['day'], $slot['time']))
            ->map(fn (array $slot): array => ['day' => (int) $slot['day'], 'time' => substr((string) $slot['time'], 0, 5)])
            ->sortBy(fn (array $slot): string => $slot['day'].$slot['time'])
            ->values()
            ->all();
    }

    /**
     * IDs of everyone taking part in the halaqa (teacher and students).
     *
     * @return list<int>
     */
    public function memberIds(): array
    {
        return $this->students()->pluck('users.id')
            ->push($this->teacher_id)
            ->filter()
            ->unique()
            ->values()
            ->all();
    }
}
