import { ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { Tabs } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { useTrans } from '@/lib/i18n';

/**
 * The pages of self-accounting: the note that stays at the top of every one of them, and their tabs.
 */
export function DeedsShell({ tab, actions, children }: { tab: 'day' | 'reports'; actions?: ReactNode; children: ReactNode }) {
    const { t } = useTrans();

    return (
        <AppLayout
            title={t('Self-accounting')}
            description={t('Record your good and bad deeds through the day, repent of every sin, and follow your state of faith.')}
            actions={actions}
        >
            <DeedsNote />
            <Tabs
                className="mb-6"
                value={tab}
                items={[
                    { value: 'day', label: t('Day by day'), href: route('deeds.index') },
                    { value: 'reports', label: t('Reports'), href: route('deeds.reports') },
                ]}
            />
            {children}
        </AppLayout>
    );
}

/**
 * Stays visible while scrolling: the reckoning belongs to Allah; this is only a help.
 */
function DeedsNote() {
    const { t } = useTrans();

    return (
        <div className="sticky top-16 z-10 -mx-1 mb-5 px-1 pt-1">
            <p className="flex items-start gap-2 rounded-2xl border border-gold-200 bg-gold-50 px-3 py-2 text-[11px] leading-relaxed text-gold-900 shadow-sm sm:gap-2.5 sm:px-4 sm:py-2.5 sm:text-sm dark:border-gold-500/25 dark:bg-[#2a2414] dark:text-gold-100">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-gold-600 dark:text-gold-300" />
                <span>
                    {t(
                        'The reckoning of good and bad deeds is known to Allah alone, and He knows His servants best and is the Most Merciful to them. This page is only a simple help to hold yourself to account and know your state of faith in order to improve it; it is not a judgment on anyone, nor a claim about Allah.',
                    )}
                </span>
            </p>
        </div>
    );
}
