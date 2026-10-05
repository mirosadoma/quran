import { Link, usePage } from '@inertiajs/react';
import { ArrowLeft, BookOpenCheck, BookOpenText, Building2, CheckCircle2, Download, LayoutDashboard, UserPlus, Video } from 'lucide-react';
import { useState } from 'react';
import { AcademyCard } from '@/components/academy/academy-card';
import { IslamicPattern, StarOrnament } from '@/components/brand';
import { SiteSection } from '@/components/site/section';
import { LinkButton } from '@/components/ui/button';
import { VideoCard, VideoPlayer } from '@/components/video/video-components';
import PublicLayout from '@/layouts/public-layout';
import { useTrans } from '@/lib/i18n';
import { localized } from '@/lib/prayers';
import { surahName } from '@/lib/quran';
import { site, siteIcon } from '@/lib/site';
import { cn, formatNumber } from '@/lib/utils';
import type { AcademyItem, VideoItem } from '@/types';

interface HomeProps {
    stats: { academies: number; teachers: number; students: number; halaqat: number };
    ayahs: { surah: number; ayah: number; text: string; tafsir: string | null }[];
    academies: AcademyItem[];
    videos: VideoItem[];
}

const featureTones: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    gold: 'bg-gold-50 text-gold-700 dark:bg-gold-500/10 dark:text-gold-300',
    teal: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300',
    sky: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    violet: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
    slate: 'bg-stone-100 text-stone-600 dark:bg-white/5 dark:text-stone-300',
};

