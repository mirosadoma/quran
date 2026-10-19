import { Download, ExternalLink } from 'lucide-react';
import { useTrans } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { SessionItem } from '@/types';

type Recording = Pick<SessionItem, 'recording_url' | 'recording_file_url'> & { recording_passcode?: string | null };

/**
 * The recording of a session: the uploaded video played inside the platform, and/or the
 * outside link (Zoom, Google Drive, YouTube...).
 */
export function RecordingPlayer({ session, className, compact = false }: { session: Recording; className?: string; compact?: boolean }) {
    const { t } = useTrans();

    if (!session.recording_file_url && !session.recording_url) {
        return null;
    }

    return (
        <div className={cn('space-y-2', className)}>
            {session.recording_file_url && (
                <video controls preload="metadata" playsInline className={cn('w-full rounded-2xl bg-black', compact ? 'aspect-video' : 'max-h-[70vh] aspect-video')} src={session.recording_file_url}>
                    {t('Your browser cannot play this video.')}
                </video>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                {session.recording_file_url && (
                    <a href={session.recording_file_url} download className="inline-flex items-center gap-1.5 font-semibold text-muted hover:text-ink">
                        <Download className="size-4" />
                        {t('Download')}
                    </a>
                )}
                {session.recording_url && (
                    <a href={session.recording_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-primary-700 hover:underline dark:text-primary-300">
                        <ExternalLink className="size-4" />
                        {session.recording_file_url ? t('Outside link') : t('Watch the recording')}
                    </a>
                )}
                {session.recording_passcode && (
                    <span className="text-xs text-muted" dir="ltr">
                        ({session.recording_passcode})
                    </span>
                )}
            </div>
        </div>
    );
}
