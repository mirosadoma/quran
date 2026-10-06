import { Link } from '@inertiajs/react';
import { AArrowDown, AArrowUp, ArrowRight, BookOpen, Check, ChevronLeft, ChevronRight, Headphones, Lightbulb, LoaderCircle, Square, Star, UserRound } from 'lucide-react';
import { type CSSProperties, Fragment, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { IslamicPattern } from '@/components/brand';
import { AyahMarker } from '@/components/mushaf/mushaf-page';
import { ReadAloudControls, ReadAloudNotice } from '@/components/read-aloud/read-aloud-controls';
import { ReadingTime, StoryIcon, toneClasses } from '@/components/stories/story-ui';
import { Button } from '@/components/ui/button';
import { Dropdown, DropdownItem, DropdownLabel } from '@/components/ui/dropdown';
import { useReadAloud } from '@/hooks/use-read-aloud';
import { rangeQueue, useRecitation } from '@/hooks/use-recitation';
import AppLayout from '@/layouts/app-layout';
import { translate, useTrans } from '@/lib/i18n';
import { readPreference, writePreference } from '@/lib/mushaf';
import { arabicDigits, surahName } from '@/lib/quran';
import { defaultTextSize, localized, type Story, type StoryKind, type StoryPassage, storyRoute, type StorySummary, textSizes, toneOf } from '@/lib/stories';
import { cn } from '@/lib/utils';
import type { ReciterItem } from '@/types';

interface StoryPageProps {
    kind: StoryKind;
    story: Story;
    previous: StorySummary | null;
    next: StorySummary | null;
    reciters: ReciterItem[];
}

/**
 * A story to read or to listen to: the voice of the device reads it paragraph by paragraph (or its
 * recorded narration plays), and a sheikh recites its Quran passages.
 */
export default function StoryPage(props: StoryPageProps) {
    const { locale } = useTrans();

    return (
        <AppLayout title={localized(props.story.title, locale)} hideHeader>
            {/* A new reader for every story: the voice stops when moving to another one. */}
            <StoryReader key={`${props.kind}:${props.story.slug}`} {...props} />
        </AppLayout>
    );
}

/**
 * What the voice reads, in order: the title, the headings and paragraphs, then the lessons; never the
 * ayahs, which a sheikh recites. Index keeps the segment of each part ("title", "0", "0.1", "lesson.0"…).
 */
function readable(story: Story): { segments: string[]; index: Map<string, number> } {
    const segments: string[] = [];
    const index = new Map<string, number>();

    const add = (key: string, text: string | null) => {
        if (text?.trim()) {
            index.set(key, segments.length);
            segments.push(text);
        }
    };

    add('title', story.title.ar);

    story.sections.forEach((section, sectionIndex) => {
        add(`${sectionIndex}`, section.heading);
        section.paragraphs.forEach((paragraph, paragraphIndex) => add(`${sectionIndex}.${paragraphIndex}`, paragraph));
    });

    if (story.lessons.length > 0) {
        add('lessons', translate('ar', 'Lessons of the story'));
        story.lessons.forEach((lesson, lessonIndex) => add(`lesson.${lessonIndex}`, lesson));
    }

    return { segments, index };
}

function passageLabel(passage: StoryPassage): string {
    return `${surahName(passage.surah, 'ar')} ${passage.from} - ${passage.to}`;
}

function StoryReader({ kind, story, previous, next, reciters }: StoryPageProps) {
    const { t } = useTrans();
    const kids = kind === 'kids';
    const tone = toneOf(story);
    const reader = useReadAloud();
    const [reciterId, setReciterId] = useState<number | null>(() => readPreference('stories.reciter', reciters[0]?.id ?? null));
    const reciter = reciters.find((item) => item.id === reciterId) ?? reciters[0] ?? null;
    const recitation = useRecitation(reciter, 'stories.player');
    const sizes = textSizes[kind];
    const [size, setSize] = useState(() => Math.min(sizes.length - 1, Math.max(0, readPreference(`stories.size.${kind}`, defaultTextSize))));
    const { segments, index } = useMemo(() => readable(story), [story]);
    const container = useRef<HTMLDivElement>(null);
    const bar = useRef<HTMLDivElement>(null);
    const narration = useRef<HTMLAudioElement>(null);
    // The voice of the device reads the story unless a recorded narration exists.
    const voiced = !story.audio && reader.supported;
    const voiceSpeaking = reader.speaking && !reader.paused;
    const { stop: stopRecitation } = recitation;
    const mark = kids ? toneClasses[tone].mark : 'bg-gold-100/70 ring-gold-300/70 dark:bg-gold-500/15 dark:ring-gold-500/30';

    // The voice and the sheikh never speak together.
    useEffect(() => {
        if (voiceSpeaking) {
            stopRecitation();
        }
    }, [voiceSpeaking, stopRecitation]);

    // Follow the reading: bring the part being read under the listening bar when it leaves the view.
    useEffect(() => {
        const element = reader.current === null ? null : container.current?.querySelector<HTMLElement>(`[data-segment="${reader.current}"]`);

        if (!element) {
            return;
        }

        const top = element.getBoundingClientRect().top;
        const barBottom = bar.current?.getBoundingClientRect().bottom ?? 130;

        if (top < barBottom || top > window.innerHeight * 0.7) {
            window.scrollTo({ top: window.scrollY + top - barBottom - 16, behavior: 'smooth' });
        }
    }, [reader.current]);

    const readFrom = (position: number) => {
        // Selecting text is not a request to listen.
        if (!voiced || window.getSelection()?.toString()) {
            return;
        }

        // The part being read pauses and resumes; any other part is read from its start.
        if (reader.speaking && reader.current === position) {
            if (reader.paused) {
                reader.resume();
            } else {
                reader.pause();
            }

            return;
        }

        reader.speak(segments, position);
    };

    const segment = (key: string) => {
        const position = index.get(key);

        return { position, active: position !== undefined && position === reader.current, clickable: voiced, mark, onRead: readFrom };
    };

    const playPassage = (passage: StoryPassage) => {
        const label = passageLabel(passage);

        if (recitation.active && recitation.label === label) {
            recitation.stop();

            return;
        }

        reader.pause();
        narration.current?.pause();
        recitation.play(rangeQueue(passage.surah, passage.from, passage.surah, passage.to), label);
    };

    const passageState = (passage: StoryPassage): 'idle' | 'loading' | 'playing' => {
        if (!recitation.active || recitation.label !== passageLabel(passage)) {
            return 'idle';
        }

        return recitation.loading ? 'loading' : 'playing';
    };

    const chooseReciter = (item: ReciterItem) => {
        setReciterId(item.id);
        writePreference('stories.reciter', item.id);
    };

    const changeSize = (step: number) => {
        const value = Math.min(sizes.length - 1, Math.max(0, size + step));
        setSize(value);
        writePreference(`stories.size.${kind}`, value);
    };

    const progress = reader.speaking && reader.current !== null ? ((reader.current + 1) / segments.length) * 100 : 0;
    const title = segment('title');

    return (
        <div ref={container}>
            <Link href={route(storyRoute(kind, 'index'))} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
                <ArrowRight className="size-4 ltr:rotate-180" />
                {kids ? t('Kids stories') : t("Prophets' stories")}
            </Link>

            {kids ? <KidsHeader story={story} position={title.position} active={title.active} /> : <ProphetHeader story={story} position={title.position} active={title.active} />}

            <div ref={bar} className="sticky top-16 z-20 -mx-4 mb-3 border-b border-line bg-canvas/90 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                <div className="mx-auto flex max-w-3xl items-center gap-2">
                    <div className="min-w-0 flex-1">
                        {story.audio ? (
                            <audio
                                ref={narration}
                                controls
                                preload="none"
                                src={story.audio}
                                className="h-10 w-full"
                                onPlay={() => {
                                    reader.stop();
                                    recitation.stop();
                                }}
                            />
                        ) : (
                            <ReadAloudControls reader={reader} segments={segments} label={t('Listen to the story')} size="sm" notice={false} />
                        )}
                    </div>
                    <TextSizeControl size={size} count={sizes.length} onChange={changeSize} />
                </div>
                {progress > 0 && (
                    <div className="absolute inset-x-0 bottom-0 h-0.5">
                        <div className="h-full bg-gold-400 transition-[width] duration-500" style={{ width: `${progress}%` }} />
                    </div>
                )}
            </div>

            {!story.audio && (
                <div className="mx-auto mb-6 max-w-3xl space-y-2">
                    <ReadAloudNotice reader={reader} />
                    {reader.supported && <p className="text-xs text-muted">{t('Tap a paragraph to listen from it.')}</p>}
                </div>
            )}

            <article
                dir="rtl"
                lang="ar"
                className={cn('mx-auto max-w-3xl text-ink', kids ? 'leading-[1.95] font-medium' : 'font-quran leading-[2.15]', story.audio && 'mt-6')}
                style={{ fontSize: `${sizes[size]}px` }}
            >
                {story.sections.map((section, sectionIndex) => (
                    <section key={sectionIndex} className="mb-[1.4em]">
                        {section.heading &&
                            (kids ? (
                                <Segment as="h2" {...segment(`${sectionIndex}`)} className={cn('mb-[0.4em] flex items-center gap-2 text-[1.2em] font-bold', toneClasses[tone].text)}>
                                    <Star className="size-[0.8em] shrink-0 fill-current" />
                                    {section.heading}
                                </Segment>
                            ) : (
                                <Segment as="h2" {...segment(`${sectionIndex}`)} className="ornament-divider mb-[0.5em] text-center text-[1.25em] font-bold">
                                    <span className="text-primary-800 dark:text-gold-100">{section.heading}</span>
                                </Segment>
                            ))}

                        <div className="space-y-[0.5em]">
                            {section.paragraphs.map((paragraph, paragraphIndex) => (
                                <Segment key={paragraphIndex} {...segment(`${sectionIndex}.${paragraphIndex}`)}>
                                    {paragraph}
                                </Segment>
                            ))}
                        </div>

                        {section.ayahs.map((passage, passageIndex) => (
                            <PassageCard
                                key={passageIndex}
                                passage={passage}
                                reciters={reciters}
                                reciter={reciter}
                                state={passageState(passage)}
                                onPlay={() => playPassage(passage)}
                                onReciter={chooseReciter}
                            />
                        ))}
                    </section>
                ))}

                {story.lessons.length > 0 && (
                    <section
                        className={cn(
                            'mt-[1.6em] rounded-3xl border px-5 py-4 sm:px-6',
                            kids ? 'border-amber-200 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/10' : 'border-gold-200 bg-gold-50/60 dark:border-gold-500/20 dark:bg-gold-500/10',
                        )}
                    >
                        <Segment as="h2" {...segment('lessons')} className="mb-[0.3em] flex items-center gap-2 text-[1.1em] font-bold text-amber-800 dark:text-amber-200">
                            <Lightbulb className="size-[1em] shrink-0" />
                            {translate('ar', 'Lessons of the story')}
                        </Segment>
                        <ul className="space-y-[0.3em]">
                            {story.lessons.map((lesson, lessonIndex) => (
                                <Segment key={lessonIndex} as="li" {...segment(`lesson.${lessonIndex}`)} className="flex items-start gap-3">
                                    <span className="mt-[0.5em] flex size-[1.1em] shrink-0 items-center justify-center rounded-full bg-amber-400 text-white">
                                        <Star className="size-[0.6em] fill-current" />
                                    </span>
                                    <span>{lesson}</span>
                                </Segment>
                            ))}
                        </ul>
                    </section>
                )}
            </article>

            <StoryNavigation kind={kind} previous={previous} next={next} />
        </div>
    );
}

interface SegmentProps {
    as?: 'p' | 'h2' | 'li';
    /** Index of the segment for the voice (undefined when it is not read). */
    position: number | undefined;
    active: boolean;
    clickable: boolean;
    /** Colors of the segment being read. */
    mark: string;
    onRead: (position: number) => void;
    className?: string;
    children: ReactNode;
}

/**
 * A part of the story read by the voice: highlighted while it is read, and read from when clicked.
 */
function Segment({ as: Tag = 'p', position, active, clickable, mark, onRead, className, children }: SegmentProps) {
    return (
        <Tag
            data-segment={position}
            onClick={clickable && position !== undefined ? () => onRead(position) : undefined}
            className={cn(
                '-mx-3 rounded-2xl px-3 py-0.5 ring-inset transition-colors duration-300',
                clickable && position !== undefined && 'cursor-pointer',
                active ? cn('ring-1', mark) : clickable && position !== undefined && 'hover:bg-surface-muted',
                className,
            )}
        >
            {children}
        </Tag>
    );
}

function KidsHeader({ story, position, active }: { story: Story; position: number | undefined; active: boolean }) {
    const { locale } = useTrans();

    return (
        <header
            data-segment={position}
            className={cn(
                'relative mb-5 overflow-hidden rounded-[2rem] bg-linear-to-br px-6 py-7 text-white shadow-xl transition sm:px-8',
                toneClasses[toneOf(story)].solid,
                active && 'ring-4 ring-amber-300/80',
            )}
        >
            <span className="pointer-events-none absolute -start-10 -top-10 size-40 rounded-full bg-white/10" />
            <span className="pointer-events-none absolute -end-6 -bottom-12 size-44 rounded-full bg-white/10" />
            <Star className="pointer-events-none absolute end-6 top-5 size-5 fill-amber-200 text-amber-200 opacity-80" />
            <Star className="pointer-events-none absolute end-16 bottom-6 size-3.5 fill-white text-white opacity-60" />

            <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:text-start">
                <span className="flex size-20 shrink-0 items-center justify-center rounded-[1.75rem] bg-white/20 ring-4 ring-white/25">
                    <StoryIcon name={story.icon} kind="kids" className="size-10 drop-shadow" />
                </span>
                <div className="min-w-0">
                    <h1 className="text-3xl leading-tight font-bold sm:text-4xl">{localized(story.title, locale)}</h1>
                    <p className="mt-2 text-base leading-relaxed text-white/90">{localized(story.summary, locale)}</p>
                    <ReadingTime minutes={story.minutes} className="mt-3 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/20" />
                </div>
            </div>
        </header>
    );
}

function ProphetHeader({ story, position, active }: { story: Story; position: number | undefined; active: boolean }) {
    const { t, locale } = useTrans();

    return (
        <header
            data-segment={position}
            className={cn(
                'relative mb-5 overflow-hidden rounded-3xl bg-linear-to-br from-primary-800 via-primary-900 to-sidebar px-6 py-8 text-white shadow-xl shadow-primary-950/20 transition sm:px-10',
                active && 'ring-4 ring-gold-300/70',
            )}
        >
            <IslamicPattern className="text-gold-300/[0.10]" size={60} />
            <div className="pointer-events-none absolute -end-16 -top-20 size-64 rounded-full bg-gold-400/15 blur-3xl" />

            <div className="relative flex items-start gap-4 sm:gap-5">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-gold-300/70 bg-white/5 font-quran text-2xl font-bold text-gold-200 sm:size-16 sm:text-3xl">
                    {locale === 'ar' ? arabicDigits(story.order) : story.order}
                </span>
                <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-gold-200">
                        <StoryIcon name={story.icon} kind="prophets" className="size-4" />
                        {t("Prophets' stories")}
                    </p>
                    <h1 className="mt-1 font-quran text-3xl leading-snug font-bold sm:text-4xl">{localized(story.title, locale)}</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">{localized(story.summary, locale)}</p>
                    <ReadingTime minutes={story.minutes} className="mt-3 text-xs text-white/70" />
                </div>
            </div>
        </header>
    );
}

function TextSizeControl({ size, count, onChange }: { size: number; count: number; onChange: (step: number) => void }) {
    const { t } = useTrans();
    const classes = 'inline-flex size-8 items-center justify-center rounded-[10px] text-muted transition hover:bg-surface-muted hover:text-ink disabled:opacity-40';

    return (
        <div role="group" aria-label={t('Text size')} className="flex shrink-0 items-center rounded-xl border border-line bg-surface p-0.5">
            <button type="button" onClick={() => onChange(-1)} disabled={size === 0} aria-label={t('Smaller text')} title={t('Smaller text')} className={classes}>
                <AArrowDown className="size-4.5" />
            </button>
            <button type="button" onClick={() => onChange(1)} disabled={size === count - 1} aria-label={t('Larger text')} title={t('Larger text')} className={classes}>
                <AArrowUp className="size-4.5" />
            </button>
        </div>
    );
}

interface PassageCardProps {
    passage: StoryPassage;
    reciters: ReciterItem[];
    reciter: ReciterItem | null;
    state: 'idle' | 'loading' | 'playing';
    onPlay: () => void;
    onReciter: (reciter: ReciterItem) => void;
}

/**
 * Ayahs told in the story, from the Quran text of the database, recited by a sheikh (never by the voice).
 */
function PassageCard({ passage, reciters, reciter, state, onPlay, onReciter }: PassageCardProps) {
    const { t } = useTrans();
    const replacements = { surah: surahName(passage.surah, 'ar'), ayah: arabicDigits(passage.from), from: arabicDigits(passage.from), to: arabicDigits(passage.to) };
    const reference = passage.from === passage.to ? translate('ar', 'Surah :surah, ayah :ayah', replacements) : translate('ar', 'Surah :surah, ayahs :from–:to', replacements);

    return (
        <figure className="my-[1em] overflow-hidden rounded-3xl border border-gold-200 bg-gold-50/60 dark:border-gold-500/25 dark:bg-gold-500/10">
            {passage.verses.length > 0 ? (
                <blockquote
                    className="px-5 pt-5 pb-2 text-center font-mushaf text-[1.3em] leading-[2.2] font-normal text-ink"
                    style={{ '--paper-ink': 'var(--color-ink)' } as CSSProperties}
                >
                    <span className="text-gold-600 dark:text-gold-400">{'﴿'}</span>
                    {passage.verses.map((verse) => (
                        <Fragment key={verse.ayah}>
                            {verse.text}
                            <AyahMarker number={verse.ayah} />
                        </Fragment>
                    ))}
                    <span className="text-gold-600 dark:text-gold-400">{'﴾'}</span>
                </blockquote>
            ) : (
                <p className="flex items-center gap-2 px-5 pt-4 font-sans text-sm text-muted">
                    <BookOpen className="size-4 shrink-0" />
                    {t('The Quran text is not installed yet')}
                </p>
            )}

            <figcaption className="flex flex-wrap items-center justify-between gap-2 px-4 pt-1 pb-3 font-sans">
                <span className="text-sm font-semibold text-gold-800 dark:text-gold-300">{reference}</span>
                {reciter && (
                    <div className="flex items-center gap-1">
                        <Button size="sm" variant={state === 'idle' ? 'gold' : 'secondary'} onClick={onPlay}>
                            {state === 'loading' ? <LoaderCircle className="animate-spin" /> : state === 'playing' ? <Square /> : <Headphones />}
                            {state === 'idle' ? t('Listen to the ayahs') : t('Stop')}
                        </Button>
                        {reciters.length > 1 && (
                            <Dropdown
                                className="w-64"
                                trigger={
                                    <button
                                        type="button"
                                        aria-label={t('Choose the reciter')}
                                        title={t('Choose the reciter')}
                                        className="inline-flex size-9 items-center justify-center rounded-xl text-gold-700 transition hover:bg-gold-100 dark:text-gold-300 dark:hover:bg-gold-500/15"
                                    >
                                        <UserRound className="size-4" />
                                    </button>
                                }
                            >
                                <DropdownLabel>{t('Choose the reciter')}</DropdownLabel>
                                {reciters.map((item) => (
                                    <DropdownItem key={item.id} icon={item.id === reciter.id ? Check : UserRound} onClick={() => onReciter(item)}>
                                        {item.name}
                                    </DropdownItem>
                                ))}
                            </Dropdown>
                        )}
                    </div>
                )}
            </figcaption>
        </figure>
    );
}

function StoryNavigation({ kind, previous, next }: { kind: StoryKind; previous: StorySummary | null; next: StorySummary | null }) {
    const { t, locale } = useTrans();

    if (!previous && !next) {
        return null;
    }

    const card = 'group flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-xs transition hover:border-primary-300 hover:shadow-md';

    return (
        <nav className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">
            {previous && (
                <Link href={route(storyRoute(kind, 'show'), previous.slug)} prefetch className={card}>
                    <ChevronRight className="size-5 shrink-0 text-muted transition group-hover:translate-x-0.5 ltr:rotate-180 ltr:group-hover:-translate-x-0.5" />
                    <span className="min-w-0">
                        <span className="block text-xs font-semibold text-muted">{t('Previous story')}</span>
                        <span className="block truncate font-bold text-ink">{localized(previous.title, locale)}</span>
                    </span>
                </Link>
            )}
            {next && (
                <Link href={route(storyRoute(kind, 'show'), next.slug)} prefetch className={cn(card, 'justify-end text-end sm:col-start-2')}>
                    <span className="min-w-0">
                        <span className="block text-xs font-semibold text-muted">{t('Next story')}</span>
                        <span className="block truncate font-bold text-ink">{localized(next.title, locale)}</span>
                    </span>
                    <ChevronLeft className="size-5 shrink-0 text-muted transition group-hover:-translate-x-0.5 ltr:rotate-180 ltr:group-hover:translate-x-0.5" />
                </Link>
            )}
        </nav>
    );
}
