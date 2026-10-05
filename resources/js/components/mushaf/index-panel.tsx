import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { Bookmark, Highlighter, Layers, ListOrdered, Search, Trash, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/form';
import { Tabs } from '@/components/ui/tabs';
import { useDebounce } from '@/hooks/use-debounce';
import { useDates } from '@/lib/dates';
import { http } from '@/lib/http';
import { useTrans } from '@/lib/i18n';
import { highlightClasses } from '@/lib/mushaf';
import { arabicDigits, normalizeArabic, surahName, surahs } from '@/lib/quran';
import { cn } from '@/lib/utils';
import type { MushafBookmarkItem, MushafHighlightItem, MushafIndex } from '@/types';

export type IndexTab = 'surahs' | 'juz' | 'bookmarks' | 'marks' | 'search';

interface SearchResult {
    id: number;
    surah: number;
    ayah: number;
    page: number;
    text: string;
}

interface IndexPanelProps {
    open: boolean;
    onClose: () => void;
    tab: IndexTab;
    onTab: (tab: IndexTab) => void;
    index: MushafIndex;
    currentPage: number;
    bookmarks: MushafBookmarkItem[];
    highlights: MushafHighlightItem[];
    onGo: (page: number, ayahId?: number | null) => void;
    onRemoveBookmark: (bookmark: MushafBookmarkItem) => void;
    onRemoveHighlight: (highlight: MushafHighlightItem) => void;
}

/**
 * Table of contents of the mushaf: surahs, ajza, bookmarks, marks and search.
 */
export function IndexPanel({ open, onClose, tab, onTab, index, currentPage, bookmarks, highlights, onGo, onRemoveBookmark, onRemoveHighlight }: IndexPanelProps) {
    const { t } = useTrans();

    const go = (page: number, ayahId?: number | null) => {
        onGo(page, ayahId);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} className="relative z-50">
            <DialogBackdrop transition className="fixed inset-0 bg-primary-950/40 backdrop-blur-sm transition duration-300 data-closed:opacity-0" />
            <div className="fixed inset-0 flex justify-start">
                <DialogPanel
                    transition
                    className="flex h-full w-full max-w-md flex-col bg-surface shadow-2xl transition duration-300 ease-out data-closed:translate-x-full ltr:data-closed:-translate-x-full"
                >
                    <div className="flex items-center justify-between border-b border-line px-5 py-4">
                        <h2 className="text-lg font-bold text-ink">{t('Mushaf index')}</h2>
                        <button type="button" onClick={onClose} className="text-muted hover:text-ink" aria-label={t('Close')}>
                            <X className="size-5" />
                        </button>
                    </div>
                    <div className="px-4 pt-3">
                        <Tabs
                            value={tab}
                            onChange={onTab}
                            items={[
                                { value: 'surahs', label: t('Surahs'), icon: ListOrdered },
                                { value: 'juz', label: t('Ajza'), icon: Layers },
                                { value: 'bookmarks', label: t('Bookmarks'), icon: Bookmark, count: bookmarks.length || undefined },
                                { value: 'marks', label: t('Marks'), icon: Highlighter, count: highlights.length || undefined },
                                { value: 'search', label: t('Search'), icon: Search },
                            ]}
                        />
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto px-2 pt-2 pb-6">
                        {tab === 'surahs' && <SurahIndex index={index} currentPage={currentPage} onGo={go} />}
                        {tab === 'juz' && <JuzIndex index={index} currentPage={currentPage} onGo={go} />}
                        {tab === 'bookmarks' && <BookmarkIndex bookmarks={bookmarks} onGo={go} onRemove={onRemoveBookmark} />}
                        {tab === 'marks' && <HighlightIndex highlights={highlights} onGo={go} onRemove={onRemoveHighlight} />}
                        {tab === 'search' && <SearchIndex onGo={go} />}
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    );
}

