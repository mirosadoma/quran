import { School } from 'lucide-react';
import { IslamicPattern } from '@/components/brand';
import { cn } from '@/lib/utils';

const sizes = {
    sm: 'size-10 rounded-xl [&_svg.icon]:size-5',
    md: 'size-14 rounded-2xl [&_svg.icon]:size-6',
    lg: 'size-20 rounded-3xl [&_svg.icon]:size-9',
} as const;

/**
 * The logo of an academy, or its emblem when it has none.
 */
export function AcademyLogo({
    academy,
    size = 'md',
    className,
}: {
    academy: { name: string; logo_url: string | null };
    size?: keyof typeof sizes;
    className?: string;
}) {
    if (academy.logo_url) {
        return <img src={academy.logo_url} alt={academy.name} className={cn('shrink-0 bg-white object-contain p-1 ring-1 ring-line', sizes[size], className)} />;
    }

    return (
        <span
            aria-hidden
            className={cn(
                'relative flex shrink-0 items-center justify-center overflow-hidden bg-linear-to-br from-primary-700 to-primary-950 text-gold-300',
                sizes[size],
                className,
            )}
        >
            <IslamicPattern className="text-gold-300/15" size={28} />
            <School className="icon relative" />
        </span>
    );
}
