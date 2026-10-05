import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { inputClasses } from '@/components/ui/form';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';

interface SearchInputProps {
    value: string;
    onSearch: (value: string) => void;
    placeholder?: string;
    className?: string;
    delay?: number;
}

/**
 * Search field that reports its value after the user stops typing.
 */
export function SearchInput({ value, onSearch, placeholder, className, delay = 400 }: SearchInputProps) {
    const [text, setText] = useState(value);
    const debounced = useDebounce(text, delay);
    const first = useRef(true);

    useEffect(() => {
        if (first.current) {
            first.current = false;

            return;
        }

        if (debounced !== value) {
            onSearch(debounced);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debounced]);

    return (
        <div className={cn('relative', className)}>
            <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
                type="search"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={placeholder}
                className={cn(inputClasses, 'ps-10 pe-9 [&::-webkit-search-cancel-button]:hidden')}
            />
            {text && (
                <button
                    type="button"
                    onClick={() => {
                        setText('');
                        onSearch('');
                    }}
                    className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:text-ink"
                >
                    <X className="size-4" />
                </button>
            )}
        </div>
    );
}
