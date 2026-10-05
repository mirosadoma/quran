import { ArrowRight, BookmarkCheck, BookmarkPlus, BookOpenText, Copy, Headphones, Highlighter, Trash, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ReciterList } from '@/components/mushaf/player';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/form';
import { useTrans } from '@/lib/i18n';
import { highlightClasses, highlightColors } from '@/lib/mushaf';
import { arabicDigits, surahName } from '@/lib/quran';
import { cn } from '@/lib/utils';
import type { HighlightColor, MushafAyah, MushafHighlightItem, ReciterItem } from '@/types';

export type ListenScope = 'ayah' | 'page' | 'surah';

export interface AyahMenuTarget {
    ayah: MushafAyah;
    x: number;
    y: number;
}

interface AyahMenuProps {
    target: AyahMenuTarget | null;
    reciters: ReciterItem[];
    reciterId: number | null;
    highlight?: MushafHighlightItem;
    bookmarked: boolean;
    onClose: () => void;
    onTafsir: (ayah: MushafAyah) => void;
    onListen: (ayah: MushafAyah, reciter: ReciterItem, scope: ListenScope) => void;
    onHighlight: (ayah: MushafAyah, color: HighlightColor | null, note: string | null) => void;
    onBookmark: (ayah: MushafAyah) => void;
}

type View = 'main' | 'listen' | 'mark';

/**
 * Actions on the ayah the reader tapped: tafsir, recitation, color mark, bookmark, copy.
 */
export function AyahMenu({ target, reciters, reciterId, highlight, bookmarked, onClose, onTafsir, onListen, onHighlight, onBookmark }: AyahMenuProps) {
    const { t } = useTrans();
    const panel = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<View>('main');
    const [scope, setScope] = useState<ListenScope>('ayah');
    const [note, setNote] = useState('');
    const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
    const ayah = target?.ayah;

    useEffect(() => {
        setView('main');
        setNote(highlight?.note ?? '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ayah?.id]);

    // Next to the tapped ayah on large screens (a bottom sheet on phones).
    useLayoutEffect(() => {
        const element = panel.current;

        if (!target || !element || window.innerWidth < 640) {
            setPosition(null);

            return;
        }

        const { width, height } = element.getBoundingClientRect();
        const margin = 12;
        const left = Math.min(Math.max(margin, target.x - width / 2), window.innerWidth - width - margin);
        const below = target.y + 18;
        const top = below + height + margin <= window.innerHeight ? below : Math.max(margin, target.y - height - 18);

        setPosition({ left, top });
    }, [target, view]);

    useEffect(() => {
        if (!target) {
            return;
        }

        const onPointerDown = (event: PointerEvent) => {
            if (panel.current && !panel.current.contains(event.target as Node)) {
                onClose();
            }
        };
        const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose();

        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [target, onClose]);

    if (!target || !ayah) {
        return null;
    }

    const reference = `${t('Surah')} ${surahName(ayah.surah, 'ar')} · ${t('Ayah')} ${arabicDigits(ayah.ayah)}`;

    const copy = () => {
        void navigator.clipboard
            .writeText(`${ayah.text}\n[${t('Surah')} ${surahName(ayah.surah, 'ar')}: ${ayah.ayah}]`)
            .then(() => toast.success(t('Ayah copied')));
        onClose();
    };

    return (
        <div
            ref={panel}
            role="dialog"
            aria-label={reference}
            className={cn(
                'fixed z-50 animate-slide-up overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl',
                'max-sm:inset-x-3 max-sm:bottom-3 sm:w-80',
                !position && 'sm:invisible',
            )}
            style={position ? { left: position.left, top: position.top } : undefined}
        >
            <div className="flex items-center gap-2 border-b border-line bg-surface-muted/60 px-4 py-2.5">
                {view !== 'main' && (
                    <button type="button" onClick={() => setView('main')} className="text-muted hover:text-ink" aria-label={t('Back')}>
                        <ArrowRight className="size-4 ltr:rotate-180" />
                    </button>
                )}
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{reference}</p>
                <button type="button" onClick={onClose} className="text-muted hover:text-ink" aria-label={t('Close')}>
                    <X className="size-4" />
                </button>
            </div>

            {view === 'main' && (
                <div className="space-y-3 p-3">
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => onTafsir(ayah)}
                            className="flex flex-col items-center gap-1.5 rounded-2xl bg-gold-50 px-3 py-3.5 text-sm font-semibold text-gold-800 transition hover:bg-gold-100 dark:bg-gold-500/10 dark:text-gold-200"
                        >
                            <BookOpenText className="size-5" />
                            {t('Tafsir')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setView('listen')}
                            className="flex flex-col items-center gap-1.5 rounded-2xl bg-primary-50 px-3 py-3.5 text-sm font-semibold text-primary-800 transition hover:bg-primary-100 dark:bg-primary-500/10 dark:text-primary-200"
                        >
                            <Headphones className="size-5" />
                            {t('Listen to the recitation')}
                        </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                        <Button variant="ghost" size="sm" className="flex-col gap-1 py-2 text-xs" onClick={() => setView('mark')}>
                            <Highlighter className={cn(highlight && 'text-gold-600')} />
                            {highlight ? t('Edit mark') : t('Mark')}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="flex-col gap-1 py-2 text-xs"
                            onClick={() => {
                                onBookmark(ayah);
                                onClose();
                            }}
                        >
                            {bookmarked ? <BookmarkCheck className="text-primary-600" /> : <BookmarkPlus />}
                            {bookmarked ? t('Bookmarked') : t('Bookmark')}
                        </Button>
                        <Button variant="ghost" size="sm" className="flex-col gap-1 py-2 text-xs" onClick={copy}>
                            <Copy />
                            {t('Copy')}
                        </Button>
                    </div>
                </div>
            )}

            {view === 'listen' && (
                <div className="space-y-3 p-3">
                    <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-muted p-1 text-xs font-semibold">
                        {(
                            [
                                ['ayah', t('This ayah')],
                                ['page', t('To the end of the page')],
                                ['surah', t('To the end of the surah')],
                            ] as const
                        ).map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setScope(value)}
                                className={cn('rounded-lg px-2 py-1.5 transition', scope === value ? 'bg-surface text-ink shadow-sm' : 'text-muted')}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <p className="px-1 text-xs text-muted">{t('Choose the reciter to start')}</p>
                    <ReciterList
                        reciters={reciters}
                        value={reciterId}
                        onChange={(reciter) => {
                            onListen(ayah, reciter, scope);
                            onClose();
                        }}
                    />
                </div>
            )}

            {view === 'mark' && (
                <div className="space-y-3 p-3">
                    <p className="text-xs text-muted">{t('Mark the ayah with a color to come back to it (only you see your marks).')}</p>
                    <div className="flex items-center justify-center gap-2.5">
                        {highlightColors.map((color) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => {
                                    onHighlight(ayah, color, note.trim() || null);
                                    onClose();
                                }}
                                className={cn(
                                    'size-8 rounded-full ring-offset-2 ring-offset-surface transition hover:scale-110',
                                    highlightClasses[color].swatch,
                                    highlight?.color === color && 'ring-2 ring-ink',
                                )}
                                aria-label={color}
                            />
                        ))}
                    </div>
                    <Textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t('A note for yourself (optional)')} maxLength={500} />
                    {highlight && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-rose-600"
                            onClick={() => {
                                onHighlight(ayah, null, null);
                                onClose();
                            }}
                        >
                            <Trash />
                            {t('Remove the mark')}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
