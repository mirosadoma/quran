import { router } from '@inertiajs/react';
import { BookOpenText, ChevronDown, CircleCheck, Copy, Ellipsis, HandHeart, Pencil, Sparkles, Trash, TriangleAlert, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { SeverityBadge } from '@/components/deeds/deed-form';
import { Button } from '@/components/ui/button';
import { Dropdown, DropdownItem } from '@/components/ui/dropdown';
import { ConfirmDialog } from '@/components/ui/modal';
import { useDates } from '@/lib/dates';
import { deedCatalog, type DeedItem, findEntry, type GoodEntry, type SinEntry } from '@/lib/deeds';
import { useTrans } from '@/lib/i18n';
import { localized } from '@/lib/prayers';
import { cn, copyText } from '@/lib/utils';

/**
 * One recorded deed. A sin shows how to repent of it (and its expiation) and the button to mark it
 * repented; a good deed shows its virtue.
 */
export function DeedRow({ deed, onEdit }: { deed: DeedItem; onEdit: (deed: DeedItem) => void }) {
    const { t, locale } = useTrans();
    const dates = useDates();
    const sin = deed.kind === 'bad';
    const repented = deed.repented_at !== null;
    const entry = findEntry(deed.kind, deed.catalog_key);
    const sinEntry = sin ? (entry as SinEntry | undefined) : undefined;
    const [open, setOpen] = useState(sin && !repented);
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);

    const toggleRepent = () => {
        router.patch(route('deeds.repent', deed.id), {}, { preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) });
    };

    const remove = () => {
        router.delete(route('deeds.destroy', deed.id), { preserveScroll: true, onFinish: () => setConfirming(false) });
    };

    return (
        <li
            className={cn(
                'rounded-2xl border bg-surface p-4 transition',
                sin ? (repented ? 'border-sky-200 dark:border-sky-500/20' : 'border-rose-200 dark:border-rose-500/25') : 'border-emerald-200 dark:border-emerald-500/20',
            )}
        >
            <div className="flex items-start gap-3">
                <span
                    className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-2xl',
                        sin
                            ? repented
                                ? 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300'
                                : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300'
                            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
                    )}
                >
                    {sin ? repented ? <HandHeart className="size-5" /> : <TriangleAlert className="size-5" /> : <Sparkles className="size-5" />}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-relaxed break-words text-ink">{deed.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                        <span className="tabular-nums">{dates.clock(deed.time)}</span>
                        {entry && <span>· {localized(entry.name, locale)}</span>}
                        {sin && <SeverityBadge severity={deed.severity} />}
                        {repented && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 font-bold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                                <CircleCheck className="size-3" />
                                {sinEntry?.kaffarah ? t('Expiation done') : t('Repented')}
                            </span>
                        )}
                    </div>
                    {deed.notes && <p className="mt-1.5 text-sm leading-relaxed text-muted">{deed.notes}</p>}
                </div>
                <Dropdown
                    trigger={
                        <button type="button" className="rounded-lg p-1.5 text-muted transition hover:bg-surface-muted hover:text-ink" aria-label={t('Actions')}>
                            <Ellipsis className="size-5" />
                        </button>
                    }
                >
                    <DropdownItem icon={Pencil} onClick={() => onEdit(deed)}>
                        {t('Edit')}
                    </DropdownItem>
                    <DropdownItem icon={Trash} onClick={() => setConfirming(true)} danger>
                        {t('Delete')}
                    </DropdownItem>
                </Dropdown>
            </div>

            {!sin && (entry as GoodEntry | undefined)?.virtue && (
                <p className="mt-3 rounded-xl bg-emerald-50/60 px-3 py-2 font-quran text-[15px] leading-relaxed text-emerald-900 dark:bg-emerald-500/5 dark:text-emerald-200">
                    {(entry as GoodEntry).virtue?.text} <span className="font-sans text-xs text-muted">— {(entry as GoodEntry).virtue?.source}</span>
                </p>
            )}

            {sin && (
                <div className="mt-3 space-y-3">
                    <button
                        type="button"
                        onClick={() => setOpen((value) => !value)}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 dark:text-primary-300"
                        aria-expanded={open}
                    >
                        <BookOpenText className="size-4" />
                        {sinEntry?.kaffarah ? t('How to repent and its expiation') : t('How to repent of it')}
                        <ChevronDown className={cn('size-4 transition', open && 'rotate-180')} />
                    </button>
                    {open && <SinGuidance entry={sinEntry} />}
                    <Button
                        size="sm"
                        variant={repented ? 'secondary' : 'primary'}
                        loading={busy}
                        onClick={toggleRepent}
                        className={cn(!repented && 'w-full sm:w-auto')}
                    >
                        {repented ? <Undo2 /> : <CircleCheck />}
                        {repented
                            ? t('Mark as not repented yet')
                            : sinEntry?.kaffarah
                              ? t('I made its expiation and asked forgiveness')
                              : t('I repented and asked forgiveness')}
                    </Button>
                </div>
            )}

            <ConfirmDialog
                open={confirming}
                onClose={() => setConfirming(false)}
                onConfirm={remove}
                title={t('Delete this deed?')}
                message={t('It is removed from your record and your reports.')}
                confirmLabel={t('Delete')}
            />
        </li>
    );
}

