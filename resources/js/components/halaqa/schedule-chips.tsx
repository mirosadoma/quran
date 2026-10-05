import { CalendarClock } from 'lucide-react';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import type { ScheduleSlot } from '@/types';

export function ScheduleChips({ schedule, compact = false }: { schedule: ScheduleSlot[]; compact?: boolean }) {
    const dates = useDates();
    const { t } = useTrans();

    if (schedule.length === 0) {
        return <span className="text-xs text-muted">{t('No weekly schedule')}</span>;
    }

    return (
        <div className="flex flex-wrap gap-1.5">
            {schedule.map((slot) => (
                <span
                    key={`${slot.day}-${slot.time}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-surface-muted px-2 py-1 text-xs font-medium text-ink ring-1 ring-line"
                >
                    {!compact && <CalendarClock className="size-3.5 text-gold-600" />}
                    <span className="text-muted">{dates.dayName(slot.day, compact ? 'short' : 'long')}</span>
                    <span className="tabular-nums">{dates.clock(slot.time)}</span>
                </span>
            ))}
        </div>
    );
}
