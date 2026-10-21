import { __setPageProps } from '@inertiajs/react';
import type { CompanionVisibility } from '@/hooks/use-companion';
import type { MascotQuote } from '@/lib/mascot/quotes';
import type { AuthUser, SharedProps } from '@/types';

interface PageOptions {
    locale?: 'ar' | 'en';
    quotes?: MascotQuote[];
    companion?: CompanionVisibility;
    user?: AuthUser | null;
    counts?: SharedProps['counts'];
}

/**
 * The shared props the components read through usePage(): the language, the name of the platform, the quotes,
 * where the companion shows, the signed-in user and their unread counters.
 */
export function setPage({ locale = 'ar', quotes = sampleQuotes(), companion = { site: true, panel: true }, user = null, counts = null }: PageOptions = {}): void {
    __setPageProps({
        locale,
        app: { name: 'وِرد', tagline: null, logo_url: null, contact: { email: null, phone: null } },
        auth: { user },
        mascot: quotes,
        companion,
        counts,
    });
}

/**
 * A signed-in user of the role (a student without academy studies on their own).
 */
export function sampleUser(role: AuthUser['role'], { academy = true }: { academy?: boolean } = {}): AuthUser {
    return {
        id: 7,
        name: 'أحمد',
        email: 'ahmad@example.com',
        phone: null,
        role,
        gender: 'male',
        avatar_url: null,
        timezone: 'Africa/Cairo',
        academy: academy && role !== 'admin' ? { id: 1, name: 'أكاديمية رتّل', logo_url: null } : null,
    };
}

export function sampleQuotes(): MascotQuote[] {
    return [
        { id: 'ayah:94:6', kind: 'ayah', text: 'إِنَّ مَعَ ٱلْعُسْرِ يُسْرًۭا', source: 'سورة الشرح: 6', href: '/admin/mushaf?surah=94&ayah=6' },
        { id: 'ayah:54:17', kind: 'ayah', text: 'وَلَقَدْ يَسَّرْنَا ٱلْقُرْءَانَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍۢ', source: 'سورة القمر: 17', href: '/admin/mushaf?surah=54&ayah=17' },
        { id: 'hadith:la-taghdab', kind: 'hadith', text: 'لاَ تَغْضَبْ', source: 'رواه البخاري', href: '/admin/hadith/bukhari/6116' },
        { id: 'dhikr:tasbih:1', kind: 'dhikr', text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', source: 'رواه مسلم', href: '/admin/adhkar' },
        { id: 'wisdom:ali', kind: 'wisdom', text: 'قيمة كل امرئ ما يُحسن.', source: 'علي بن أبي طالب رضي الله عنه', href: '/admin/sayings' },
    ];
}

/**
 * Ziggy's route() helper, as the components call it: route(name) is the URL, route().current(pattern) tells
 * whether `current` (the name of the route of the page) matches the pattern ("halaqat.*").
 */
export function stubRoutes(current: string | null = null): void {
    const matches = (pattern: string) => current !== null && new RegExp(`^${pattern.replaceAll('.', '\\.').replaceAll('*', '.*')}$`).test(current);

    (globalThis as { route?: unknown }).route = Object.assign((name?: string) => (name === undefined ? { current: matches } : `/${name.replaceAll('.', '/')}`), {
        current: matches,
    });
}
