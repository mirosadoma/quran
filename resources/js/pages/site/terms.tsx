import { Link } from '@inertiajs/react';
import { Mail } from 'lucide-react';
import { PageHero } from '@/components/site/section';
import PublicLayout from '@/layouts/public-layout';
import { useTrans } from '@/lib/i18n';
import { localized } from '@/lib/prayers';
import { site } from '@/lib/site';
import { formatNumber } from '@/lib/utils';

export default function Terms() {
    const { t, locale } = useTrans();

    return (
        <PublicLayout title={t('Terms and policies')} description={t('The terms of use of the platform and how we protect your privacy.')}>
            <PageHero eyebrow={t('Terms and policies')} title={t('Terms of use and privacy policy')} description={t('The terms of use of the platform and how we protect your privacy.')} />

            <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[16rem_1fr] lg:px-8">
                <nav className="hidden lg:block">
                    <div className="sticky top-24 space-y-1 rounded-3xl border border-line bg-surface p-3">
                        {site.terms.map((section, index) => (
                            <a
                                key={section.id}
                                href={`#${section.id}`}
                                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-ink"
                            >
                                <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-xs font-bold text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
                                    {formatNumber(index + 1, locale)}
                                </span>
                                {localized(section.title, locale)}
                            </a>
                        ))}
                    </div>
                </nav>

                <div className="min-w-0 space-y-6">
                    {site.terms.map((section, index) => (
                        <section key={section.id} id={section.id} className="scroll-mt-24 rounded-3xl border border-line bg-surface p-6 sm:p-8">
                            <h2 className="flex items-center gap-3 text-xl font-bold text-ink">
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gold-500 text-sm font-bold text-white">
                                    {formatNumber(index + 1, locale)}
                                </span>
                                {localized(section.title, locale)}
                            </h2>
                            <div className="mt-4 space-y-3 leading-loose text-ink/90">
                                {section.paragraphs.map((paragraph) => (
                                    <p key={paragraph.en}>{localized(paragraph, locale)}</p>
                                ))}
                            </div>
                        </section>
                    ))}

                    <div className="flex flex-col items-start gap-3 rounded-3xl bg-surface-muted p-6 sm:flex-row sm:items-center">
                        <Mail className="size-6 shrink-0 text-primary-600" />
                        <p className="flex-1 text-sm text-ink">{t('Do you have a question about these terms or your data?')}</p>
                        <Link href={route('site.contact')} className="text-sm font-bold text-primary-700 hover:underline dark:text-primary-300">
                            {t('Contact us')}
                        </Link>
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}
