import { router } from '@inertiajs/react';
import { BookOpen, Building2, Clock, DoorOpen, Eye, History, Mail, MapPin, Phone, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AcademyCard } from '@/components/academy/academy-card';
import { AcademyLogo } from '@/components/academy/academy-logo';
import { JoinAcademyDialog } from '@/components/academy/join-dialog';
import { IslamicPattern } from '@/components/brand';
import { HalaqaCard } from '@/components/halaqa/halaqa-card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button, LinkButton } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/modal';
import { SearchInput } from '@/components/ui/search-input';
import AppLayout from '@/layouts/app-layout';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { joinRequestTone, useLabels } from '@/lib/labels';
import type { AcademyItem, HalaqaItem, JoinRequestItem } from '@/types';

interface MyAcademyProps {
    academy: AcademyItem | null;
    halaqat: HalaqaItem[];
    requests: JoinRequestItem[];
    academies: AcademyItem[];
    /** The slug of the academy to ask right away (from the public academy page). */
    join: string | null;
}

function RequestHistory({ requests }: { requests: JoinRequestItem[] }) {
    const { t } = useTrans();
    const labels = useLabels();
    const dates = useDates();

    if (requests.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader title={t('My requests')} icon={History} />
            <ul className="divide-y divide-line">
                {requests.map((request) => (
                    <li key={request.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                        {request.academy && <AcademyLogo academy={request.academy} size="sm" />}
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-ink">{request.academy?.name ?? t('Deleted academy')}</p>
                            <p className="text-xs text-muted">{request.created_at && dates.relative(request.created_at)}</p>
                            {request.response && <p className="mt-1 text-xs text-ink">{request.response}</p>}
                        </div>
                        <Badge tone={joinRequestTone[request.status]}>{labels.joinRequest[request.status]}</Badge>
                    </li>
                ))}
            </ul>
        </Card>
    );
}

function CurrentAcademy({ academy, halaqat, requests }: { academy: AcademyItem; halaqat: HalaqaItem[]; requests: JoinRequestItem[] }) {
    const { t } = useTrans();
    const labels = useLabels();
    const [leaving, setLeaving] = useState(false);
    const [processing, setProcessing] = useState(false);

    const contacts = [
        { icon: MapPin, value: academy.location },
        { icon: Mail, value: academy.email, ltr: true },
        { icon: Phone, value: academy.phone, ltr: true },
    ].filter((item) => item.value);

    return (
        <>
            <section className="relative mb-6 overflow-hidden rounded-3xl bg-linear-to-br from-primary-800 via-primary-900 to-primary-950 p-6 text-white sm:p-8">
                <IslamicPattern className="text-gold-300/10" size={64} />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4 sm:items-center">
                        <AcademyLogo academy={academy} size="lg" className="ring-4 ring-white/10" />
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-gold-300">{t('You study at')}</p>
                            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{academy.name}</h1>
                            {academy.tagline && <p className="mt-1.5 text-sm text-white/75">{academy.tagline}</p>}
                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-white/70">
                                <span>{labels.halaqaGender[academy.gender]}</span>
                                {contacts.map((item) => (
                                    <span key={item.value} className="inline-flex items-center gap-1.5" dir={item.ltr ? 'ltr' : undefined}>
                                        <item.icon className="size-3.5 text-gold-300" />
                                        {item.value}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                    <Button variant="light" onClick={() => setLeaving(true)}>
                        <DoorOpen />
                        {t('Leave the academy')}
                    </Button>
                </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-3">
                <div className="min-w-0 space-y-6 xl:col-span-2">
                    <Card>
                        <CardHeader title={t('My halaqat in the academy')} icon={BookOpen} />
                        <CardBody>
                            {halaqat.length === 0 ? (
                                <EmptyState
                                    icon={BookOpen}
                                    compact
                                    title={t('You are not in a halaqa yet')}
                                    description={t('The academy will add you to the halaqa that suits your level, and you will be notified.')}
                                />
                            ) : (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {halaqat.map((halaqa) => (
                                        <HalaqaCard key={halaqa.id} halaqa={halaqa} />
                                    ))}
                                </div>
                            )}
                        </CardBody>
                    </Card>
                    {academy.description && (
                        <Card>
                            <CardHeader title={t('About the academy')} />
                            <CardBody>
                                <p className="text-sm leading-loose whitespace-pre-line text-ink">{academy.description}</p>
                            </CardBody>
                        </Card>
                    )}
                </div>
                <div className="min-w-0 space-y-6">
                    {academy.manager && (
                        <Card>
                            <CardHeader title={t('Manager of the academy')} />
                            <CardBody className="flex items-center gap-3">
                                <Avatar name={academy.manager.name} src={academy.manager.avatar_url} />
                                <div className="min-w-0">
                                    <p className="truncate font-semibold text-ink">{academy.manager.name}</p>
                                    <p className="truncate text-xs text-muted" dir="ltr">
                                        {academy.manager.email ?? academy.manager.phone}
                                    </p>
                                </div>
                            </CardBody>
                        </Card>
                    )}
                    <RequestHistory requests={requests} />
                </div>
            </div>

            <ConfirmDialog
                open={leaving}
                onClose={() => setLeaving(false)}
                onConfirm={() =>
                    router.post(route('my-academy.leave'), {}, { onStart: () => setProcessing(true), onFinish: () => setProcessing(false) })
                }
                processing={processing}
                title={t('Leave :academy?', { academy: academy.name })}
                message={t('You will be removed from its halaqat. Your memorization record stays with you, and you can then ask to join another academy.')}
                confirmLabel={t('Leave the academy')}
            />
        </>
    );
}

function AcademyBrowser({ academies, requests, join }: { academies: AcademyItem[]; requests: JoinRequestItem[]; join: string | null }) {
    const { t } = useTrans();
    const [search, setSearch] = useState('');
    const [joining, setJoining] = useState<AcademyItem | null>(null);
    const pending = requests.find((request) => request.status === 'pending') ?? null;

    useEffect(() => {
        const wanted = join ? academies.find((academy) => academy.slug === join) : undefined;

        if (wanted && !pending) {
            setJoining(wanted);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [join]);

    const shown = useMemo(() => {
        const query = search.trim().toLowerCase();

        return query === ''
            ? academies
            : academies.filter((academy) => [academy.name, academy.tagline, academy.location].some((value) => value?.toLowerCase().includes(query)));
    }, [academies, search]);

    return (
        <>
            {pending && (
                <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900 sm:flex-row sm:items-center dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                    <Clock className="size-5 shrink-0" />
                    <div className="min-w-0 flex-1 text-sm">
                        <p className="font-semibold">{t('Your request to join :academy is waiting for an answer.', { academy: pending.academy?.name ?? '' })}</p>
                        <p className="mt-0.5 opacity-80">{t('You can ask one academy at a time. Cancel this request to ask another one.')}</p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => router.patch(route('join-requests.cancel', pending.id), {}, { preserveScroll: true })}>
                        {t('Cancel the request')}
                    </Button>
                </div>
            )}

            <div className="grid gap-6 xl:grid-cols-4">
                <div className="min-w-0 xl:col-span-3">
                    <SearchInput value={search} onSearch={setSearch} placeholder={t('Name or place of the academy...')} className="mb-5 sm:w-80" />
                    {shown.length === 0 ? (
                        <Card>
                            <EmptyState icon={Building2} title={t('No academies found')} />
                        </Card>
                    ) : (
                        <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
                            {shown.map((academy) => (
                                <AcademyCard
                                    key={academy.id}
                                    academy={academy}
                                    href={route('site.academy', academy.slug)}
                                    action={
                                        <>
                                            <Button className="flex-1" disabled={pending !== null} onClick={() => setJoining(academy)}>
                                                <UserPlus />
                                                {t('Ask to join')}
                                            </Button>
                                            <LinkButton href={route('site.academy', academy.slug)} variant="secondary" size="icon" aria-label={t('Details')}>
                                                <Eye />
                                            </LinkButton>
                                        </>
                                    }
                                />
                            ))}
                        </div>
                    )}
                </div>
                <div className="min-w-0 space-y-6">
                    <Card>
                        <CardBody className="space-y-3 text-sm leading-relaxed text-muted">
                            <p className="font-bold text-ink">{t('How does joining work?')}</p>
                            <ol className="list-inside list-decimal space-y-2">
                                <li>{t('Choose an academy and send it a request with a word about yourself.')}</li>
                                <li>{t('Its manager accepts or declines; you are notified either way.')}</li>
                                <li>{t('Once accepted you become one of its students and it adds you to a halaqa.')}</li>
                                <li>{t('You study at one academy at a time; leave it whenever you want to join another.')}</li>
                            </ol>
                        </CardBody>
                    </Card>
                    <RequestHistory requests={requests} />
                </div>
            </div>

            <JoinAcademyDialog academy={joining} onClose={() => setJoining(null)} />
        </>
    );
}

export default function MyAcademy({ academy, halaqat, requests, academies, join }: MyAcademyProps) {
    const { t } = useTrans();

    if (academy) {
        return (
            <AppLayout title={academy.name} hideHeader>
                <CurrentAcademy academy={academy} halaqat={halaqat} requests={requests} />
            </AppLayout>
        );
    }

    return (
        <AppLayout
            title={t('Join an academy')}
            description={t('Study in a halaqa with a teacher: choose an academy and send it a request to join.')}
        >
            <AcademyBrowser academies={academies} requests={requests} join={join} />
        </AppLayout>
    );
}
