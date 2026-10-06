import { Headphones, Info, Pause, Play, Snail, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ReadAloud } from '@/hooks/use-read-aloud';
import { useTrans } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * The speeds offered: normal, and slow to follow the text (or for children).
 */
export const readAloudRates = { normal: 1, slow: 0.8 } as const;

interface ReadAloudControlsProps {
    /** The reader of useReadAloud(). */
    reader: ReadAloud;
    /** What the play button reads, in order (the reader's current is an index of this list). */
    segments: string[];
    /** Label of the play button ("Listen" by default). */
    label?: string;
    size?: 'sm' | 'md';
    /** Show under the buttons the notice about a browser that cannot speak or a missing Arabic voice. */
    notice?: boolean;
    className?: string;
}

/**
 * Play, pause and stop a text read aloud by the Arabic voice of the device, at a normal or a slow speed.
 */
export function ReadAloudControls({ reader, segments, label, size = 'md', notice = true, className }: ReadAloudControlsProps) {
    const { t } = useTrans();
    const small = size === 'sm';

    return (
        <div className={cn('flex flex-col gap-2', className)}>
            <div className="flex flex-wrap items-center gap-1.5">
                {!reader.speaking ? (
                    <Button size={small ? 'sm' : 'md'} disabled={!reader.supported || segments.length === 0} onClick={() => reader.speak(segments)}>
                        <Headphones />
                        {label ?? t('Listen')}
                    </Button>
                ) : reader.paused ? (
                    <Button size={small ? 'sm' : 'md'} onClick={reader.resume}>
                        <Play />
                        {t('Resume')}
                    </Button>
                ) : (
                    <Button size={small ? 'sm' : 'md'} variant="secondary" onClick={reader.pause}>
                        <Pause />
                        {t('Pause')}
                    </Button>
                )}

                {reader.speaking && (
                    <Button size={small ? 'icon-sm' : 'icon'} variant="ghost" onClick={reader.stop} aria-label={t('Stop')} title={t('Stop')}>
                        <Square />
                    </Button>
                )}

                <SpeedSwitch reader={reader} small={small} />
            </div>

            {notice && <ReadAloudNotice reader={reader} />}
        </div>
    );
}

function SpeedSwitch({ reader, small }: { reader: ReadAloud; small: boolean }) {
    const { t } = useTrans();
    const speeds = [
        { rate: readAloudRates.normal, label: t('Normal') },
        { rate: readAloudRates.slow, label: t('Slow') },
    ];

    return (
        <div role="group" aria-label={t('Reading speed')} className="inline-flex rounded-xl border border-line bg-surface-muted p-0.5">
            {speeds.map((speed) => {
                const active = speed.rate === readAloudRates.slow ? reader.rate < readAloudRates.normal : reader.rate >= readAloudRates.normal;

                return (
                    <button
                        key={speed.rate}
                        type="button"
                        aria-pressed={active}
                        onClick={() => reader.setRate(speed.rate)}
                        disabled={!reader.supported}
                        className={cn(
                            'inline-flex items-center gap-1 rounded-[10px] font-semibold transition disabled:opacity-55',
                            small ? 'h-7 px-2 text-xs' : 'h-8 px-2.5 text-xs sm:text-sm',
                            active ? 'bg-surface text-ink shadow-sm ring-1 ring-line' : 'text-muted hover:text-ink',
                        )}
                    >
                        {speed.rate === readAloudRates.slow && <Snail className="size-3.5" />}
                        {speed.label}
                    </button>
                );
            })}
        </div>
    );
}

/**
 * Tells how to hear the text when the browser cannot speak or the device has no Arabic voice.
 */
export function ReadAloudNotice({ reader, className }: { reader: ReadAloud; className?: string }) {
    const { t } = useTrans();
    const [settled, setSettled] = useState(false);

    // The voices load a moment after the page: wait before saying there is none.
    useEffect(() => {
        const timer = window.setTimeout(() => setSettled(true), 1500);

        return () => window.clearTimeout(timer);
    }, []);

    if (reader.supported && (reader.hasVoice || !settled)) {
        return null;
    }

    return (
        <p
            className={cn(
                'flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200',
                className,
            )}
        >
            <Info className="mt-0.5 size-4 shrink-0" />
            <span>
                {reader.supported
                    ? t('No Arabic voice was found on this device. Install an Arabic voice from the text-to-speech settings of your device, or open the page in Chrome, Edge or Safari.')
                    : t('This browser cannot read texts aloud. Open the page in Chrome, Edge or Safari.')}
            </span>
        </p>
    );
}
