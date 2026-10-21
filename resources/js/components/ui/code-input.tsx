import { useState } from 'react';
import { cn } from '@/lib/utils';

interface CodeInputProps {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    length?: number;
    invalid?: boolean;
    autoFocus?: boolean;
    disabled?: boolean;
}

/**
 * A code of digits (OTP) shown in boxes. One real input lies over the boxes, so typing, pasting and the code
 * the phone offers from the email (autocomplete one-time-code) all work; the boxes only show its digits.
 */
export function CodeInput({ id, value, onChange, length = 6, invalid = false, autoFocus = false, disabled = false }: CodeInputProps) {
    const [focused, setFocused] = useState(autoFocus);
    const current = Math.min(value.length, length - 1);

    return (
        <div className="relative" dir="ltr">
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }} aria-hidden>
                {Array.from({ length }, (_, index) => (
                    <div
                        key={index}
                        className={cn(
                            'flex h-14 items-center justify-center rounded-xl border bg-surface text-2xl font-bold text-ink tabular-nums shadow-xs transition dark:bg-surface-muted',
                            invalid ? 'border-rose-400' : 'border-line',
                            focused && index === current && 'border-primary-500 ring-4 ring-primary-500/15',
                            disabled && 'opacity-60',
                        )}
                    >
                        {value[index] ?? (focused && index === current ? <span className="h-6 w-0.5 animate-pulse rounded-full bg-primary-500" /> : '')}
                    </div>
                ))}
            </div>
            <input
                id={id}
                value={value}
                onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, length))}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={length}
                autoFocus={autoFocus}
                disabled={disabled}
                aria-invalid={invalid}
                className="absolute inset-0 h-full w-full cursor-text bg-transparent text-base text-transparent caret-transparent opacity-0 outline-none"
            />
        </div>
    );
}
