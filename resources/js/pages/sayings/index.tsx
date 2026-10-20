import { Link } from '@inertiajs/react';
import { Copy, ExternalLink, Lightbulb, Quote, SearchX } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { IslamicPattern } from '@/components/brand';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CategoryIcon, iconFor } from '@/components/ui/category-icon';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchInput } from '@/components/ui/search-input';
import { Tabs } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { hadithHref, type SayingCategoryItem, type SayingItem } from '@/lib/athar';
import { useTrans } from '@/lib/i18n';
import { normalizeArabic } from '@/lib/quran';
import { cn, colorOf, copyText, formatNumber } from '@/lib/utils';

interface SayingsProps {
    categories: SayingCategoryItem[];
}

/** Stories longer than this are shortened, with a button to read them whole. */
const LONG_TEXT = 500;

/**
 * The transmitted sayings and stories by category, with who said each and its lesson.
 */
export default function Sayings({ categories }: SayingsProps) {
    const { t, locale } = useTrans();
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState<string>(categories[0]?.slug ?? 'all');

    const query = normalizeArabic(search.trim());
    const searching = query !== '';
    const selected = categories.find((category) => category.slug === tab) ?? null;
    const total = categories.reduce((sum, category) => sum + category.sayings.length, 0);

    const matches = (saying: SayingItem) => normalizeArabic(`${saying.title ?? ''} ${saying.text} ${saying.attribution} ${saying.source ?? ''} ${saying.lesson ?? ''}`).includes(query);
    const pool = searching || selected === null ? categories : [selected];
    const shown = pool.flatMap((category) => category.sayings.filter((saying) => !searching || matches(saying)).map((saying) => ({ saying, category })));

    return (
        <AppLayout title={t('Transmitted sayings')} hideHeader>
            <div className="relative mb-6 overflow-hidden rounded-3xl bg-linear-to-br from-violet-700 via-primary-900 to-sidebar px-6 py-7 text-white shadow-xl shadow-primary-950/20 sm:px-8">
                <IslamicPattern className="text-gold-300/[0.10]" size={60} />
                <div className="pointer-events-none absolute -end-16 -top-20 size-64 rounded-full bg-gold-400/15 blur-3xl" />
                <div className="relative max-w-2xl">
                    <p className="flex items-center gap-2 text-sm font-semibold text-gold-200">
                        <Quote className="size-4" />
                        {t('Transmitted sayings')}
                    </p>
                    <h1 className="mt-2 font-quran text-3xl leading-snug font-bold sm:text-4xl">{t('Wisdom and stories from the Quran, the sunnah, the companions and the scholars')}</h1>
                    <p className="mt-3 text-sm leading-relaxed text-white/80 sm:text-base">
                        {t('Sayings of Allah in the hadith qudsi, words of the Prophet ﷺ, of his companions and of the scholars, and stories with a lesson.')}
                    </p>
                    <SearchInput value={search} onSearch={setSearch} placeholder={t('Search the sayings...')} className="mt-5" delay={200} />
                </div>
            </div>

            {categories.length === 0 ? (
                <Card>
                    <EmptyState icon={Quote} title={t('No sayings yet')} description={t('The sayings will be added soon.')} />
                </Card>
            ) : (
                <>
                    {!searching && (
                        <Tabs<string>
                            items={[
                                { value: 'all', label: t('All'), count: total },
                                ...categories.map((category) => ({ value: category.slug, label: category.name, count: category.sayings.length, icon: iconFor(category.icon) })),
                            ]}
                            value={selected?.slug ?? 'all'}
                            onChange={setTab}
                            className="mb-5"
                        />
                    )}

                    {searching ? (
                        <p className="mb-4 text-sm text-muted">{t(':count sayings match your search.', { count: formatNumber(shown.length, locale) })}</p>
                    ) : (
                        selected?.description && <p className="mb-4 text-sm text-muted">{selected.description}</p>
                    )}

                    {shown.length === 0 ? (
                        <Card>
                            <EmptyState icon={SearchX} title={t('No saying matches your search')} description={t('Try other words, or fewer of them.')} />
                        </Card>
                    ) : (
                        <div className="grid gap-4 xl:grid-cols-2">
                            {shown.map(({ saying, category }) => (
                                <SayingCard key={saying.id} saying={saying} category={category} showCategory={searching || selected === null} />
                            ))}
                        </div>
                    )}
                </>
            )}
        </AppLayout>
    );
}

function SayingCard({ saying, category, showCategory }: { saying: SayingItem; category: SayingCategoryItem; showCategory: boolean }) {
    const { t } = useTrans();
    const [expanded, setExpanded] = useState(false);
    const color = colorOf(category.color);
    const story = saying.kind === 'story';
    const long = saying.text.length > LONG_TEXT;
    const href = hadithHref(saying.hadith);

    const copy = async () => {
        const lines = [saying.title, saying.text, '', saying.attribution, saying.source].filter((line): line is string => typeof line === 'string');

        if (await copyText(lines.join('\n'))) {
            toast.success(t('Copied'));
        }
    };

    return (
        <Card className="flex flex-col">
            <div className="flex flex-1 flex-col p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        {showCategory && (
                            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold', color.soft)}>
                                <CategoryIcon name={category.icon} className="size-3.5" />
                                {category.name}
                            </span>
                        )}
                        {story && <Badge tone="rose">{t('A story')}</Badge>}
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

                {saying.title && <h3 className="mt-3 font-quran text-xl leading-snug font-bold text-ink">{saying.title}</h3>}

                <p dir="rtl" className={cn('mt-3 leading-[2] text-ink', story ? 'text-base sm:text-lg' : 'font-quran text-lg sm:text-xl', long && !expanded && 'line-clamp-6')}>
                    {saying.text}
                </p>
                {long && (
                    <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-1 self-start text-sm font-semibold text-primary-700 hover:underline dark:text-primary-300">
                        {expanded ? t('Show less') : t('Read the whole text')}
                    </button>
                )}

                <p className="mt-3 text-sm">
                    <span className="font-semibold text-primary-700 dark:text-primary-300">{saying.attribution}</span>
                    {saying.source && <span className="text-muted"> · {saying.source}</span>}
                </p>

                {saying.lesson && (
                    <div className="mt-3 flex gap-2 rounded-2xl bg-surface-muted px-4 py-3 text-sm leading-relaxed text-ink/90">
                        <Lightbulb className="mt-0.5 size-4 shrink-0 text-gold-600" />
                        <p>
                            <span className="font-bold">{t('The lesson')}: </span>
                            {saying.lesson}
                        </p>
                    </div>
                )}

                {href && (
                    <Link href={href} className="mt-3 inline-flex items-center gap-1 self-start text-xs font-semibold text-gold-700 hover:underline dark:text-gold-300">
                        <ExternalLink className="size-3.5" />
                        {t('Read the hadith in its source')}
                    </Link>
                )}
            </div>
        </Card>
    );
}
