import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Whether the visitor asked their system for less motion: then the companion stands still and plays no intro.
 */
export function useReducedMotion(): boolean {
    const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && 'matchMedia' in window && window.matchMedia(QUERY).matches);

    useEffect(() => {
        if (typeof window === 'undefined' || !('matchMedia' in window)) {
            return;
        }

        const media = window.matchMedia(QUERY);
        const listener = (event: MediaQueryListEvent) => setReduced(event.matches);

        media.addEventListener('change', listener);

        return () => media.removeEventListener('change', listener);
    }, []);

    return reduced;
}
