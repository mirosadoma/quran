import { router, useForm, usePage } from '@inertiajs/react';
import { Building2, Check, Globe, Mail, MessageSquareQuote, Phone, UserPlus, X } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, Select, Textarea } from '@/components/ui/form';
import { Modal } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { Tabs } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { joinRequestTone, useLabels } from '@/lib/labels';
import { cleanQuery } from '@/lib/utils';
import type { JoinRequestItem, JoinRequestStatus, Paginated } from '@/types';

interface Filters {
    status: JoinRequestStatus;
    academy_id: number | null;
}

interface JoinRequestsIndexProps {
    requests: Paginated<JoinRequestItem>;
    filters: Filters;
    counts: Record<JoinRequestStatus, number>;
    /** Every academy, for the administration's filter (empty for a manager). */
    academies: { id: number; name: string }[];
}

type Decision = { request: JoinRequestItem; accept: boolean };

function DecisionDialog({ decision, onClose }: { decision: Decision | null; onClose: () => void }) {
    const { t } = useTrans();
    const form = useForm({ response: '' });
    const accept = decision?.accept ?? true;

    const submit = (event: FormEvent) => {
        event.preventDefault();

        if (!decision) {
            return;
        }

        form.patch(route(accept ? 'join-requests.accept' : 'join-requests.reject', decision.request.id), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onClose();
            },
        });
    };

    return (
        <Modal
            open={decision !== null}
            onClose={onClose}
            title={accept ? t('Accept :name?', { name: decision?.request.user?.name ?? '' }) : t('Decline the request of :name?', { name: decision?.request.user?.name ?? '' })}
            description={
                accept
                    ? t('The student joins the academy; you can then add them to a halaqa.')
                    : t('The student is notified and can ask another academy.')
            }
            size="sm"
        >
            <form onSubmit={submit} className="space-y-5">
                <Field label={t('A word to the student')} hint={t('Optional. Sent with the notification.')} error={form.errors.response}>
                    <Textarea
                        rows={3}
                        maxLength={1000}
                        value={form.data.response}
                        onChange={(event) => form.setData('response', event.target.value)}
                        placeholder={accept ? t('Welcome! Your halaqa starts on...') : t('Sorry, our halaqat are full at the moment.')}
                    />
                </Field>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button variant="secondary" onClick={onClose}>
                        {t('Cancel')}
                    </Button>
                    <Button type="submit" variant={accept ? 'success' : 'danger'} loading={form.processing}>
                        {accept ? <Check /> : <X />}
                        {accept ? t('Accept') : t('Decline')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

export default function JoinRequestsIndex({ requests, filters, counts, academies }: JoinRequestsIndexProps) {
    const { t } = useTrans();
    const labels = useLabels();
    const dates = useDates();
    const { auth } = usePage().props;
    const [decision, setDecision] = useState<Decision | null>(null);
    const isAdmin = auth.user?.role === 'admin';

    const apply = (changes: Partial<Filters>) => {
        router.get(route('join-requests.index'), cleanQuery({ ...filters, ...changes }), { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <AppLayout
            title={t('Join requests')}
            description={
                isAdmin
                    ? t('Students without academy who asked to join one. Each academy manager answers the requests of their academy.')
                    : t('Students who asked to join your academy. Once accepted, add them to a halaqa.')
            }
        >
            <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
                <Tabs
                    value={filters.status}
                    onChange={(status) => apply({ status })}
                    items={(['pending', 'accepted', 'rejected', 'cancelled'] as const).map((status) => ({
                        value: status,
                        label: labels.joinRequest[status],
                        count: counts[status],
                    }))}
                />
                {academies.length > 0 && (
                    <div className="lg:ms-auto lg:w-64">
                        <Select value={filters.academy_id ?? ''} onChange={(event) => apply({ academy_id: Number(event.target.value) || null })} aria-label={t('Academy')}>
                            <option value="">{t('All academies')}</option>
                            {academies.map((academy) => (
                                <option key={academy.id} value={academy.id}>
                                    {academy.name}
                                </option>
                            ))}
                        </Select>
                    </div>
                )}
            </div>

            {requests.data.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={UserPlus}
                        title={filters.status === 'pending' ? t('No requests waiting for an answer') : t('No requests here')}
                        description={t('Students who register on the platform can ask to join an academy from the academies page.')}
                    />
                </Card>
            ) : (
                <div className="space-y-3">
                    {requests.data.map((request) => {
                        const student = request.user;
                        const contacts = [
                            { icon: Mail, value: student?.email, ltr: true },
                            { icon: Phone, value: student?.phone, ltr: true },
                            { icon: Globe, value: student?.country },
                        ].filter((item) => item.value);

                        return (
                            <Card key={request.id} className="p-4 sm:p-5">
                                <div className="flex flex-col gap-4 md:flex-row md:items-start">
                                    <div className="flex min-w-0 flex-1 gap-3">
                                        <Avatar name={student?.name ?? '?'} src={student?.avatar_url} size="md" />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-bold text-ink">{student?.name ?? t('Deleted account')}</p>
                                                {student?.gender && <Badge tone="slate">{labels.gender[student.gender]}</Badge>}
                                                <Badge tone={joinRequestTone[request.status]}>{labels.joinRequest[request.status]}</Badge>
                                            </div>
                                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                                                {contacts.map((item) => (
                                                    <span key={String(item.value)} className="inline-flex items-center gap-1" dir={item.ltr ? 'ltr' : undefined}>
                                                        <item.icon className="size-3.5" />
                                                        {item.value}
                                                    </span>
                                                ))}
                                                {isAdmin && request.academy && (
                                                    <span className="inline-flex items-center gap-1 font-semibold text-ink">
                                                        <Building2 className="size-3.5 text-gold-600" />
                                                        {request.academy.name}
                                                    </span>
                                                )}
                                            </div>
                                            {request.message && (
                                                <p className="mt-3 flex gap-2 rounded-xl bg-surface-muted p-3 text-sm leading-relaxed text-ink">
                                                    <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-gold-600" />
                                                    <span className="whitespace-pre-line">{request.message}</span>
                                                </p>
                                            )}
                                            {request.status !== 'pending' && (request.response || request.decider) && (
                                                <p className="mt-2 text-xs leading-relaxed text-muted">
                                                    {request.decider && t('Answered by :name', { name: request.decider.name })}
                                                    {request.decided_at && ` · ${dates.dateTime(request.decided_at)}`}
                                                    {request.response && (
                                                        <span className="mt-1 block text-sm text-ink">{request.response}</span>
                                                    )}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 flex-col gap-2 md:items-end">
                                        {request.created_at && <span className="text-xs text-muted">{dates.relative(request.created_at)}</span>}
                                        {request.status === 'pending' && (
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="success" onClick={() => setDecision({ request, accept: true })}>
                                                    <Check />
                                                    {t('Accept')}
                                                </Button>
                                                <Button size="sm" variant="danger-soft" onClick={() => setDecision({ request, accept: false })}>
                                                    <X />
                                                    {t('Decline')}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            <Pagination data={requests} className="mt-6" />

            <DecisionDialog decision={decision} onClose={() => setDecision(null)} />
        </AppLayout>
    );
}
