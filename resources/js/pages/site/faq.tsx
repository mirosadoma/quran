import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { ChevronDown, MessageCircleQuestion } from 'lucide-react';
import { PageHero } from '@/components/site/section';
import { LinkButton } from '@/components/ui/button';
import PublicLayout from '@/layouts/public-layout';
import { useTrans } from '@/lib/i18n';
import { localized } from '@/lib/prayers';
import { site } from '@/lib/site';

export default function Faq() {
    const { t, locale } = useTrans();

    return (
        <PublicLayout title={t('FAQ')} description={t('Answers to the most common questions about the platform, joining the academies and the halaqat.')}>
            <PageHero
                eyebrow={t('FAQ')}
                title={t('Frequently asked questions')}
                description={t('Answers to the most common questions about the platform, joining the academies and the halaqat.')}
            />

            <div className="mx-auto max-w-4xl space-y-10 px-4 py-14 sm:px-6">
                {site.faq.map((category) => (
                    <section key={category.category.en}>
                        <h2 className="mb-4 text-xl font-bold text-ink">{localized(category.category, locale)}</h2>
                        <div className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
                            {category.items.map((item) => (
                                <Disclosure key={item.q.en}>
                                    <DisclosureButton className="group flex w-full items-center gap-4 px-5 py-4 text-start transition hover:bg-surface-muted/60 sm:px-6">
                                        <span className="flex-1 font-semibold text-ink">{localized(item.q, locale)}</span>
                                        <ChevronDown className="size-5 shrink-0 text-muted transition group-data-open:rotate-180" />
                                    </DisclosureButton>
                                    <DisclosurePanel className="px-5 pb-5 leading-loose text-muted sm:px-6">{localized(item.a, locale)}</DisclosurePanel>
                                </Disclosure>
                            ))}
                        </div>
                    </section>
                ))}

                <div className="flex flex-col items-center gap-4 rounded-3xl bg-sidebar p-8 text-center text-white sm:p-10">
                    <MessageCircleQuestion className="size-10 text-gold-300" />
                    <h2 className="text-2xl font-bold">{t('Did not find your answer?')}</h2>
                    <p className="max-w-md text-sidebar-ink/80">{t('Write to us and we will answer you as soon as possible, God willing.')}</p>
                    <LinkButton href={route('site.contact')} variant="gold" size="lg">
                        {t('Contact us')}
                    </LinkButton>
                </div>
            </div>
        </PublicLayout>
    );
}
