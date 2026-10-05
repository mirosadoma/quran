import { usePage } from '@inertiajs/react';
import { Compass, Mail, Target, UserPlus } from 'lucide-react';
import { IslamicPattern } from '@/components/brand';
import { PageHero, SiteSection } from '@/components/site/section';
import { LinkButton } from '@/components/ui/button';
import PublicLayout from '@/layouts/public-layout';
import { useTrans } from '@/lib/i18n';
import { localized } from '@/lib/prayers';
import { site, siteIcon } from '@/lib/site';
import { formatNumber } from '@/lib/utils';

interface AboutProps {
    stats: { academies: number; teachers: number; students: number; halaqat: number };
}

export default function About({ stats }: AboutProps) {
    const { auth, app } = usePage().props;
    const { t, locale } = useTrans();

    const numbers = [
        { label: t('Academies'), value: stats.academies },
        { label: t('Teachers'), value: stats.teachers },
        { label: t('Students'), value: stats.students },
        { label: t('Halaqat'), value: stats.halaqat },
    ];

    return (
        <PublicLayout title={t('About us')} description={localized(site.about.mission, locale)}>
            <PageHero eyebrow={t('About us')} title={t('Who we are')} description={localized(site.about.story[0], locale)} />

            <SiteSection>
                <div className="grid items-start gap-10 lg:grid-cols-[1.2fr_1fr]">
                    <div className="space-y-5 text-lg leading-loose text-ink">
                        {site.about.story.map((paragraph) => (
                            <p key={paragraph.en}>{localized(paragraph, locale)}</p>
                        ))}
                    </div>
                    <dl className="grid grid-cols-2 gap-4">
                        {numbers.map((item) => (
                            <div key={item.label} className="rounded-3xl border border-line bg-surface p-6 text-center">
                                <dd className="text-4xl font-bold text-primary-700 tabular-nums dark:text-primary-300">{formatNumber(item.value, locale)}</dd>
                                <dt className="mt-1 text-sm text-muted">{item.label}</dt>
                            </div>
                        ))}
                    </dl>
                </div>
            </SiteSection>

            <div className="border-y border-line bg-surface/60">
                <SiteSection>
                    <div className="grid gap-5 md:grid-cols-2">
                        {[
                            { icon: Target, title: t('Our mission'), text: localized(site.about.mission, locale) },
                            { icon: Compass, title: t('Our vision'), text: localized(site.about.vision, locale) },
                        ].map((item) => (
                            <div key={item.title} className="relative overflow-hidden rounded-3xl bg-sidebar p-8 text-white">
                                <IslamicPattern className="text-gold-300/[0.08]" size={56} />
                                <span className="relative flex size-12 items-center justify-center rounded-2xl bg-gold-400/15 text-gold-300">
                                    <item.icon className="size-6" />
                                </span>
                                <h2 className="relative mt-5 text-2xl font-bold">{item.title}</h2>
                                <p className="relative mt-3 text-lg leading-relaxed text-sidebar-ink/85">{item.text}</p>
                            </div>
                        ))}
                    </div>
                </SiteSection>
            </div>

            <SiteSection eyebrow={t('Our values')} title={t('What guides our work')}>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {site.about.values.map((value) => {
                        const Icon = siteIcon(value.icon);

                        return (
                            <div key={value.icon} className="rounded-3xl border border-line bg-surface p-6">
                                <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
                                    <Icon className="size-6" />
                                </span>
                                <h3 className="mt-5 text-lg font-bold text-ink">{localized(value.title, locale)}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-muted">{localized(value.text, locale)}</p>
                            </div>
                        );
                    })}
                </div>
            </SiteSection>

            <SiteSection className="pt-0 sm:pt-0">
                <div className="flex flex-col items-center gap-5 rounded-3xl border border-line bg-surface p-8 text-center sm:p-12">
                    <h2 className="text-2xl font-bold text-ink sm:text-3xl">{t('Be part of :name', { name: app.name })}</h2>
                    <p className="max-w-xl text-muted">{t('Start on your own today, join an academy, or bring your academy to the platform.')}</p>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        {!auth.user && (
                            <LinkButton href={route('register')} size="lg">
                                <UserPlus />
                                {t('Create a free account')}
                            </LinkButton>
                        )}
                        <LinkButton href={route('site.contact')} variant="secondary" size="lg">
                            <Mail />
                            {t('Contact us')}
                        </LinkButton>
                    </div>
                </div>
            </SiteSection>
        </PublicLayout>
    );
}
