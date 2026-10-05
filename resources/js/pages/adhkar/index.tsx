import { router, useForm } from '@inertiajs/react';
import {
    BookOpen,
    Check,
    ChevronDown,
    Copy,
    Droplets,
    EllipsisVertical,
    Eye,
    EyeOff,
    GraduationCap,
    HandHeart,
    Heart,
    House,
    Landmark,
    type LucideIcon,
    Moon,
    Pencil,
    Plus,
    RotateCcw,
    Shield,
    Sparkles,
    Star,
    Sun,
    Sunrise,
    Sunset,
    Trash,
} from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, Input, Select, Switch, Textarea } from '@/components/ui/form';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import AppLayout from '@/layouts/app-layout';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { cn, colorOf } from '@/lib/utils';
import type { DhikrCategoryItem, DhikrItem } from '@/types';

interface AdhkarProps {
    categories: DhikrCategoryItem[];
    icons: string[];
    colors: string[];
    can: { manage: boolean };
}

export const dhikrIcons: Record<string, LucideIcon> = {
    sunrise: Sunrise,
    sunset: Sunset,
    moon: Moon,
    sun: Sun,
    'book-open': BookOpen,
    'hand-heart': HandHeart,
    heart: Heart,
    sparkles: Sparkles,
    star: Star,
    house: House,
    landmark: Landmark,
    droplets: Droplets,
    shield: Shield,
    'graduation-cap': GraduationCap,
};

/**
 * Count of each dhikr said today, kept on this device and reset every day.
 */
function useDailyProgress() {
    const dates = useDates();
    const key = `adhkar.progress.${dates.today()}`;
    const [progress, setProgress] = useState<Record<number, number>>(() => {
        try {
            return JSON.parse(window.localStorage.getItem(key) ?? '{}') as Record<number, number>;
        } catch {
            return {};
        }
    });

    const save = (next: Record<number, number>) => {
        setProgress(next);

        try {
            window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
            // Without storage the counters still work until the page is closed.
        }
    };

    return {
        progress,
        count: (dhikr: DhikrItem) => () => save({ ...progress, [dhikr.id]: Math.min(dhikr.repeat, (progress[dhikr.id] ?? 0) + 1) }),
        reset: (ids: number[]) => save(Object.fromEntries(Object.entries(progress).filter(([id]) => !ids.includes(Number(id))))),
    };
}

/**
 * The category matching the time of day: morning, evening or sleep.
 */
function categoryForNow(categories: DhikrCategoryItem[]): DhikrCategoryItem | undefined {
    const hour = new Date().getHours();
    const slug = hour >= 4 && hour < 12 ? 'morning' : hour >= 15 && hour < 20 ? 'evening' : hour >= 21 || hour < 4 ? 'sleep' : null;

    return categories.find((category) => category.slug === slug && category.is_active) ?? categories[0];
}

