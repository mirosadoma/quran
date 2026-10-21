import { usePage } from '@inertiajs/react';
import type { MascotVariant } from '@/lib/mascot/config';

/**
 * Where the administration lets the companion show (settings, shared by HandleInertiaRequests).
 */
export interface CompanionVisibility {
    /** The public website and the sign-in pages. */
    site: boolean;
    /** The control panel of the signed-in user's role. */
    panel: boolean;
}

/**
 * Whether the companion shows in a part of the platform: the control panels (app), the public website (site)
 * or the sign-in pages (auth). Shown when nothing says otherwise.
 */
export function companionShown(visibility: CompanionVisibility | null | undefined, variant: MascotVariant): boolean {
    return (variant === 'app' ? visibility?.panel : visibility?.site) !== false;
}

/**
 * The same for a page known by its component and props, outside the page's React tree (the loading screen).
 */
export function companionShownOn(page: { component: string; props: Record<string, unknown> }): boolean {
    return companionShown(page.props.companion as CompanionVisibility | undefined, /^(site|auth)\//.test(page.component) ? 'site' : 'app');
}

export function useCompanionShown(variant: MascotVariant): boolean {
    return companionShown(usePage().props.companion, variant);
}
