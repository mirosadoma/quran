import { Headphones, Mic, Sparkles, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { IslamicPattern } from '@/components/brand';
import { scoreStars } from '@/components/recitation/recitation-ui';
import { SearchInput } from '@/components/ui/search-input';
import { Tabs } from '@/components/ui/tabs';
import { useTrans } from '@/lib/i18n';
import { type KidsProgress, shortSurahs } from '@/lib/kids';
import { arabicDigits, normalizeArabic, surah as surahOf, surahs } from '@/lib/quran';
import { cn } from '@/lib/utils';

/**
 * Colors of the surah cards, in turn.
 */
const palette = [
    'bg-emerald-500 shadow-emerald-500/30',
    'bg-sky-500 shadow-sky-500/30',
    'bg-violet-500 shadow-violet-500/30',
    'bg-rose-500 shadow-rose-500/30',
    'bg-gold-500 shadow-gold-500/30',
    'bg-teal-500 shadow-teal-500/30',
];

export function KidsHero() {
    const { t } = useTrans();

    const steps = [
        { icon: Headphones, text: t('Listen to the sheikh') },
        { icon: Mic, text: t('Recite with your voice') },
        { icon: Star, text: t('Collect the stars') },
    ];

    return (
        <div className="relative mb-6 overflow-hidden rounded-3xl bg-linear-to-br from-primary-700 via-primary-800 to-sidebar px-6 py-7 text-white shadow-xl shadow-primary-950/15 sm:px-8">
            <IslamicPattern className="text-gold-300/[0.12]" size={56} />
            <div className="pointer-events-none absolute -end-10 -top-16 size-56 rounded-full bg-gold-400/20 blur-3xl" />
            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-gold-200">
                        <Sparkles className="size-4" />
                        {t('Kids memorization')}
                    </p>
                    <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{t('Let us memorize the Quran together!')}</h1>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/80">
                        {t('Choose a surah, listen to the sheikh ayah by ayah, repeat after him, then recite with your voice to see how well you read.')}
                    </p>
                </div>
                <ol className="flex flex-wrap gap-2">
                    {steps.map((step, index) => (
                        <li key={index} className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-sm font-semibold ring-1 ring-white/15 backdrop-blur">
                            <span className="flex size-7 items-center justify-center rounded-xl bg-gold-400 text-primary-950">
                                <step.icon className="size-4" />
                            </span>
                            {step.text}
                        </li>
                    ))}
                </ol>
            </div>
        </div>
    );
}

/**
 * The surahs to choose from: the short ones first (the order children learn them in), or all of them.
 */
export function SurahPicker({ progress, onPick }: { progress: KidsProgress; onPick: (surah: number) => void }) {
    const { t, locale } = useTrans();
    const [tab, setTab] = useState<'short' | 'all'>('short');
    const [search, setSearch] = useState('');

    const list = useMemo(() => {
        const numbers = tab === 'short' ? shortSurahs : surahs.map((item) => item.number);
        const query = normalizeArabic(search.trim());

        if (!query) {
            return numbers;
        }

        return surahs
            .filter((item) => normalizeArabic(item.ar).includes(query) || item.en.toLowerCase().includes(query) || String(item.number) === query)
            .map((item) => item.number);
    }, [tab, search]);

    return (
        <>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Tabs
                    items={[
                        { value: 'short', label: t('Short surahs') },
                        { value: 'all', label: t('All surahs') },
                    ]}
                    value={tab}
                    onChange={setTab}
                />
                <SearchInput value={search} onSearch={setSearch} delay={150} placeholder={t('Search for a surah')} className="sm:w-72" />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {list.map((number, position) => {
                    const item = surahOf(number);

                    if (!item) {
                        return null;
                    }

                    const scores = Object.values(progress[number] ?? {});
                    const learned = scores.filter((score) => score >= 70).length;
                    const stars = scores.reduce((total, score) => total + scoreStars(score), 0);

                    return (
                        <button
                            key={number}
                            type="button"
                            onClick={() => onPick(number)}
                            className="group relative flex flex-col items-center gap-2 overflow-hidden rounded-3xl border border-line bg-surface p-4 text-center shadow-xs transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-lg active:scale-[0.98]"
                        >
                            <span className={cn('flex size-11 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-lg', palette[position % palette.length])}>
                                {locale === 'ar' ? arabicDigits(number) : number}
                            </span>
                            <span className="font-quran text-2xl leading-snug font-bold text-ink">{item.ar}</span>
                            <span className="text-xs text-muted">{t(':count ayahs', { count: locale === 'ar' ? arabicDigits(item.ayahs) : item.ayahs })}</span>
                            <span className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                                <span className="block h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(100 * learned) / item.ayahs}%` }} />
                            </span>
                            {stars > 0 && (
                                <span className="absolute end-2.5 top-2.5 flex items-center gap-0.5 rounded-full bg-gold-50 px-1.5 py-0.5 text-[11px] font-bold text-gold-700 dark:bg-gold-500/15 dark:text-gold-300">
                                    <Star className="size-3 fill-gold-400 text-gold-500" />
                                    {stars}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </>
    );
}
