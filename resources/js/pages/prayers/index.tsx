import { Link } from '@inertiajs/react';
import {
    ArrowRight,
    BookOpenText,
    ChevronLeft,
    CloudRain,
    Compass,
    Copy,
    Droplets,
    Eclipse,
    HeartHandshake,
    Info,
    Landmark,
    Layers,
    ListOrdered,
    Moon,
    MoonStar,
    Quote,
    Sparkles,
    Sun,
    Users,
    type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { ReminderCard, type ReminderSettings } from '@/components/prayers/reminder-card';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { useTrans } from '@/lib/i18n';
import { localized, type PrayerGuide, prayerGuides, type PrayerReminderType } from '@/lib/prayers';
import { arabicDigits } from '@/lib/quran';
import { cn, copyText } from '@/lib/utils';

interface PrayersProps {
    slug: string | null;
    reminders: Record<PrayerReminderType, ReminderSettings>;
    timezone: string;
}

const icons: Record<string, LucideIcon> = {
    'moon-star': MoonStar,
    layers: Layers,
    sun: Sun,
    landmark: Landmark,
    droplets: Droplets,
    compass: Compass,
    'heart-handshake': HeartHandshake,
    moon: Moon,
    sparkles: Sparkles,
    eclipse: Eclipse,
    'cloud-rain': CloudRain,
    users: Users,
};

const tones: Record<PrayerGuide['tone'], { soft: string; solid: string }> = {
    violet: { soft: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300', solid: 'from-violet-600 to-indigo-800' },
    gold: { soft: 'bg-gold-50 text-gold-700 dark:bg-gold-500/10 dark:text-gold-300', solid: 'from-gold-500 to-amber-700' },
    emerald: { soft: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300', solid: 'from-emerald-600 to-primary-800' },
    sky: { soft: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300', solid: 'from-sky-500 to-sky-800' },
    rose: { soft: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300', solid: 'from-rose-500 to-rose-800' },
    teal: { soft: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300', solid: 'from-teal-500 to-teal-800' },
    slate: { soft: 'bg-stone-100 text-stone-700 dark:bg-white/5 dark:text-stone-300', solid: 'from-stone-600 to-stone-900' },
};

/**
 * Prayer: daily reminders of the night prayer and duha, and how to pray the voluntary prayers.
 */
export default function Prayers({ slug, reminders }: PrayersProps) {
    const { t } = useTrans();
    const guide = slug ? prayerGuides.find((item) => item.slug === slug) : undefined;

    if (guide) {
        return <GuidePage guide={guide} reminders={reminders} />;
    }

    return (
        <AppLayout title={t('Prayer')} description={t('Reminders of the night prayer and duha, and how to pray the voluntary prayers with their du\'as.')}>
            <div className="grid gap-5 lg:grid-cols-2">
                <ReminderCard type="qiyam" reminder={reminders.qiyam} showGuideLink />
                <ReminderCard type="duha" reminder={reminders.duha} showGuideLink />
            </div>

            <h2 className="mt-10 mb-4 flex items-center gap-2 text-lg font-bold text-ink">
                <BookOpenText className="size-5 text-primary-600" />
                {t('The voluntary prayers')}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {prayerGuides.map((item) => (
                    <GuideCard key={item.slug} guide={item} />
                ))}
            </div>

            <ContentNote className="mt-8" />
        </AppLayout>
    );
}

function GuideCard({ guide }: { guide: PrayerGuide }) {
    const { t, locale } = useTrans();
    const Icon = icons[guide.icon] ?? Sparkles;

    return (
        <Link
            href={route('prayers.show', guide.slug)}
            className="group flex flex-col rounded-3xl border border-line bg-surface p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-lg"
        >
            <div className="flex items-center gap-3">
                <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-2xl', tones[guide.tone].soft)}>
                    <Icon className="size-5" />
                </span>
                <h3 className="font-bold text-ink">{localized(guide.title, locale)}</h3>
            </div>
            <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-muted">{localized(guide.summary, locale)}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-700 dark:text-primary-300">
                {t('How to pray it')}
                <ChevronLeft className="size-4 transition group-hover:-translate-x-0.5 ltr:rotate-180 ltr:group-hover:translate-x-0.5" />
            </span>
        </Link>
    );
}

function GuidePage({ guide, reminders }: { guide: PrayerGuide; reminders: PrayersProps['reminders'] }) {
    const { t, locale } = useTrans();
    const Icon = icons[guide.icon] ?? Sparkles;
    const title = localized(guide.title, locale);

    const copy = async (text: string) => {
        if (await copyText(text)) {
            toast.success(t('Copied'));
        }
    };

    return (
        <AppLayout title={title} hideHeader>
            <Link href={route('prayers.index')} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
                <ArrowRight className="size-4 ltr:rotate-180" />
                {t('Prayer')}
            </Link>

            <header className={cn('relative mb-6 overflow-hidden rounded-3xl bg-linear-to-br px-6 py-7 text-white shadow-xl sm:px-8', tones[guide.tone].solid)}>
                <div className="pointer-events-none absolute -end-12 -top-12 size-48 rounded-full bg-white/10 blur-2xl" />
                <div className="relative flex items-start gap-4">
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                        <Icon className="size-7" />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">{localized(guide.summary, locale)}</p>
                    </div>
                </div>
            </header>

            {guide.reminder && (
                <div className="mb-6">
                    <ReminderCard type={guide.reminder} reminder={reminders[guide.reminder]} />
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {guide.facts.map((fact, index) => (
                    <div key={index} className="rounded-2xl border border-line bg-surface p-4">
                        <p className="text-xs font-semibold text-muted">{localized(fact.label, locale)}</p>
                        <p className="mt-1 leading-relaxed font-semibold text-ink">{localized(fact.value, locale)}</p>
                    </div>
                ))}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-5">
                <Card className="p-5 sm:p-6 lg:col-span-3">
                    <h2 className="mb-4 flex items-center gap-2 font-bold text-ink">
                        <ListOrdered className="size-5 text-primary-600" />
                        {t('How to pray it')}
                    </h2>
                    <ol className="space-y-3">
                        {guide.steps.map((step, index) => (
                            <li key={index} className="flex gap-3">
                                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
                                    {locale === 'ar' ? arabicDigits(index + 1) : index + 1}
                                </span>
                                <p className="pt-0.5 leading-relaxed text-ink">{localized(step, locale)}</p>
                            </li>
                        ))}
                    </ol>
                </Card>

                <div className="space-y-4 lg:col-span-2">
                    <h2 className="flex items-center gap-2 font-bold text-ink">
                        <Quote className="size-5 text-gold-600" />
                        {t('Its virtue')}
                    </h2>
                    {guide.virtues.map((virtue, index) => (
                        <figure key={index} className="rounded-2xl border-s-4 border-gold-400 bg-gold-50/60 px-4 py-3 dark:bg-gold-500/10">
                            <blockquote dir="rtl" className="font-quran text-lg leading-loose text-ink">
                                {virtue.text}
                            </blockquote>
                            <figcaption className="mt-1 text-xs font-semibold text-gold-700 dark:text-gold-300">{virtue.source}</figcaption>
                        </figure>
                    ))}
                </div>
            </div>

            {guide.duas.length > 0 && (
                <>
                    <h2 className="mt-8 mb-4 flex items-center gap-2 text-lg font-bold text-ink">
                        <HeartHandshake className="size-5 text-primary-600" />
                        {t('Du\'as')}
                    </h2>
                    <div className="grid gap-4 lg:grid-cols-2">
                        {guide.duas.map((dua, index) => (
                            <Card key={index} className="p-5">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <h3 className="font-bold text-ink">{localized(dua.title, locale)}</h3>
                                    <button
                                        type="button"
                                        onClick={() => void copy(dua.text)}
                                        className="rounded-lg p-1.5 text-muted transition hover:bg-surface-muted hover:text-ink"
                                        aria-label={t('Copy')}
                                        title={t('Copy')}
                                    >
                                        <Copy className="size-4" />
                                    </button>
                                </div>
                                <p dir="rtl" className="font-quran text-xl leading-[2.1] text-ink">
                                    {dua.text}
                                </p>
                                <p className="mt-2 text-xs font-semibold text-muted">{dua.source}</p>
                            </Card>
                        ))}
                    </div>
                </>
            )}

            <ContentNote className="mt-8" />
        </AppLayout>
    );
}

function ContentNote({ className }: { className?: string }) {
    const { t } = useTrans();

    return (
        <p className={cn('flex items-start gap-2 rounded-2xl bg-surface-muted px-4 py-3 text-xs leading-relaxed text-muted', className)}>
            <Info className="mt-0.5 size-4 shrink-0" />
            {t('A short guide for learning and reminding. Scholars differ on some details; ask a trusted scholar about your own case.')}
        </p>
    );
}
