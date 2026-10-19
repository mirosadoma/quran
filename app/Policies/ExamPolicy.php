<?php

namespace App\Policies;

use App\Models\Exam;
use App\Models\ExamDay;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ExamPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return ! $user->isIndependent();
    }

    /**
     * Determine whether the user can view the model: the ones who run it, the teachers who
     * examine in it or whose halaqat take part, and the students examined in it.
     */
    public function view(User $user, Exam $exam): bool
    {
        if ($exam->isManagedBy($user)) {
            return true;
        }

        if ($user->isTeacher()) {
            return DB::table('exam_days')
                ->where('exam_days.exam_id', $exam->id)
                ->where(function ($query) use ($user): void {
                    $query->whereIn('exam_days.id', DB::table('exam_examiners')->where('user_id', $user->id)->select('exam_day_id'))
                        ->orWhereIn('exam_days.id', DB::table('exam_day_halaqa')
                            ->join('halaqat', 'halaqat.id', '=', 'exam_day_halaqa.halaqa_id')
                            ->where('halaqat.teacher_id', $user->id)
                            ->select('exam_day_halaqa.exam_day_id'));
                })
                ->exists();
        }

        if ($user->isStudent()) {
            return DB::table('exam_entries')
                ->join('exam_days', 'exam_days.id', '=', 'exam_entries.exam_day_id')
                ->where('exam_days.exam_id', $exam->id)
                ->where('exam_entries.student_id', $user->id)
                ->exists();
        }

        return false;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->managesAcademies();
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Exam $exam): bool
    {
        return $exam->isManagedBy($user);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Exam $exam): bool
    {
        return $exam->isManagedBy($user);
    }

    /**
     * Determine whether the user sees the results of the students (the manager and the teachers;
     * students only see their own published result).
     */
    public function viewResults(User $user, Exam $exam): bool
    {
        return ! $user->isStudent() && $this->view($user, $exam);
    }

    /**
     * Determine whether the user may enter the rooms of the day.
     */
    public function enter(User $user, ExamDay $day): bool
    {
        return $day->isEnterableBy($user);
    }
}
