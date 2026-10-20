import { MascotFace } from '@/components/mascot/mascot-face';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils';

const look = { halo: 'gold', body: 'round', eyes: 'pensive', accessory: 'none' } as const;

/**
 * The companion of the loading screen: pondering (eyes up, a hand under the chin, a pulsing halo) under a
 * small thought cloud with three moving dots. `compact` for the small loaders inside a page.
 */
export function LoaderBuddy({ compact = false, className }: { compact?: boolean; className?: string }) {
    const reduced = useReducedMotion();

    return (
        <div className={cn('flex flex-col items-center', compact ? 'gap-1' : 'gap-2', className)} data-mascot-loader={compact ? 'compact' : 'full'}>
            <div className={cn('mascot-thought', compact && 'scale-75')} aria-hidden>
                <i />
                <i />
                <i />
            </div>
            <MascotFace look={look} mood="thinking" arms="think" size={compact ? '3.25rem' : '5.5rem'} animate={!reduced} />
        </div>
    );
}
