<?php

namespace App\Observers;

use App\Models\ProgressRecord;
use App\Models\User;
use App\Services\StudentProgress;

class ProgressRecordObserver
{
    public function __construct(protected StudentProgress $progress) {}

    /**
     * Handle the ProgressRecord "saved" event.
     */
    public function saved(ProgressRecord $progressRecord): void
    {
        $this->refresh($progressRecord);
    }

    /**
     * Handle the ProgressRecord "deleted" event.
     */
    public function deleted(ProgressRecord $progressRecord): void
    {
        $this->refresh($progressRecord);
    }

    /**
     * Recalculate the memorized total cached on the student.
     */
    protected function refresh(ProgressRecord $progressRecord): void
    {
        $student = User::find($progressRecord->student_id);

        if ($student !== null) {
            $this->progress->refresh($student);
        }
    }
}
