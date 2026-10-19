import { Badge } from '@/components/ui/badge';
import { examDayTone, examEntryTone, examStateTone, useLabels } from '@/lib/labels';
import type { ExamDayStatus, ExamEntryStatus, ExamState } from '@/types';

export function ExamStateBadge({ state }: { state: ExamState }) {
    const labels = useLabels();

    return (
        <Badge tone={examStateTone[state]} dot pulse={state === 'live'}>
            {labels.examState[state]}
        </Badge>
    );
}

export function ExamDayStatusBadge({ status }: { status: ExamDayStatus }) {
    const labels = useLabels();

    return (
        <Badge tone={examDayTone[status]} dot pulse={status === 'live'}>
            {labels.examDay[status]}
        </Badge>
    );
}

export function ExamEntryStatusBadge({ status }: { status: ExamEntryStatus }) {
    const labels = useLabels();

    return (
        <Badge tone={examEntryTone[status]} dot pulse={status === 'called'}>
            {labels.examEntry[status]}
        </Badge>
    );
}
