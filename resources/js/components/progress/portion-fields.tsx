import { BookOpen, Minus, Plus, Repeat, Sparkles } from 'lucide-react';
import { SurahSelect } from '@/components/progress/surah-select';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { useTrans } from '@/lib/i18n';
import { gradeTone, grades, useLabels } from '@/lib/labels';
import { ayahCount, countAyahs, rangeLabel } from '@/lib/quran';
import { cn } from '@/lib/utils';
import type { Grade, ProgressType, QuranRange } from '@/types';

export interface PortionData {
    from_surah: number | null;
    from_ayah: number | null;
    to_surah: number | null;
    to_ayah: number | null;
    grade?: Grade | null;
    mistakes?: number;
}

/**
 * Which parts the recitation contains.
 */
export type RecitationKind = 'memorization' | 'revision' | 'both';

export const progressTypes: ProgressType[] = ['memorization', 'revision'];

export function emptyPortion(start?: { surah: number; ayah: number } | null, graded = false): PortionData {
    return {
        from_surah: start?.surah ?? null,
        from_ayah: start?.ayah ?? null,
        to_surah: start?.surah ?? null,
        to_ayah: start ? Math.min(ayahCount(start.surah), start.ayah + 4) : null,
        ...(graded ? { grade: 'very_good' as Grade, mistakes: 0 } : {}),
    };
}

export function portionFromRange(range: QuranRange, graded = false): PortionData {
    return {
        from_surah: range.from_surah,
        from_ayah: range.from_ayah,
        to_surah: range.to_surah,
        to_ayah: range.to_ayah,
        ...(graded ? { grade: null, mistakes: 0 } : {}),
    };
}

export function kindOf(memorization: unknown, revision: unknown): RecitationKind {
    if (memorization && revision) {
        return 'both';
    }

    return revision ? 'revision' : 'memorization';
}

export function kindIncludes(kind: RecitationKind, type: ProgressType): boolean {
    return kind === 'both' || kind === type;
}

/**
 * Chosen portions whose start or end is still missing or invalid.
 */
export function incompletePortions(kind: RecitationKind, data: Record<ProgressType, PortionData>): ProgressType[] {
    return progressTypes.filter(
        (type) => kindIncludes(kind, type) && countAyahs(data[type].from_surah, data[type].from_ayah, data[type].to_surah, data[type].to_ayah) === null,
    );
}

/**
 * Tells which portion still needs its start and end before sending.
 */
export function IncompleteHint({ types }: { types: ProgressType[] }) {
    const { t } = useTrans();
    const labels = useLabels();

    if (types.length === 0) {
        return null;
    }

    return (
        <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
            {types.map((type) => t('Choose the start and end of the :type.', { type: labels.progressType[type] })).join(' ')}
        </p>
    );
}

export function RecitationKindPicker({ value, onChange }: { value: RecitationKind; onChange: (kind: RecitationKind) => void }) {
    const { t } = useTrans();
    const labels = useLabels();

    const options: { value: RecitationKind; label: string; icons: (typeof BookOpen)[] }[] = [
        { value: 'memorization', label: labels.progressType.memorization, icons: [BookOpen] },
        { value: 'revision', label: labels.progressType.revision, icons: [Repeat] },
        { value: 'both', label: t('Memorization and revision'), icons: [BookOpen, Repeat] },
    ];

    return (
        <div className="grid grid-cols-3 gap-2">
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(option.value)}
                    aria-pressed={value === option.value}
                    className={cn(
                        'flex flex-col items-center justify-center gap-1.5 rounded-2xl border px-3 py-3 text-center text-sm font-semibold transition sm:flex-row',
                        value === option.value
                            ? 'border-primary-600 bg-primary-50 text-primary-800 dark:bg-primary-500/10 dark:text-primary-200'
                            : 'border-line text-muted hover:border-line-strong',
                    )}
                >
                    <span className="flex items-center gap-0.5">
                        {option.icons.map((Icon, index) => (
                            <Icon key={index} className="size-4" />
                        ))}
                    </span>
                    {option.label}
                </button>
            ))}
        </div>
    );
}

const gradeChip: Record<string, string> = {
    emerald: 'peer-checked:bg-emerald-600 peer-checked:text-white peer-checked:ring-emerald-600',
    teal: 'peer-checked:bg-teal-600 peer-checked:text-white peer-checked:ring-teal-600',
    sky: 'peer-checked:bg-sky-600 peer-checked:text-white peer-checked:ring-sky-600',
    amber: 'peer-checked:bg-amber-500 peer-checked:text-white peer-checked:ring-amber-500',
    rose: 'peer-checked:bg-rose-600 peer-checked:text-white peer-checked:ring-rose-600',
};

interface PortionFieldsProps {
    type: ProgressType;
    value: PortionData;
    onChange: (value: PortionData) => void;
    /** Validation errors of the whole form; this portion reads the ones prefixed with its type. */
    errors: Record<string, string | undefined>;
    /** Show the grade and mistakes inputs (teacher side). */
    graded?: boolean;
    /** Emphasize the grade and mistakes (the range was entered by the student). */
    highlightGrading?: boolean;
}

