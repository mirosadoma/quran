import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import { ChevronsUpDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { inputClasses } from '@/components/ui/form';
import { useTrans } from '@/lib/i18n';
import { normalizeArabic, surahName, surahs } from '@/lib/quran';
import { cn } from '@/lib/utils';

interface SurahSelectProps {
    id?: string;
    value: number | null;
    onChange: (surah: number) => void;
    invalid?: boolean;
}

/**
 * Searchable surah picker (by number, Arabic or English name).
 */
export function SurahSelect({ id, value, onChange, invalid = false }: SurahSelectProps) {
    const { t, locale } = useTrans();
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
        const needle = query.trim();

        if (needle === '') {
            return surahs;
        }

        const arabic = normalizeArabic(needle);

        return surahs.filter(
            (surah) =>
                String(surah.number) === needle ||
                normalizeArabic(surah.ar).includes(arabic) ||
                surah.en.toLowerCase().includes(needle.toLowerCase()),
        );
    }, [query]);

    return (
        <Combobox value={value} onChange={(surah: number | null) => surah && onChange(surah)} onClose={() => setQuery('')} immediate>
            <div className="relative">
                <ComboboxInput
                    id={id}
                    aria-invalid={invalid}
                    className={cn(inputClasses, 'pe-9')}
                    displayValue={(surah: number | null) => (surah ? `${surah}. ${surahName(surah, locale)}` : '')}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t('Choose a surah')}
                    autoComplete="off"
                />
                <ComboboxButton className="absolute inset-y-0 end-0 flex items-center px-3 text-muted">
                    <ChevronsUpDown className="size-4" />
                </ComboboxButton>
            </div>
            <ComboboxOptions
                anchor="bottom start"
                transition
                className="z-[60] max-h-64 w-(--input-width) overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-xl [--anchor-gap:6px] empty:invisible transition duration-100 data-closed:opacity-0"
            >
                {filtered.map((surah) => (
                    <ComboboxOption
                        key={surah.number}
                        value={surah.number}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-ink data-focus:bg-primary-50 data-selected:font-bold dark:data-focus:bg-primary-500/10"
                    >
                        <span className="flex items-center gap-2.5">
                            <span className="w-6 text-xs text-muted tabular-nums">{surah.number}</span>
                            <span>{locale === 'ar' ? surah.ar : surah.en}</span>
                        </span>
                        <span className="text-xs text-muted">{t(':count ayahs', { count: surah.ayahs })}</span>
                    </ComboboxOption>
                ))}
            </ComboboxOptions>
        </Combobox>
    );
}
