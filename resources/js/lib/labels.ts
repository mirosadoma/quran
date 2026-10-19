import { useMemo } from 'react';
import { useTrans } from '@/lib/i18n';
import type {
    AlarmKind,
    AttendanceStatus,
    ExamDayPhase,
    ExamDayStatus,
    ExamEntryStatus,
    ExamState,
    Gender,
    Grade,
    HalaqaGender,
    HalaqaLevel,
    JoinRequestStatus,
    MeetingProvider,
    ProgressType,
    Role,
    SessionStatus,
} from '@/types';

export type Tone = 'emerald' | 'gold' | 'sky' | 'rose' | 'amber' | 'slate' | 'violet' | 'teal';

export const gradeTone: Record<Grade, Tone> = {
    excellent: 'emerald',
    very_good: 'teal',
    good: 'sky',
    acceptable: 'amber',
    weak: 'rose',
};

export const attendanceTone: Record<AttendanceStatus, Tone> = {
    present: 'emerald',
    late: 'amber',
    absent: 'rose',
    excused: 'sky',
};

export const sessionTone: Record<SessionStatus, Tone> = {
    scheduled: 'sky',
    live: 'emerald',
    completed: 'slate',
    cancelled: 'rose',
};

export const roleTone: Record<Role, Tone> = {
    admin: 'violet',
    manager: 'sky',
    teacher: 'gold',
    student: 'emerald',
};

export const joinRequestTone: Record<JoinRequestStatus, Tone> = {
    pending: 'amber',
    accepted: 'emerald',
    rejected: 'rose',
    cancelled: 'slate',
};

export const examStateTone: Record<ExamState, Tone> = {
    draft: 'slate',
    upcoming: 'sky',
    live: 'emerald',
    finished: 'slate',
};

export const examDayTone: Record<ExamDayStatus, Tone> = {
    scheduled: 'sky',
    live: 'emerald',
    closed: 'slate',
};

export const examEntryTone: Record<ExamEntryStatus, Tone> = {
    waiting: 'slate',
    alerted: 'amber',
    called: 'rose',
    examined: 'emerald',
    absent: 'rose',
};

export const alarmKinds: AlarmKind[] = ['memorization', 'revision', 'prayer', 'dhikr', 'custom'];

export const grades: Grade[] = ['excellent', 'very_good', 'good', 'acceptable', 'weak'];
export const attendanceStatuses: AttendanceStatus[] = ['present', 'late', 'absent', 'excused'];

/**
 * Translated labels for every enum used in the interface.
 */
export function useLabels() {
    const { t } = useTrans();

    return useMemo(
        () => ({
            role: {
                admin: t('Admin'),
                manager: t('Academy manager'),
                teacher: t('Teacher'),
                student: t('Student'),
            } satisfies Record<Role, string>,
            gender: {
                male: t('Male'),
                female: t('Female'),
            } satisfies Record<Gender, string>,
            halaqaGender: {
                male: t('Men & boys'),
                female: t('Women & girls'),
                mixed: t('Mixed'),
            } satisfies Record<HalaqaGender, string>,
            level: {
                beginner: t('Beginner'),
                intermediate: t('Intermediate'),
                advanced: t('Advanced'),
            } satisfies Record<HalaqaLevel, string>,
            session: {
                scheduled: t('Scheduled'),
                live: t('Live now'),
                completed: t('Completed'),
                cancelled: t('Cancelled'),
            } satisfies Record<SessionStatus, string>,
            attendance: {
                present: t('Present'),
                late: t('Late'),
                absent: t('Absent'),
                excused: t('Excused'),
            } satisfies Record<AttendanceStatus, string>,
            progressType: {
                memorization: t('Memorization'),
                revision: t('Revision'),
            } satisfies Record<ProgressType, string>,
            grade: {
                excellent: t('Excellent'),
                very_good: t('Very good'),
                good: t('Good'),
                acceptable: t('Acceptable'),
                weak: t('Needs repetition'),
            } satisfies Record<Grade, string>,
            joinRequest: {
                pending: t('Waiting for an answer'),
                accepted: t('Accepted'),
                rejected: t('Declined'),
                cancelled: t('Cancelled'),
            } satisfies Record<JoinRequestStatus, string>,
            provider: {
                google_meet: 'Google Meet',
                zoom: 'Zoom',
                jitsi: 'Jitsi Meet',
                manual: t('Manual link'),
            } satisfies Record<MeetingProvider, string>,
            examState: {
                draft: t('Draft'),
                upcoming: t('Upcoming'),
                live: t('Live now'),
                finished: t('Finished'),
            } satisfies Record<ExamState, string>,
            examDay: {
                scheduled: t('Scheduled'),
                live: t('Live now'),
                closed: t('Closed'),
            } satisfies Record<ExamDayStatus, string>,
            examPhase: {
                opening: t('Opening word'),
                examining: t('Examining'),
            } satisfies Record<ExamDayPhase, string>,
            examEntry: {
                waiting: t('Waiting'),
                alerted: t('Get ready'),
                called: t('Being examined'),
                examined: t('Examined'),
                absent: t('Absent'),
            } satisfies Record<ExamEntryStatus, string>,
            alarmKind: {
                memorization: t('Memorization'),
                revision: t('Revision'),
                prayer: t('Prayer'),
                dhikr: t('Adhkar'),
                custom: t('Other'),
            } satisfies Record<AlarmKind, string>,
        }),
        [t],
    );
}
