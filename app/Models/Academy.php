<?php

namespace App\Models;

use App\Enums\HalaqaGender;
use App\Enums\UserRole;
use Database\Factories\AcademyFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * An academy on the platform: its manager runs its teachers, students, halaqat and sessions.
 * Deleting archives it (soft delete); the administration can restore it or delete it for good.
 */
#[Fillable([
    'name', 'slug', 'tagline', 'description', 'logo_path', 'email', 'phone', 'location', 'gender', 'timezone',
    'manager_id', 'is_active', 'accepts_requests',
])]
class Academy extends Model
{
    /** @use HasFactory<AcademyFactory> */
    use HasFactory, SoftDeletes;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'gender' => HalaqaGender::class,
            'is_active' => 'boolean',
            'accepts_requests' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    /**
     * Everyone in the academy: its manager, teachers and students.
     *
     * @return HasMany<User, $this>
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * @return HasMany<User, $this>
     */
    public function teachers(): HasMany
    {
        return $this->users()->where('role', UserRole::Teacher);
    }

    /**
     * @return HasMany<User, $this>
     */
    public function students(): HasMany
    {
        return $this->users()->where('role', UserRole::Student);
    }

    /**
     * @return HasMany<Halaqa, $this>
     */
    public function halaqat(): HasMany
    {
        return $this->hasMany(Halaqa::class);
    }

    /**
     * @return HasMany<AcademyJoinRequest, $this>
     */
    public function joinRequests(): HasMany
    {
        return $this->hasMany(AcademyJoinRequest::class);
    }

    /**
     * @return HasMany<Video, $this>
     */
    public function videos(): HasMany
    {
        return $this->hasMany(Video::class);
    }

    #[Scope]
    protected function active(Builder $query): void
    {
        $query->where('is_active', true);
    }

    /**
     * Academies independent students may ask to join.
     */
    #[Scope]
    protected function open(Builder $query): void
    {
        $query->where('is_active', true)->where('accepts_requests', true);
    }

    /**
     * @return Attribute<string|null, never>
     */
    protected function logoUrl(): Attribute
    {
        return Attribute::get(fn (): ?string => $this->logo_path ? Storage::disk('public')->url($this->logo_path) : null);
    }

    /**
     * Replace or remove the logo (the caller saves the model).
     */
    public function updateLogo(?UploadedFile $file, bool $remove = false): void
    {
        if (($remove || $file !== null) && $this->logo_path !== null) {
            Storage::disk('public')->delete($this->logo_path);
            $this->logo_path = null;
        }

        if ($file !== null) {
            $this->logo_path = $file->store('academies', 'public');
        }
    }

    /**
     * A free address for the public page, from the name (Arabic names are transliterated).
     */
    public static function uniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug(Str::ascii($name)) ?: 'academy';
        $slug = $base;

        for ($number = 2; static::withTrashed()->where('slug', $slug)->when($ignoreId, fn (Builder $query) => $query->whereKeyNot($ignoreId))->exists(); $number++) {
            $slug = "{$base}-{$number}";
        }

        return $slug;
    }
}
