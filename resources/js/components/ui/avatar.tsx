import { cn, initials } from '@/lib/utils';

const palette = [
    'bg-emerald-600',
    'bg-teal-600',
    'bg-sky-600',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-rose-500',
    'bg-amber-600',
    'bg-lime-700',
    'bg-cyan-700',
];

const sizes = {
    xs: 'size-6 text-[10px]',
    sm: 'size-8 text-xs',
    md: 'size-10 text-sm',
    lg: 'size-14 text-lg',
    xl: 'size-20 text-2xl',
} as const;

function hash(value: string): number {
    let result = 0;

    for (const char of value) {
        result = (result * 31 + char.charCodeAt(0)) | 0;
    }

    return Math.abs(result);
}

interface AvatarProps {
    name: string;
    src?: string | null;
    size?: keyof typeof sizes;
    className?: string;
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
    if (src) {
        return <img src={src} alt={name} className={cn('shrink-0 rounded-full object-cover ring-2 ring-surface', sizes[size], className)} />;
    }

    return (
        <span
            aria-hidden
            className={cn(
                'inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ring-2 ring-surface',
                palette[hash(name) % palette.length],
                sizes[size],
                className,
            )}
        >
            {initials(name)}
        </span>
    );
}

export function AvatarStack({ people, max = 4 }: { people: { name: string; avatar_url?: string | null }[]; max?: number }) {
    const visible = people.slice(0, max);
    const rest = people.length - visible.length;

    return (
        <div className="flex -space-x-2 rtl:space-x-reverse">
            {visible.map((person, index) => (
                <Avatar key={index} name={person.name} src={person.avatar_url} size="sm" />
            ))}
            {rest > 0 && (
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-muted ring-2 ring-surface">
                    +{rest}
                </span>
            )}
        </div>
    );
}
