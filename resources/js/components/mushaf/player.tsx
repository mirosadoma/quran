import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Check, Headphones, ListOrdered, LoaderCircle, Pause, Play, Repeat, Repeat1, SkipBack, SkipForward, Square, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { SurahSelect } from '@/components/progress/surah-select';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/form';
import { Modal } from '@/components/ui/modal';
import { type Recitation, type RecitationOptions } from '@/hooks/use-recitation';
import { useTrans } from '@/lib/i18n';
import { arabicDigits, ayahCount, countAyahs, surahName } from '@/lib/quran';
import { cn } from '@/lib/utils';
import type { ReciterItem } from '@/types';

const repeatChoices = [1, 2, 3, 5, 7, 10, 20];
const rateChoices = [0.75, 1, 1.25, 1.5];

interface ReciterListProps {
    reciters: ReciterItem[];
    value: number | null;
    onChange: (reciter: ReciterItem) => void;
}

/**
 * Sheikhs to choose from.
 */
export function ReciterList({ reciters, value, onChange }: ReciterListProps) {
    return (
        <ul className="space-y-1">
            {reciters.map((reciter) => (
                <li key={reciter.id}>
                    <button
                        type="button"
                        onClick={() => onChange(reciter)}
                        className={cn(
                            'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-start transition hover:bg-surface-muted',
                            value === reciter.id && 'bg-primary-50 ring-1 ring-primary-200 dark:bg-primary-500/10 dark:ring-primary-500/30',
                        )}
                    >
                        <Avatar name={reciter.name} size="sm" />
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-ink">{reciter.name}</span>
                            {reciter.description && <span className="block truncate text-xs text-muted">{reciter.description}</span>}
                        </span>
                        {value === reciter.id && <Check className="size-4 text-primary-600" />}
                    </button>
                </li>
            ))}
        </ul>
    );
}

interface ListenMenuProps {
    reciters: ReciterItem[];
    reciter: ReciterItem | null;
    onReciter: (reciter: ReciterItem) => void;
    onPlayPage: () => void;
    onPlaySurah: () => void;
    onPlayRange: () => void;
    surahLabel: string;
}

/**
 * Toolbar button: choose the sheikh and what to listen to.
 */
export function ListenMenu({ reciters, reciter, onReciter, onPlayPage, onPlaySurah, onPlayRange, surahLabel }: ListenMenuProps) {
    const { t } = useTrans();

    return (
        <Popover className="relative">
            <PopoverButton as={Button} size="sm">
                <Headphones />
                <span className="hidden sm:inline">{t('Listen')}</span>
            </PopoverButton>
            <PopoverPanel
                anchor={{ to: 'bottom end', gap: 8 }}
                transition
                className="z-50 w-80 rounded-2xl border border-line bg-surface p-3 shadow-2xl transition duration-150 data-closed:scale-95 data-closed:opacity-0"
            >
                {({ close }) => (
                    <div className="space-y-3">
                        <p className="px-1 text-xs font-semibold text-muted">{t('Choose the reciter')}</p>
                        <ReciterList reciters={reciters} value={reciter?.id ?? null} onChange={onReciter} />
                        <div className="grid gap-2 border-t border-line pt-3">
                            <Button
                                variant="secondary"
                                size="sm"
                                disabled={!reciter}
                                onClick={() => {
                                    onPlayPage();
                                    close();
                                }}
                            >
                                <Play />
                                {t('This page')}
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                disabled={!reciter}
                                onClick={() => {
                                    onPlaySurah();
                                    close();
                                }}
                            >
                                <Play />
                                {t('The whole surah (:name)', { name: surahLabel })}
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                disabled={!reciter}
                                onClick={() => {
                                    onPlayRange();
                                    close();
                                }}
                            >
                                <ListOrdered />
                                {t('A range to memorize…')}
                            </Button>
                        </div>
                    </div>
                )}
            </PopoverPanel>
        </Popover>
    );
}