function Hero({ stats }: { stats: HomeProps['stats'] }) {
    const { auth } = usePage().props;
    const { t, locale } = useTrans();

    const numbers = [
        { label: t('Academies'), value: stats.academies },
        { label: t('Teachers'), value: stats.teachers },
        { label: t('Students'), value: stats.students },
        { label: t('Halaqat'), value: stats.halaqat },
    ];

    return (
        <section className="relative overflow-hidden bg-sidebar text-white">
            <IslamicPattern className="text-gold-300/[0.09]" size={80} />
            <div className="pointer-events-none absolute -top-40 -end-24 size-[34rem] rounded-full bg-primary-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-40 start-0 size-96 rounded-full bg-gold-400/10 blur-3xl" />

            <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pt-14 pb-10 sm:px-6 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:px-8 lg:pt-24">
                <div className="text-center lg:text-start">
                    <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-gold-200 ring-1 ring-white/15 backdrop-blur sm:text-sm">
                        <StarOrnament className="size-3 text-gold-400" />
                        {t('Free registration for everyone who loves the Quran')}
                    </p>
                    <h1 className="mt-6 text-4xl leading-[1.25] font-bold sm:text-5xl lg:text-6xl">
                        {t('Learn the Quran in a halaqa with a teacher,')} <span className="text-gold-300">{t('wherever you are')}</span>
                    </h1>
                    <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-sidebar-ink/80 sm:text-lg lg:mx-0">
                        {t('Academies, teachers and live halaqat, with your memorization tracked ayah by ayah, and tools that keep you company with the Quran and worship every day.')}
                    </p>
                    <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                        {auth.user ? (
                            <LinkButton href={route('dashboard')} variant="gold" size="lg">
                                <LayoutDashboard />
                                {t('Go to your dashboard')}
                            </LinkButton>
                        ) : (
                            <LinkButton href={route('register')} variant="gold" size="lg">
                                <UserPlus />
                                {t('Create a free account')}
                            </LinkButton>
                        )}
                        <LinkButton href={route('site.academies')} variant="light" size="lg">
                            <Building2 />
                            {t('Browse the academies')}
                        </LinkButton>
                    </div>
                    {!auth.user && (
                        <p className="mt-4 text-sm text-sidebar-ink/70">
                            {t('Already have an account?')}{' '}
                            <Link href={route('login')} className="font-semibold text-gold-200 underline-offset-4 hover:underline">
                                {t('Sign in')}
                            </Link>
                        </p>
                    )}
                </div>

                <div className="relative mx-auto w-full max-w-md lg:max-w-none">
                    <div className="relative rounded-[2rem] bg-white/[0.06] p-8 text-center ring-1 ring-white/15 backdrop-blur sm:p-10">
                        <span className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-gold-400/15 ring-1 ring-gold-300/25">
                            <BookOpenText className="size-8 text-gold-300" />
                        </span>
                        <p className="font-quran mt-6 text-3xl leading-[1.8] sm:text-4xl" dir="rtl">
                            <span className="text-gold-400">﴿</span> وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا <span className="text-gold-400">﴾</span>
                        </p>
                        <p className="mt-2 text-xs text-gold-200/80">
                            {surahName(73, locale)} · {formatNumber(4, locale)}
                        </p>
                        <div className="ornament-divider my-6 text-gold-400/70">
                            <StarOrnament className="size-3" />
                        </div>
                        <p className="font-quran text-xl leading-relaxed text-white/90" dir="rtl">
                            «خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ»
                        </p>
                        <p className="mt-1.5 text-xs text-sidebar-ink/60">{t('Narrated by Al-Bukhari')}</p>
                    </div>

                    <div className="absolute -start-4 top-8 hidden items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-ink shadow-2xl shadow-black/20 sm:flex lg:-start-10">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                            <Video className="size-5" />
                        </span>
                        <span className="text-start">
                            <span className="block text-sm font-bold">{t('Your session starts soon')}</span>
                            <span className="block text-xs text-muted">{t('Join with one tap')}</span>
                        </span>
                    </div>
                    <div className="absolute -end-4 bottom-8 hidden items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-ink shadow-2xl shadow-black/20 sm:flex lg:-end-8">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-gold-50 text-gold-700 dark:bg-gold-500/10 dark:text-gold-300">
                            <BookOpenCheck className="size-5" />
                        </span>
                        <span className="text-start">
                            <span className="block text-sm font-bold">{t('Excellent memorization')}</span>
                            <span className="block text-xs text-muted">{surahName(67, locale)}</span>
                        </span>
                    </div>
                </div>
            </div>

            <div className="relative mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
                <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-white/10 ring-1 ring-white/10 sm:grid-cols-4">
                    {numbers.map((item) => (
                        <div key={item.label} className="bg-sidebar/60 px-4 py-5 text-center backdrop-blur">
                            <dd className="text-3xl font-bold text-white tabular-nums">{formatNumber(item.value, locale)}</dd>
                            <dt className="mt-1 text-sm text-sidebar-ink/70">{item.label}</dt>
                        </div>
                    ))}
                </dl>
            </div>
        </section>
    );
}

function Ayahs({ ayahs }: { ayahs: HomeProps['ayahs'] }) {
    const { auth } = usePage().props;
    const { t, locale } = useTrans();

    if (ayahs.length === 0) {
        return null;
    }

    return (
        <SiteSection
            eyebrow={t('Ayahs and their meaning')}
            title={t('Read the Quran and understand it')}
            description={t('Ayahs about the Book of Allah with their explanation from Al-Muyassar tafsir. In the recited mushaf you find the tafsir of every ayah and the meaning of its words.')}
            actions={
                <LinkButton href={auth.user ? route('mushaf.index') : route('register')} variant="outline">
                    <BookOpenText />
                    {t('Open the recited mushaf')}
                </LinkButton>
            }
        >
            <div className="grid gap-5 md:grid-cols-2">
                {ayahs.map((ayah) => (
                    <article key={`${ayah.surah}:${ayah.ayah}`} className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6 sm:p-8">
                        <IslamicPattern className="text-gold-500/[0.05]" size={56} />
                        <p className="quran-text relative text-2xl leading-[2.1] text-ink sm:text-[1.7rem]" dir="rtl">
                            <span className="text-gold-500">﴿</span> {ayah.text} <span className="text-gold-500">﴾</span>
                        </p>
                        <p className="relative mt-2 text-xs font-semibold text-gold-600 dark:text-gold-400">
                            {t('Surah :surah, ayah :ayah', { surah: surahName(ayah.surah, locale), ayah: formatNumber(ayah.ayah, locale) })}
                        </p>
                        {ayah.tafsir && (
                            <div className="relative mt-5 border-t border-line pt-4">
                                <p className="text-xs font-bold text-primary-700 dark:text-primary-300">{t('Al-Muyassar tafsir')}</p>
                                <p className="mt-1.5 text-sm leading-relaxed text-muted" dir="rtl">
                                    {ayah.tafsir}
                                </p>
                            </div>
                        )}
                    </article>
                ))}
            </div>
        </SiteSection>
    );
}

