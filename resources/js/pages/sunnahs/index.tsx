import { Link } from '@inertiajs/react';
import { Circle, CircleCheck, Copy, ExternalLink, Leaf, SearchX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { IslamicPattern } from '@/components/brand';
import { Card } from '@/components/ui/card';
import { CategoryIcon } from '@/components/ui/category-icon';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchInput } from '@/components/ui/search-input';
import AppLayout from '@/layouts/app-layout';
import { hadithHref, type SunnahCategoryItem, type SunnahItem } from '@/lib/athar';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { normalizeArabic } from '@/lib/quran';
import { cn, colorOf, copyText, formatNumber } from '@/lib/utils';

interface SunnahsProps {
    categories: SunnahCategoryItem[];
}

/**
 * The sunnahs done today, kept on this device and reset every day.
 */
function useDoneToday() {
    const dates = useDates();
    const key = `sunnahs.done.${dates.today()}`;
    const [done, setDone] = useState<number[]>(() => {
        try {
            const stored = JSON.parse(window.localStorage.getItem(key) ?? '[]') as unknown;

            return Array.isArray(stored) ? stored.filter((id): id is number => typeof id === 'number') : [];
        } catch {
            return [];
        }
    });

    const toggle = (id: number) => {
        const next = done.includes(id) ? done.filter((item) => item !== id) : [...done, id];
        setDone(next);

        try {
            window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
            // Without storage the ticks still work until the page is closed.
        }
    };

    return { done, toggle };
}

/**
 * The neglected sunnahs by category: how each is done and its hadith, with a tick for the ones done today.
 */
