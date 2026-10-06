import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { Head, router, usePage, usePoll } from '@inertiajs/react';
import { X } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader, type PageHeaderProps } from '@/components/layout/page-header';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { useDocumentDirection, useFlashToasts } from '@/hooks/use-app-shell';
import { useRealtime } from '@/hooks/use-realtime';
import { useTrans } from '@/lib/i18n';
import { syncPushSubscription } from '@/lib/push';
import { syncRealtime } from '@/lib/realtime';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types';

interface AppLayoutProps extends Omit<PageHeaderProps, 'title'> {
    title: string;
    heading?: ReactNode;
    hideHeader?: boolean;
    wide?: boolean;
    /** Remove the bottom padding (full-height pages such as the chat). */
    flush?: boolean;
    children: ReactNode;
}

export default function AppLayout({ title, heading, description, actions, back, hideHeader = false, wide = false, flush = false, children }: AppLayoutProps) {
    const { auth, realtime, push } = usePage().props;
    const { t } = useTrans();
    const [menuOpen, setMenuOpen] = useState(false);

    useFlashToasts();
    useDocumentDirection();

    useEffect(() => {
        syncRealtime(realtime, auth.user?.id ?? null);
    }, [realtime, auth.user?.id]);

    const userId = auth.user?.id;

    useEffect(() => {
        if (userId) {
            void syncPushSubscription(push.public_key, userId);
        }
    }, [push.public_key, userId]);

    useRealtime<{ title?: string; body?: string }>('notification', (notification) => {
        toast(notification.title ?? t('New notification'), { description: notification.body });
        router.reload({ only: ['counts'] });
    });

    useRealtime<ChatMessage>('message', (message) => {
        if (!route().current('chat.show', { halaqa: message.halaqa_id }) && message.user?.id !== auth.user?.id) {
            router.reload({ only: ['counts'] });
        }
    });

    // Without realtime, refresh the unread counters every minute.
    usePoll(60_000, { only: ['counts'] }, { autoStart: !realtime.enabled });

    return (
        <div className="min-h-dvh">
            <Head title={title} />

            <aside data-shell="sidebar" className="no-print fixed inset-y-0 start-0 z-30 hidden w-72 lg:block">
                <Sidebar />
            </aside>

            <Dialog open={menuOpen} onClose={setMenuOpen} className="relative z-50 lg:hidden">
                <DialogBackdrop transition className="fixed inset-0 bg-primary-950/50 backdrop-blur-sm transition duration-300 data-closed:opacity-0" />
                <div className="fixed inset-0 flex">
                    <DialogPanel
                        transition
                        className="relative w-72 max-w-[85vw] transition duration-300 ease-out data-closed:-translate-x-full rtl:data-closed:translate-x-full"
                    >
                        <Sidebar onNavigate={() => setMenuOpen(false)} />
                        <button
                            type="button"
                            onClick={() => setMenuOpen(false)}
                            aria-label={t('Close')}
                            className="absolute -end-12 top-4 rounded-xl bg-white/10 p-2 text-white backdrop-blur"
                        >
                            <X className="size-5" />
                        </button>
                    </DialogPanel>
                </div>
            </Dialog>

            {/* data-shell: the parts hidden while the mushaf is read full screen (see app.css). */}
            <div data-shell="content" className="lg:ps-72 print:ps-0">
                <Topbar onMenu={() => setMenuOpen(true)} />
                <main data-shell="main" className={cn('mx-auto px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8', flush ? 'pb-4' : 'pb-16', wide ? 'max-w-420' : 'max-w-360')}>
                    {!hideHeader && <PageHeader title={heading ?? title} description={description} actions={actions} back={back} />}
                    <div className="animate-fade-in">{children}</div>
                </main>
            </div>
        </div>
    );
}
