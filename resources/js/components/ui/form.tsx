import { Switch as HeadlessSwitch } from '@headlessui/react';
import { ChevronDown, CircleAlert } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const inputClasses = cn(
    'h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink shadow-xs outline-none transition',
    'placeholder:text-muted/70 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15',
    'disabled:cursor-not-allowed disabled:opacity-60 dark:bg-surface-muted',
    'aria-[invalid=true]:border-rose-400 aria-[invalid=true]:focus:ring-rose-500/15',
);

export function Input({ className, ...props }: ComponentProps<'input'>) {
    return <input className={cn(inputClasses, className)} {...props} />;
}

export function Textarea({ className, rows = 3, ...props }: ComponentProps<'textarea'>) {
    return <textarea rows={rows} className={cn(inputClasses, 'h-auto min-h-20 py-2.5 leading-relaxed', className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
    return (
        <div className="relative">
            <select className={cn(inputClasses, 'cursor-pointer appearance-none pe-10', className)} {...props}>
                {children}
            </select>
            <ChevronDown className="pointer-events-none absolute end-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        </div>
    );
}

export function Label({ className, ...props }: ComponentProps<'label'>) {
    return <label className={cn('mb-1.5 block text-sm font-medium text-ink', className)} {...props} />;
}

export function FieldError({ message }: { message?: string | null }) {
    if (!message) {
        return null;
    }

    return (
        <p className="mt-1.5 flex items-start gap-1 text-xs font-medium text-rose-600 dark:text-rose-400">
            <CircleAlert className="mt-px size-3.5 shrink-0" />
            <span>{message}</span>
        </p>
    );
}

interface FieldProps {
    label?: ReactNode;
    htmlFor?: string;
    error?: string | null;
    hint?: ReactNode;
    required?: boolean;
    className?: string;
    children: ReactNode;
}

export function Field({ label, htmlFor, error, hint, required, className, children }: FieldProps) {
    return (
        <div className={className}>
            {label && (
                <Label htmlFor={htmlFor}>
                    {label}
                    {required && <span className="ms-0.5 text-rose-500">*</span>}
                </Label>
            )}
            {children}
            {hint && !error && <p className="mt-1.5 text-xs leading-relaxed text-muted">{hint}</p>}
            <FieldError message={error} />
        </div>
    );
}

interface CheckboxProps extends Omit<ComponentProps<'input'>, 'type'> {
    label?: ReactNode;
    description?: ReactNode;
}

export function Checkbox({ label, description, className, ...props }: CheckboxProps) {
    const input = (
        <input
            type="checkbox"
            className={cn('mt-0.5 size-4.5 shrink-0 cursor-pointer rounded-md border-line accent-primary-700', className)}
            {...props}
        />
    );

    if (!label) {
        return input;
    }

    return (
        <label className="flex cursor-pointer items-start gap-3">
            {input}
            <span>
                <span className="block text-sm font-medium text-ink">{label}</span>
                {description && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span>}
            </span>
        </label>
    );
}

interface SwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: ReactNode;
    description?: ReactNode;
    disabled?: boolean;
}

export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
    const control = (
        <HeadlessSwitch
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="group relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-line-strong transition data-checked:bg-primary-600 data-disabled:cursor-not-allowed data-disabled:opacity-50"
        >
            <span className="inline-block size-5 translate-x-0.5 rounded-full bg-white shadow-sm transition group-data-checked:translate-x-5.5 rtl:-translate-x-0.5 rtl:group-data-checked:-translate-x-5.5" />
        </HeadlessSwitch>
    );

    if (!label) {
        return control;
    }

    return (
        <label className="flex cursor-pointer items-start justify-between gap-4">
            <span>
                <span className="block text-sm font-medium text-ink">{label}</span>
                {description && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span>}
            </span>
            {control}
        </label>
    );
}