/**
 * How to repent of a sin: the specific way, its expiation, the evidence, then the general conditions
 * of repentance and the words of seeking forgiveness.
 */
export function SinGuidance({ entry }: { entry?: SinEntry }) {
    const { t, locale } = useTrans();
    const [formulas, setFormulas] = useState(false);

    const copy = async (text: string) => {
        if (await copyText(text)) {
            toast.success(t('Copied'));
        }
    };

    return (
        <div className="space-y-3 rounded-2xl bg-surface-muted/70 p-4 text-sm leading-relaxed">
            {entry && <p className="text-ink">{localized(entry.repent, locale)}</p>}
            {entry?.kaffarah && (
                <p className="rounded-xl border-s-4 border-gold-400 bg-gold-50 px-3 py-2 text-gold-900 dark:bg-gold-500/10 dark:text-gold-100">
                    <span className="font-bold">{t('Expiation:')}</span> {localized(entry.kaffarah, locale)}
                </p>
            )}
            {entry?.evidence && (
                <p className="font-quran text-base text-ink">
                    {entry.evidence.text} <span className="font-sans text-xs text-muted">— {entry.evidence.source}</span>
                </p>
            )}

            <div>
                <p className="mb-1 text-xs font-bold text-muted">{t('The conditions of repentance')}</p>
                <ol className="list-inside list-decimal space-y-0.5 text-ink">
                    {deedCatalog.repentance[locale].map((condition) => (
                        <li key={condition}>{condition}</li>
                    ))}
                </ol>
            </div>

            <button type="button" onClick={() => setFormulas((value) => !value)} className="text-xs font-bold text-primary-700 dark:text-primary-300" aria-expanded={formulas}>
                {formulas ? t('Hide the words of seeking forgiveness') : t('Words of seeking forgiveness')}
            </button>
            {formulas && (
                <div className="space-y-2">
                    {deedCatalog.istighfar.map((formula) => (
                        <div key={formula.text} className="rounded-xl bg-surface p-3">
                            <div className="mb-1 flex items-center justify-between gap-2">
                                <p className="text-xs font-bold text-muted">{localized(formula.title, locale)}</p>
                                <button type="button" onClick={() => void copy(formula.text)} className="rounded-md p-1 text-muted hover:text-ink" aria-label={t('Copy')}>
                                    <Copy className="size-3.5" />
                                </button>
                            </div>
                            <p dir="rtl" className="font-quran text-lg leading-loose text-ink">
                                {formula.text}
                            </p>
                            <p className="text-[11px] text-muted">{formula.source}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