interface PlayerBarProps {
    recitation: Recitation;
    reciters: ReciterItem[];
    reciter: ReciterItem | null;
    onReciter: (reciter: ReciterItem) => void;
}

/**
 * Bottom bar while a recitation plays.
 */
export function PlayerBar({ recitation, reciters, reciter, onReciter }: PlayerBarProps) {
    const { t } = useTrans();
    const { current, options } = recitation;

    if (!recitation.active || !current) {
        return null;
    }

    const position = recitation.queue.slice(0, recitation.index + 1).filter((item) => !item.basmala).length;
    const total = recitation.queue.filter((item) => !item.basmala).length;
    const setOption = <K extends keyof RecitationOptions>(key: K, value: RecitationOptions[K]) => recitation.setOptions({ [key]: value });

    return (
        <div className="mushaf-dock fixed inset-x-0 bottom-0 z-30 animate-slide-up border-t border-line bg-surface/95 shadow-[0_-10px_30px_-15px_rgb(0_0_0/0.3)] backdrop-blur lg:start-72">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={reciter?.name ?? '?'} size="sm" />
                    <div className="min-w-0">
                        <Select
                            value={reciter?.id ?? ''}
                            onChange={(event) => {
                                const chosen = reciters.find((item) => item.id === Number(event.target.value));

                                if (chosen) {
                                    onReciter(chosen);
                                }
                            }}
                            className="h-auto border-0 bg-transparent py-0 ps-0 text-sm font-semibold shadow-none focus:ring-0"
                            aria-label={t('Reciter')}
                        >
                            {reciters.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                </option>
                            ))}
                        </Select>
                        <p className="truncate text-xs text-muted">
                            {current.basmala
                                ? `${t('Surah')} ${surahName(current.surah, 'ar')} · ${t('Basmala')}`
                                : `${t('Surah')} ${surahName(current.surah, 'ar')} · ${t('Ayah')} ${arabicDigits(current.ayah)}`}
                            <span className="ms-2 tabular-nums">
                                ({arabicDigits(position)} / {arabicDigits(total)})
                            </span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={recitation.previous} aria-label={t('Previous ayah')}>
                        <SkipBack className="rtl:hidden" />
                        <SkipForward className="ltr:hidden" />
                    </Button>
                    <Button size="icon" className="size-11 rounded-full" onClick={recitation.toggle} aria-label={recitation.playing ? t('Pause') : t('Play')}>
                        {recitation.loading ? <LoaderCircle className="animate-spin" /> : recitation.playing ? <Pause /> : <Play />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={recitation.next} aria-label={t('Next ayah')}>
                        <SkipForward className="rtl:hidden" />
                        <SkipBack className="ltr:hidden" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={recitation.stop} aria-label={t('Stop')}>
                        <Square />
                    </Button>
                </div>

                <div className="flex items-center gap-2 text-xs">
                    <label className="flex items-center gap-1 text-muted" title={t('Repeat each ayah')}>
                        <Repeat1 className="size-4" />
                        <select
                            value={options.repeatAyah}
                            onChange={(event) => setOption('repeatAyah', Number(event.target.value))}
                            className="rounded-lg border border-line bg-surface px-1.5 py-1 text-ink"
                        >
                            {repeatChoices.map((value) => (
                                <option key={value} value={value}>
                                    ×{value}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="flex items-center gap-1 text-muted" title={t('Repeat the whole selection')}>
                        <Repeat className="size-4" />
                        <select
                            value={options.repeatAll}
                            onChange={(event) => setOption('repeatAll', Number(event.target.value))}
                            className="rounded-lg border border-line bg-surface px-1.5 py-1 text-ink"
                        >
                            {repeatChoices.map((value) => (
                                <option key={value} value={value}>
                                    ×{value}
                                </option>
                            ))}
                        </select>
                    </label>
                    <select
                        value={options.rate}
                        onChange={(event) => setOption('rate', Number(event.target.value))}
                        className="rounded-lg border border-line bg-surface px-1.5 py-1 text-ink"
                        aria-label={t('Speed')}
                    >
                        {rateChoices.map((value) => (
                            <option key={value} value={value}>
                                {value}x
                            </option>
                        ))}
                    </select>
                </div>

                {recitation.failed && (
                    <p className="flex w-full items-center gap-1.5 text-xs font-medium text-rose-600">
                        <TriangleAlert className="size-3.5" />
                        {t('The audio could not be loaded. Check the internet connection, then press play.')}
                    </p>
                )}
            </div>
        </div>
    );
}

interface RangeDialogProps {
    open: boolean;
    onClose: () => void;
    start: { surah: number; ayah: number };
    onPlay: (range: { fromSurah: number; fromAyah: number; toSurah: number; toAyah: number }, options: Pick<RecitationOptions, 'repeatAyah' | 'repeatAll'>) => void;
}

/**
 * Listen to a range of ayahs, repeated to memorize it.
 */
export function RangeDialog({ open, onClose, start, onPlay }: RangeDialogProps) {
    const { t } = useTrans();
    const [range, setRange] = useState({ fromSurah: start.surah, fromAyah: start.ayah, toSurah: start.surah, toAyah: Math.min(ayahCount(start.surah), start.ayah + 4) });
    const [repeat, setRepeat] = useState({ repeatAyah: 3, repeatAll: 1 });
    const count = countAyahs(range.fromSurah, range.fromAyah, range.toSurah, range.toAyah);
    const numberValue = (value: string) => Math.max(1, Number.parseInt(value, 10) || 1);

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={t('Listen to a range')}
            description={t('Choose the ayahs to memorize and how many times to repeat them.')}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        {t('Cancel')}
                    </Button>
                    <Button
                        disabled={!count}
                        onClick={() => {
                            onPlay(range, repeat);
                            onClose();
                        }}
                    >
                        <Play />
                        {t('Listen')}
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-ink">{t('From')}</p>
                        <SurahSelect
                            value={range.fromSurah}
                            onChange={(surah) => setRange((current) => ({ ...current, fromSurah: surah, fromAyah: 1, toSurah: Math.max(surah, current.toSurah) }))}
                        />
                        <Input type="number" min={1} value={range.fromAyah} onChange={(event) => setRange((current) => ({ ...current, fromAyah: numberValue(event.target.value) }))} />
                    </div>
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-ink">{t('To')}</p>
                        <SurahSelect
                            value={range.toSurah}
                            onChange={(surah) => setRange((current) => ({ ...current, toSurah: surah, toAyah: ayahCount(surah) }))}
                        />
                        <Input type="number" min={1} value={range.toAyah} onChange={(event) => setRange((current) => ({ ...current, toAyah: numberValue(event.target.value) }))} />
                    </div>
                </div>
                <p className={cn('rounded-xl px-3 py-2 text-sm', count ? 'bg-surface-muted text-ink' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300')}>
                    {count ? t(':count ayahs', { count }) : t('Choose the start and end of the portion.')}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t('Repeat each ayah')}>
                        <Select value={repeat.repeatAyah} onChange={(event) => setRepeat((current) => ({ ...current, repeatAyah: Number(event.target.value) }))}>
                            {repeatChoices.map((value) => (
                                <option key={value} value={value}>
                                    {t(':count times', { count: value })}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label={t('Repeat the whole range')}>
                        <Select value={repeat.repeatAll} onChange={(event) => setRepeat((current) => ({ ...current, repeatAll: Number(event.target.value) }))}>
                            {repeatChoices.map((value) => (
                                <option key={value} value={value}>
                                    {t(':count times', { count: value })}
                                </option>
                            ))}
                        </Select>
                    </Field>
                </div>
            </div>
        </Modal>
    );
}
