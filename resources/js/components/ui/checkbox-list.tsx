import { Check, Search } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { inputClasses } from '@/components/ui/form';
import { useTrans } from '@/lib/i18n';
import { normalizeArabic } from '@/lib/quran';
import { cn } from '@/lib/utils';

export interface CheckboxOption {
    id: number;
    name: string;
    avatar_url?: string | null;
    meta?: ReactNode;
    disabled?: boolean;
}

interface CheckboxListProps {
    options: CheckboxOption[];
    value: number[];
    onChange: (value: number[]) => void;
    emptyText?: string;
    showAvatars?: boolean;
    className?: string;
}

/**
 * Searchable multi-select list (students, halaqat...).
 */
export function CheckboxList({ options, value, onChange, emptyText, showAvatars = true, className }: CheckboxListProps) {
    const { t } = useTrans();
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
        const needle = normalizeArabic(query.trim());

        return needle ? options.filter((option) => normalizeArabic(option.name).includes(needle)) : options;
    }, [options, query]);

    const toggle = (id: number) => {
        onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
    };

    return (
        <div className={cn('overflow-hidden rounded-2xl border border-line', className)}>
            <div className="flex items-center gap-2 border-b border-line bg-surface-muted p-2">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={t('Search...')}
                        className={cn(inputClasses, 'h-9 ps-9 text-sm')}
                    />
                </div>
                <span className="shrink-0 rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
                    {t(':count selected', { count: value.length })}
                </span>
            </div>
            <ul className="max-h-72 divide-y divide-line overflow-y-auto">
                {filtered.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">{emptyText ?? t('No results')}</li>}
                {filtered.map((option) => {
                    const checked = value.includes(option.id);

                    return (
                        <li key={option.id}>
                            <button
                                type="button"
                                disabled={option.disabled && !checked}
                                onClick={() => toggle(option.id)}
                                className={cn(
                                    'flex w-full items-center gap-3 px-4 py-2.5 text-start transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50',
                                    checked && 'bg-primary-50/70 dark:bg-primary-500/10',
                                )}
                            >
                                <span
                                    className={cn(
                                        'flex size-5 shrink-0 items-center justify-center rounded-md border transition',
                                        checked ? 'border-primary-600 bg-primary-600 text-white' : 'border-line-strong bg-surface',
                                    )}
                                >
                                    {checked && <Check className="size-3.5" strokeWidth={3} />}
                                </span>
                                {showAvatars && <Avatar name={option.name} src={option.avatar_url} size="sm" />}
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-ink">{option.name}</span>
                                    {option.meta && <span className="block truncate text-xs text-muted">{option.meta}</span>}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
