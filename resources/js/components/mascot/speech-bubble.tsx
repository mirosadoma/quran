import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { MASCOT_TEXT_LIMIT } from '@/lib/mascot/config';
import { type MascotQuote, type QuoteKind, truncateQuote } from '@/lib/mascot/quotes';
import { useTrans } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export type BubbleTail = 'bottom-end' | 'bottom-start' | 'start' | 'end' | 'top-start' | 'none';

interface SpeechBubbleProps {
    tail?: BubbleTail;
    /** On the dark green banner of the dashboard. */
    tone?: 'light' | 'dark';
    className?: string;
    children: ReactNode;
}

export function SpeechBubble({ tail = 'bottom-end', tone = 'light', className, children }: SpeechBubbleProps) {
    return (
        <div className={cn('mascot-bubble text-sm leading-relaxed', className)} data-tail={tail} data-tone={tone} role="status">
            {children}
        </div>
    );
}

const KIND_LABELS: Record<QuoteKind, string> = {
    ayah: 'Ayah',
    hadith: 'Hadith',
    dhikr: 'Dhikr',
    wisdom: 'Wisdom',
};

const DAILY_LABELS: Record<QuoteKind, string> = {
    ayah: 'Ayah of the day',
    hadith: 'Hadith of the day',
    dhikr: 'Dhikr of the day',
    wisdom: 'Saying of the day',
};

interface QuoteBubbleProps extends Omit<SpeechBubbleProps, 'children'> {
    quote: MascotQuote;
    /** "Ayah of the day" instead of "Ayah". */
    daily?: boolean;
    limit?: number;
}

/**
 * A text of the platform in a bubble: the Quran in the mushaf script, the source in the font of the page,
 * and a "read more" link to its page when it was cut.
 */
export function QuoteBubble({ quote, daily = false, limit = MASCOT_TEXT_LIMIT, ...bubble }: QuoteBubbleProps) {
    const { t } = useTrans();
    const { text, truncated } = truncateQuote(quote.text, limit);
    const isQuran = quote.kind === 'ayah';

    return (
        <SpeechBubble {...bubble}>
            <p className="mb-1 text-[11px] font-semibold tracking-wide text-gold-600 dark:text-gold-400" data-mascot-kind={quote.kind}>
                {t(daily ? DAILY_LABELS[quote.kind] : KIND_LABELS[quote.kind])}
            </p>
            <p className={cn(isQuran ? 'font-mushaf text-[1.2rem] leading-[1.9]' : 'font-quran text-base leading-[1.8]')} dir="rtl" lang="ar">
                {isQuran && <span className="text-gold-500">﴿ </span>}
                {text}
                {isQuran && <span className="text-gold-500"> ﴾</span>}
            </p>
            <p className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs opacity-75">
                <span dir="rtl">{quote.source}</span>
                {truncated && quote.href && (
                    <Link href={quote.href} className="font-semibold text-primary-600 underline-offset-2 hover:underline dark:text-primary-300">
                        {t('Read more')}
                    </Link>
                )}
            </p>
        </SpeechBubble>
    );
}
