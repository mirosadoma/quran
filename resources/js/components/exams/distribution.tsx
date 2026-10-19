import { router } from '@inertiajs/react';
import { ArrowDown, ArrowUp, RefreshCw, Save, Shuffle, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/form';
import { useTrans } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ExamDayItem, ExamEntryItem } from '@/types';

interface DistributionProps {
    day: ExamDayItem;
    missingStudents: { id: number; name: string }[];
}

interface Row {
    entry: ExamEntryItem;
    examiner_id: number | '';
}

/**
 * How the students of the day are shared among the examiners, and the order of every queue.
 */
export function Distribution({ day, missingStudents }: DistributionProps) {
    const { t } = useTrans();
    const examiners = day.examiners ?? [];
    const [rows, setRows] = useState<Row[]>([]);
    const [busy, setBusy] = useState<string | null>(null);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        setRows((day.entries ?? []).map((entry) => ({ entry, examiner_id: entry.examiner_id ?? '' })));
        setDirty(false);
    }, [day.entries]);

    const groups = useMemo(() => {
        const byExaminer = new Map<number | '', Row[]>();

        rows.forEach((row) => {
            const list = byExaminer.get(row.examiner_id) ?? [];
            list.push(row);
            byExaminer.set(row.examiner_id, list);
        });

        return byExaminer;
    }, [rows]);

    const assign = (entryId: number, examinerId: number | '') => {
        setRows((current) => {
            const moved = current.find((row) => row.entry.id === entryId);

            if (!moved) {
                return current;
            }

            // The moved student goes to the end of the new queue.
            return [...current.filter((row) => row.entry.id !== entryId), { ...moved, examiner_id: examinerId }];
        });
        setDirty(true);
    };

    const move = (entryId: number, direction: -1 | 1) => {
        setRows((current) => {
            const row = current.find((item) => item.entry.id === entryId);

            if (!row) {
                return current;
            }

            const siblings = current.filter((item) => item.examiner_id === row.examiner_id);
            const index = siblings.findIndex((item) => item.entry.id === entryId);
            const target = index + direction;

            if (target < 0 || target >= siblings.length) {
                return current;
            }

            const reordered = [...siblings];
            [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
            const others = current.filter((item) => item.examiner_id !== row.examiner_id);

            return [...others, ...reordered];
        });
        setDirty(true);
    };

    const save = () => {
        const assignments: { entry_id: number; examiner_id: number | null; position: number }[] = [];

        groups.forEach((list) => {
            list.forEach((row, index) => assignments.push({ entry_id: row.entry.id, examiner_id: row.examiner_id === '' ? null : row.examiner_id, position: index + 1 }));
        });

        router.put(route('exams.days.distribution', day.id), { assignments }, { preserveScroll: true, onStart: () => setBusy('save'), onFinish: () => setBusy(null) });
    };

    const post = (name: string, url: string, data: Record<string, boolean | number | string> = {}) => {
        router.post(url, data, { preserveScroll: true, onStart: () => setBusy(name), onFinish: () => setBusy(null) });
    };

    const editable = day.status !== 'closed';
    const columns: { id: number | ''; name: string }[] = [...examiners.map((examiner) => ({ id: examiner.id, name: examiner.name })), { id: '', name: t('Not assigned yet') }];

    return (
        <div>
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
                <p className="me-auto text-sm text-muted">{t(':count students on this day', { count: rows.length })}</p>
                {editable && (
                    <>
                        <Button size="sm" variant="secondary" loading={busy === 'sync'} onClick={() => post('sync', route('exams.days.sync-students', day.id))} title={t('Add the students who joined the halaqat after the exam was planned')}>
                            <RefreshCw />
                            {t('Refresh the students')}
                        </Button>
                        <Button size="sm" variant="secondary" loading={busy === 'auto'} disabled={examiners.length === 0} onClick={() => post('auto', route('exams.days.auto-assign', day.id))}>
                            <Shuffle />
                            {t('Share evenly')}
                        </Button>
                        <Button size="sm" loading={busy === 'save'} disabled={!dirty} onClick={save}>
                            <Save />
                            {t('Save the distribution')}
                        </Button>
                    </>
                )}
            </div>

            {missingStudents.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 border-b border-line bg-gold-50/70 px-5 py-2.5 text-xs text-gold-900 dark:bg-gold-500/10 dark:text-gold-100">
                    <UserPlus className="size-4 shrink-0" />
                    <span>
                        {t('Students of these halaqat who are not in the exam yet: :names', { names: missingStudents.map((student) => student.name).join('، ') })}
                    </span>
                </div>
            )}

            {rows.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted">{t('No students on this day yet. Add halaqat to the day or refresh the students.')}</p>
            ) : (
                <div className={cn('grid gap-px bg-line', columns.length > 1 ? 'md:grid-cols-2 xl:grid-cols-3' : '')}>
                    {columns.map((column) => {
                        const list = groups.get(column.id) ?? [];

                        if (column.id === '' && list.length === 0) {
                            return null;
                        }

                        return (
                            <div key={String(column.id)} className="bg-surface">
                                <div className={cn('flex items-center justify-between gap-2 px-4 py-2.5 text-sm font-bold', column.id === '' ? 'text-amber-700 dark:text-amber-300' : 'text-ink')}>
                                    <span className="truncate">{column.name}</span>
                                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold text-muted ring-1 ring-line">{list.length}</span>
                                </div>
                                <ul className="divide-y divide-line border-t border-line">
                                    {list.length === 0 && <li className="px-4 py-4 text-center text-xs text-muted">{t('No students')}</li>}
                                    {list.map((row, index) => (
                                        <li key={row.entry.id} className="flex items-center gap-2 px-3 py-2">
                                            <span className="w-5 text-center text-xs font-bold text-muted tabular-nums">{index + 1}</span>
                                            {row.entry.student && <Avatar name={row.entry.student.name} src={row.entry.student.avatar_url} size="xs" />}
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-medium text-ink">{row.entry.student?.name}</span>
                                                {row.entry.halaqa && <span className="block truncate text-[11px] text-muted">{row.entry.halaqa.name}</span>}
                                            </span>
                                            {editable && (
                                                <>
                                                    <Select
                                                        value={row.examiner_id}
                                                        onChange={(event) => assign(row.entry.id, event.target.value === '' ? '' : Number(event.target.value))}
                                                        className="h-8 w-32 text-xs"
                                                        aria-label={t('Examiner')}
                                                    >
                                                        <option value="">{t('Not assigned yet')}</option>
                                                        {examiners.map((examiner) => (
                                                            <option key={examiner.id} value={examiner.id}>
                                                                {examiner.name}
                                                            </option>
                                                        ))}
                                                    </Select>
                                                    <span className="flex flex-col">
                                                        <button type="button" onClick={() => move(row.entry.id, -1)} disabled={index === 0} className="rounded p-0.5 text-muted hover:text-ink disabled:opacity-30" aria-label={t('Move up')}>
                                                            <ArrowUp className="size-3.5" />
                                                        </button>
                                                        <button type="button" onClick={() => move(row.entry.id, 1)} disabled={index === list.length - 1} className="rounded p-0.5 text-muted hover:text-ink disabled:opacity-30" aria-label={t('Move down')}>
                                                            <ArrowDown className="size-3.5" />
                                                        </button>
                                                    </span>
                                                </>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
