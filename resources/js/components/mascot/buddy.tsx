import { usePage } from '@inertiajs/react';
import { type CSSProperties, useEffect, useState } from 'react';
import { type MascotArms, MascotFace } from '@/components/mascot/mascot-face';
import { QuoteBubble } from '@/components/mascot/speech-bubble';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTrans } from '@/lib/i18n';
import { MASCOT_TIMING } from '@/lib/mascot/config';
import { lookAt, nextLookIndex } from '@/lib/mascot/looks';
import { type MascotQuote, quoteOfTheDay } from '@/lib/mascot/quotes';
import { cn } from '@/lib/utils';

export interface BuddyProps {
    /** The height of the lantern. */
    size: string;
    arms: MascotArms;
    /** Change the look this often (milliseconds); 0 keeps the same look. */
    lookEvery: number;
    /** The first look (an index of MASCOT_LOOKS). */
    startLook?: number;
    /** How far it floats up and down. */
    float?: string;
    className?: string;
}

/**
 * A small companion that lives inside the page (the dashboard greeting, the page headers): it floats, blinks,
 * follows the pointer with its eyes, changes its look now and then, and on a tap. The pointing hand turns to
 * the text next to it, on right-to-left pages too.
 */
export function Buddy({ size, arms, lookEvery, startLook = 0, float = '6px', className }: BuddyProps) {
    const { t, isRtl } = useTrans();
    const reduced = useReducedMotion();
    const [look, setLook] = useState(startLook);

    useEffect(() => {
        if (reduced || lookEvery <= 0) {
            return;
        }

        const timer = window.setInterval(() => setLook(nextLookIndex), lookEvery);

        return () => window.clearInterval(timer);
    }, [reduced, lookEvery]);

    return (
        <button
            type="button"
            onClick={() => setLook(nextLookIndex)}
            className={cn('mascot-clickable', !reduced && 'mascot-float', className)}
            style={{ '--mascot-float': float } as CSSProperties}
            aria-label={t('Your companion')}
            title={t('Change the look')}
            data-mascot-buddy={arms}
        >
            <MascotFace look={lookAt(look)} arms={arms} size={size} mirrorArms={isRtl && arms === 'point'} track animate={!reduced} />
        </button>
    );
}

/**
 * The companion of the dashboard greeting: 4.5rem, waving, a new look every 6 seconds.
 */
export function DashboardBuddy({ className }: { className?: string }) {
    return <Buddy size="4.5rem" arms="wave" lookEvery={MASCOT_TIMING.dashboardLookEvery} startLook={0} float="6px" className={className} />;
}

/**
 * The companion of the page headers: 2.5rem, pointing at the title (or the breadcrumb), a new look every 8 seconds.
 */
export function HeaderBuddy({ className }: { className?: string }) {
    return <Buddy size="2.5rem" arms="point" lookEvery={MASCOT_TIMING.headerLookEvery} startLook={2} float="3px" className={className} />;
}

/**
 * The bubble of the dashboard companion: the ayah, hadith, dhikr or saying of the day, from the texts of the platform.
 */
export function DailyQuoteBubble({ className }: { className?: string }) {
    const { mascot } = usePage().props;
    const quote = quoteOfTheDay((mascot as MascotQuote[] | undefined) ?? []);

    if (!quote) {
        return null;
    }

    return <QuoteBubble quote={quote} daily tail="top-start" tone="dark" className={cn('max-w-xl', className)} />;
}
