import { __setPageProps } from '@inertiajs/react';
import type { MascotQuote } from '@/lib/mascot/quotes';

/**
 * The shared props the components read through usePage(): the language, the name of the platform and the quotes.
 */
export function setPage({ locale = 'ar', quotes = sampleQuotes() }: { locale?: 'ar' | 'en'; quotes?: MascotQuote[] } = {}): void {
    __setPageProps({
        locale,
        app: { name: 'وِرد', tagline: null, logo_url: null, contact: { email: null, phone: null } },
        auth: { user: null },
        mascot: quotes,
    });
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
 * Ziggy's route() helper, as the components call it.
 */
export function stubRoutes(): void {
    (globalThis as { route?: unknown }).route = Object.assign((name: string) => `/${name.replaceAll('.', '/')}`, {
        current: () => false,
    });
}
