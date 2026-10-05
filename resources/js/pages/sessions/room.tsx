import { Head, Link, router, usePage } from '@inertiajs/react';
import { JaaSMeeting, JitsiMeeting } from '@jitsi/react-sdk';
import { ArrowRight, CircleStop } from 'lucide-react';
import { LogoMark } from '@/components/brand';
import { Button, Spinner } from '@/components/ui/button';
import { useDocumentDirection } from '@/hooks/use-app-shell';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import type { SessionItem } from '@/types';

interface RoomProps {
    session: SessionItem;
    meeting: { provider: 'jaas' | 'jitsi'; appId?: string; domain?: string; roomName: string; jwt?: string | null };
    isModerator: boolean;
}

/**
 * Jitsi meeting embedded inside the platform (JaaS or a self-hosted server).
 */
export default function Room({ session, meeting, isModerator }: RoomProps) {
    const { t, locale } = useTrans();
    const dates = useDates();
    const { auth } = usePage().props;

    useDocumentDirection();

    const leave = () => router.visit(route('sessions.show', session.id));

    const shared = {
        roomName: meeting.roomName,
        jwt: meeting.jwt ?? undefined,
        lang: locale,
        userInfo: { displayName: auth.user?.name ?? '', email: auth.user?.email ?? '' },
        configOverwrite: {
            startWithAudioMuted: !isModerator,
            startWithVideoMuted: false,
            prejoinConfig: { enabled: true },
            disableDeepLinking: true,
            defaultLanguage: locale,
            subject: session.display_title,
        },
        interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            MOBILE_APP_PROMO: false,
        },
        spinner: () => (
            <div className="flex h-full items-center justify-center">
                <Spinner className="size-8 text-gold-400" />
            </div>
        ),
        onReadyToClose: leave,
        getIFrameRef: (node: HTMLDivElement) => {
            node.style.height = '100%';
            node.style.width = '100%';
        },
    };

    return (
        <div className="flex h-dvh flex-col bg-primary-950">
            <Head title={session.display_title} />
            <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 px-4 text-white">
                <Link href={route('sessions.show', session.id)} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white">
                    <ArrowRight className="size-5 ltr:rotate-180" />
                </Link>
                <LogoMark className="size-8" />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{session.display_title}</p>
                    <p className="truncate text-xs text-white/60">
                        {dates.time(session.starts_at)} – {dates.time(session.ends_at)}
                    </p>
                </div>
                {isModerator && (
                    <Button variant="danger" size="sm" onClick={() => router.post(route('sessions.end', session.id))}>
                        <CircleStop />
                        {t('End the session')}
                    </Button>
                )}
            </header>
            <div className="min-h-0 flex-1">
                {meeting.provider === 'jaas' ? (
                    <JaaSMeeting appId={meeting.appId ?? ''} {...shared} />
                ) : (
                    <JitsiMeeting domain={meeting.domain} {...shared} />
                )}
            </div>
        </div>
    );
}
