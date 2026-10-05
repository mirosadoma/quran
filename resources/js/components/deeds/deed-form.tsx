import { useForm, usePage } from '@inertiajs/react';
import { CircleCheck, Sparkles, TriangleAlert, WandSparkles } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { useTrans } from '@/lib/i18n';
import { deedCatalog, type DeedItem, type DeedKind, findEntry, matchDeed, type SinEntry, type SinSeverity } from '@/lib/deeds';
import { localized } from '@/lib/prayers';
import { cn } from '@/lib/utils';

/**
 * The current time in the user's timezone, as HH:MM.
 */
export function currentTime(timezone: string): string {
    return new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
}

interface DeedFormProps {
    /** The day shown; new deeds are recorded on it. */
    date: string;
    today: string;
    deed?: DeedItem | null;
    onDone?: () => void;
}

/**
 * Record a good or a bad deed. While typing, the description is matched with the common sins and
 * good deeds, so a sin is classified (major or minor) and its repentance is known; the user can
 * change the match, or say whether the sin is minor or major when nothing matches.
 */
export function DeedForm({ date, today, deed, onDone }: DeedFormProps) {
    const { t, locale } = useTrans();
    const { timezone } = usePage().props;
    const form = useForm({
        kind: (deed?.kind ?? 'good') as DeedKind,
        title: deed?.title ?? '',
        notes: deed?.notes ?? '',
        catalog_key: deed?.catalog_key ?? '',
        severity: (deed?.severity ?? '') as SinSeverity | '',
        date: deed?.date ?? date,
        time: deed?.time ?? (date === today ? currentTime(timezone) : '12:00'),
    });
    // Once the user picks an entry by hand, typing no longer changes it.
    const [picked, setPicked] = useState(Boolean(deed));
    const sin = form.data.kind === 'bad';
    const entries = sin ? deedCatalog.sins : deedCatalog.good;
    const suggestion = useMemo(() => matchDeed(form.data.title, entries as SinEntry[]), [form.data.title, entries]);
    const key = picked ? form.data.catalog_key : (suggestion?.key ?? '');
    const entry = findEntry(form.data.kind, key);

    const setKind = (kind: DeedKind) => {
        form.setData((data) => ({ ...data, kind, catalog_key: '', severity: '' }));
        setPicked(false);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.transform((data) => ({ ...data, catalog_key: key || null, severity: key ? null : data.severity || null }));

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                if (!deed) {
                    form.reset('title', 'notes', 'catalog_key', 'severity');
                    form.setData('time', form.data.date === today ? currentTime(timezone) : form.data.time);
                    setPicked(false);
                }

                onDone?.();
            },
        };

        if (deed) {
            form.put(route('deeds.update', deed.id), options);
        } else {
            form.post(route('deeds.store'), options);
        }
    };

    const groups: { label: string; items: SinEntry[] }[] = [
        { label: t('Major sins'), items: deedCatalog.sins.filter((item) => item.severity === 'major') },
        { label: t('Minor sins'), items: deedCatalog.sins.filter((item) => item.severity === 'minor') },
    ];

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-muted p-1 text-sm font-bold">
                <button
                    type="button"
                    onClick={() => setKind('good')}
                    className={cn('flex items-center justify-center gap-2 rounded-xl py-2.5 transition', !sin ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted hover:text-ink')}
                >
                    <Sparkles className="size-4" />
                    {t('Good deed')}
                </button>
                <button
                    type="button"
                    onClick={() => setKind('bad')}
                    className={cn('flex items-center justify-center gap-2 rounded-xl py-2.5 transition', sin ? 'bg-rose-600 text-white shadow-sm' : 'text-muted hover:text-ink')}
                >
                    <TriangleAlert className="size-4" />
                    {t('Bad deed')}
                </button>
            </div>

            <Field label={sin ? t('What did you do?') : t('What good did you do?')} htmlFor="deed-title" error={form.errors.title} required>
                <Input
                    id="deed-title"
                    value={form.data.title}
                    onChange={(event) => form.setData('title', event.target.value)}
                    placeholder={sin ? t('For example: I backbit a colleague at work') : t('For example: I prayed Fajr in the mosque')}
                    maxLength={255}
                    autoComplete="off"
                />
            </Field>

            <div className={cn('rounded-2xl border p-3', sin ? 'border-rose-200 bg-rose-50/50 dark:border-rose-500/20 dark:bg-rose-500/5' : 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/20 dark:bg-emerald-500/5')}>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <WandSparkles className={cn('size-4', sin ? 'text-rose-600' : 'text-emerald-600')} />
                    {entry ? (
                        <>
                            <span className="text-muted">{picked ? t('Kind:') : t('Classified automatically:')}</span>
                            <span className="font-bold text-ink">{localized(entry.name, locale)}</span>
                            {sin && <SeverityBadge severity={(entry as SinEntry).severity} />}
                        </>
                    ) : (
                        <span className="text-muted">{form.data.title.trim() ? t('Not recognized: choose the kind below.') : t('Write what you did and it is classified automatically.')}</span>
                    )}
                </div>

                <Select
                    className="mt-3"
                    value={key}
                    onChange={(event) => {
                        form.setData('catalog_key', event.target.value);
                        setPicked(true);
                    }}
                    aria-label={t('Kind')}
                >
                    <option value="">{sin ? t('Another sin (I choose its kind)') : t('Another good deed')}</option>
                    {sin
                        ? groups.map((group) => (
                              <optgroup key={group.label} label={group.label}>
                                  {group.items.map((item) => (
                                      <option key={item.key} value={item.key}>
                                          {localized(item.name, locale)}
                                      </option>
                                  ))}
                              </optgroup>
                          ))
                        : deedCatalog.good.map((item) => (
                              <option key={item.key} value={item.key}>
                                  {localized(item.name, locale)}
                              </option>
                          ))}
                </Select>

                {sin && !entry && (
                    <div className="mt-3">
                        <p className="mb-2 text-xs font-semibold text-muted">{t('Is it a minor or a major sin?')}</p>
                        <div className="grid grid-cols-2 gap-2">
                            {(['minor', 'major'] as const).map((severity) => (
                                <button
                                    key={severity}
                                    type="button"
                                    onClick={() => form.setData('severity', severity)}
                                    className={cn(
                                        'rounded-xl border px-3 py-2 text-sm font-bold transition',
                                        form.data.severity === severity
                                            ? severity === 'major'
                                                ? 'border-rose-500 bg-rose-600 text-white'
                                                : 'border-gold-500 bg-gold-500 text-white'
                                            : 'border-line bg-surface text-ink hover:border-line-strong',
                                    )}
                                >
                                    {severity === 'major' ? t('Major sin') : t('Minor sin')}
                                </button>
                            ))}
                        </div>
                        {form.errors.severity && <p className="mt-1.5 text-xs text-rose-600">{form.errors.severity}</p>}
                        <p className="mt-2 text-xs leading-relaxed text-muted">{t('If you are not sure, ask Allah\'s forgiveness for it as you would for any sin; persisting in a minor sin makes it major.')}</p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Field label={t('Date')} htmlFor="deed-date" error={form.errors.date}>
                    <Input id="deed-date" type="date" value={form.data.date} max={today} onChange={(event) => form.setData('date', event.target.value)} />
                </Field>
                <Field label={t('Time')} htmlFor="deed-time" error={form.errors.time}>
                    <Input id="deed-time" type="time" value={form.data.time} onChange={(event) => form.setData('time', event.target.value)} />
                </Field>
            </div>

            <Field label={t('Notes (optional)')} htmlFor="deed-notes" error={form.errors.notes}>
                <Textarea id="deed-notes" rows={2} value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} maxLength={2000} />
            </Field>

            <Button type="submit" className="w-full" loading={form.processing} variant={sin ? 'danger' : 'success'}>
                <CircleCheck />
                {deed ? t('Save') : sin ? t('Record the sin') : t('Record the good deed')}
            </Button>
        </form>
    );
}

export function SeverityBadge({ severity }: { severity: SinSeverity | null }) {
    const { t } = useTrans();

    if (!severity) {
        return null;
    }

    return (
        <span
            className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-bold',
                severity === 'major' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' : 'bg-gold-100 text-gold-800 dark:bg-gold-500/15 dark:text-gold-200',
            )}
        >
            {severity === 'major' ? t('Major sin') : t('Minor sin')}
        </span>
    );
}
