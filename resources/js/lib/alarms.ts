import type { AlarmItem, AlarmKind } from '@/types';

/**
 * An alarm keeps ringing for this long after its time (then it waits for the next day).
 */
export const ALARM_WINDOW_MINUTES = 30;

export const SNOOZE_MINUTES = 10;

const DISMISSED_PREFIX = 'alarm-dismissed:';
const SNOOZED_PREFIX = 'alarm-snoozed:';

export interface LocalClock {
    /** YYYY-MM-DD */
    date: string;
    /** Minutes since midnight. */
    minutes: number;
    /** 0 = Sunday ... 6 = Saturday */
    weekday: number;
}

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * The current date, time and weekday in the given timezone.
 */
export function localClock(timezone: string, now: Date = new Date()): LocalClock {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        weekday: 'short',
    }).formatToParts(now);

    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';

    return {
        date: `${get('year')}-${get('month')}-${get('day')}`,
        minutes: Number(get('hour')) * 60 + Number(get('minute')),
        weekday: Math.max(0, weekdays.indexOf(get('weekday'))),
    };
}

export function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);

    return (hours ?? 0) * 60 + (minutes ?? 0);
}

function read(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function write(key: string, value: string): void {
    try {
        localStorage.setItem(key, value);
    } catch {
        // Storage can be unavailable (private mode); the server keeps the dismissal anyway.
    }
}

/**
 * Remember on this device that the alarm was dismissed today (the server is told too).
 */
export function rememberDismissed(alarm: AlarmItem, date: string): void {
    write(DISMISSED_PREFIX + alarm.id, date);
}

export function rememberSnoozed(alarm: AlarmItem, minutes = SNOOZE_MINUTES): void {
    write(SNOOZED_PREFIX + alarm.id, String(Date.now() + minutes * 60_000));
}

/**
 * Whether the alarm should be ringing right now on this device.
 */
export function isRinging(alarm: AlarmItem, clock: LocalClock): boolean {
    if (!alarm.is_active || !ringsOn(alarm, clock.weekday)) {
        return false;
    }

    const late = clock.minutes - timeToMinutes(alarm.time);

    if (late < 0 || late > ALARM_WINDOW_MINUTES) {
        return false;
    }

    if (alarm.last_dismissed_on === clock.date || read(DISMISSED_PREFIX + alarm.id) === clock.date) {
        return false;
    }

    const snoozedUntil = Number(read(SNOOZED_PREFIX + alarm.id) ?? 0);

    return snoozedUntil < Date.now();
}

export function ringsOn(alarm: Pick<AlarmItem, 'days'>, weekday: number): boolean {
    return alarm.days === null || alarm.days.length === 0 || alarm.days.includes(weekday);
}

/**
 * The next moment the alarm rings, for "in 3 hours" hints (null when it never rings).
 */
export function nextRing(alarm: AlarmItem, timezone: string, now: Date = new Date()): Date | null {
    if (!alarm.is_active) {
        return null;
    }

    const clock = localClock(timezone, now);
    const target = timeToMinutes(alarm.time);

    for (let offset = 0; offset < 8; offset++) {
        const weekday = (clock.weekday + offset) % 7;

        if (!ringsOn(alarm, weekday)) {
            continue;
        }

        if (offset === 0 && target <= clock.minutes) {
            continue;
        }

        const minutesAhead = offset * 24 * 60 + target - clock.minutes;

        return new Date(now.getTime() + minutesAhead * 60_000);
    }

    return null;
}

/**
 * Suggested names when an alarm of the kind is created.
 */
export const kindPresets: Record<AlarmKind, { title: { ar: string; en: string }; time: string }> = {
    memorization: { title: { ar: 'ورد الحفظ', en: 'Memorization time' }, time: '06:00' },
    revision: { title: { ar: 'المراجعة', en: 'Revision time' }, time: '21:00' },
    prayer: { title: { ar: 'قيام الليل', en: 'Night prayer' }, time: '03:30' },
    dhikr: { title: { ar: 'أذكار الصباح', en: 'Morning adhkar' }, time: '06:30' },
    custom: { title: { ar: 'منبه', en: 'Alarm' }, time: '08:00' },
};