export function PortionFields({ type, value, onChange, errors, graded = false, highlightGrading = false }: PortionFieldsProps) {
    const { t, locale } = useTrans();
    const labels = useLabels();
    const memorization = type === 'memorization';
    const count = countAyahs(value.from_surah, value.from_ayah, value.to_surah, value.to_ayah);
    const error = (field: string) => errors[`${type}.${field}`];
    const set = (changes: Partial<PortionData>) => onChange({ ...value, ...changes });
    const numberValue = (input: string) => (input === '' ? null : Math.max(1, Number.parseInt(input, 10) || 1));

    const setFromSurah = (surah: number) => {
        const resetEnd = !value.to_surah || value.to_surah < surah;

        set({
            from_surah: surah,
            from_ayah: value.from_ayah && value.from_ayah <= ayahCount(surah) ? value.from_ayah : 1,
            to_surah: resetEnd ? surah : value.to_surah,
            to_ayah: resetEnd ? ayahCount(surah) : value.to_ayah,
        });
    };

    const wholeSurah = () => {
        if (value.from_surah) {
            set({ from_ayah: 1, to_surah: value.from_surah, to_ayah: ayahCount(value.from_surah) });
        }
    };

    return (
        <div
            className={cn(
                'space-y-4 rounded-2xl border p-4',
                memorization ? 'border-gold-200 dark:border-gold-500/20' : 'border-sky-200 dark:border-sky-500/20',
            )}
        >
            <div className="flex items-center gap-2">
                <span
                    className={cn(
                        'flex size-8 items-center justify-center rounded-xl',
                        memorization ? 'bg-gold-50 text-gold-600 dark:bg-gold-500/10' : 'bg-sky-50 text-sky-600 dark:bg-sky-500/10',
                    )}
                >
                    {memorization ? <BookOpen className="size-4" /> : <Repeat className="size-4" />}
                </span>
                <h3 className="font-bold text-ink">{labels.progressType[type]}</h3>
                {count && <span className="ms-auto text-sm font-semibold text-primary-700 dark:text-primary-300">{t(':count ayahs', { count })}</span>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <p className="text-sm font-medium text-ink">{t('From')}</p>
                    <SurahSelect value={value.from_surah} onChange={setFromSurah} invalid={!!error('from_surah')} />
                    <Input
                        type="number"
                        min={1}
                        inputMode="numeric"
                        placeholder={t('Ayah')}
                        value={value.from_ayah ?? ''}
                        onChange={(event) => set({ from_ayah: numberValue(event.target.value) })}
                        aria-invalid={!!error('from_ayah')}
                    />
                    {(error('from_surah') || error('from_ayah')) && (
                        <p className="text-xs font-medium text-rose-600">{error('from_surah') ?? error('from_ayah')}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <p className="text-sm font-medium text-ink">{t('To')}</p>
                    <SurahSelect value={value.to_surah} onChange={(surah) => set({ to_surah: surah })} invalid={!!error('to_surah')} />
                    <Input
                        type="number"
                        min={1}
                        inputMode="numeric"
                        placeholder={t('Ayah')}
                        value={value.to_ayah ?? ''}
                        onChange={(event) => set({ to_ayah: numberValue(event.target.value) })}
                        aria-invalid={!!error('to_ayah')}
                    />
                    {(error('to_surah') || error('to_ayah')) && <p className="text-xs font-medium text-rose-600">{error('to_surah') ?? error('to_ayah')}</p>}
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-muted px-3 py-2.5">
                <div className="text-sm">
                    {count ? (
                        <span className="font-quran text-base text-ink">{rangeLabel(value as QuranRange, locale)}</span>
                    ) : (
                        <span className="text-muted">{t('Choose the start and end of the portion.')}</span>
                    )}
                </div>
                <Button variant="ghost" size="xs" onClick={wholeSurah} disabled={!value.from_surah}>
                    <Sparkles />
                    {t('Whole surah')}
                </Button>
            </div>

            {graded && (
                <div className={cn('grid gap-4 sm:grid-cols-[1fr_auto]', highlightGrading && 'rounded-xl bg-gold-50/70 p-3 ring-1 ring-gold-200 dark:bg-gold-500/5 dark:ring-gold-500/20')}>
                    <Field label={t('Grade')} error={error('grade')}>
                        <div className="flex flex-wrap gap-2">
                            {grades.map((grade) => (
                                <label key={grade} className="cursor-pointer">
                                    <input
                                        type="radio"
                                        name={`${type}-grade`}
                                        className="peer sr-only"
                                        checked={value.grade === grade}
                                        onChange={() => set({ grade })}
                                    />
                                    <span
                                        className={cn(
                                            'inline-flex rounded-xl bg-surface px-3 py-1.5 text-sm font-semibold text-ink ring-1 ring-line transition hover:ring-line-strong',
                                            gradeChip[gradeTone[grade]],
                                        )}
                                    >
                                        {labels.grade[grade]}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </Field>
                    <Field label={t('Mistakes')} error={error('mistakes')}>
                        <div className="flex items-center gap-2">
                            <Button variant="secondary" size="icon" onClick={() => set({ mistakes: Math.max(0, (value.mistakes ?? 0) - 1) })}>
                                <Minus />
                            </Button>
                            <Input
                                type="number"
                                min={0}
                                className="w-16 text-center"
                                value={value.mistakes ?? 0}
                                onChange={(event) => set({ mistakes: Math.max(0, Number.parseInt(event.target.value, 10) || 0) })}
                            />
                            <Button variant="secondary" size="icon" onClick={() => set({ mistakes: (value.mistakes ?? 0) + 1 })}>
                                <Plus />
                            </Button>
                        </div>
                    </Field>
                </div>
            )}
        </div>
    );
}
