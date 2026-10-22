import { usePoll } from '@inertiajs/react';
import { Copy, KeyRound, Mail, MessageCircle, Phone, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/form';
import AppLayout from '@/layouts/app-layout';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { useLabels, type Tone } from '@/lib/labels';
import { cn, copyText } from '@/lib/utils';
import type { SentCodeItem } from '@/types';

interface SentCodesIndexProps {
    codes: SentCodeItem[];
    /** How long the codes are kept. */
    keepHours: number;
}

const statusTone: Record<SentCodeItem['status'], Tone> = {
    valid: 'emerald',
    expired: 'slate',
    used: 'sky',
    replaced: 'amber',
    blocked: 'rose',
};

function whatsappLink(phone: string): string {
    return `https://wa.me/${phone.replace(/[^0-9]/g, '')}`;
}

const chipClasses =
    'inline-flex h-8 items-center gap-1.5 rounded-xl border border-line bg-surface px-2.5 text-xs font-semibold text-ink transition hover:border-line-strong';

/**
 * The codes (OTP) the platform sent in the last hours, to give one to a user whose email did not arrive.
 */
export default function SentCodesIndex({ codes, keepHours }: SentCodesIndexProps) {
    const { t } = useTrans();
    const dates = useDates();
    const labels = useLabels();
    const [search, setSearch] = useState('');

    // New codes appear without reloading the page.
    usePoll(15_000, { only: ['codes'] });

    const statusLabel: Record<SentCodeItem['status'], string> = {
        valid: t('Valid'),
        expired: t('Expired'),
        used: t('Used'),
        replaced: t('Replaced by a newer code'),
        blocked: t('Blocked after wrong tries'),
    };

    const purposeLabel: Record<SentCodeItem['purpose'], string> = {
        password_reset: t('Password reset'),
    };

    const shown = useMemo(() => {
        const term = search.trim().toLowerCase();

        if (!term) {
            return codes;
        }

        return codes.filter((item) => [item.user.name, item.user.email, item.user.phone, item.destination, item.code].some((value) => value?.toLowerCase().includes(term)));
    }, [codes, search]);

    const copy = async (code: string) => {
        if (await copyText(code)) {
            toast.success(t('Copied'));
        }
    };

    return (
        <AppLayout
            title={t('Verification codes')}
            description={t('The codes (OTP) the platform sent in the last :count hours. Make sure you are talking to the owner of the account before giving a code.', {
                count: keepHours,
            })}
        >
            <div className="relative mb-6 max-w-md">
                <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('Search by name, email or phone')} className="ps-9" />
            </div>

            {shown.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={KeyRound}
                        title={search ? t('No results') : t('No codes in the last :count hours', { count: keepHours })}
                        description={t('When a user asks for a code to reset the password, it appears here.')}
                    />
                </Card>
            ) : (
                <div className="space-y-3">
                    {shown.map((item) => {
                        const valid = item.status === 'valid';

                        return (
                            <Card key={item.id} className={cn('p-4 sm:p-5', valid && 'border-emerald-500/40')}>
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                    <div className="flex items-center gap-2 sm:w-56 sm:shrink-0">
                                        <span dir="ltr" className={cn('font-mono text-2xl font-bold tracking-[0.25em]', valid ? 'text-ink' : 'text-muted')}>
                                            {item.code}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => copy(item.code)}
                                            title={t('Copy')}
                                            aria-label={t('Copy')}
                                            className="rounded-lg p-1.5 text-primary-700 transition hover:bg-surface-muted dark:text-primary-300"
                                        >
                                            <Copy className="size-4" />
                                        </button>
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                            <p className="font-bold text-ink">{item.user.name}</p>
                                            <span className="text-xs text-muted">{labels.role[item.user.role]}</span>
                                            <Badge tone={statusTone[item.status]}>{statusLabel[item.status]}</Badge>
                                        </div>

                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {item.user.email && (
                                                <a href={`mailto:${item.user.email}`} className={chipClasses} dir="ltr">
                                                    <Mail className="size-4" />
                                                    {item.user.email}
                                                </a>
                                            )}
                                            {item.user.phone && (
                                                <>
                                                    <a href={`tel:${item.user.phone}`} className={chipClasses} dir="ltr">
                                                        <Phone className="size-4" />
                                                        {item.user.phone}
                                                    </a>
                                                    <a
                                                        href={whatsappLink(item.user.phone)}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-emerald-600 px-2.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                                                    >
                                                        <MessageCircle className="size-4" />
                                                        {t('WhatsApp')}
                                                    </a>
                                                </>
                                            )}
                                        </div>

                                        <p className="mt-2 text-xs leading-relaxed text-muted">
                                            {purposeLabel[item.purpose]}
                                            {' · '}
                                            {t('Sent by email')}
                                            {item.sent_at && ` · ${dates.relative(item.sent_at)}`}
                                            {valid && ` · ${t('Valid until :time', { time: dates.time(item.expires_at) })}`}
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </AppLayout>
    );
}
