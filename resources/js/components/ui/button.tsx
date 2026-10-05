import { Link } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const variants = {
    primary:
        'bg-primary-700 text-white shadow-sm shadow-primary-900/15 hover:bg-primary-800 dark:bg-primary-600 dark:hover:bg-primary-500',
    gold: 'bg-gold-500 text-white shadow-sm shadow-gold-900/15 hover:bg-gold-600',
    secondary: 'border border-line bg-surface text-ink shadow-xs hover:border-line-strong hover:bg-surface-muted',
    outline:
        'border border-primary-700/25 text-primary-800 hover:bg-primary-50 dark:border-primary-400/30 dark:text-primary-300 dark:hover:bg-primary-500/10',
    ghost: 'text-muted hover:bg-surface-muted hover:text-ink',
    danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700',
    'danger-soft': 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20',
    success: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700',
    light: 'bg-white/15 text-white ring-1 ring-white/25 backdrop-blur hover:bg-white/25',
} as const;

const sizes = {
    xs: 'h-7 gap-1 rounded-lg px-2.5 text-xs [&_svg]:size-3.5',
    sm: 'h-9 gap-1.5 px-3 text-xs [&_svg]:size-4',
    md: 'h-10 gap-2 px-4 text-sm [&_svg]:size-4',
    lg: 'h-12 gap-2 px-6 text-base [&_svg]:size-5',
    icon: 'size-10 [&_svg]:size-5',
    'icon-sm': 'size-8 rounded-lg [&_svg]:size-4',
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonClasses({
    variant = 'primary',
    size = 'md',
    className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
    return cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-xl font-semibold whitespace-nowrap transition duration-150',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/25 active:scale-[0.98]',
        'disabled:pointer-events-none disabled:opacity-55 [&_svg]:shrink-0',
        variants[variant],
        sizes[size],
        className,
    );
}

interface ButtonProps extends ComponentProps<'button'> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
}

export function Button({ variant, size, loading = false, className, children, disabled, type = 'button', ...props }: ButtonProps) {
    return (
        <button type={type} className={buttonClasses({ variant, size, className })} disabled={disabled || loading} {...props}>
            {loading && <LoaderCircle className="animate-spin" />}
            {children}
        </button>
    );
}

type LinkButtonProps = Omit<ComponentProps<typeof Link>, 'size'> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
};

export function LinkButton({ variant, size, className, ...props }: LinkButtonProps) {
    return <Link className={buttonClasses({ variant, size, className: className as string | undefined })} {...props} />;
}

export function Spinner({ className }: { className?: string }) {
    return <LoaderCircle className={cn('size-5 animate-spin text-primary-600', className)} />;
}
