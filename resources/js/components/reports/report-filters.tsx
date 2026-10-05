import { router } from '@inertiajs/react';
import { Download, Printer, Search } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/form';
import { useTrans } from '@/lib/i18n';
import { cleanQuery } from '@/lib/utils';
import type { HalaqaRef } from '@/types';

interface ReportFiltersProps {
    routeName: string;
    routeParams?: Record<string, number | string>;
    filters: { halaqa_id?: number | null; from: string; to: string };
    halaqat?: HalaqaRef[];
    allowAllHalaqat?: boolean;
    exportable?: boolean;
}

/**
 * Halaqa and date range filters with export and print actions.
 */
export function ReportFilters({ routeName, routeParams = {}, filters, halaqat, allowAllHalaqat = false, exportable = true }: ReportFiltersProps) {
    const { t } = useTrans();
    const [values, setValues] = useState({ halaqa_id: filters.halaqa_id ?? null, from: filters.from, to: filters.to });

    const query = cleanQuery(values);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        router.get(route(routeName, routeParams), query, { preserveScroll: true, preserveState: true });
    };

    const presets = [
        { label: t('Last 7 days'), days: 6 },
        { label: t('Last 30 days'), days: 29 },
        { label: t('Last 90 days'), days: 89 },
    ];

    const applyPreset = (days: number) => {
        const to = new Date();
        const from = new Date(Date.now() - days * 86_400_000);
        const next = { ...values, from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
        setValues(next);
        router.get(route(routeName, routeParams), cleanQuery(next), { preserveScroll: true, preserveState: true });
    };

    return (
        <form onSubmit={submit} className="no-print mb-6 rounded-2xl border border-line bg-surface p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
                {halaqat && (
                    <Field label={t('Halaqa')}>
                        <Select value={values.halaqa_id ?? ''} onChange={(event) => setValues({ ...values, halaqa_id: Number(event.target.value) || null })}>
                            {allowAllHalaqat && <option value="">{t('All halaqat')}</option>}
                            {halaqat.map((halaqa) => (
                                <option key={halaqa.id} value={halaqa.id}>
                                    {halaqa.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                )}
                <Field label={t('From')}>
                    <Input type="date" value={values.from} onChange={(event) => setValues({ ...values, from: event.target.value })} />
                </Field>
                <Field label={t('To')}>
                    <Input type="date" value={values.to} onChange={(event) => setValues({ ...values, to: event.target.value })} />
                </Field>
                <div className="flex items-end">
                    <Button type="submit" className="w-full">
                        <Search />
                        {t('Show')}
                    </Button>
                </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                    {presets.map((preset) => (
                        <button
                            key={preset.days}
                            type="button"
                            onClick={() => applyPreset(preset.days)}
                            className="rounded-lg bg-surface-muted px-2.5 py-1 text-xs font-semibold text-muted ring-1 ring-line hover:text-ink"
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2">
                    {exportable && (
                        <a
                            href={route(routeName, { ...routeParams, ...query, export: 'csv' })}
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line px-3 text-xs font-semibold text-ink transition hover:bg-surface-muted"
                        >
                            <Download className="size-4" />
                            {t('Export to Excel (CSV)')}
                        </a>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => window.print()}>
                        <Printer />
                        {t('Print')}
                    </Button>
                </div>
            </div>
        </form>
    );
}
