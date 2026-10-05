import { BookOpen, Repeat } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { attendanceTone, gradeTone, roleTone, sessionTone, useLabels } from '@/lib/labels';
import type { AttendanceStatus, Grade, ProgressType, Role, SessionStatus } from '@/types';

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
    const labels = useLabels();

    return (
        <Badge tone={sessionTone[status]} dot pulse={status === 'live'}>
            {labels.session[status]}
        </Badge>
    );
}

export function AttendanceBadge({ status }: { status: AttendanceStatus }) {
    const labels = useLabels();

    return <Badge tone={attendanceTone[status]}>{labels.attendance[status]}</Badge>;
}

export function GradeBadge({ grade }: { grade: Grade }) {
    const labels = useLabels();

    return <Badge tone={gradeTone[grade]}>{labels.grade[grade]}</Badge>;
}

export function RoleBadge({ role }: { role: Role }) {
    const labels = useLabels();

    return <Badge tone={roleTone[role]}>{labels.role[role]}</Badge>;
}

export function ProgressTypeBadge({ type }: { type: ProgressType }) {
    const labels = useLabels();
    const Icon = type === 'memorization' ? BookOpen : Repeat;

    return (
        <Badge tone={type === 'memorization' ? 'gold' : 'sky'}>
            <Icon className="size-3" />
            {labels.progressType[type]}
        </Badge>
    );
}
