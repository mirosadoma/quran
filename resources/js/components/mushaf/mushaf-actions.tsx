import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Bookmark, BookmarkCheck, BookOpenText, Headphones, LayoutGrid, Mic, Minimize2, PanelRight, X, type LucideIcon } from 'lucide-react';
import { useTrans } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface MushafActionsProps {
    bookmarked: boolean;
    onRecite: () => void;
    onListen: () => void;
    onTafsir: () => void;
    onIndex: () => void;
    onBookmark: () => void;
    onExit: () => void;
    className?: string;
}

/**
 * The actions on the mushaf read full screen, behind one floating icon: recite, listen, the tafsir of
 * the page, the index, the bookmark. A tap outside closes them.
 */
export function MushafActions({ bookmarked, onRecite, onListen, onTafsir, onIndex, onBookmark, onExit, className }: MushafActionsProps) {
    const { t } = useTrans();

    const actions: { label: string; icon: LucideIcon; onClick: () => void; tone: string }[] = [
        { label: t('Recite with your voice'), icon: Mic, onClick: onRecite, tone: 'bg-rose-500' },
        { label: t('Listen to the page'), icon: Headphones, onClick: onListen, tone: 'bg-primary-600' },
        { label: t('Tafsir of the page'), icon: BookOpenText, onClick: onTafsir, tone: 'bg-gold-500' },
        { label: t('Index'), icon: PanelRight, onClick: onIndex, tone: 'bg-sky-600' },
        { label: bookmarked ? t('Remove the bookmark') : t('Bookmark this page'), icon: bookmarked ? BookmarkCheck : Bookmark, onClick: onBookmark, tone: 'bg-violet-600' },
        { label: t('Exit full screen'), icon: Minimize2, onClick: onExit, tone: 'bg-slate-600' },
    ];

    return (
        <Popover className={cn('fixed bottom-6 z-40 ltr:right-6 rtl:left-6', className)}>
            {({ open }) => (
                <>
                    <PopoverPanel
                        transition
                        className="absolute bottom-full mb-3 flex w-60 origin-bottom flex-col gap-1.5 rounded-3xl border border-line bg-surface/95 p-2 shadow-2xl backdrop-blur transition duration-150 data-closed:translate-y-2 data-closed:scale-95 data-closed:opacity-0 ltr:right-0 rtl:left-0"
                    >
                        {({ close }) => (
                            <>
                                {actions.map(({ label, icon: Icon, onClick, tone }) => (
                                    <button
                                        key={label}
                                        type="button"
                                        onClick={() => {
                                            close();
                                            onClick();
                                        }}
                                        className="flex items-center gap-3 rounded-2xl px-2.5 py-2 text-start text-sm font-semibold text-ink transition hover:bg-surface-muted"
                                    >
                                        <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm', tone)}>
                                            <Icon className="size-4.5" />
                                        </span>
                                        {label}
                                    </button>
                                ))}
                            </>
                        )}
                    </PopoverPanel>
                    <PopoverButton
                        aria-label={t('Mushaf actions')}
                        title={t('Mushaf actions')}
                        className={cn(
                            'flex size-14 items-center justify-center rounded-full text-white shadow-xl ring-4 ring-white/20 transition hover:scale-105 focus:outline-none focus-visible:ring-primary-400/60',
                            open ? 'bg-slate-900 dark:bg-white dark:text-slate-900' : 'bg-primary-700 dark:bg-primary-600',
                        )}
                    >
                        {open ? <X className="size-6" /> : <LayoutGrid className="size-6" />}
                    </PopoverButton>
                </>
            )}
        </Popover>
    );
}
