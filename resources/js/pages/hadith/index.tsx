import { Link, router } from '@inertiajs/react';
import { BookText, ChevronLeft, Quote, SearchX } from 'lucide-react';
import { IslamicPattern } from '@/components/brand';
import { CollectionIcon, HadithCard } from '@/components/hadith/hadith-ui';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/form';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import AppLayout from '@/layouts/app-layout';
import { type HadithCollectionItem, type HadithItem, nameOf } from '@/lib/hadith';
import { useTrans } from '@/lib/i18n';
import { cleanQuery, cn, colorOf, formatNumber } from '@/lib/utils';
import type { Paginated } from '@/types';

interface HadithIndexProps {
    collections: HadithCollectionItem[];
    filters: { search: string; collection: string | null };
    /** The words the results matched (reduced for searching), to highlight them. */
    highlight: string[];
    /** The hadiths of all the books matching the search; null when nothing is searched. */
    results: Paginated<HadithItem> | null;
    daily: HadithItem | null;
}

/**
 * The books of hadith with the hadith of the day, or the hadiths of all the books matching a search.
 */
export default function HadithIndex({ collections, filters, highlight, results, daily }: HadithIndexProps) {
    const { t, locale } = useTrans();

    const apply = (changes: Partial<{ search: string; collection: string | null }>) => {
        router.get(route('hadith.index'), cleanQuery({ search: filters.search, collection: filters.collection, ...changes }), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <AppLayout title={t('Prophetic hadiths')} hideHeader>
            <div className="relative mb-6 overflow-hidden rounded-3xl bg-linear-to-br from-primary-800 via-primary-900 to-sidebar px-6 py-7 text-white shadow-xl shadow-primary-950/20 sm:px-8">
                <IslamicPattern className="text-gold-300/[0.10]" size={60} />
                <div className="pointer-events-none absolute -end-16 -top-20 size-64 rounded-full bg-gold-400/15 blur-3xl" />
                <div className="relative max-w-3xl">
                    <p className="flex items-center gap-2 text-sm font-semibold text-gold-200">
                        <BookText className="size-4" />
                        {t('Prophetic hadiths')}
                    </p>
                    <h1 className="mt-2 font-quran text-3xl leading-snug font-bold sm:text-4xl">{t('The books of the sunnah of the Prophet ﷺ')}</h1>
                    <p className="mt-3 text-sm leading-relaxed text-white/80 sm:text-base">
                        {t('Sahih al-Bukhari, Sahih Muslim, the Sunan and more: browse them book by book, or search them all; words are found whatever their diacritics.')}
                    </p>
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                        <SearchInput value={filters.search} onSearch={(search) => apply({ search })} placeholder={t('Search the hadiths...')} className="flex-1" />
                        <Select
                            value={filters.collection ?? ''}
                            onChange={(event) => apply({ collection: event.target.value || null })}
                            aria-label={t('The book')}
                            className="sm:w-60"
                        >
                            <option value="">{t('All the books')}</option>
                            {collections.map((collection) => (
                                <option key={collection.slug} value={collection.slug}>
                                    {nameOf(collection, locale)}
                                </option>
                            ))}
                        </Select>
                    </div>
                </div>
            </div>

            {results ? (
                <SearchResults results={results} terms={highlight} />
            ) : (
                <>
                    {daily && (
                        <section className="mb-8">
                            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-ink">
                                <Quote className="size-5 text-gold-600" />
                                {t('Hadith of the day')}
                            </h2>
                            <HadithCard hadith={daily} showCollection showBook featured />
                        </section>
                    )}

                    <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink">
                        <BookText className="size-5 text-primary-600" />
                        {t('The books of hadith')}
                    </h2>
                    {collections.length === 0 ? (
                        <Card>
                            <EmptyState icon={BookText} title={t('No hadiths yet')} description={t('The books of hadith will be added soon.')} />
                        </Card>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {collections.map((collection) => (
                                <CollectionCard key={collection.slug} collection={collection} />
                            ))}
                        </div>
                    )}
                </>
            )}
        </AppLayout>
    );
}

function SearchResults({ results, terms }: { results: Paginated<HadithItem>; terms: string[] }) {
    const { t, locale } = useTrans();

    if (results.data.length === 0) {
        return (
            <Card>
                <EmptyState icon={SearchX} title={t('No hadith matches your search')} description={t('Try other words, or fewer of them.')} />
            </Card>
        );
    }

    return (
        <>
            <p className="mb-3 text-sm text-muted">{t(':count hadiths match your search.', { count: formatNumber(results.total, locale) })}</p>
            <div className="space-y-3">
                {results.data.map((hadith) => (
                    <HadithCard key={hadith.id} hadith={hadith} terms={terms} showCollection showBook />
                ))}
            </div>
            <Pagination data={results} className="mt-8" />
        </>
    );
}

function CollectionCard({ collection }: { collection: HadithCollectionItem }) {
    const { t, locale } = useTrans();
    const color = colorOf(collection.color);
    const description = locale === 'en' ? collection.description_en : collection.description;

    return (
        <Link
            href={route('hadith.show', collection.slug)}
            prefetch
            className="group flex flex-col rounded-3xl border border-line bg-surface p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-lg"
        >
            <div className="flex items-start gap-3">
                <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br text-white shadow-sm', color.gradient)}>
                    <CollectionIcon name={collection.icon} className="size-6" />
                </span>
                <div className="min-w-0">
                    <h3 className="font-quran text-xl leading-snug font-bold text-ink">{nameOf(collection, locale)}</h3>
                    <p className="mt-0.5 text-xs text-muted">{locale === 'en' ? collection.author_en : collection.author}</p>
                </div>
            </div>
            {description && <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-muted">{description}</p>}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <span className="flex flex-wrap gap-1.5 text-xs font-semibold">
                    <span className={cn('rounded-full px-2.5 py-1', color.soft)}>{t(':count hadiths', { count: formatNumber(collection.hadiths_count ?? 0, locale) })}</span>
                    <span className="rounded-full bg-surface-muted px-2.5 py-1 text-muted">{t(':count books', { count: formatNumber(collection.books_count ?? 0, locale) })}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 dark:text-primary-300">
                    {t('Browse')}
                    <ChevronLeft className="size-4 transition group-hover:-translate-x-0.5 ltr:rotate-180 ltr:group-hover:translate-x-0.5" />
                </span>
            </div>
        </Link>
    );
}
