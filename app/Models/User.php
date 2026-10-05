<?php

namespace App\Models;

use App\Enums\Gender;
use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Translation\HasLocalePreference;
use Illuminate\Database\Eloquent\Attributes\Appends;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Http\UploadedFile;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;

#[Fillable([
    'name', 'email', 'phone', 'password', 'role', 'academy_id', 'gender', 'birth_date', 'country', 'timezone', 'locale',
    'avatar_path', 'bio', 'guardian_name', 'guardian_phone', 'zoom_user_id', 'admin_notes', 'is_active',
    'notify_email', 'notify_whatsapp',
])]
#[Hidden(['password', 'remember_token', 'admin_notes'])]
#[Appends(['avatar_url'])]
class User extends Authenticatable implements HasLocalePreference
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Halaqa IDs the student is enrolled in, cached for the current request.
     *
     * @var list<int>|null
     */
    protected ?array $enrolledHalaqaIdsCache = null;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
            'gender' => Gender::class,
            'birth_date' => 'date',
            'is_active' => 'boolean',
            'notify_email' => 'boolean',
            'notify_whatsapp' => 'boolean',
            'memorized_ayahs' => 'integer',
            'last_login_at' => 'datetime',
            'mushaf_page' => 'integer',
        ];
    }

    /**
     * The academy of a manager, teacher or student (none for the administration and for
     * students who joined no academy).
     *
     * @return BelongsTo<Academy, $this>
     */
    public function academy(): BelongsTo
    {
        return $this->belongsTo(Academy::class)->withTrashed();
    }

    /**
     * Requests the student sent to join academies.
     *
     * @return HasMany<AcademyJoinRequest, $this>
     */
    public function joinRequests(): HasMany
    {
        return $this->hasMany(AcademyJoinRequest::class);
    }

    /**
     * Halaqat the user is enrolled in as a student.
     *
     * @return BelongsToMany<Halaqa, $this>
     */
    public function halaqat(): BelongsToMany
    {
        return $this->belongsToMany(Halaqa::class, 'halaqa_student', 'student_id', 'halaqa_id')->withTimestamps();
    }

    /**
     * Halaqat the user teaches.
     *
     * @return HasMany<Halaqa, $this>
     */
    public function teachingHalaqat(): HasMany
    {
        return $this->hasMany(Halaqa::class, 'teacher_id');
    }

    /**
     * @return HasMany<Attendance, $this>
     */
    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class, 'student_id');
    }

    /**
     * @return HasMany<ProgressRecord, $this>
     */
    public function progressRecords(): HasMany
    {
        return $this->hasMany(ProgressRecord::class, 'student_id');
    }

    /**
     * Recitations the student entered and that wait for grading.
     *
     * @return HasMany<RecitationSubmission, $this>
     */
    public function recitationSubmissions(): HasMany
    {
        return $this->hasMany(RecitationSubmission::class, 'student_id');
    }

    /**
     * @return HasMany<MushafBookmark, $this>
     */
    public function mushafBookmarks(): HasMany
    {
        return $this->hasMany(MushafBookmark::class);
    }

    /**
     * @return HasMany<MushafHighlight, $this>
     */
    public function mushafHighlights(): HasMany
    {
        return $this->hasMany(MushafHighlight::class);
    }

    /**
     * Browsers and installed apps of the user that receive push notifications.
     *
     * @return HasMany<PushSubscription, $this>
     */
    public function pushSubscriptions(): HasMany
    {
        return $this->hasMany(PushSubscription::class);
    }

    /**
     * @return HasMany<PrayerReminder, $this>
     */
    public function prayerReminders(): HasMany
    {
        return $this->hasMany(PrayerReminder::class);
    }

    /**
     * The good and bad deeds the user records to hold themselves to account (private).
     *
     * @return HasMany<Deed, $this>
     */
    public function deeds(): HasMany
    {
        return $this->hasMany(Deed::class);
    }

    /**
     * Keep only digits and a leading plus sign so phone logins match.
     */
    public static function normalizePhone(?string $phone): ?string
    {
        $phone = trim((string) $phone);

        if ($phone === '') {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        return str_starts_with($phone, '+') ? '+'.$digits : $digits;
    }

    public function isAdmin(): bool
    {
        return $this->role === UserRole::Admin;
    }

    public function isManager(): bool
    {
        return $this->role === UserRole::Manager;
    }

    /**
     * Whether the user runs academies: the administration (all of them) or an academy manager (theirs).
     */
    public function managesAcademies(): bool
    {
        return $this->isAdmin() || $this->isManager();
    }

    /**
     * Whether the user manages the given academy (the administration manages every academy).
     */
    public function managesAcademy(?int $academyId): bool
    {
        return $this->isAdmin() || ($this->isManager() && $academyId !== null && $this->academy_id === $academyId);
    }

    /**
     * A student who joined no academy: only the personal features (mushaf, adhkar, prayer...).
     */
    public function isIndependent(): bool
    {
        return $this->isStudent() && $this->academy_id === null;
    }

    public function isTeacher(): bool
    {
        return $this->role === UserRole::Teacher;
    }

    public function isStudent(): bool
    {
        return $this->role === UserRole::Student;
    }

    public function hasRole(UserRole ...$roles): bool
    {
        return in_array($this->role, $roles, true);
    }

    /**
     * IDs of the halaqat the student is enrolled in.
     *
     * @return list<int>
     */
    public function enrolledHalaqaIds(): array
    {
        return $this->enrolledHalaqaIdsCache ??= $this->halaqat()->pluck('halaqat.id')->map(fn ($id): int => (int) $id)->all();
    }

    /**
     * Get the halaqat this user can access (all for admins).
     *
     * @return Builder<Halaqa>
     */
    public function accessibleHalaqat(): Builder
    {
        return Halaqa::query()->visibleTo($this);
    }

    /**
     * Timezone used to display dates to this user.
     */
    public function displayTimezone(): string
    {
        return $this->timezone ?: config('app.user_timezone');
    }

    /**
     * Get the user's preferred locale.
     */
    public function preferredLocale(): string
    {
        return $this->locale ?: config('app.locale');
    }

    /**
     * Replace or remove the profile picture (the caller saves the model).
     */
    public function updateAvatar(?UploadedFile $file, bool $remove = false): void
    {
        if (($remove || $file !== null) && $this->avatar_path !== null) {
            Storage::disk('public')->delete($this->avatar_path);
            $this->avatar_path = null;
        }

        if ($file !== null) {
            $this->avatar_path = $file->store('avatars', 'public');
        }
    }

    /**
     * WhatsApp number used for notifications (falls back to the guardian's).
     */
    public function routeNotificationForWhatsApp(): ?string
    {
        return $this->phone ?: $this->guardian_phone;
    }

    /**
     * @return Attribute<string|null, never>
     */
    protected function avatarUrl(): Attribute
    {
        return Attribute::get(
            fn (): ?string => $this->avatar_path ? Storage::disk('public')->url($this->avatar_path) : null,
        );
    }

    #[Scope]
    protected function admins(Builder $query): void
    {
        $query->where('role', UserRole::Admin);
    }

    #[Scope]
    protected function managers(Builder $query): void
    {
        $query->where('role', UserRole::Manager);
    }

    /**
     * Users of one academy, or of every academy when null (the administration's view).
     */
    #[Scope]
    protected function inAcademy(Builder $query, ?int $academyId): void
    {
        $query->when($academyId !== null, fn (Builder $query) => $query->where('academy_id', $academyId));
    }

    #[Scope]
    protected function teachers(Builder $query): void
    {
        $query->where('role', UserRole::Teacher);
    }

    #[Scope]
    protected function students(Builder $query): void
    {
        $query->where('role', UserRole::Student);
    }

    #[Scope]
    protected function active(Builder $query): void
    {
        $query->where('is_active', true);
    }

    #[Scope]
    protected function search(Builder $query, ?string $term): void
    {
        $term = trim((string) $term);

        if ($term === '') {
            return;
        }

        $query->where(function (Builder $query) use ($term): void {
            $query->where('name', 'like', "%{$term}%")
                ->orWhere('email', 'like', "%{$term}%")
                ->orWhere('phone', 'like', "%{$term}%");
        });
    }
}
