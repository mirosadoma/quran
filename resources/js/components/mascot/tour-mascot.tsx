import { usePage } from '@inertiajs/react';
import { type CSSProperties, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ChaseMascot } from '@/components/mascot/chase-mascot';
import { MascotFace } from '@/components/mascot/mascot-face';
import { QuoteBubble, SpeechBubble } from '@/components/mascot/speech-bubble';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTrans } from '@/lib/i18n';
import { MASCOT_TIMING, MASCOT_VARIANTS, MASCOT_VISITS, type MascotVariant } from '@/lib/mascot/config';
import { ensureCycleStarted, finishChase, getCycleState, restartChaseTimeout, subscribeCycle } from '@/lib/mascot/cycle';
import { lookAt } from '@/lib/mascot/looks';
import { type MascotQuote, quoteForVisit, quoteOfTheDay, quotesOfKinds } from '@/lib/mascot/quotes';
import { cn } from '@/lib/utils';

interface TourMascotProps {
    /** Which welcome and which kinds of texts: the control panels, the public website or the sign-in pages. */
    variant: MascotVariant;
    className?: string;
}

const timingStyle = {
    '--mascot-enter': `${MASCOT_TIMING.enter}ms`,
    '--mascot-exit': `${MASCOT_TIMING.exit}ms`,
    '--mascot-intro-enter': `${MASCOT_TIMING.introEnter}ms`,
    '--mascot-intro-exit': `${MASCOT_TIMING.introExit}ms`,
} as CSSProperties;

/**
 * The travelling companion of every page: the rope, then the chase, then the visits (a lantern after another
 * in the corners and on the sides of the page, each with a text of the platform), and the rope again, for as
 * long as the day's session runs. The cycle itself lives in lib/mascot/cycle.ts, outside React: this component
 * only shows its current step, so moving from page to page neither stops nor restarts the show. Rendered by
 * the layouts, so it works on the whole platform.
 */
export function TourMascot({ variant, className }: TourMascotProps) {
    const { app, mascot } = usePage().props;
    const { t, isRtl } = useTrans();
    const reduced = useReducedMotion();
    const quotes = useMemo(() => quotesOfKinds((mascot as MascotQuote[] | undefined) ?? [], MASCOT_VARIANTS[variant].kinds), [mascot, variant]);
    const state = useSyncExternalStore(subscribeCycle, getCycleState, getCycleState);
    const [shift, setShift] = useState(0);

    useEffect(() => {
        if (!reduced) {
            ensureCycleStarted();
        }
    }, [reduced]);

    // A page opened during the chase: its lantern gets the whole time again before the cycle moves on alone.
    useEffect(() => {
        if (state.phase === 'chase') {
            restartChaseTimeout();
        }
    }, [state.phase]);

    const changeLook = useCallback(() => setShift((value) => value + 1), []);

    const welcome = t(MASCOT_VARIANTS[variant].welcome, { name: app.name });

    if (reduced) {
        const quote = quoteOfTheDay(quotes);
        const visit = MASCOT_VISITS[0];

        return (
            <div className={cn('mascot-layer no-print', className)} style={timingStyle}>
                <div className="mascot-visit" data-position={visit.position}>
                    <div className="mascot-visit-body">
                        {quote && <QuoteBubble quote={quote} tail={visit.position.endsWith('-end') ? 'bottom-end' : 'bottom-start'} />}
                        <MascotFace look={lookAt(visit.look)} size="5rem" animate={false} />
                    </div>
                </div>
            </div>
        );
    }

    const visit = state.phase === 'visit' ? MASCOT_VISITS[state.index % MASCOT_VISITS.length] : null;
    const quote = state.phase === 'visit' && visit ? quoteForVisit(quotes, visit.kind, state.sequence + shift) : null;

    return (
        <div className={cn('mascot-layer no-print', className)} style={timingStyle} data-mascot-phase={state.phase} data-mascot-cycle={state.cycle}>
            {state.phase === 'rope' && (
                <div className="mascot-intro" data-state={state.leaving ? 'leaving' : 'entering'}>
                    <div className="mascot-rope" />
                    <div className="mascot-intro-row">
                        <MascotFace look={lookAt(0)} arms="wave" size="5.5rem" track />
                        <SpeechBubble tail="start" className="w-max max-w-[min(16rem,calc(100vw-9rem))]">
                            <p className="font-semibold text-ink">{welcome}</p>
                        </SpeechBubble>
                    </div>
                </div>
            )}

            {state.phase === 'chase' && <ChaseMascot onDone={finishChase} />}

            {state.phase === 'visit' && visit && (
                <div className="mascot-visit" data-position={visit.position} data-state={state.leaving ? 'leaving' : 'entering'}>
                    <div className="mascot-visit-body">
                        {quote && <QuoteBubble quote={quote} tail={visit.position.endsWith('-end') ? 'bottom-end' : 'bottom-start'} />}
                        <button
                            type="button"
                            className="mascot-clickable mascot-float"
                            onClick={changeLook}
                            aria-label={t('Your companion')}
                            title={t('Tap to change the look and read another text')}
                        >
                            <MascotFace look={lookAt(visit.look + shift)} arms={shift % 2 === 1 ? 'wave' : 'rest'} size="5rem" mirrorArms={isRtl} track />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