export default function Home({ stats, ayahs, academies, videos }: HomeProps) {
    const { auth } = usePage().props;
    const { t, locale } = useTrans();
    const [playing, setPlaying] = useState<VideoItem | null>(null);

    const audienceLinks = [
        { href: auth.user ? route('dashboard') : route('register'), label: auth.user ? t('Go to your dashboard') : t('Create a free account') },
        { href: route('site.academies'), label: t('Browse the academies') },
        { href: route('site.contact'), label: t('Contact us to add your academy') },
    ];

    return (
        <PublicLayout
            title={t('Learn the Quran in a halaqa with a teacher')}
            description={t('Academies, teachers and live halaqat, with your memorization tracked ayah by ayah, and tools that keep you company with the Quran and worship every day.')}
        >
            <Hero stats={stats} />

            <Ayahs ayahs={ayahs} />

            <div className="border-y border-line bg-surface/60">
                <SiteSection
                    eyebrow={t('What the platform offers')}
                    title={t('Everything you need on your journey with the Quran')}
                    description={t('From the live halaqa with your teacher to the adhkar of your morning, in one place, on your phone and your computer.')}
                >
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {site.features.map((feature) => {
                            const Icon = siteIcon(feature.icon);

                            return (
                                <div key={feature.icon + feature.title.en} className="rounded-3xl border border-line bg-surface p-6 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary-950/5">
                                    <span className={cn('flex size-12 items-center justify-center rounded-2xl', featureTones[feature.tone])}>
                                        <Icon className="size-6" />
                                    </span>
                                    <h3 className="mt-5 text-lg font-bold text-ink">{localized(feature.title, locale)}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-muted">{localized(feature.text, locale)}</p>
                                </div>
                            );
                        })}
                    </div>
                </SiteSection>
            </div>

            <SiteSection
                eyebrow={t('Join us')}
                title={t('Choose the way that suits you')}
                description={t('Individuals, students of academies and academies themselves: everyone finds their place.')}
            >
                <div className="grid gap-5 lg:grid-cols-3">
                    {site.audiences.map((audience, index) => {
                        const Icon = siteIcon(audience.icon);
                        const featured = index === 1;

                        return (
                            <div
                                key={audience.icon}
                                className={cn(
                                    'relative flex flex-col overflow-hidden rounded-3xl p-7',
                                    featured ? 'bg-sidebar text-white shadow-2xl shadow-primary-950/20' : 'border border-line bg-surface',
                                )}
                            >
                                {featured && <IslamicPattern className="text-gold-300/[0.08]" size={56} />}
                                <span
                                    className={cn(
                                        'relative flex size-12 items-center justify-center rounded-2xl',
                                        featured ? 'bg-gold-400/15 text-gold-300' : 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300',
                                    )}
                                >
                                    <Icon className="size-6" />
                                </span>
                                <h3 className={cn('relative mt-5 text-xl font-bold', featured ? 'text-white' : 'text-ink')}>{localized(audience.title, locale)}</h3>
                                <p className={cn('relative mt-2 text-sm leading-relaxed', featured ? 'text-sidebar-ink/80' : 'text-muted')}>
                                    {localized(audience.text, locale)}
                                </p>
                                <ul className="relative mt-5 flex-1 space-y-2.5">
                                    {audience.points.map((point) => (
                                        <li key={point.en} className={cn('flex gap-2 text-sm', featured ? 'text-sidebar-ink' : 'text-ink')}>
                                            <CheckCircle2 className={cn('mt-0.5 size-4 shrink-0', featured ? 'text-gold-300' : 'text-primary-600')} />
                                            {localized(point, locale)}
                                        </li>
                                    ))}
                                </ul>
                                <LinkButton href={audienceLinks[index].href} variant={featured ? 'gold' : 'secondary'} className="relative mt-7 w-full">
                                    {audienceLinks[index].label}
                                </LinkButton>
                            </div>
                        );
                    })}
                </div>
            </SiteSection>

            {academies.length > 0 && (
                <div className="border-y border-line bg-surface/60">
                    <SiteSection
                        eyebrow={t('Academies')}
                        title={t('Academies that welcome you')}
                        description={t('Every academy has its teachers and halaqat. Visit its page, see its halaqat and times, and ask to join.')}
                        actions={
                            <LinkButton href={route('site.academies')} variant="outline">
                                {t('All academies')}
                                <ArrowLeft className="ltr:rotate-180" />
                            </LinkButton>
                        }
                    >
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {academies.map((academy) => (
                                <AcademyCard
                                    key={academy.id}
                                    academy={academy}
                                    href={route('site.academy', academy.slug)}
                                    action={
                                        <LinkButton href={route('site.academy', academy.slug)} variant="secondary" className="w-full">
                                            {t('View the academy')}
                                        </LinkButton>
                                    }
                                />
                            ))}
                        </div>
                    </SiteSection>
                </div>
            )}

            <SiteSection eyebrow={t('How it works')} title={t('Three steps and you start')}>
                <ol className="grid gap-5 md:grid-cols-3">
                    {site.steps.map((step, index) => (
                        <li key={step.title.en} className="relative rounded-3xl border border-line bg-surface p-7">
                            <span className="flex size-12 items-center justify-center rounded-2xl bg-gold-500 text-xl font-bold text-white shadow-lg shadow-gold-900/20">
                                {formatNumber(index + 1, locale)}
                            </span>
                            <h3 className="mt-5 text-lg font-bold text-ink">{localized(step.title, locale)}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-muted">{localized(step.text, locale)}</p>
                        </li>
                    ))}
                </ol>
            </SiteSection>

            {videos.length > 0 && (
                <div className="border-t border-line bg-surface/60">
                    <SiteSection
                        eyebrow={t('Video library')}
                        title={t('Lessons to benefit from')}
                        actions={
                            <LinkButton href={route('site.videos')} variant="outline">
                                {t('All videos')}
                                <ArrowLeft className="ltr:rotate-180" />
                            </LinkButton>
                        }
                    >
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {videos.map((video) => (
                                <VideoCard key={video.id} video={video} onPlay={() => setPlaying(video)} />
                            ))}
                        </div>
                    </SiteSection>
                </div>
            )}

            <section className="relative overflow-hidden bg-linear-to-br from-primary-700 via-primary-800 to-primary-950 text-white">
                <IslamicPattern className="text-gold-300/[0.1]" size={64} />
                <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-20">
                    <h2 className="text-3xl leading-snug font-bold sm:text-4xl">{t('Begin your journey with the Book of Allah today')}</h2>
                    <p className="mt-4 max-w-2xl text-sidebar-ink/80">
                        {t('An account takes less than a minute. Read, listen, recite and keep your adhkar, and join an academy whenever you are ready.')}
                    </p>
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <LinkButton href={auth.user ? route('dashboard') : route('register')} variant="gold" size="lg">
                            {auth.user ? <LayoutDashboard /> : <UserPlus />}
                            {auth.user ? t('Go to your dashboard') : t('Create a free account')}
                        </LinkButton>
                        <LinkButton href={route('install')} variant="light" size="lg">
                            <Download />
                            {t('Install the app')}
                        </LinkButton>
                    </div>
                </div>
            </section>

            <VideoPlayer video={playing} onClose={() => setPlaying(null)} />
        </PublicLayout>
    );
}
