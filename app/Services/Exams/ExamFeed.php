<?php

namespace App\Services\Exams;

use App\Enums\ExamDayStatus;
use App\Enums\UserRole;
use App\Models\ExamDay;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * The exam days a user should see on their dashboard: the ones running now and the next ones.
 */
class ExamFeed
{
    /**
     * Live and upcoming days (within the given number of days) relevant to the user, soonest first.
     *
     * @return Collection<int, ExamDay>
     */
    public function upcomingFor(User $user, int $withinDays = 60, int $limit = 3): Collection
    {
        if ($user->isIndependent()) {
            return new Collection;
        }

        return ExamDay::query()
            ->where('status', '!=', ExamDayStatus::Closed)
            ->where(fn (Builder $query) => $query->where('status', ExamDayStatus::Live)->orWhere('starts_at', '<=', now()->addDays($withinDays)))
            ->where(fn (Builder $query) => $query->where('status', ExamDayStatus::Live)->orWhere('starts_at', '>=', now()->subHours(6)))
            ->tap(fn (Builder $query) => $this->scopeToUser($query, $user))
            ->with(['exam', 'halaqat', 'examiners', 'entries'])
            ->orderByRaw("CASE WHEN status = 'live' THEN 0 ELSE 1 END")
            ->orderBy('starts_at')
            ->limit($limit)
            ->get();
    }

    /**
     * @param  Builder<ExamDay>  $query
     */
    protected function scopeToUser(Builder $query, User $user): void
    {
        match ($user->role) {
            UserRole::Admin => null,
            UserRole::Manager => $query->whereIn('exam_id', DB::table('exams')->where('academy_id', $user->academy_id)->select('id')),
            UserRole::Teacher => $query->where(function (Builder $query) use ($user): void {
                $query->whereIn('id', DB::table('exam_examiners')->where('user_id', $user->id)->select('exam_day_id'))
                    ->orWhereIn('id', DB::table('exam_day_halaqa')
                        ->join('halaqat', 'halaqat.id', '=', 'exam_day_halaqa.halaqa_id')
                        ->where('halaqat.teacher_id', $user->id)
                        ->select('exam_day_halaqa.exam_day_id'));
            }),
            UserRole::Student => $query->whereIn('id', DB::table('exam_entries')->where('student_id', $user->id)->select('exam_day_id')),
        };
    }
}
