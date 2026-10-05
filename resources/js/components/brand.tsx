import { usePage } from '@inertiajs/react';
import { useId } from 'react';
import { useTrans } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Brand mark: an open mushaf inside an eight-pointed star (Rub el Hizb).
 */
export function LogoMark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 48 48" className={cn('size-10', className)} aria-hidden>
            <rect width="48" height="48" rx="14" fill="#0b3b31" />
            <g fill="none" stroke="#d8a747" strokeWidth="1.8" strokeLinejoin="round">
                <rect x="12.5" y="12.5" width="23" height="23" rx="1.5" />
                <rect x="12.5" y="12.5" width="23" height="23" rx="1.5" transform="rotate(45 24 24)" />
            </g>
            <path d="M24 21.4c-2-1.5-4.3-1.8-6.6-1V28c2.3-.8 4.6-.5 6.6 1z" fill="#ecd7a1" />
            <path d="M24 21.4c2-1.5 4.3-1.8 6.6-1V28c-2.3-.8-4.6-.5-6.6 1z" fill="#f6ecd2" />
        </svg>
    );
}

export function Logo({ light = false, className }: { light?: boolean; className?: string }) {
    const { app } = usePage().props;
    const { t } = useTrans();

    return (
        <div className={cn('flex items-center gap-3', className)}>
            {app.logo_url ? (
                <img src={app.logo_url} alt={app.name} className="size-10 rounded-xl object-cover" />
            ) : (
                <LogoMark className="drop-shadow-sm" />
            )}
            <div className="min-w-0 leading-tight">
                <p className={cn('truncate font-quran text-xl font-bold', light ? 'text-white' : 'text-ink')}>{app.name}</p>
                <p className={cn('truncate text-[11px] font-medium', light ? 'text-gold-200/80' : 'text-muted')}>
                    {app.tagline || t('Quran memorization platform')}
                </p>
            </div>
        </div>
    );
}

/**
 * Islamic geometric pattern (eight-pointed stars) drawn with currentColor.
 */
export function IslamicPattern({ className, size = 64, strokeWidth = 1 }: { className?: string; size?: number; strokeWidth?: number }) {
    const id = `pattern-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const c = size / 2;
    const h = size * 0.2;
    const d = h * Math.SQRT2;
    const k = size * 0.14;

    const path = [
        `M${c - h} ${c - h}H${c + h}V${c + h}H${c - h}Z`,
        `M${c} ${c - d}L${c + d} ${c}L${c} ${c + d}L${c - d} ${c}Z`,
        `M${c} 0V${c - d}M${c} ${c + d}V${size}M0 ${c}H${c - d}M${c + d} ${c}H${size}`,
        `M0 ${k}L${k} 0M${size - k} 0L${size} ${k}M${size} ${size - k}L${size - k} ${size}M${k} ${size}L0 ${size - k}`,
    ].join('');

    return (
        <svg className={cn('pointer-events-none absolute inset-0 size-full', className)} aria-hidden>
            <defs>
                <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse">
                    <path d={path} fill="none" stroke="currentColor" strokeWidth={strokeWidth} />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${id})`} />
        </svg>
    );
}

/**
 * Small decorative eight-pointed star.
 */
export function StarOrnament({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={cn('size-4', className)} aria-hidden>
            <g fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="1" />
                <rect x="6" y="6" width="12" height="12" rx="1" transform="rotate(45 12 12)" />
            </g>
        </svg>
    );
}
