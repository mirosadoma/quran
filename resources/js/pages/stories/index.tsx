import { Link } from '@inertiajs/react';
import { BookHeart, BookOpen, ChevronLeft, Headphones, Lightbulb, ScrollText, Sparkles, Star } from 'lucide-react';
import { IslamicPattern } from '@/components/brand';
import { ReadingTime, StoryIcon, toneClasses } from '@/components/stories/story-ui';
import { EmptyState } from '@/components/ui/empty-state';
import AppLayout from '@/layouts/app-layout';
import { useTrans } from '@/lib/i18n';
import { arabicDigits } from '@/lib/quran';
import { localized, type StoryKind, storyRoute, type StorySummary, toneOf } from '@/lib/stories';
import { cn } from '@/lib/utils';

interface StoriesProps {
    kind: StoryKind;
    stories: StorySummary[];
}

/**
 * A library of stories to read or to listen to: colorful cards for children, the prophets in their order.
 */
export default function Stories({ kind, stories }: StoriesProps) {
    const { t } = useTrans();
    const kids = kind === 'kids';

    return (
        <AppLayout title={kids ? t('Kids stories') : t("Prophets' stories")} hideHeader>
            {kids ? <KidsHero /> : <ProphetsHero count={stories.length} />}

            {stories.length === 0 ? (
                <EmptyState icon={kids ? BookHeart : ScrollText} title={t('No stories yet')} description={t('The stories will be added soon.')} />
            ) : kids ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {stories.map((story) => (
                        <KidsStoryCard key={story.slug} story={story} />
                    ))}
                </div>
            ) : (
                <ProphetsTimeline stories={stories} />
            )}
        </AppLayout>
    );
}

function KidsHero() {
    const { t } = useTrans();

    const steps = [
        { icon: BookOpen, text: t('Read the story') },
        { icon: Headphones, text: t('Listen to it') },
        { icon: Lightbulb, text: t('Learn its lesson') },
    ];

    return (
        <div className="relative mb-6 overflow-hidden rounded-[2rem] bg-linear-to-br from-sky-500 via-violet-500 to-rose-500 px-6 py-7 text-white shadow-xl shadow-violet-900/15 sm:px-8 dark:from-sky-700 dark:via-violet-700 dark:to-rose-700">
            <div className="pointer-events-none absolute -end-10 -top-16 size-56 rounded-full bg-amber-300/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 start-10 size-48 rounded-full bg-sky-300/30 blur-3xl" />
            <Star className="pointer-events-none absolute end-8 top-6 size-6 fill-amber-200 text-amber-200 opacity-80" />
            <Star className="pointer-events-none absolute end-24 bottom-6 size-4 fill-white text-white opacity-60" />
            <Sparkles className="pointer-events-none absolute start-1/2 top-4 size-5 text-amber-100 opacity-70" />

            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-amber-100">
                        <BookHeart className="size-4" />
                        {t('Kids stories')}
                    </p>
                    <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{t('Beautiful stories to read and to listen to!')}</h1>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
                        {t('Choose a story, read it yourself or listen to it, then learn its lesson.')}
                    </p>
                </div>
                <ol className="flex flex-wrap gap-2">
                    {steps.map((step, index) => (
                        <li key={index} className="flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2 text-sm font-semibold ring-1 ring-white/20 backdrop-blur">
                            <span className="flex size-7 items-center justify-center rounded-xl bg-amber-300 text-violet-900">
                                <step.icon className="size-4" />
                            </span>
                            {step.text}
                        </li>
                    ))}
                </ol>
            </div>
        </div>
    );
}

