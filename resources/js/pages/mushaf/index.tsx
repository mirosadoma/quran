import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Bookmark, BookmarkCheck, BookOpen, ChevronLeft, ChevronRight, Columns2, Minus, PanelRight, Plus, RectangleVertical, Settings2, Sparkles } from 'lucide-react';
import { type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AyahMenu, type AyahMenuTarget, type ListenScope } from '@/components/mushaf/ayah-menu';
import { Book, type BookHandle } from '@/components/mushaf/book';
import { IndexPanel, type IndexTab } from '@/components/mushaf/index-panel';
import { MushafPage, type PageSide } from '@/components/mushaf/mushaf-page';
import { ListenMenu, PlayerBar, RangeDialog } from '@/components/mushaf/player';
import { TafsirDialog } from '@/components/mushaf/tafsir-dialog';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ayahsQueue, rangeQueue, surahQueue, useRecitation } from '@/hooks/use-recitation';
import AppLayout from '@/layouts/app-layout';
import { http } from '@/lib/http';
import { useTrans } from '@/lib/i18n';
import { cachedPage, clampPage, loadPage, pageOfAyah, readPreference, spreadOf, TOTAL_PAGES, useMushafPages, writePreference } from '@/lib/mushaf';
import { arabicDigits, surahName } from '@/lib/quran';
import { cn } from '@/lib/utils';
import type { HighlightColor, MushafAyah, MushafBookmarkItem, MushafHighlightItem, MushafIndex, ReciterItem } from '@/types';

interface MushafProps {
    initialPage: number;
    focusAyahId: number | null;
    ready: boolean;
    index: MushafIndex;
    reciters: ReciterItem[];
    tafsirs: { value: string; label: string }[];
    bookmarks: MushafBookmarkItem[];
    highlights: MushafHighlightItem[];
}

type LayoutMode = 'auto' | 'single' | 'double';

const zoomLevels = [0.9, 1, 1.15, 1.3, 1.5];

