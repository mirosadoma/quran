import { Head, usePage } from '@inertiajs/react';
import { ArrowRight, House } from 'lucide-react';
import { IslamicPattern, LogoMark } from '@/components/brand';
import { Button, LinkButton } from '@/components/ui/button';
import { useDocumentDirection } from '@/hooks/use-app-shell';
import { useTrans } from '@/lib/i18n';

export default function ErrorPage({ status }: { status: number }) {
    const { t } = useTrans();
    const { auth } = usePage().props;

    useDocumentDirection();

    const messages: Record<number, { title: string; description: string }> = {
        403: { title: t('Access denied'), description: t('You do not have permission to open this page.') },
        404: { title: t('Page not found'), description: t('The page you are looking for does not exist or was moved.') },
        500: { title: t('Something went wrong'), description: t('An unexpected error occurred. Please try again in a moment.') },
        503: { title: t('Under maintenance'), description: t('The platform is being updated. Please come back shortly.') },
    };

    const message = messages[status] ?? messages[500];

    return (
        <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-6">
            <Head title={message.title} />
            <IslamicPattern className="text-primary-700/[0.06] dark:text-gold-300/[0.05]" size={80} />
            <div className="relative max-w-md text-center">
                <LogoMark className="mx-auto size-16" />
                <p className="mt-8 font-quran text-7xl font-bold text-gold-500">{status}</p>
                <h1 className="mt-4 text-2xl font-bold text-ink">{message.title}</h1>
                <p className="mt-2 leading-relaxed text-muted">{message.description}</p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <Button variant="secondary" onClick={() => window.history.back()}>
                        <ArrowRight className="ltr:rotate-180" />
                        {t('Go back')}
                    </Button>
                    <LinkButton href={auth.user ? route('dashboard') : route('login')}>
                        <House />
                        {auth.user ? t('Dashboard') : t('Sign in')}
                    </LinkButton>
                </div>
            </div>
        </div>
    );
}
