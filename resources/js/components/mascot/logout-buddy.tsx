import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { MascotFace } from '@/components/mascot/mascot-face';
import { SpeechBubble } from '@/components/mascot/speech-bubble';
import { useCompanionShown } from '@/hooks/use-companion';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTrans } from '@/lib/i18n';

/** The width the companion and its bubble need beside the menu. */
const WIDTH = 270;
const GAP = 12;

const look = { halo: 'sky', body: 'round', eyes: 'open', accessory: 'none' } as const;

/**
 * Shown while the pointer (or the keyboard) rests on "Sign out": a lantern with a tear waving goodbye and a
 * farewell in its bubble. It is drawn in a portal next to the menu, so the menu's overflow never clips it,
 * and it takes no clicks (pointer-events: none), so it never covers a button.
 */
export function LogoutBuddy({ anchor }: { anchor: DOMRect | null }) {
    const { t, isRtl } = useTrans();
    const reduced = useReducedMotion();
    const shown = useCompanionShown('app');

    if (!shown || !anchor || typeof document === 'undefined') {
        return null;
    }

    // The free side of the menu is its inline start (the menu hangs at the end of the top bar).
    const roomBeside = isRtl ? window.innerWidth - anchor.right : anchor.left;
    const beside = roomBeside >= WIDTH + GAP;

    const style: CSSProperties = beside
        ? {
              top: anchor.top + anchor.height / 2,
              transform: 'translateY(-50%)',
              ...(isRtl ? { left: anchor.right + GAP } : { right: window.innerWidth - anchor.left + GAP }),
          }
        : {
              top: anchor.bottom + GAP,
              ...(isRtl ? { right: window.innerWidth - anchor.right } : { left: anchor.left }),
          };

    const face = <MascotFace look={look} mood="sad" arms="farewell" size="4rem" mirrorArms={!isRtl} animate={!reduced} />;
    const bubble = (
        <SpeechBubble tail={beside ? 'end' : 'start'} className="w-max max-w-56">
            <p className="font-semibold text-ink">{t("Go with Allah's protection, see you soon.")}</p>
        </SpeechBubble>
    );

    return createPortal(
        <div className="pointer-events-none fixed z-[60] flex items-center gap-2 animate-fade-in" style={style} data-mascot-logout aria-hidden>
            {beside ? (
                <>
                    {bubble}
                    {face}
                </>
            ) : (
                <>
                    {face}
                    {bubble}
                </>
            )}
        </div>,
        document.body,
    );
}