export default function Mushaf(props: MushafProps) {
    const { index, reciters, tafsirs } = props;
    const { t } = useTrans();
    const stageRef = useRef<HTMLDivElement>(null);
    const bookRef = useRef<BookHandle>(null);
    const [stage, setStage] = useState({ width: 0, height: 800 });
    const [layout, setLayout] = useState<LayoutMode>(() => readPreference('layout', 'auto'));
    const [zoom, setZoom] = useState<number>(() => readPreference('zoom', 1));
    const [page, setPage] = useState(() => clampPage(props.initialPage));
    const [flash, setFlash] = useState<number | null>(props.focusAyahId);
    const [menu, setMenu] = useState<AyahMenuTarget | null>(null);
    const [tafsirAyah, setTafsirAyah] = useState<number | null>(null);
    const [indexOpen, setIndexOpen] = useState(false);
    const [indexTab, setIndexTab] = useState<IndexTab>('surahs');
    const [rangeOpen, setRangeOpen] = useState(false);
    const [bookmarks, setBookmarks] = useState(props.bookmarks);
    const [highlights, setHighlights] = useState(props.highlights);
    const [reciterId, setReciterId] = useState<number | null>(() => readPreference('reciter', reciters[0]?.id ?? null));
    const [slider, setSlider] = useState<number | null>(null);

    const reciter = reciters.find((item) => item.id === reciterId) ?? reciters[0] ?? null;
    const recitation = useRecitation(reciter);
    const playingId = recitation.current && !recitation.current.basmala ? recitation.current.id : null;

    // Two facing pages on wide screens, one page on phones.
    const double = layout === 'double' ? stage.width >= 720 : layout === 'single' ? false : stage.width >= 1000;
    const spread = spreadOf(page);
    const visible = useMemo(() => (double ? [spread.right, spread.left].filter((value): value is number => value !== null) : [page]), [double, page, spread.right, spread.left]);
    const current = double ? spread.right : page;

    // Pages keep the proportions of a printed mushaf; on phones they use the height of the screen
    // so the text, fitted to the page, stays readable.
    const phone = stage.width < 640;
    const ratio = 1.47;
    const available = Math.max(460, stage.height - (recitation.active ? 300 : 220));
    const maxWidth = double ? (stage.width - 120) / 2 : Math.min(stage.width - (phone ? 0 : 120), 680);
    const pageWidth = Math.max(260, Math.floor(Math.min(maxWidth, phone ? maxWidth : available / ratio)));
    const naturalHeight = phone ? Math.min(Math.max(pageWidth * 1.55, available), pageWidth * 2.1) : pageWidth * ratio;
    const pageHeight = Math.floor(naturalHeight * zoom);

    useEffect(() => {
        const element = stageRef.current;

        if (!element) {
            return;
        }

        const measure = () => setStage({ width: element.clientWidth, height: window.innerHeight });
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        window.addEventListener('resize', measure);
        measure();

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, []);

    // Download the visible pages and the next ones before they are needed.
    const around = useMemo(() => {
        const step = double ? 2 : 1;
        const first = visible[0];

        return [...visible, first - step, first - step + 1, first + step, first + step + 1, first + 2 * step].filter((value) => value >= 1 && value <= TOTAL_PAGES);
    }, [visible, double]);

    useMushafPages(around);

    const goTo = useCallback((target: number, focusAyahId?: number | null) => {
        const destination = clampPage(target);
        setMenu(null);

        if (focusAyahId) {
            setFlash(focusAyahId);
        }

        const { right, left } = spreadOf(destination);

        void Promise.all([loadPage(destination), loadPage(right), left ? loadPage(left) : null].map((request) => request?.catch(() => undefined))).finally(() =>
            bookRef.current?.turnTo(destination),
        );
    }, []);

    const commitSlider = () => {
        if (slider !== null) {
            goTo(slider);
            setSlider(null);
        }
    };

    const next = useCallback(() => current + (double ? 2 : 1) <= TOTAL_PAGES && goTo(current + (double ? 2 : 1)), [current, double, goTo]);
    const previous = useCallback(() => current > 1 && goTo(current - (double ? 2 : 1)), [current, double, goTo]);

    useEffect(() => {
        if (flash === null) {
            return;
        }

        const timer = window.setTimeout(() => setFlash(null), 3500);

        return () => window.clearTimeout(timer);
    }, [flash]);

    // Remember where the reader stopped.
    useEffect(() => {
        if (!props.ready) {
            return;
        }

        const timer = window.setTimeout(() => void http.put(route('mushaf.position'), { page: current }).catch(() => undefined), 1500);

        return () => window.clearTimeout(timer);
    }, [current, props.ready]);

    // Keyboard: in an Arabic book the next page is on the left.
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const element = event.target as HTMLElement;

            if (indexOpen || tafsirAyah !== null || rangeOpen || element.closest('input, textarea, select, [contenteditable="true"]')) {
                return;
            }

            if (event.key === 'ArrowLeft') {
                next();
            } else if (event.key === 'ArrowRight') {
                previous();
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [next, previous, indexOpen, tafsirAyah, rangeOpen]);

    // Follow the recitation from page to page.
    useEffect(() => {
        if (!recitation.current || !recitation.playing) {
            return;
        }

        const target = pageOfAyah(index.page_starts, recitation.current.id);

        if (!visible.includes(target)) {
            goTo(target);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recitation.current?.id, recitation.playing]);

    const highlightMap = useMemo(() => new Map(highlights.map((highlight) => [highlight.ayah_id, highlight])), [highlights]);
    const pageBookmark = bookmarks.find((bookmark) => bookmark.page === current && bookmark.ayah_id === null);

    const openMenu = useCallback((ayah: MushafAyah, event: MouseEvent<HTMLElement>) => {
        setMenu({ ayah, x: event.clientX, y: event.clientY });
    }, []);

    const closeMenu = useCallback(() => setMenu(null), []);

    const renderPage = useCallback(
        (number: number, side: PageSide) => (
            <MushafPage
                number={number}
                ayahs={cachedPage(number)}
                width={pageWidth}
                height={pageHeight}
                side={side}
                highlights={highlightMap}
                selectedAyahId={menu?.ayah.id ?? null}
                playingAyahId={playingId}
                flashAyahId={flash}
                onAyahClick={openMenu}
            />
        ),
        [pageWidth, pageHeight, highlightMap, menu?.ayah.id, playingId, flash, openMenu],
    );

    const chooseReciter = (chosen: ReciterItem) => {
        setReciterId(chosen.id);
        writePreference('reciter', chosen.id);
    };

    const visibleAyahs = () => visible.flatMap((number) => cachedPage(number) ?? []);
    const firstAyah = cachedPage(current)?.[0];
    const currentSurah = firstAyah?.surah ?? 1;

    const playPage = () => recitation.play(ayahsQueue(visibleAyahs()), t('Page :page', { page: current }));
    const playSurah = () => recitation.play(surahQueue(currentSurah), `${t('Surah')} ${surahName(currentSurah, 'ar')}`);

    const listen = (ayah: MushafAyah, chosen: ReciterItem, scope: ListenScope) => {
        chooseReciter(chosen);

        if (scope === 'surah') {
            recitation.play(surahQueue(ayah.surah, ayah.ayah), `${t('Surah')} ${surahName(ayah.surah, 'ar')}`);
        } else if (scope === 'page') {
            recitation.play(ayahsQueue(visibleAyahs().filter((item) => item.id >= ayah.id)), t('Page :page', { page: current }));
        } else {
            recitation.play(rangeQueue(ayah.surah, ayah.ayah, ayah.surah, ayah.ayah), `${t('Surah')} ${surahName(ayah.surah, 'ar')} ${ayah.ayah}`);
        }
    };

    const toggleBookmark = async (target: { page: number; ayah_id: number | null }) => {
        const existing = bookmarks.find((bookmark) => bookmark.page === target.page && bookmark.ayah_id === target.ayah_id);

        try {
            if (existing) {
                setBookmarks((items) => items.filter((item) => item.id !== existing.id));
                await http.delete(route('mushaf.bookmarks.destroy', existing.id));
                toast.success(t('Bookmark removed'));
            } else {
                const { data } = await http.post<{ bookmark: MushafBookmarkItem }>(route('mushaf.bookmarks.store'), target);
                setBookmarks((items) => [data.bookmark, ...items.filter((item) => item.id !== data.bookmark.id)]);
                toast.success(t('Bookmark saved'));
            }
        } catch {
            setBookmarks(props.bookmarks);
            toast.error(t('Something went wrong, please try again.'));
        }
    };

    const removeBookmark = (bookmark: MushafBookmarkItem) => void toggleBookmark({ page: bookmark.page, ayah_id: bookmark.ayah_id });

    const setHighlight = async (ayah: Pick<MushafAyah, 'id' | 'surah' | 'ayah'>, color: HighlightColor | null, note: string | null) => {
        const previous = highlights;

        try {
            if (color === null) {
                setHighlights((items) => items.filter((item) => item.ayah_id !== ayah.id));
                await http.delete(route('mushaf.highlights.destroy', ayah.id));
            } else {
                const { data } = await http.put<{ highlight: MushafHighlightItem }>(route('mushaf.highlights.update', ayah.id), { color, note });
                setHighlights((items) => [data.highlight, ...items.filter((item) => item.ayah_id !== ayah.id)]);
            }
        } catch {
            setHighlights(previous);
            toast.error(t('Something went wrong, please try again.'));
        }
    };

    if (!props.ready) {
        return (
            <AppLayout title={t('The mushaf')}>
                <EmptyState icon={BookOpen} title={t('The Quran text is not installed yet')} description={t('Run: php artisan db:seed --class=AyahSeeder')} />
            </AppLayout>
        );
    }

    return (
        <AppLayout title={t('The mushaf')} hideHeader wide>
            <div className="sticky top-16 z-20 -mx-4 mb-5 border-b border-line bg-canvas/90 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setIndexOpen(true)}>
                        <PanelRight />
                        <span className="hidden sm:inline">{t('Index')}</span>
                    </Button>

                    <div className="min-w-0 flex-1 text-center">
                        <p className="truncate font-quran text-lg leading-tight font-bold text-ink">
                            {firstAyah ? `${t('Surah')} ${surahName(firstAyah.surah, 'ar')}` : t('The mushaf')}
                        </p>
                        <p className="text-xs text-muted">
                            {firstAyah && `${t('Juz')} ${arabicDigits(firstAyah.juz)} · ${t('Hizb :number', { number: arabicDigits(Math.ceil(firstAyah.hizb_quarter / 4)) })} · `}
                            {double && spread.left ? t('Pages :from - :to', { from: arabicDigits(spread.right), to: arabicDigits(spread.left) }) : t('Page :page', { page: arabicDigits(current) })}
                        </p>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void toggleBookmark({ page: current, ayah_id: null })}
                        aria-label={pageBookmark ? t('Remove the bookmark') : t('Bookmark this page')}
                        title={pageBookmark ? t('Remove the bookmark') : t('Bookmark this page')}
                    >
                        {pageBookmark ? <BookmarkCheck className="text-primary-600" /> : <Bookmark />}
                    </Button>

                    <ListenMenu
                        reciters={reciters}
                        reciter={reciter}
                        onReciter={chooseReciter}
                        onPlayPage={playPage}
                        onPlaySurah={playSurah}
                        onPlayRange={() => setRangeOpen(true)}
                        surahLabel={surahName(currentSurah, 'ar')}
                    />

                    <Popover className="relative">
                        <PopoverButton as={Button} variant="ghost" size="icon" aria-label={t('Reading settings')}>
                            <Settings2 />
                        </PopoverButton>
                        <PopoverPanel
                            anchor={{ to: 'bottom end', gap: 8 }}
                            transition
                            className="z-50 w-72 space-y-4 rounded-2xl border border-line bg-surface p-4 shadow-2xl transition duration-150 data-closed:scale-95 data-closed:opacity-0"
                        >
                            <div>
                                <p className="mb-2 text-xs font-semibold text-muted">{t('Pages')}</p>
                                <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-muted p-1 text-xs font-semibold">
                                    {(
                                        [
                                            ['auto', t('Automatic'), Sparkles],
                                            ['single', t('One page'), RectangleVertical],
                                            ['double', t('Two pages'), Columns2],
                                        ] as const
                                    ).map(([value, label, Icon]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => {
                                                setLayout(value);
                                                writePreference('layout', value);
                                            }}
                                            className={cn('flex flex-col items-center gap-1 rounded-lg px-2 py-2 transition', layout === value ? 'bg-surface text-ink shadow-sm' : 'text-muted')}
                                        >
                                            <Icon className="size-4" />
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="mb-2 text-xs font-semibold text-muted">{t('Text size')}</p>
                                <div className="flex items-center justify-between gap-2">
                                    <Button
                                        variant="secondary"
                                        size="icon-sm"
                                        disabled={zoom <= zoomLevels[0]}
                                        onClick={() => {
                                            const value = zoomLevels[Math.max(0, zoomLevels.indexOf(zoom) - 1)] ?? 1;
                                            setZoom(value);
                                            writePreference('zoom', value);
                                        }}
                                        aria-label={t('Smaller')}
                                    >
                                        <Minus />
                                    </Button>
                                    <span className="text-sm font-semibold text-ink tabular-nums">{Math.round(zoom * 100)}%</span>
                                    <Button
                                        variant="secondary"
                                        size="icon-sm"
                                        disabled={zoom >= zoomLevels[zoomLevels.length - 1]}
                                        onClick={() => {
                                            const value = zoomLevels[Math.min(zoomLevels.length - 1, zoomLevels.indexOf(zoom) + 1)] ?? 1;
                                            setZoom(value);
                                            writePreference('zoom', value);
                                        }}
                                        aria-label={t('Bigger')}
                                    >
                                        <Plus />
                                    </Button>
                                </div>
                            </div>
                        </PopoverPanel>
                    </Popover>
                </div>
            </div>

            <div ref={stageRef} className="relative" dir="rtl">
                {stage.width > 0 && (
                    <div className="flex items-center justify-center gap-4">
                        <SideButton direction="previous" disabled={current <= 1} onClick={previous} label={t('Previous page')} />
                        <Book
                            ref={bookRef}
                            page={current}
                            double={double}
                            pageWidth={pageWidth}
                            pageHeight={pageHeight}
                            renderPage={renderPage}
                            onPageChange={setPage}
                            onSwipe={(direction) => (direction === 'next' ? next() : previous())}
                        />
                        <SideButton direction="next" disabled={current + (double ? 2 : 1) > TOTAL_PAGES} onClick={next} label={t('Next page')} />
                    </div>
                )}

                <div className={cn('mx-auto mt-6 flex max-w-xl items-center gap-3', recitation.active && 'mb-28')}>
                    <Button variant="secondary" size="icon-sm" onClick={previous} disabled={current <= 1} aria-label={t('Previous page')}>
                        <ChevronRight className="ltr:rotate-180" />
                    </Button>
                    <input
                        type="range"
                        min={1}
                        max={TOTAL_PAGES}
                        value={slider ?? current}
                        onChange={(event) => setSlider(Number(event.target.value))}
                        onPointerUp={commitSlider}
                        onKeyUp={commitSlider}
                        className="flex-1 accent-primary-600"
                        aria-label={t('Page')}
                    />
                    <Button variant="secondary" size="icon-sm" onClick={next} disabled={current + (double ? 2 : 1) > TOTAL_PAGES} aria-label={t('Next page')}>
                        <ChevronLeft className="ltr:rotate-180" />
                    </Button>
                    <span className="w-24 shrink-0 text-center text-xs text-muted tabular-nums">
                        {t(':page of :total', { page: arabicDigits(slider ?? current), total: arabicDigits(TOTAL_PAGES) })}
                    </span>
                </div>
            </div>

            <AyahMenu
                target={menu}
                reciters={reciters}
                reciterId={reciter?.id ?? null}
                highlight={menu ? highlightMap.get(menu.ayah.id) : undefined}
                bookmarked={!!menu && bookmarks.some((bookmark) => bookmark.ayah_id === menu.ayah.id)}
                onClose={closeMenu}
                onTafsir={(ayah) => {
                    setMenu(null);
                    setTafsirAyah(ayah.id);
                }}
                onListen={listen}
                onHighlight={(ayah, color, note) => void setHighlight(ayah, color, note)}
                onBookmark={(ayah) => void toggleBookmark({ page: pageOfAyah(index.page_starts, ayah.id), ayah_id: ayah.id })}
            />

            <TafsirDialog ayahId={tafsirAyah} editions={tafsirs} onClose={() => setTafsirAyah(null)} />

            <IndexPanel
                open={indexOpen}
                onClose={() => setIndexOpen(false)}
                tab={indexTab}
                onTab={setIndexTab}
                index={index}
                currentPage={current}
                bookmarks={bookmarks}
                highlights={highlights}
                onGo={goTo}
                onRemoveBookmark={removeBookmark}
                onRemoveHighlight={(highlight) => void setHighlight({ id: highlight.ayah_id, surah: highlight.surah, ayah: highlight.ayah }, null, null)}
            />

            {rangeOpen && (
                <RangeDialog
                    open={rangeOpen}
                    onClose={() => setRangeOpen(false)}
                    start={{ surah: firstAyah?.surah ?? 1, ayah: firstAyah?.ayah ?? 1 }}
                    onPlay={(range, options) => {
                        recitation.setOptions(options);
                        recitation.play(
                            rangeQueue(range.fromSurah, range.fromAyah, range.toSurah, range.toAyah),
                            `${surahName(range.fromSurah, 'ar')} ${range.fromAyah} - ${surahName(range.toSurah, 'ar')} ${range.toAyah}`,
                        );
                    }}
                />
            )}

            <PlayerBar recitation={recitation} reciters={reciters} reciter={reciter} onReciter={chooseReciter} />
        </AppLayout>
    );
}

/**
 * Large arrow beside the book (the next page is on the left in an Arabic book).
 */
function SideButton({ direction, disabled, onClick, label }: { direction: 'next' | 'previous'; disabled: boolean; onClick: () => void; label: string }) {
    const Icon = direction === 'next' ? ChevronLeft : ChevronRight;

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            className={cn(
                'hidden size-12 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-sm transition hover:border-primary-300 hover:text-primary-700 disabled:opacity-30 sm:flex',
                direction === 'next' ? 'order-last' : 'order-first',
            )}
        >
            <Icon className="size-6 ltr:rotate-180" />
        </button>
    );
}
