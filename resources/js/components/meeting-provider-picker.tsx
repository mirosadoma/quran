import { CircleCheck, CircleDashed, Link2, Video } from 'lucide-react';
import { useTrans } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { MeetingProvider, ProviderOption } from '@/types';

const descriptions: Record<MeetingProvider, string> = {
    google_meet: 'Recommended: cheapest and most stable, links created automatically',
    zoom: 'Automatic Zoom meetings with your Zoom licenses',
    jitsi: 'Free; works without setup or embedded inside the platform',
    manual: 'Paste a fixed meeting link yourself',
};

export function MeetingProviderPicker({
    providers,
    value,
    onChange,
}: {
    providers: ProviderOption[];
    value: MeetingProvider;
    onChange: (value: MeetingProvider) => void;
}) {
    const { t } = useTrans();

    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {providers.map((provider) => {
                const active = provider.value === value;
                const Icon = provider.value === 'manual' ? Link2 : Video;

                return (
                    <button
                        key={provider.value}
                        type="button"
                        onClick={() => onChange(provider.value)}
                        className={cn(
                            'flex items-start gap-3 rounded-2xl border p-4 text-start transition',
                            active
                                ? 'border-primary-600 bg-primary-50/70 ring-4 ring-primary-500/10 dark:bg-primary-500/10'
                                : 'border-line hover:border-line-strong',
                        )}
                    >
                        <span
                            className={cn(
                                'flex size-10 shrink-0 items-center justify-center rounded-xl',
                                active ? 'bg-primary-600 text-white' : 'bg-surface-muted text-muted',
                            )}
                        >
                            <Icon className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-ink">{provider.value === 'manual' ? t('Manual link') : provider.label}</span>
                                {provider.configured ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                        <CircleCheck className="size-3.5" />
                                        {t('Ready')}
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                        <CircleDashed className="size-3.5" />
                                        {t('Needs setup')}
                                    </span>
                                )}
                            </span>
                            <span className="mt-1 block text-xs leading-relaxed text-muted">{t(descriptions[provider.value])}</span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
