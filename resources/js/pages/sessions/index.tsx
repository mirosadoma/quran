import { router, usePage } from '@inertiajs/react';
import { CalendarDays, CalendarPlus, X } from 'lucide-react';
import { useMemo } from 'react';
import { SessionRow } from '@/components/session/session-row';
import { Button, LinkButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Select } from '@/components/ui/form';
import { Pagination } from '@/components/ui/pagination';
import { Tabs } from '@/components/ui/tabs';
import { useRealtime } from '@/hooks/use-realtime';
import AppLayout from '@/layouts/app-layout';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { useLabels } from '@/lib/labels';
import { cleanQuery } from '@/lib/utils';
import type { HalaqaRef, Paginated, SessionItem, SessionStatus } from '@/types';

interface Filters {
    view: 'upcoming' | 'past' | 'all';
    halaqa_id: number | null;
    status: SessionStatus | null;
    from: string | null;
    to: string | null;
}

interface SessionsIndexProps {
    sessions: Paginated<SessionItem>;
    filters: Filters;
    halaqat: HalaqaRef[];
    can: { create: boolean };
}

export default function SessionsIndex({ sessions, filters, halaqat, can }: SessionsIndexProps) {
    const { t } = useTrans();
    const labels = useLabels();
    const dates = useDates();
    const { realtime } = usePage().props;

    useRealtime('session', () => router.reload({ only: ['sessions'] }));

    const apply = (changes: Partial<Filters>) => {
        router.get(route('sessions.index'), cleanQuery({ ...filters, ...changes }), { preserveState: true, preserveScroll: true, replace: true });
    };

    const groups = useMemo(() => {
        const result: { key: string; label: string; items: SessionItem[] }[] = [];

        for (const session of sessions.data) {
            const key = dates.dayKey(session.starts_at);
            let group = result.find((item) => item.key === key);

            if (!group) {
                const label = dates.isToday(session.starts_at)
                    ? t('Today')
                    : dates.isTomorrow(session.starts_at)
                      ? t('Tomorrow')
                      : dates.isYesterday(session.starts_at)
                        ? t('Yesterday')
                        : dates.date(session.starts_at, { weekday: 'long', month: 'long' });
                group = { key, label, items: [] };
                result.push(group);
            }

            group.items.push(session);
        }

        return result;
    }, [sessions.data, dates, t]);

    const hasFilters = filters.halaqa_id || filters.status || filters.from || filters.to;

    return (
        <AppLayout
            title={t('Sessions')}
            description={realtime.enabled ? undefined : t('Upcoming and previous sessions of your halaqat.')}
            actions={
                can.create && (
                    <LinkButton href={route('sessions.create')}>
                        <CalendarPlus />
                        {t('Schedule a session')}
                    </LinkButton>
                )
            }
        >
            <div className="mb-6 space-y-3">
                <Tabs
                    value={filters.view}
                    onChange={(view) => apply({ view })}
                    items={[
                        { value: 'upcoming', label: t('Upcoming') },
                        { value: 'past', label: t('Previous') },
                        { value: 'all', label: t('All') },
                    ]}
                />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <Select value={filters.halaqa_id ?? ''} onChange={(event) => apply({ halaqa_id: Number(event.target.value) || null })}>
                        <option value="">{t('All halaqat')}</option>
                        {halaqat.map((halaqa) => (
                            <option key={halaqa.id} value={halaqa.id}>
                                {halaqa.name}
                            </option>
                        ))}
                    </Select>
                    <Select value={filters.status ?? ''} onChange={(event) => apply({ status: (event.target.value || null) as SessionStatus | null })}>
                        <option value="">{t('All statuses')}</option>
                        {(['scheduled', 'live', 'completed', 'cancelled'] as const).map((status) => (
                            <option key={status} value={status}>
                                {labels.session[status]}
                            </option>
                        ))}
                    </Select>
                    <Input type="date" value={filters.from ?? ''} onChange={(event) => apply({ from: event.target.value || null })} aria-label={t('From')} />
                    <Input type="date" value={filters.to ?? ''} onChange={(event) => apply({ to: event.target.value || null })} aria-label={t('To')} />
                    {hasFilters && (
                        <Button variant="ghost" onClick={() => apply({ halaqa_id: null, status: null, from: null, to: null })}>
                            <X />
                            {t('Clear filters')}
                        </Button>
                    )}
                </div>
            </div>

            {sessions.data.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={CalendarDays}
                        title={filters.view === 'upcoming' ? t('No upcoming sessions') : t('No sessions found')}
                        description={can.create ? t('Sessions are created automatically from the weekly schedule of each halaqa.') : undefined}
                    />
                </Card>
            ) : (
                <div className="space-y-6">
                    {groups.map((group) => (
                        <section key={group.key}>
                            <h2 className="mb-2 px-1 text-sm font-bold text-muted">{group.label}</h2>
                            <Card className="divide-y divide-line overflow-hidden">
                                {group.items.map((session) => (
                                    <SessionRow key={session.id} session={session} />
                                ))}
                            </Card>
                        </section>
                    ))}
                </div>
            )}

            <Pagination data={sessions} className="mt-8" />
        </AppLayout>
    );
}
