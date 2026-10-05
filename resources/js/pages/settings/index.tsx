import { router, useForm } from '@inertiajs/react';
import { Bell, Building2, CircleCheck, CircleDashed, Copy, ImagePlus, Link2, Save, Timer, Trash, Unplug, Video, Webhook } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { LogoMark } from '@/components/brand';
import { MeetingProviderPicker } from '@/components/meeting-provider-picker';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Field, Input, Select, Switch } from '@/components/ui/form';
import { ConfirmDialog } from '@/components/ui/modal';
import AppLayout from '@/layouts/app-layout';
import { useTrans } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { MeetingProvider, ProviderOption } from '@/types';

interface SettingsProps {
    settings: {
        academy_name: string;
        academy_tagline: string | null;
        contact_email: string | null;
        contact_phone: string | null;
        default_timezone: string;
        meeting_provider: MeetingProvider;
        generate_days_ahead: number;
        reminder_minutes: number;
        late_after_minutes: number;
        auto_mark_absent: boolean;
        notify_email: boolean;
        notify_whatsapp: boolean;
    };
    logoUrl: string | null;
    providers: ProviderOption[];
    google: { has_credentials: boolean; connected: boolean; email: string | null; redirect_uri: string };
    integrations: {
        jitsi_mode: string;
        realtime: { enabled: boolean; driver: string };
        mail: { driver: string; from: string | null };
        whatsapp: { driver: string; configured: boolean };
        queue: string;
        webhooks: { zoom: string; jaas: string };
    };
    timezones: string[];
}

function Status({ ok, label }: { ok: boolean; label: string }) {
    return (
        <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold', ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
            {ok ? <CircleCheck className="size-4" /> : <CircleDashed className="size-4" />}
            {label}
        </span>
    );
}

function CopyValue({ value }: { value: string }) {
    const { t } = useTrans();

    return (
        <div className="flex items-center gap-2 rounded-xl bg-surface-muted px-3 py-2">
            <code className="min-w-0 flex-1 truncate text-xs text-ink" dir="ltr">
                {value}
            </code>
            <button
                type="button"
                onClick={() => navigator.clipboard.writeText(value).then(() => toast.success(t('Copied')))}
                className="shrink-0 text-primary-700 dark:text-primary-300"
            >
                <Copy className="size-4" />
            </button>
        </div>
    );
}

