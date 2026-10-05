import { router, usePage } from '@inertiajs/react';
import { Radio, Video } from 'lucide-react';
import { Button, type ButtonSize } from '@/components/ui/button';
import { useTrans } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { SessionItem } from '@/types';

interface JoinSessionButtonProps {
    session: Pick<SessionItem, 'id' | 'status' | 'can_join' | 'can_manage'>;
    size?: ButtonSize;
    className?: string;
    block?: boolean;
}

/**
 * Opens the meeting in a new tab through a POST form: the server records the
 * attendance (or starts the session for the teacher) before redirecting.
 */
export function JoinSessionButton({ session, size = 'md', className, block = false }: JoinSessionButtonProps) {
    const { csrf_token } = usePage().props;
    const { t } = useTrans();

    if (!session.can_join) {
        return null;
    }

    const live = session.status === 'live';
    const label = session.can_manage && !live ? t('Start the session') : live ? t('Join now') : t('Join the session');

    return (
        <form
            method="post"
            action={route('sessions.join', session.id)}
            target="_blank"
            onSubmit={() => window.setTimeout(() => router.reload(), 2500)}
            className={cn(block && 'w-full', className)}
        >
            <input type="hidden" name="_token" value={csrf_token} />
            <Button type="submit" size={size} variant={live ? 'success' : 'primary'} className={cn(block && 'w-full')}>
                {live ? <Radio className="animate-pulse" /> : <Video />}
                {label}
            </Button>
        </form>
    );
}