export default function Sunnahs({ categories }: SunnahsProps) {
    const { t, locale } = useTrans();
    const [search, setSearch] = useState('');
    const [selectedSlug, setSelectedSlug] = useState<string | null>(categories[0]?.slug ?? null);
    const { done, toggle } = useDoneToday();

    useEffect(() => {
        if (selectedSlug !== null && !categories.some((category) => category.slug === selectedSlug)) {
            setSelectedSlug(categories[0]?.slug ?? null);
        }
    }, [categories, selectedSlug]);

    const query = normalizeArabic(search.trim());
    const searching = query !== '';
    const selected = categories.find((category) => category.slug === selectedSlug) ?? categories[0];
    const total = categories.reduce((sum, category) => sum + category.sunnahs.length, 0);
    const doneIn = (category: SunnahCategoryItem) => category.sunnahs.filter((sunnah) => done.includes(sunnah.id)).length;

    const matches = (sunnah: SunnahItem) => normalizeArabic(`${sunnah.title} ${sunnah.text} ${sunnah.evidence} ${sunnah.source}`).includes(query);
    const shown: { sunnah: SunnahItem; category: SunnahCategoryItem }[] = searching
        ? categories.flatMap((category) => category.sunnahs.filter(matches).map((sunnah) => ({ sunnah, category })))
        : (selected?.sunnahs ?? []).map((sunnah) => ({ sunnah, category: selected }));

    return (
        <AppLayout title={t('Neglected sunnahs')} hideHeader>
            <div className="relative mb-6 overflow-hidden rounded-3xl bg-linear-to-br from-emerald-700 via-primary-800 to-sidebar px-6 py-7 text-white shadow-xl shadow-primary-950/20 sm:px-8">
                <IslamicPattern className="text-gold-300/[0.10]" size={60} />
                <div className="pointer-events-none absolute -end-16 -top-20 size-64 rounded-full bg-gold-400/15 blur-3xl" />
                <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                    <div className="max-w-2xl">
                        <p className="flex items-center gap-2 text-sm font-semibold text-gold-200">
                            <Leaf className="size-4" />
                            {t('Neglected sunnahs')}
                        </p>
                        <h1 className="mt-2 font-quran text-3xl leading-snug font-bold sm:text-4xl">{t('Sunnahs of the Prophet ﷺ that are easy to revive in your day')}</h1>
                        <p className="mt-3 text-sm leading-relaxed text-white/80 sm:text-base">
                            {t('Every sunnah with how to do it and its hadith from the books of the sunnah. Tick the ones you did today, and come back tomorrow for the rest.')}
                        </p>
                        <SearchInput value={search} onSearch={setSearch} placeholder={t('Search the sunnahs...')} className="mt-5" delay={200} />
                    </div>
                    <div className="flex shrink-0 gap-3">
                        <div className="rounded-2xl bg-white/10 px-4 py-3 text-center ring-1 ring-white/15">
                            <p className="text-2xl font-bold">{formatNumber(total, locale)}</p>
                            <p className="text-xs text-white/75">{t('Sunnahs')}</p>
                        </div>
                        <div className="rounded-2xl bg-white/10 px-4 py-3 text-center ring-1 ring-white/15">
                            <p className="text-2xl font-bold text-gold-200">{formatNumber(done.length, locale)}</p>
                            <p className="text-xs text-white/75">{t('Done today')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {categories.length === 0 ? (
                <Card>
                    <EmptyState icon={Leaf} title={t('No sunnahs yet')} description={t('The sunnahs will be added soon.')} />
                </Card>
            ) : (
                <>
                    {!searching && (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                            {categories.map((category) => {
                                const color = colorOf(category.color);
                                const count = category.sunnahs.length;
                                const finished = doneIn(category);
                                const active = selected?.slug === category.slug;

                                return (
                                    <button
                                        key={category.id}
                                        type="button"
                                        onClick={() => setSelectedSlug(category.slug)}
                                        className={cn(
                                            'group relative overflow-hidden rounded-2xl border bg-surface p-4 text-start transition hover:-translate-y-0.5 hover:shadow-lg',
                                            active ? 'border-primary-400 shadow-md ring-2 ring-primary-500/20' : 'border-line',
                                        )}
                                    >
                                        <span className={cn('flex size-11 items-center justify-center rounded-2xl bg-linear-to-br text-white shadow-sm', color.gradient)}>
                                            <CategoryIcon name={category.icon} className="size-5" />
                                        </span>
                                        <span className="mt-3 block font-bold text-ink">{category.name}</span>
                                        <span className="mt-0.5 block text-xs text-muted">
                                            {count > 0 && finished === count ? t('Completed today') : t(':done of :total', { done: finished, total: count })}
                                        </span>
                                        <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-surface-muted">
                                            <span className={cn('block h-full rounded-full transition-all duration-500', color.bar)} style={{ width: count ? `${(finished / count) * 100}%` : 0 }} />
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <section className="mt-8">
                        {searching ? (
                            <p className="mb-4 text-sm text-muted">{t(':count sunnahs match your search.', { count: formatNumber(shown.length, locale) })}</p>
                        ) : (
                            selected && (
                                <div className="mb-4">
                                    <h2 className="text-xl font-bold text-ink">{selected.name}</h2>
                                    {selected.description && <p className="mt-1 text-sm text-muted">{selected.description}</p>}
                                </div>
                            )
                        )}

                        {shown.length === 0 ? (
                            <Card>
                                <EmptyState icon={SearchX} title={t('No sunnah matches your search')} description={t('Try other words, or fewer of them.')} />
                            </Card>
                        ) : (
                            <div className="grid gap-4 xl:grid-cols-2">
                                {shown.map(({ sunnah, category }) => (
                                    <SunnahCard
                                        key={sunnah.id}
                                        sunnah={sunnah}
                                        categoryName={searching ? category.name : null}
                                        done={done.includes(sunnah.id)}
                                        onToggle={() => toggle(sunnah.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}
        </AppLayout>
    );
}

function SunnahCard({ sunnah, categoryName, done, onToggle }: { sunnah: SunnahItem; categoryName: string | null; done: boolean; onToggle: () => void }) {
    const { t } = useTrans();
    const href = hadithHref(sunnah.hadith);

    const copy = async () => {
        if (await copyText(`${sunnah.title}\n${sunnah.text}\n\n«${sunnah.evidence}»\n${sunnah.source}`)) {
            toast.success(t('Copied'));
        }
    };

    return (
        <Card className={cn('flex flex-col transition', done && 'border-emerald-300/70 bg-emerald-50/30 dark:border-emerald-500/30 dark:bg-emerald-500/5')}>
            <div className="flex flex-1 flex-col p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        {categoryName && <p className="mb-1 text-xs font-semibold text-muted">{categoryName}</p>}
                        <h3 className="text-lg leading-snug font-bold text-ink">{sunnah.title}</h3>
                    </div>
                    <button
                        type="button"
                        onClick={() => void copy()}
                        className="rounded-lg p-1.5 text-muted transition hover:bg-surface-muted hover:text-ink"
                        aria-label={t('Copy')}
                        title={t('Copy')}
                    >
                        <Copy className="size-4" />
                    </button>
                </div>

                <p className="mt-3 leading-relaxed text-ink/90">{sunnah.text}</p>

                <figure className="mt-4 rounded-2xl border-s-4 border-gold-400 bg-gold-50/60 px-4 py-3 dark:bg-gold-500/10">
                    <blockquote dir="rtl" className="font-quran text-lg leading-loose text-ink">
                        {sunnah.evidence}
                    </blockquote>
                    <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-gold-700 dark:text-gold-300">
                        <span>{sunnah.source}</span>
                        {href && (
                            <Link href={href} className="inline-flex items-center gap-1 hover:underline">
                                <ExternalLink className="size-3.5" />
                                {t('Read the hadith in its source')}
                            </Link>
                        )}
                    </figcaption>
                </figure>

                <button
                    type="button"
                    onClick={onToggle}
                    aria-pressed={done}
                    className={cn(
                        'mt-4 inline-flex items-center gap-2 self-start rounded-xl px-3.5 py-2 text-sm font-semibold transition',
                        done
                            ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
                            : 'border border-line bg-surface text-muted hover:border-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300',
                    )}
                >
                    {done ? <CircleCheck className="size-4" /> : <Circle className="size-4" />}
                    {done ? t('Done today') : t('I did it today')}
                </button>
            </div>
        </Card>
    );
}