function KidsStoryCard({ story }: { story: StorySummary }) {
    const { t, locale } = useTrans();
    const tone = toneClasses[toneOf(story)];

    return (
        <Link
            href={route(storyRoute('kids', 'show'), story.slug)}
            prefetch
            className={cn(
                'group flex flex-col overflow-hidden rounded-[2rem] border-2 border-line bg-surface shadow-xs transition hover:-translate-y-1 hover:shadow-xl active:scale-[0.99]',
                tone.hover,
            )}
        >
            <div className={cn('relative flex h-32 items-center justify-center overflow-hidden bg-linear-to-br', tone.band)}>
                <span className="absolute -start-6 -top-6 size-24 rounded-full bg-white/15" />
                <span className="absolute -end-4 -bottom-8 size-28 rounded-full bg-white/10" />
                <Star className="absolute end-5 top-4 size-4 fill-white/70 text-white/70" />
                <span className="relative flex size-20 items-center justify-center rounded-[1.75rem] bg-white/20 ring-4 ring-white/25 backdrop-blur-sm transition duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <StoryIcon name={story.icon} kind="kids" className="size-10 text-white drop-shadow" />
                </span>
            </div>
            <div className="flex flex-1 flex-col p-5">
                <h2 className="text-xl leading-snug font-bold text-ink">{localized(story.title, locale)}</h2>
                <p className="mt-2 line-clamp-3 flex-1 leading-relaxed text-muted">{localized(story.summary, locale)}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <ReadingTime minutes={story.minutes} className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', tone.soft)} />
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-700 dark:text-primary-300">
                        <Headphones className="size-4" />
                        {t('Read and listen')}
                        <ChevronLeft className="size-4 transition group-hover:-translate-x-0.5 ltr:rotate-180 ltr:group-hover:translate-x-0.5" />
                    </span>
                </div>
            </div>
        </Link>
    );
}

function ProphetsHero({ count }: { count: number }) {
    const { t, locale } = useTrans();

    return (
        <div className="relative mb-8 overflow-hidden rounded-3xl bg-linear-to-br from-primary-800 via-primary-900 to-sidebar px-6 py-8 text-white shadow-xl shadow-primary-950/20 sm:px-10">
            <IslamicPattern className="text-gold-300/[0.10]" size={60} />
            <div className="pointer-events-none absolute -end-16 -top-20 size-64 rounded-full bg-gold-400/15 blur-3xl" />
            <div className="relative max-w-2xl">
                <p className="flex items-center gap-2 text-sm font-semibold text-gold-200">
                    <ScrollText className="size-4" />
                    {t("Prophets' stories")}
                </p>
                <h1 className="mt-2 font-quran text-3xl leading-snug font-bold sm:text-4xl">{t('Lessons from the lives of the prophets')}</h1>
                <p className="mt-3 text-sm leading-relaxed text-white/80 sm:text-base">
                    {t('Their call to worship Allah alone, their patience and what happened to their people, complete and in order, to read or to listen to.')}
                </p>
                {count > 0 && (
                    <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-gold-100 ring-1 ring-white/15">
                        <BookOpen className="size-3.5" />
                        {t(':count stories', { count: locale === 'ar' ? arabicDigits(count) : count })}
                    </p>
                )}
            </div>
        </div>
    );
}

/**
 * The prophets one after the other, with their order.
 */
function ProphetsTimeline({ stories }: { stories: StorySummary[] }) {
    const { locale } = useTrans();

    return (
        <ol className="relative mx-auto max-w-4xl">
            <span
                aria-hidden
                className="absolute inset-y-6 start-6 w-px bg-linear-to-b from-gold-300 via-gold-300/70 to-transparent sm:start-7 dark:from-gold-500/50 dark:via-gold-500/30"
            />
            {stories.map((story) => (
                <li key={story.slug} className="relative pb-4 ps-16 sm:ps-20">
                    <span className="absolute start-0 top-3 flex size-12 items-center justify-center rounded-full border-2 border-gold-300 bg-surface font-quran text-lg font-bold text-gold-700 shadow-sm sm:size-14 sm:text-xl dark:border-gold-500/50 dark:text-gold-300">
                        {locale === 'ar' ? arabicDigits(story.order) : story.order}
                    </span>
                    <Link
                        href={route(storyRoute('prophets', 'show'), story.slug)}
                        prefetch
                        className="group flex items-start gap-4 rounded-2xl border border-line bg-surface p-4 shadow-xs transition hover:border-gold-300 hover:shadow-lg sm:p-5 dark:hover:border-gold-500/40"
                    >
                        <span className={cn('mt-0.5 hidden size-11 shrink-0 items-center justify-center rounded-xl sm:flex', toneClasses[toneOf(story)].soft)}>
                            <StoryIcon name={story.icon} kind="prophets" className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <h2 className="font-quran text-xl leading-snug font-bold text-ink sm:text-2xl">{localized(story.title, locale)}</h2>
                            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">{localized(story.summary, locale)}</p>
                            <ReadingTime minutes={story.minutes} className="mt-2 text-xs text-muted" />
                        </div>
                        <ChevronLeft className="mt-2 size-5 shrink-0 text-muted transition group-hover:-translate-x-0.5 group-hover:text-gold-600 ltr:rotate-180 ltr:group-hover:translate-x-0.5" />
                    </Link>
                </li>
            ))}
        </ol>
    );
}
