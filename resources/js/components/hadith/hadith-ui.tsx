import { Link } from '@inertiajs/react';
import {
    BookOpen,
    BookText,
    Copy,
    ExternalLink,
    Feather,
    Gem,
    Hash,
    Heart,
    Landmark,
    Library,
    type LucideIcon,
    MoonStar,
    Scale,
    ScrollText,
    Sparkles,
    Star,
    Sun,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Highlight } from '@/components/community/highlight';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { citation, collectionTone, gradeTone, type HadithItem, nameOf } from '@/lib/hadith';
import { useTrans } from '@/lib/i18n';
import { arabicDigits } from '@/lib/quran';
import { cn, copyText } from '@/lib/utils';

/**
 * The icons a collection may name (lucide names); any other name falls back to an open book.
 */
const icons: Record<string, LucideIcon> = {
    'book-marked': BookText,
    'book-open': BookOpen,
    'book-text': BookText,
    feather: Feather,
    gem: Gem,
    heart: Heart,
    landmark: Landmark,
    library: Library,
    'moon-star': MoonStar,
    scale: Scale,
    'scroll-text': ScrollText,
    sparkles: Sparkles,
    star: Star,
    sun: Sun,
};

export function CollectionIcon({ name, className }: { name: string; className?: string }) {
    const Icon = icons[name] ?? BookOpen;

    return <Icon className={className} />;
}

/**
 * Texts longer than this are shortened in lists, with a button to read them whole.
 */
const LONG_TEXT = 700;

interface HadithCardProps {
    hadith: HadithItem;
    /** The slug of the collection, when the hadith does not carry it. */
    collectionSlug?: string;
    /** Words to mark in the text (reduced like the search). */
    terms?: string[];
    showCollection?: boolean;
    showBook?: boolean;
    /** Whole text in a larger type (the page of the hadith, the hadith of the day). */
    featured?: boolean;
    /** Link to the page of the hadith. */
    linked?: boolean;
}

/**
 * One hadith: its number, book and collection, its text and its grade, with a copy button.
 */
export function HadithCard({ hadith, collectionSlug, terms = [], showCollection = false, showBook = false, featured = false, linked = true }: HadithCardProps) {
    const { t, locale } = useTrans();
    const [expanded, setExpanded] = useState(false);
    const slug = hadith.collection?.slug ?? collectionSlug;
    const long = !featured && hadith.text.length > LONG_TEXT;
    const collectionName = hadith.collection ? nameOf(hadith.collection, locale) : '';

    const copy = async () => {
        if (await copyText(citation(hadith, collectionName))) {
            toast.success(t('Copied'));
        }
    };

    return (
        <Card className={cn('overflow-hidden', featured && 'border-gold-300/70 shadow-md dark:border-gold-500/30')}>
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5 sm:px-5">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-bold text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
                    <Hash className="size-3" />
                    {locale === 'ar' ? arabicDigits(hadith.label) : hadith.label}
                </span>
                {showCollection && hadith.collection && (
                    <Badge tone={collectionTone(hadith.collection.color)}>{collectionName}</Badge>
                )}
                {showBook && hadith.book && <span className="truncate text-xs font-semibold text-muted">{nameOf(hadith.book, locale)}</span>}
                <span className="ms-auto flex items-center gap-0.5">
                    <button
                        type="button"
                        onClick={() => void copy()}
                        className="rounded-lg p-1.5 text-muted transition hover:bg-surface-muted hover:text-ink"
                        aria-label={t('Copy')}
                        title={t('Copy')}
                    >
                        <Copy className="size-4" />
                    </button>
                    {linked && slug && (
                        <Link
                            href={route('hadith.hadith', { collection: slug, number: hadith.number })}
                            className="rounded-lg p-1.5 text-muted transition hover:bg-surface-muted hover:text-ink"
                            aria-label={t('Open the hadith')}
                            title={t('Open the hadith')}
                        >
                            <ExternalLink className="size-4" />
                        </Link>
                    )}
                </span>
            </div>

            <div className="px-4 py-4 sm:px-6 sm:py-5">
                <p
                    dir="rtl"
                    className={cn('font-quran leading-[2.1] text-ink', featured ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl', long && !expanded && 'line-clamp-6')}
                >
                    <Highlight text={hadith.text} terms={terms} />
                </p>
                {long && (
                    <button
                        type="button"
                        onClick={() => setExpanded((value) => !value)}
                        className="mt-2 text-sm font-semibold text-primary-700 hover:underline dark:text-primary-300"
                    >
                        {expanded ? t('Show less') : t('Read the whole hadith')}
                    </button>
                )}
            </div>

            {hadith.grade && (
                <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-muted/60 px-4 py-2.5 text-xs sm:px-5">
                    <Badge tone={gradeTone(hadith.grade)} dot>
                        {hadith.grade}
                    </Badge>
                    {hadith.grader && <span className="text-muted">{t('Graded by :name', { name: hadith.grader })}</span>}
                </div>
            )}
        </Card>
    );
}
