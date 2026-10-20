import { Link, router } from '@inertiajs/react';
import { ArrowRight, BookOpen, Library, SearchX } from 'lucide-react';
import { IslamicPattern } from '@/components/brand';
import { CollectionIcon, HadithCard } from '@/components/hadith/hadith-ui';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/form';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import AppLayout from '@/layouts/app-layout';
import { type HadithBookItem, type HadithCollectionItem, type HadithItem, nameOf } from '@/lib/hadith';
import { useTrans } from '@/lib/i18n';
import { arabicDigits } from '@/lib/quran';
import { cleanQuery, cn, colorOf, formatNumber } from '@/lib/utils';
import type { Paginated } from '@/types';

interface HadithShowProps {
    collection: HadithCollectionItem;
    books: HadithBookItem[];
    /** The book opened; null while searching the whole collection. */
    book: HadithBookItem | null;
    filters: { search: string; book: number | null };
    highlight: string[];
    hadiths: Paginated<HadithItem>;
}

/**
 * One collection: its books (kutub) with the hadiths of one of them, or the hadiths matching a search in it.
 */
export default function HadithShow({ collection, books, book, filters, highlight, hadiths }: HadithShowProps) {
    const { t, locale } = useTrans();
    const color = colorOf(collection.color);
    const name = nameOf(collection, locale);
    const searching = highlight.length > 0;

    const apply = (changes: Partial<{ search: string; book: number | null }>) => {
        router.get(route('hadith.show', collection.slug), cleanQuery({ search: filters.search, book: filters.book, ...changes }), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const bookHref = (number: number | null) => route('hadith.show', cleanQuery({ collection: collection.slug, book: number, search: filters.search }));

    return (
        <AppLayout title={name} hideHeader>
            <Link href={route('hadith.index')} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
                <ArrowRight className="size-4 ltr:rotate-180" />
                {t('Prophetic hadiths')}
            </Link>

            <header className={cn('relative mb-6 overflow-hidden rounded-3xl bg-linear-to-br px-6 py-7 text-white shadow-xl sm:px-8', color.gradient)}>
                <IslamicPattern className="text-white/[0.08]" size={56} />
                <div className="pointer-events-none absolute -end-12 -top-12 size-48 rounded-full bg-white/10 blur-2xl" />
                <div className="relative flex items-start gap-4">
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                        <CollectionIcon name={collection.icon} className="size-7" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h1 className="font-quran text-2xl font-bold sm:text-3xl">{name}</h1>
                        <p className="mt-1 text-sm text-white/80">{locale === 'en' ? collection.author_en : collection.author}</p>
                        {(locale === 'en' ? collection.description_en : collection.description) && (
                            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
                                {locale === 'en' ? collection.description_en : collection.description}
                            </p>
                        )}
                        <p className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                            <span className="rounded-full bg-white/15 px-3 py-1 ring-1 ring-white/20">
                                {t(':count hadiths', { count: formatNumber(collection.hadiths_count ?? 0, locale) })}
                            </span>
                            <span className="rounded-full bg-white/15 px-3 py-1 ring-1 ring-white/20">
                                {t(':count books', { count: formatNumber(collection.books_count ?? 0, locale) })}
                            </span>
                        </p>
                    </div>
                </div>
            </header>

            <SearchInput value={filters.search} onSearch={(search) => apply({ search, book: null })} placeholder={t('Search in :name...', { name })} className="mb-5" />

            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                <aside>
                    <Select
                        value={book?.number ?? ''}
                        onChange={(event) => apply({ book: event.target.value === '' ? null : Number(event.target.value) })}
                        aria-label={t('The book')}
                        className="lg:hidden"
                    >
                        <option value="">{searching ? t('All the books') : t('The books')}</option>
                        {books.map((item) => (
                            <option key={item.id} value={item.number}>
                                {item.number}. {nameOf(item, locale)}
                            </option>
                        ))}
                    </Select>

                    <nav className="sticky top-24 hidden max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-line bg-surface p-2 lg:block">
                        <p className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-muted">
                            <Library className="size-4" />
                            {t('The books')}
                        </p>
                        {searching && (
                            <Link
                                href={bookHref(null)}
                                preserveScroll
                                className={cn(
                                    'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition',
                                    book === null ? 'bg-primary-50 text-primary-800 dark:bg-primary-500/10 dark:text-primary-300' : 'text-muted hover:bg-surface-muted hover:text-ink',
                                )}
                            >
                                {t('All the books')}
                            </Link>
                        )}
                        <ul className="space-y-0.5">
                            {books.map((item) => {
                                const active = book?.number === item.number;

                                return (
                                    <li key={item.id}>
                                        <Link
                                            href={bookHref(item.number)}
                                            preserveScroll
                                            className={cn(
                                                'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition',
                                                active ? 'bg-primary-50 font-semibold text-primary-800 dark:bg-primary-500/10 dark:text-primary-300' : 'text-ink/80 hover:bg-surface-muted hover:text-ink',
                                            )}
                                        >
                                            <span className={cn('w-7 shrink-0 text-center text-xs font-bold', active ? 'text-primary-600 dark:text-primary-300' : 'text-muted')}>
                                                {locale === 'ar' ? arabicDigits(item.number) : item.number}
                                            </span>
                                            <span className="min-w-0 flex-1 truncate">{nameOf(item, locale)}</span>
                                            {item.hadiths_count !== null && <span className="text-[11px] text-muted">{formatNumber(item.hadiths_count, locale)}</span>}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>
                </aside>

                <section className="min-w-0">
                    <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-ink">
                        <BookOpen className="size-5 text-primary-600" />
                        {searching
                            ? t(':count hadiths match your search.', { count: formatNumber(hadiths.total, locale) })
                            : book
                              ? nameOf(book, locale)
                              : t('All the hadiths')}
                    </h2>

                    {hadiths.data.length === 0 ? (
                        <Card>
                            {searching ? (
                                <EmptyState icon={SearchX} title={t('No hadith matches your search')} description={t('Try other words, or fewer of them.')} />
                            ) : (
                                <EmptyState icon={BookOpen} title={t('No hadiths here')} />
                            )}
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {hadiths.data.map((hadith) => (
                                <HadithCard key={hadith.id} hadith={hadith} collectionSlug={collection.slug} terms={highlight} showBook={searching || book === null} />
                            ))}
                        </div>
                    )}

                    <Pagination data={hadiths} className="mt-8" />
                </section>
            </div>
        </AppLayout>
    );
}