function SurahIndex({ index, currentPage, onGo }: { index: MushafIndex; currentPage: number; onGo: (page: number) => void }) {
    const { t } = useTrans();
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
        const needle = normalizeArabic(query.trim());

        return needle === '' ? surahs : surahs.filter((surah) => String(surah.number) === needle || normalizeArabic(surah.ar).includes(needle) || surah.en.toLowerCase().includes(needle));
    }, [query]);

    const currentSurah = useMemo(() => {
        let found = 1;

        for (const surah of surahs) {
            if ((index.surahs[surah.number] ?? 999) <= currentPage) {
                found = surah.number;
            }
        }

        return found;
    }, [index.surahs, currentPage]);

    return (
        <div>
            <div className="px-2 pb-2">
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Search for a surah')} />
            </div>
            <ul>
                {filtered.map((surah) => (
                    <li key={surah.number}>
                        <button
                            type="button"
                            onClick={() => onGo(index.surahs[surah.number] ?? 1)}
                            className={cn(
                                'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition hover:bg-surface-muted',
                                surah.number === currentSurah && 'bg-primary-50 dark:bg-primary-500/10',
                            )}
                        >
                            <span className="relative flex size-9 shrink-0 items-center justify-center">
                                <svg viewBox="0 0 48 48" className="absolute inset-0 text-gold-500/70" aria-hidden>
                                    <rect x="10" y="10" width="28" height="28" rx="4" fill="none" stroke="currentColor" strokeWidth="2" transform="rotate(45 24 24)" />
                                    <rect x="10" y="10" width="28" height="28" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
                                </svg>
                                <span className="relative text-xs font-bold text-ink tabular-nums">{surah.number}</span>
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block font-quran text-lg leading-tight text-ink">{surah.ar}</span>
                                <span className="text-xs text-muted">
                                    {surah.type === 'meccan' ? t('Meccan') : t('Medinan')} · {t(':count ayahs', { count: surah.ayahs })}
                                </span>
                            </span>
                            <span className="text-xs text-muted tabular-nums">{t('p. :page', { page: index.surahs[surah.number] ?? '' })}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function JuzIndex({ index, currentPage, onGo }: { index: MushafIndex; currentPage: number; onGo: (page: number) => void }) {
    const { t } = useTrans();

    return (
        <div className="grid gap-2 px-2 sm:grid-cols-2">
            {Array.from({ length: 30 }, (_, position) => position + 1).map((juz) => {
                const page = index.juz[juz] ?? 1;
                const next = index.juz[juz + 1] ?? 605;
                const hizbs = index.quarters.filter((quarter) => quarter.quarter % 4 === 1 && Math.ceil(quarter.quarter / 8) === juz);
                const active = currentPage >= page && currentPage < next;

                return (
                    <div key={juz} className={cn('rounded-2xl border p-3', active ? 'border-primary-300 bg-primary-50/60 dark:border-primary-500/40 dark:bg-primary-500/10' : 'border-line')}>
                        <button type="button" onClick={() => onGo(page)} className="flex w-full items-center justify-between text-start">
                            <span className="font-quran text-lg font-bold text-ink">
                                {t('Juz')} {arabicDigits(juz)}
                            </span>
                            <span className="text-xs text-muted tabular-nums">{t('p. :page', { page })}</span>
                        </button>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {hizbs.map((quarter) => (
                                <button
                                    key={quarter.quarter}
                                    type="button"
                                    onClick={() => onGo(quarter.page)}
                                    className="rounded-lg bg-surface-muted px-2 py-1 text-xs text-ink ring-1 ring-line transition hover:ring-primary-300"
                                    title={`${surahName(quarter.surah, 'ar')} ${quarter.ayah}`}
                                >
                                    {t('Hizb :number', { number: Math.ceil(quarter.quarter / 4) })}
                                </button>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function BookmarkIndex({ bookmarks, onGo, onRemove }: { bookmarks: MushafBookmarkItem[]; onGo: (page: number, ayahId?: number | null) => void; onRemove: (bookmark: MushafBookmarkItem) => void }) {
    const { t } = useTrans();
    const dates = useDates();

    if (bookmarks.length === 0) {
        return <EmptyState icon={Bookmark} title={t('No bookmarks yet')} description={t('Bookmark a page or an ayah to come back to it.')} compact />;
    }

    return (
        <ul className="space-y-1 px-1">
            {bookmarks.map((bookmark) => (
                <li key={bookmark.id} className="group flex items-center gap-2 rounded-xl px-2 hover:bg-surface-muted">
                    <button type="button" onClick={() => onGo(bookmark.page, bookmark.ayah_id)} className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-start">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
                            <Bookmark className="size-4" />
                        </span>
                        <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-ink">
                                {bookmark.label ||
                                    (bookmark.surah && bookmark.ayah
                                        ? `${t('Surah')} ${surahName(bookmark.surah, 'ar')} · ${t('Ayah')} ${bookmark.ayah}`
                                        : t('Page :page', { page: bookmark.page }))}
                            </span>
                            <span className="text-xs text-muted">
                                {t('Page :page', { page: bookmark.page })}
                                {bookmark.created_at && ` · ${dates.relative(bookmark.created_at)}`}
                            </span>
                        </span>
                    </button>
                    <button type="button" onClick={() => onRemove(bookmark)} className="p-2 text-muted hover:text-rose-600" aria-label={t('Delete')}>
                        <Trash className="size-4" />
                    </button>
                </li>
            ))}
        </ul>
    );
}

function HighlightIndex({ highlights, onGo, onRemove }: { highlights: MushafHighlightItem[]; onGo: (page: number, ayahId?: number | null) => void; onRemove: (highlight: MushafHighlightItem) => void }) {
    const { t } = useTrans();

    if (highlights.length === 0) {
        return <EmptyState icon={Highlighter} title={t('No marked ayahs yet')} description={t('Tap an ayah and choose a color to mark it.')} compact />;
    }

    return (
        <ul className="space-y-1 px-1">
            {highlights.map((highlight) => (
                <li key={highlight.ayah_id} className="flex items-center gap-2 rounded-xl px-2 hover:bg-surface-muted">
                    <button type="button" onClick={() => onGo(highlight.page, highlight.ayah_id)} className="flex min-w-0 flex-1 items-start gap-3 py-2.5 text-start">
                        <span className={cn('mt-1.5 size-3 shrink-0 rounded-full', highlightClasses[highlight.color].swatch)} />
                        <span className="min-w-0">
                            <span className="block text-sm font-semibold text-ink">
                                {t('Surah')} {surahName(highlight.surah, 'ar')} · {t('Ayah')} {highlight.ayah}
                            </span>
                            {highlight.note && <span className="block text-xs text-muted">{highlight.note}</span>}
                        </span>
                    </button>
                    <button type="button" onClick={() => onRemove(highlight)} className="p-2 text-muted hover:text-rose-600" aria-label={t('Delete')}>
                        <Trash className="size-4" />
                    </button>
                </li>
            ))}
        </ul>
    );
}

function SearchIndex({ onGo }: { onGo: (page: number, ayahId?: number | null) => void }) {
    const { t } = useTrans();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[] | null>(null);
    const [loading, setLoading] = useState(false);
    const debounced = useDebounce(query, 350);

    useEffect(() => {
        const term = debounced.trim();

        if (term.length < 2) {
            setResults(null);

            return;
        }

        let active = true;
        setLoading(true);

        http.get<{ results: SearchResult[] }>(route('mushaf.search'), { params: { q: term } })
            .then(({ data }) => active && setResults(data.results))
            .catch(() => active && setResults([]))
            .finally(() => active && setLoading(false));

        return () => {
            active = false;
        };
    }, [debounced]);

    return (
        <div>
            <div className="px-2 pb-2">
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Words from the ayah, or a reference like 2:255')} autoFocus />
            </div>
            {loading && <p className="px-3 py-2 text-sm text-muted">{t('Searching…')}</p>}
            {results !== null && !loading && results.length === 0 && <EmptyState icon={Search} title={t('No ayah matches the search')} compact />}
            {results && results.length > 0 && (
                <>
                    <p className="px-3 pb-1 text-xs text-muted">{results.length >= 50 ? t('The first :count results', { count: results.length }) : t(':count results', { count: results.length })}</p>
                    <ul className="space-y-1 px-1">
                        {results.map((result) => (
                            <li key={result.id}>
                                <button type="button" onClick={() => onGo(result.page, result.id)} className="w-full rounded-xl px-3 py-2.5 text-start transition hover:bg-surface-muted">
                                    <span className="block text-xs font-semibold text-primary-700 dark:text-primary-300">
                                        {t('Surah')} {surahName(result.surah, 'ar')} · {t('Ayah')} {result.ayah} · {t('Page :page', { page: result.page })}
                                    </span>
                                    <span dir="rtl" className="mt-1 line-clamp-2 block font-mushaf text-lg leading-loose text-ink">
                                        {result.text}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}
