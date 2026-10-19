import { router, useForm } from '@inertiajs/react';
import { Copy, ExternalLink, Link2, Plus, Trash, UserPlus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/form';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { useTrans } from '@/lib/i18n';
import { cn, copyText } from '@/lib/utils';
import type { ExamDayItem, ExamExaminerItem } from '@/types';

interface ExaminersPanelProps {
    day: ExamDayItem;
    teachers: { id: number; name: string; role: string }[];
    canManage: boolean;
}

/**
 * The examiners of a day: teachers of the academy, or people invited from outside with a link.
 */
export function ExaminersPanel({ day, teachers, canManage }: ExaminersPanelProps) {
    const { t } = useTrans();
    const [adding, setAdding] = useState(false);
    const [removing, setRemoving] = useState<ExamExaminerItem | null>(null);
    const [processing, setProcessing] = useState(false);
    const examiners = day.examiners ?? [];
    const counts = (day.entries ?? []).reduce<Record<number, number>>((map, entry) => {
        if (entry.examiner_id !== null) {
            map[entry.examiner_id] = (map[entry.examiner_id] ?? 0) + 1;
        }

        return map;
    }, {});

    const copy = async (url: string) => {
        if (await copyText(url)) {
            toast.success(t('Link copied. Send it to the examiner.'));
        }
    };

    const remove = () => {
        if (!removing) {
            return;
        }

        router.delete(route('exams.examiners.destroy', removing.id), {
            preserveScroll: true,
            onStart: () => setProcessing(true),
            onFinish: () => {
                setProcessing(false);
                setRemoving(null);
            },
        });
    };

    return (
        <div>
            {examiners.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-muted">
                    {canManage ? t('No examiners yet. Add the teachers who will listen to the students on this day.') : t('No examiners yet.')}
                </p>
            ) : (
                <ul className="divide-y divide-line">
                    {examiners.map((examiner) => (
                        <li key={examiner.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                            <Avatar name={examiner.name} src={examiner.avatar_url} size="sm" />
                            <div className="min-w-0 flex-1">
                                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                                    {examiner.name}
                                    {examiner.is_external && <Badge tone="gold">{t('Invited examiner')}</Badge>}
                                    {examiner.id === day.my_examiner_id && <Badge tone="emerald">{t('You')}</Badge>}
                                </p>
                                <p className="text-xs text-muted">
                                    {t(':count students', { count: counts[examiner.id] ?? 0 })}
                                    {examiner.email && <span className="ms-2">{examiner.email}</span>}
                                </p>
                            </div>
                            {canManage && examiner.guest_url && (
                                <div className="flex items-center gap-1">
                                    <Button size="sm" variant="secondary" onClick={() => copy(examiner.guest_url!)}>
                                        <Copy />
                                        {t('Copy the link')}
                                    </Button>
                                    <a
                                        href={examiner.guest_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex size-9 items-center justify-center rounded-xl text-muted transition hover:bg-surface-muted hover:text-ink"
                                        title={t('Open the link')}
                                    >
                                        <ExternalLink className="size-4" />
                                    </a>
                                </div>
                            )}
                            {canManage && day.status !== 'closed' && (
                                <Button size="icon-sm" variant="ghost" className="hover:text-rose-600" onClick={() => setRemoving(examiner)} aria-label={t('Remove')}>
                                    <Trash />
                                </Button>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {canManage && day.status !== 'closed' && (
                <div className="border-t border-line px-5 py-3">
                    <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
                        <Plus />
                        {t('Add an examiner')}
                    </Button>
                </div>
            )}

            <ExaminerForm open={adding} onClose={() => setAdding(false)} day={day} teachers={teachers.filter((teacher) => !examiners.some((examiner) => examiner.user_id === teacher.id))} />

            <ConfirmDialog
                open={removing !== null}
                onClose={() => setRemoving(null)}
                onConfirm={remove}
                processing={processing}
                title={t('Remove this examiner?')}
                message={t('Their students go back to the pool; share them among the other examiners again.')}
                confirmLabel={t('Remove')}
            />
        </div>
    );
}

function ExaminerForm({ open, onClose, day, teachers }: { open: boolean; onClose: () => void; day: ExamDayItem; teachers: { id: number; name: string; role: string }[] }) {
    const { t } = useTrans();
    const [source, setSource] = useState<'platform' | 'outside'>('platform');
    const form = useForm({ user_id: '' as number | '', name: '', email: '', phone: '' });

    const submit = (event: FormEvent) => {
        event.preventDefault();

        form.transform((data) => (source === 'platform' ? { user_id: data.user_id } : { name: data.name, email: data.email, phone: data.phone }));
        form.post(route('exams.examiners.store', day.id), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onClose();
            },
        });
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={t('Add an examiner')}
            description={t('A teacher of the academy, or someone from outside who gets a link that works on the exam day only.')}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        {t('Cancel')}
                    </Button>
                    <Button type="submit" form="examiner-form" loading={form.processing}>
                        <UserPlus />
                        {t('Add')}
                    </Button>
                </>
            }
        >
            <form id="examiner-form" onSubmit={submit} className="space-y-5">
                <div className="grid grid-cols-2 gap-2">
                    {(['platform', 'outside'] as const).map((option) => (
                        <button
                            key={option}
                            type="button"
                            onClick={() => setSource(option)}
                            className={cn(
                                'flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition',
                                source === option ? 'border-primary-600 bg-primary-50 text-primary-800 dark:bg-primary-500/10 dark:text-primary-200' : 'border-line text-muted hover:border-line-strong',
                            )}
                        >
                            {option === 'platform' ? <UserPlus className="size-4" /> : <Link2 className="size-4" />}
                            {option === 'platform' ? t('From the academy') : t('Invited from outside')}
                        </button>
                    ))}
                </div>

                {source === 'platform' ? (
                    <Field label={t('Teacher')} error={form.errors.user_id} required>
                        <Select value={form.data.user_id} onChange={(event) => form.setData('user_id', event.target.value === '' ? '' : Number(event.target.value))} aria-invalid={!!form.errors.user_id}>
                            <option value="">{t('Choose a teacher')}</option>
                            {teachers.map((teacher) => (
                                <option key={teacher.id} value={teacher.id}>
                                    {teacher.name}
                                    {teacher.role === 'manager' ? ` (${t('Academy manager')})` : ''}
                                </option>
                            ))}
                        </Select>
                    </Field>
                ) : (
                    <>
                        <Field label={t('Name')} error={form.errors.name} required>
                            <Input value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} aria-invalid={!!form.errors.name} />
                        </Field>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label={t('Email')} error={form.errors.email}>
                                <Input type="email" dir="ltr" value={form.data.email} onChange={(event) => form.setData('email', event.target.value)} />
                            </Field>
                            <Field label={t('Phone')} error={form.errors.phone}>
                                <Input dir="ltr" value={form.data.phone} onChange={(event) => form.setData('phone', event.target.value)} />
                            </Field>
                        </div>
                        <p className="rounded-xl bg-gold-50 px-4 py-3 text-xs leading-relaxed text-gold-900 dark:bg-gold-500/10 dark:text-gold-100">
                            {t('After adding them you get a private link to send by WhatsApp or email. It opens their hall and private room from an hour before the day starts until it is closed, without an account.')}
                        </p>
                    </>
                )}
            </form>
        </Modal>
    );
}