export default function Settings({ settings, logoUrl, providers, google, integrations, timezones }: SettingsProps) {
    const { t } = useTrans();
    const logoInput = useRef<HTMLInputElement>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [disconnecting, setDisconnecting] = useState(false);

    const form = useForm({
        _method: 'put',
        ...settings,
        academy_tagline: settings.academy_tagline ?? '',
        contact_email: settings.contact_email ?? '',
        contact_phone: settings.contact_phone ?? '',
        logo: null as File | null,
        remove_logo: false,
    });

    useEffect(() => {
        if (!form.data.logo) {
            setLogoPreview(null);

            return;
        }

        const url = URL.createObjectURL(form.data.logo);
        setLogoPreview(url);

        return () => URL.revokeObjectURL(url);
    }, [form.data.logo]);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(route('settings.update'), { forceFormData: true, preserveScroll: true });
    };

    const shownLogo = logoPreview ?? (form.data.remove_logo ? null : logoUrl);

    return (
        <AppLayout title={t('Settings')} description={t('Academy identity, meetings, automation and notifications.')}>
            <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <Card>
                        <CardHeader title={t('Academy')} icon={Building2} />
                        <CardBody className="grid gap-5 sm:grid-cols-2">
                            <div className="flex items-center gap-4 sm:col-span-2">
                                {shownLogo ? <img src={shownLogo} alt="" className="size-16 rounded-2xl object-cover" /> : <LogoMark className="size-16" />}
                                <div className="flex flex-wrap gap-2">
                                    <Button variant="secondary" size="sm" onClick={() => logoInput.current?.click()}>
                                        <ImagePlus />
                                        {t('Upload logo')}
                                    </Button>
                                    {shownLogo && (
                                        <Button variant="ghost" size="sm" onClick={() => form.setData((data) => ({ ...data, logo: null, remove_logo: true }))}>
                                            <Trash />
                                            {t('Use the default logo')}
                                        </Button>
                                    )}
                                </div>
                                <input
                                    ref={logoInput}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(event) => form.setData((data) => ({ ...data, logo: event.target.files?.[0] ?? null, remove_logo: false }))}
                                />
                            </div>
                            <Field label={t('Academy name')} error={form.errors.academy_name} required>
                                <Input value={form.data.academy_name} onChange={(event) => form.setData('academy_name', event.target.value)} />
                            </Field>
                            <Field label={t('Tagline')} error={form.errors.academy_tagline}>
                                <Input
                                    value={form.data.academy_tagline}
                                    onChange={(event) => form.setData('academy_tagline', event.target.value)}
                                    placeholder={t('Quran memorization platform')}
                                />
                            </Field>
                            <Field label={t('Contact email')} error={form.errors.contact_email}>
                                <Input type="email" dir="ltr" value={form.data.contact_email} onChange={(event) => form.setData('contact_email', event.target.value)} />
                            </Field>
                            <Field label={t('Contact phone')} error={form.errors.contact_phone}>
                                <Input type="tel" dir="ltr" value={form.data.contact_phone} onChange={(event) => form.setData('contact_phone', event.target.value)} />
                            </Field>
                            <Field label={t('Default timezone')} error={form.errors.default_timezone} hint={t('Used for new users and halaqat.')}>
                                <Select value={form.data.default_timezone} onChange={(event) => form.setData('default_timezone', event.target.value)}>
                                    {timezones.map((timezone) => (
                                        <option key={timezone} value={timezone}>
                                            {timezone}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader title={t('Meetings')} description={t('The default platform for new halaqat. Each halaqa can choose its own.')} icon={Video} />
                        <CardBody className="space-y-6">
                            <MeetingProviderPicker
                                providers={providers}
                                value={form.data.meeting_provider}
                                onChange={(value) => form.setData('meeting_provider', value)}
                            />

                            <div className="rounded-2xl border border-line p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="font-bold text-ink">Google Meet</p>
                                        <p className="mt-1 text-sm text-muted">
                                            {google.connected
                                                ? t('Connected as :email. Meet links are created automatically for every session.', { email: google.email ?? '' })
                                                : t('Connect the academy Google account to create Meet links automatically.')}
                                        </p>
                                    </div>
                                    <Status ok={google.connected} label={google.connected ? t('Connected') : t('Not connected')} />
                                </div>
                                {!google.has_credentials && (
                                    <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                                        {t('Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the .env file first (see PLAN.md, section 10).')}
                                    </p>
                                )}
                                <div className="mt-4 space-y-2">
                                    <p className="text-xs font-semibold text-muted">{t('Authorized redirect URI (add it in Google Cloud):')}</p>
                                    <CopyValue value={google.redirect_uri} />
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {google.connected ? (
                                        <Button variant="danger-soft" size="sm" onClick={() => setDisconnecting(true)}>
                                            <Unplug />
                                            {t('Disconnect')}
                                        </Button>
                                    ) : (
                                        <a
                                            href={route('settings.google.connect')}
                                            className={cn(
                                                'inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary-700 px-3 text-xs font-semibold text-white transition hover:bg-primary-800',
                                                !google.has_credentials && 'pointer-events-none opacity-50',
                                            )}
                                        >
                                            <Link2 className="size-4" />
                                            {t('Connect Google account')}
                                        </a>
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="rounded-2xl border border-line p-4">
                                    <p className="text-sm font-bold text-ink">Jitsi</p>
                                    <p className="mt-1 text-xs text-muted">{t('Mode: :mode (JITSI_MODE in .env)', { mode: integrations.jitsi_mode })}</p>
                                </div>
                                <div className="rounded-2xl border border-line p-4">
                                    <p className="text-sm font-bold text-ink">Zoom</p>
                                    <div className="mt-1">
                                        <Status
                                            ok={providers.find((provider) => provider.value === 'zoom')?.configured ?? false}
                                            label={providers.find((provider) => provider.value === 'zoom')?.configured ? t('Ready') : t('Needs setup')}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                                    <Webhook className="size-4" />
                                    {t('Webhooks for saving recordings automatically')}
                                </p>
                                <CopyValue value={integrations.webhooks.zoom} />
                                <CopyValue value={integrations.webhooks.jaas} />
                            </div>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader title={t('Sessions automation')} icon={Timer} />
                        <CardBody className="grid gap-5 sm:grid-cols-3">
                            <Field label={t('Create sessions ahead (days)')} error={form.errors.generate_days_ahead}>
                                <Input
                                    type="number"
                                    min={1}
                                    max={60}
                                    value={form.data.generate_days_ahead}
                                    onChange={(event) => form.setData('generate_days_ahead', Number(event.target.value))}
                                />
                            </Field>
                            <Field label={t('Reminder before session (minutes)')} error={form.errors.reminder_minutes} hint={t('0 disables reminders.')}>
                                <Input
                                    type="number"
                                    min={0}
                                    max={240}
                                    value={form.data.reminder_minutes}
                                    onChange={(event) => form.setData('reminder_minutes', Number(event.target.value))}
                                />
                            </Field>
                            <Field label={t('Late after (minutes)')} error={form.errors.late_after_minutes}>
                                <Input
                                    type="number"
                                    min={0}
                                    max={120}
                                    value={form.data.late_after_minutes}
                                    onChange={(event) => form.setData('late_after_minutes', Number(event.target.value))}
                                />
                            </Field>
                            <div className="sm:col-span-3">
                                <Switch
                                    checked={form.data.auto_mark_absent}
                                    onChange={(value) => form.setData('auto_mark_absent', value)}
                                    label={t('Mark students who did not join as absent')}
                                    description={t('When a session ends (manually or automatically 30 minutes after its end time).')}
                                />
                            </div>
                        </CardBody>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader title={t('Notifications')} icon={Bell} />
                        <CardBody className="space-y-5">
                            <Switch
                                checked={form.data.notify_email}
                                onChange={(value) => form.setData('notify_email', value)}
                                label={t('Email notifications')}
                                description={t('Mail driver: :driver', { driver: integrations.mail.driver })}
                            />
                            <Switch
                                checked={form.data.notify_whatsapp}
                                onChange={(value) => form.setData('notify_whatsapp', value)}
                                label={t('WhatsApp notifications')}
                                description={
                                    integrations.whatsapp.configured
                                        ? t('WhatsApp Cloud API is configured.')
                                        : t('Driver ":driver": messages are written to the log only.', { driver: integrations.whatsapp.driver })
                                }
                            />
                            <div className="space-y-2 border-t border-line pt-4 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted">{t('Realtime chat')}</span>
                                    <Status ok={integrations.realtime.enabled} label={integrations.realtime.enabled ? integrations.realtime.driver : t('Auto refresh')} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted">{t('Queue')}</span>
                                    <span className="font-semibold text-ink">{integrations.queue}</span>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    <Card className="lg:sticky lg:top-24">
                        <CardBody>
                            <Button type="submit" size="lg" className="w-full" loading={form.processing}>
                                <Save />
                                {t('Save settings')}
                            </Button>
                        </CardBody>
                    </Card>
                </div>
            </form>

            <ConfirmDialog
                open={disconnecting}
                onClose={() => setDisconnecting(false)}
                onConfirm={() => router.delete(route('settings.google.disconnect'), { preserveScroll: true, onFinish: () => setDisconnecting(false) })}
                title={t('Disconnect Google?')}
                message={t('New sessions will not get Google Meet links until you connect again. Existing links keep working.')}
                confirmLabel={t('Disconnect')}
            />
        </AppLayout>
    );
}
