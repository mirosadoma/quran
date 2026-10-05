import { usePage } from '@inertiajs/react';
import { CheckCircle2, UserPlus } from 'lucide-react';
import { PageHero } from '@/components/site/section';
import { LinkButton } from '@/components/ui/button';
import PublicLayout from '@/layouts/public-layout';
import { useTrans } from '@/lib/i18n';
import { localized } from '@/lib/prayers';
import { site, siteIcon } from '@/lib/site';

export default function Guide() {
    const { auth } = usePage().props;
    const { t, locale } = useTrans();

    return (
        <PublicLayout title={t('System guide')} description={t('What every section of the platform does, for students, teachers, academy managers and the administration.')}>
            <PageHero
                eyebrow={t('System guide')}
                title={t('Your guide to every section of the platform')}
                description={t('What every section of the platform does, for students, teachers, academy managers and the administration.')}
            >
                <nav className="flex flex-wrap justify-center gap-2">
                    {site.guide.map((section) => (
                        <a
                            key={section.role}
                            href={`#${section.role}`}
                            className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/20"
                        >
                            {localized(section.title, locale)}
                        </a>
                    ))}
                </nav>
            </PageHero>

            <div className="mx-auto max-w-6xl space-y-16 px-4 py-14 sm:px-6 lg:px-8">
                {site.guide.map((section) => (
                    <section key={section.role} id={section.role} className="scroll-mt-24">
                        <div className="mb-6 max-w-2xl">
                            <h2 className="text-2xl font-bold text-ink sm:text-3xl">{localized(section.title, locale)}</h2>
                            <p className="mt-2 leading-relaxed text-muted">{localized(section.intro, locale)}</p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            {section.tabs.map((tab) => {
                                const Icon = siteIcon(tab.icon);

                                return (
                                    <article key={tab.title.en} className="flex gap-4 rounded-3xl border border-line bg-surface p-5 sm:p-6">
                                        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
                                            <Icon className="size-6" />
                                        </span>
                                        <div className="min-w-0">
                                            <h3 className="text-lg font-bold text-ink">{localized(tab.title, locale)}</h3>
                                            <p className="mt-1.5 text-sm leading-relaxed text-muted">{localized(tab.text, locale)}</p>
                                            {tab.points && (
                                                <ul className="mt-3 space-y-1.5">
                                                    {tab.points.map((point) => (
                                                        <li key={point.en} className="flex gap-2 text-sm text-ink">
                                                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary-600" />
                                                            {localized(point, locale)}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                ))}

                {!auth.user && (
                    <div className="flex flex-col items-center gap-4 rounded-3xl border border-line bg-surface p-8 text-center sm:p-10">
                        <h2 className="text-2xl font-bold text-ink">{t('Try it yourself')}</h2>
                        <p className="max-w-md text-muted">{t('Create a free account and discover the sections open to you.')}</p>
                        <LinkButton href={route('register')} size="lg">
                            <UserPlus />
                            {t('Create a free account')}
                        </LinkButton>
                    </div>
                )}
            </div>
        </PublicLayout>
    );
}