export default function Adhkar({ categories, icons, colors, can }: AdhkarProps) {
    const { t } = useTrans();
    const [selectedId, setSelectedId] = useState<number | null>(() => categoryForNow(categories)?.id ?? null);
    const [categoryForm, setCategoryForm] = useState<{ open: boolean; category: DhikrCategoryItem | null }>({ open: false, category: null });
    const [dhikrForm, setDhikrForm] = useState<{ open: boolean; dhikr: DhikrItem | null }>({ open: false, dhikr: null });
    const [deleting, setDeleting] = useState<{ type: 'category'; item: DhikrCategoryItem } | { type: 'dhikr'; item: DhikrItem } | null>(null);
    const { progress, count, reset } = useDailyProgress();

    const selected = categories.find((category) => category.id === selectedId) ?? categories[0];

    useEffect(() => {
        if (selectedId !== null && !categories.some((category) => category.id === selectedId)) {
            setSelectedId(categories[0]?.id ?? null);
        }
    }, [categories, selectedId]);

    const doneIn = (category: DhikrCategoryItem) => category.adhkar.filter((dhikr) => dhikr.is_active && (progress[dhikr.id] ?? 0) >= dhikr.repeat).length;
    const activeIn = (category: DhikrCategoryItem) => category.adhkar.filter((dhikr) => dhikr.is_active).length;

    const toggle = (url: string) => router.patch(url, {}, { preserveScroll: true, preserveState: true });

    const destroy = () => {
        if (!deleting) {
            return;
        }

        const url = deleting.type === 'category' ? route('adhkar.categories.destroy', deleting.item.id) : route('adhkar.destroy', deleting.item.id);
        router.delete(url, { preserveScroll: true, preserveState: true, onFinish: () => setDeleting(null) });
    };

    return (
        <AppLayout
            title={t('Adhkar and duas')}
            description={t('Adhkar of the day and night, and duas from the Quran and the sunnah.')}
            actions={
                can.manage && (
                    <Button onClick={() => setCategoryForm({ open: true, category: null })}>
                        <Plus />
                        {t('New category')}
                    </Button>
                )
            }
        >
            {categories.length === 0 ? (
                <Card>
                    <EmptyState icon={HandHeart} title={t('No adhkar yet')} description={can.manage ? t('Add a category to start.') : undefined} />
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        {categories.map((category) => {
                            const Icon = dhikrIcons[category.icon] ?? Sparkles;
                            const color = colorOf(category.color);
                            const total = activeIn(category);
                            const done = doneIn(category);

                            return (
                                <button
                                    key={category.id}
                                    type="button"
                                    onClick={() => setSelectedId(category.id)}
                                    className={cn(
                                        'group relative overflow-hidden rounded-2xl border bg-surface p-4 text-start transition hover:-translate-y-0.5 hover:shadow-lg',
                                        selected?.id === category.id ? 'border-primary-400 shadow-md ring-2 ring-primary-500/20' : 'border-line',
                                        !category.is_active && 'opacity-60',
                                    )}
                                >
                                    <span className={cn('flex size-11 items-center justify-center rounded-2xl bg-linear-to-br text-white shadow-sm', color.gradient)}>
                                        <Icon className="size-5" />
                                    </span>
                                    <span className="mt-3 block font-bold text-ink">{category.name}</span>
                                    <span className="mt-0.5 block text-xs text-muted">
                                        {total > 0 && done === total ? t('Completed today') : t(':done of :total', { done, total })}
                                    </span>
                                    <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-surface-muted">
                                        <span className={cn('block h-full rounded-full transition-all duration-500', color.bar)} style={{ width: total ? `${(done / total) * 100}%` : 0 }} />
                                    </span>
                                    {!category.is_active && (
                                        <Badge tone="slate" className="absolute end-3 top-3">
                                            {t('Disabled')}
                                        </Badge>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {selected && (
                        <section className="mt-8">
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-xl font-bold text-ink">{selected.name}</h2>
                                    {selected.description && <p className="mt-0.5 text-sm text-muted">{selected.description}</p>}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => reset(selected.adhkar.map((dhikr) => dhikr.id))}>
                                        <RotateCcw />
                                        {t('Start again')}
                                    </Button>
                                    {can.manage && (
                                        <>
                                            <Button size="sm" onClick={() => setDhikrForm({ open: true, dhikr: null })}>
                                                <Plus />
                                                {t('Add a dhikr')}
                                            </Button>
                                            <Dropdown
                                                trigger={
                                                    <Button variant="secondary" size="icon-sm" aria-label={t('More')}>
                                                        <EllipsisVertical />
                                                    </Button>
                                                }
                                            >
                                                <DropdownItem icon={Pencil} onClick={() => setCategoryForm({ open: true, category: selected })}>
                                                    {t('Edit category')}
                                                </DropdownItem>
                                                <DropdownItem icon={selected.is_active ? EyeOff : Eye} onClick={() => toggle(route('adhkar.categories.toggle', selected.id))}>
                                                    {selected.is_active ? t('Disable for everyone') : t('Enable for everyone')}
                                                </DropdownItem>
                                                <DropdownSeparator />
                                                <DropdownItem icon={Trash} danger onClick={() => setDeleting({ type: 'category', item: selected })}>
                                                    {t('Delete category')}
                                                </DropdownItem>
                                            </Dropdown>
                                        </>
                                    )}
                                </div>
                            </div>

                            {selected.adhkar.length === 0 ? (
                                <Card>
                                    <EmptyState icon={HandHeart} title={t('No adhkar in this category yet')} compact />
                                </Card>
                            ) : (
                                <div className="space-y-4">
                                    {selected.adhkar.map((dhikr) => (
                                        <DhikrCard
                                            key={dhikr.id}
                                            dhikr={dhikr}
                                            color={selected.color}
                                            said={progress[dhikr.id] ?? 0}
                                            onCount={count(dhikr)}
                                            canManage={can.manage}
                                            onEdit={() => setDhikrForm({ open: true, dhikr })}
                                            onToggle={() => toggle(route('adhkar.toggle', dhikr.id))}
                                            onDelete={() => setDeleting({ type: 'dhikr', item: dhikr })}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>
                    )}
                </>
            )}

            {can.manage && (
                <>
                    <CategoryForm
                        open={categoryForm.open}
                        category={categoryForm.category}
                        icons={icons}
                        colors={colors}
                        onClose={() => setCategoryForm({ open: false, category: null })}
                    />
                    <DhikrForm
                        open={dhikrForm.open}
                        dhikr={dhikrForm.dhikr}
                        categories={categories}
                        defaultCategoryId={selected?.id ?? null}
                        onClose={() => setDhikrForm({ open: false, dhikr: null })}
                    />
                    <ConfirmDialog
                        open={deleting !== null}
                        onClose={() => setDeleting(null)}
                        onConfirm={destroy}
                        title={deleting?.type === 'category' ? t('Delete :name?', { name: deleting.item.name }) : t('Delete this dhikr?')}
                        message={deleting?.type === 'category' ? t('All the adhkar of this category will be deleted too.') : t('It will disappear for everyone.')}
                        confirmLabel={t('Delete')}
                    />
                </>
            )}
        </AppLayout>
    );
}

interface DhikrCardProps {
    dhikr: DhikrItem;
    color: string;
    said: number;
    onCount: () => void;
    canManage: boolean;
    onEdit: () => void;
    onToggle: () => void;
    onDelete: () => void;
}

function DhikrCard({ dhikr, color, said, onCount, canManage, onEdit, onToggle, onDelete }: DhikrCardProps) {
    const { t } = useTrans();
    const [showVirtue, setShowVirtue] = useState(false);
    const done = said >= dhikr.repeat;
    const tone = colorOf(color);
    const ring = useMemo(() => 2 * Math.PI * 26, []);

    const tap = () => {
        if (done) {
            return;
        }

        onCount();

        if ('vibrate' in navigator) {
            navigator.vibrate?.(12);
        }
    };

    return (
        <article
            className={cn(
                'relative overflow-hidden rounded-3xl border bg-surface transition duration-300',
                done ? 'border-emerald-300/70 bg-emerald-50/40 dark:border-emerald-500/30 dark:bg-emerald-500/5' : 'border-line',
                !dhikr.is_active && 'opacity-60',
            )}
        >
            <span className={cn('absolute inset-y-0 start-0 w-1', tone.bar)} />
            <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        {dhikr.title && <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', tone.soft)}>{dhikr.title}</span>}
                        {dhikr.repeat > 1 && <Badge tone="slate">{t(':count times', { count: dhikr.repeat })}</Badge>}
                        {!dhikr.is_active && <Badge tone="amber">{t('Disabled')}</Badge>}
                    </div>
                    {canManage && (
                        <Dropdown
                            trigger={
                                <Button variant="ghost" size="icon-sm" aria-label={t('More')}>
                                    <EllipsisVertical />
                                </Button>
                            }
                        >
                            <DropdownItem icon={Pencil} onClick={onEdit}>
                                {t('Edit')}
                            </DropdownItem>
                            <DropdownItem icon={dhikr.is_active ? EyeOff : Eye} onClick={onToggle}>
                                {dhikr.is_active ? t('Disable for everyone') : t('Enable for everyone')}
                            </DropdownItem>
                            <DropdownSeparator />
                            <DropdownItem icon={Trash} danger onClick={onDelete}>
                                {t('Delete')}
                            </DropdownItem>
                        </Dropdown>
                    )}
                </div>

                <p dir="rtl" className="mt-3 font-quran text-xl leading-[2.15] whitespace-pre-line text-ink sm:text-[1.4rem]">
                    {dhikr.text}
                </p>

                {dhikr.virtue && showVirtue && (
                    <p className="mt-3 animate-fade-in rounded-2xl border-s-2 border-gold-400 bg-gold-50/70 px-4 py-2.5 text-sm leading-relaxed text-ink/85 dark:bg-gold-500/10">
                        {dhikr.virtue}
                    </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                    {dhikr.reference && <span className="text-xs font-medium text-muted">{dhikr.reference}</span>}
                    <div className="ms-auto flex items-center gap-1">
                        {dhikr.virtue && (
                            <Button variant="ghost" size="sm" onClick={() => setShowVirtue((value) => !value)}>
                                <Star className="text-gold-500" />
                                {t('Its virtue')}
                                <ChevronDown className={cn('transition', showVirtue && 'rotate-180')} />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t('Copy')}
                            onClick={() => void navigator.clipboard.writeText(dhikr.text).then(() => toast.success(t('Copied')))}
                        >
                            <Copy />
                        </Button>
                        <button
                            type="button"
                            onClick={tap}
                            className={cn(
                                'relative flex size-16 shrink-0 items-center justify-center rounded-full transition active:scale-95',
                                done ? 'text-emerald-600' : 'text-ink hover:bg-surface-muted',
                            )}
                            aria-label={done ? t('Done') : t(':count left', { count: dhikr.repeat - said })}
                        >
                            <svg viewBox="0 0 60 60" className="absolute inset-0 -rotate-90">
                                <circle cx="30" cy="30" r="26" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="4" />
                                <circle
                                    cx="30"
                                    cy="30"
                                    r="26"
                                    fill="none"
                                    className={cn('transition-all duration-300', done ? 'stroke-emerald-500' : 'stroke-primary-500')}
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    strokeDasharray={ring}
                                    strokeDashoffset={ring * (1 - Math.min(1, said / dhikr.repeat))}
                                />
                            </svg>
                            {done ? <Check className="size-6" /> : <span className="text-lg font-bold tabular-nums">{dhikr.repeat - said}</span>}
                        </button>
                    </div>
                </div>
            </div>
        </article>
    );
}

interface CategoryFormProps {
    open: boolean;
    category: DhikrCategoryItem | null;
    icons: string[];
    colors: string[];
    onClose: () => void;
}

function CategoryForm({ open, category, icons, colors, onClose }: CategoryFormProps) {
    const { t } = useTrans();
    const form = useForm({ name: '', description: '', icon: 'sparkles', color: 'emerald', sort_order: '' as number | '', is_active: true });

    useEffect(() => {
        if (!open) {
            return;
        }

        form.clearErrors();
        form.setData({
            name: category?.name ?? '',
            description: category?.description ?? '',
            icon: category?.icon ?? 'sparkles',
            color: category?.color ?? 'emerald',
            sort_order: category?.sort_order ?? '',
            is_active: category?.is_active ?? true,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, category?.id]);

    const submit = (event: FormEvent) => {
        event.preventDefault();

        const options = { preserveScroll: true, preserveState: true, onSuccess: () => onClose() };

        if (category) {
            form.put(route('adhkar.categories.update', category.id), options);
        } else {
            form.post(route('adhkar.categories.store'), options);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={category ? t('Edit category') : t('New category')}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        {t('Cancel')}
                    </Button>
                    <Button type="submit" form="category-form" loading={form.processing}>
                        {t('Save')}
                    </Button>
                </>
            }
        >
            <form id="category-form" onSubmit={submit} className="space-y-4">
                <Field label={t('Name')} error={form.errors.name} required>
                    <Input value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} placeholder={t('For example: Morning adhkar')} />
                </Field>
                <Field label={t('Description')} error={form.errors.description}>
                    <Input value={form.data.description} onChange={(event) => form.setData('description', event.target.value)} />
                </Field>
                <Field label={t('Icon')} error={form.errors.icon}>
                    <div className="flex flex-wrap gap-2">
                        {icons.map((name) => {
                            const Icon = dhikrIcons[name] ?? Sparkles;

                            return (
                                <button
                                    key={name}
                                    type="button"
                                    onClick={() => form.setData('icon', name)}
                                    className={cn(
                                        'flex size-10 items-center justify-center rounded-xl ring-1 transition',
                                        form.data.icon === name ? 'bg-primary-600 text-white ring-primary-600' : 'text-ink ring-line hover:ring-line-strong',
                                    )}
                                    aria-label={name}
                                >
                                    <Icon className="size-5" />
                                </button>
                            );
                        })}
                    </div>
                </Field>
                <Field label={t('Color')} error={form.errors.color}>
                    <div className="flex flex-wrap gap-2">
                        {colors.map((name) => (
                            <button
                                key={name}
                                type="button"
                                onClick={() => form.setData('color', name)}
                                className={cn('size-8 rounded-full ring-offset-2 ring-offset-surface transition', colorOf(name).dot, form.data.color === name && 'ring-2 ring-ink')}
                                aria-label={name}
                            />
                        ))}
                    </div>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t('Order')} error={form.errors.sort_order} hint={t('Leave empty to add it at the end.')}>
                        <Input type="number" min={0} value={form.data.sort_order} onChange={(event) => form.setData('sort_order', event.target.value === '' ? '' : Number(event.target.value))} />
                    </Field>
                    <div className="flex items-end pb-2">
                        <Switch checked={form.data.is_active} onChange={(value) => form.setData('is_active', value)} label={t('Shown to everyone')} />
                    </div>
                </div>
            </form>
        </Modal>
    );
}

interface DhikrFormProps {
    open: boolean;
    dhikr: DhikrItem | null;
    categories: DhikrCategoryItem[];
    defaultCategoryId: number | null;
    onClose: () => void;
}

function DhikrForm({ open, dhikr, categories, defaultCategoryId, onClose }: DhikrFormProps) {
    const { t } = useTrans();
    const form = useForm({
        dhikr_category_id: defaultCategoryId as number | null,
        title: '',
        text: '',
        repeat: 1,
        reference: '',
        virtue: '',
        sort_order: '' as number | '',
        is_active: true,
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        form.clearErrors();
        form.setData({
            dhikr_category_id: dhikr?.dhikr_category_id ?? defaultCategoryId,
            title: dhikr?.title ?? '',
            text: dhikr?.text ?? '',
            repeat: dhikr?.repeat ?? 1,
            reference: dhikr?.reference ?? '',
            virtue: dhikr?.virtue ?? '',
            sort_order: dhikr?.sort_order ?? '',
            is_active: dhikr?.is_active ?? true,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, dhikr?.id]);

    const submit = (event: FormEvent) => {
        event.preventDefault();

        const options = { preserveScroll: true, preserveState: true, onSuccess: () => onClose() };

        if (dhikr) {
            form.put(route('adhkar.update', dhikr.id), options);
        } else {
            form.post(route('adhkar.store'), options);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            size="lg"
            title={dhikr ? t('Edit dhikr') : t('Add a dhikr')}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        {t('Cancel')}
                    </Button>
                    <Button type="submit" form="dhikr-form" loading={form.processing}>
                        {t('Save')}
                    </Button>
                </>
            }
        >
            <form id="dhikr-form" onSubmit={submit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t('Category')} error={form.errors.dhikr_category_id} required>
                        <Select value={form.data.dhikr_category_id ?? ''} onChange={(event) => form.setData('dhikr_category_id', Number(event.target.value) || null)}>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label={t('Title')} error={form.errors.title} hint={t('Optional, e.g. Ayat Al-Kursi')}>
                        <Input value={form.data.title} onChange={(event) => form.setData('title', event.target.value)} />
                    </Field>
                </div>
                <Field label={t('Text')} error={form.errors.text} required>
                    <Textarea dir="rtl" rows={5} className="font-quran text-lg leading-loose" value={form.data.text} onChange={(event) => form.setData('text', event.target.value)} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                    <Field label={t('Times')} error={form.errors.repeat} required>
                        <Input type="number" min={1} max={1000} value={form.data.repeat} onChange={(event) => form.setData('repeat', Math.max(1, Number(event.target.value) || 1))} />
                    </Field>
                    <Field label={t('Order')} error={form.errors.sort_order}>
                        <Input type="number" min={0} value={form.data.sort_order} onChange={(event) => form.setData('sort_order', event.target.value === '' ? '' : Number(event.target.value))} />
                    </Field>
                    <div className="flex items-end pb-2">
                        <Switch checked={form.data.is_active} onChange={(value) => form.setData('is_active', value)} label={t('Shown to everyone')} />
                    </div>
                </div>
                <Field label={t('Source')} error={form.errors.reference} hint={t('For example: Narrated by Muslim')}>
                    <Input value={form.data.reference} onChange={(event) => form.setData('reference', event.target.value)} />
                </Field>
                <Field label={t('Its virtue')} error={form.errors.virtue}>
                    <Textarea rows={2} value={form.data.virtue} onChange={(event) => form.setData('virtue', event.target.value)} />
                </Field>
            </form>
        </Modal>
    );
}
