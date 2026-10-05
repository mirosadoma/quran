import { useForm, usePage } from '@inertiajs/react';
import { Building2, Camera, KeyRound, Save, Settings2, Trash, UserCog, Wand2 } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { AcademyLogo } from '@/components/academy/academy-logo';
import { Button, LinkButton } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Field, Input, Select, Switch, Textarea } from '@/components/ui/form';
import { PasswordInput } from '@/components/ui/password-input';
import AppLayout from '@/layouts/app-layout';
import { useTrans } from '@/lib/i18n';
import { useLabels } from '@/lib/labels';
import { cn, generatePassword } from '@/lib/utils';
import type { AcademyItem, HalaqaGender } from '@/types';

interface AcademyFormProps {
    academy: AcademyItem | null;
    timezones: string[];
    defaultTimezone: string;
}

function LogoUpload({
    name,
    currentUrl,
    file,
    removed,
    onChange,
    onRemove,
    error,
}: {
    name: string;
    currentUrl: string | null;
    file: File | null;
    removed: boolean;
    onChange: (file: File | null) => void;
    onRemove: () => void;
    error?: string;
}) {
    const { t } = useTrans();
    const input = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);

    useEffect(() => {
        if (!file) {
            setPreview(null);

            return;
        }

        const url = URL.createObjectURL(file);
        setPreview(url);

        return () => URL.revokeObjectURL(url);
    }, [file]);

    const shown = preview ?? (removed ? null : currentUrl);

    return (
        <div className="flex items-center gap-4">
            <AcademyLogo academy={{ name: name || '?', logo_url: shown }} size="lg" />
            <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => input.current?.click()}>
                        <Camera />
                        {shown ? t('Change the logo') : t('Upload a logo')}
                    </Button>
                    {shown && (
                        <Button variant="ghost" size="sm" onClick={onRemove}>
                            <Trash />
                            {t('Remove')}
                        </Button>
                    )}
                </div>
                <p className="text-xs text-muted">{t('JPG or PNG, up to 2 MB.')}</p>
                {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
            </div>
            <input
                ref={input}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                    onChange(event.target.files?.[0] ?? null);
                    event.target.value = '';
                }}
            />
        </div>
    );
}

export default function AcademyForm({ academy, timezones, defaultTimezone }: AcademyFormProps) {
    const { t } = useTrans();
    const labels = useLabels();
    const { auth } = usePage().props;
    const isAdmin = auth.user?.role === 'admin';
    const editing = academy !== null;
    const hasManager = !!academy?.manager;

    const form = useForm({
        _method: editing ? 'put' : 'post',
        name: academy?.name ?? '',
        tagline: academy?.tagline ?? '',
        description: academy?.description ?? '',
        email: academy?.email ?? '',
        phone: academy?.phone ?? '',
        location: academy?.location ?? '',
        gender: academy?.gender ?? ('mixed' as HalaqaGender),
        timezone: academy?.timezone ?? defaultTimezone,
        accepts_requests: academy?.accepts_requests ?? true,
        is_active: academy?.is_active ?? true,
        logo: null as File | null,
        remove_logo: false,
        manager: {
            name: academy?.manager?.name ?? '',
            email: academy?.manager?.email ?? '',
            phone: academy?.manager?.phone ?? '',
            password: '',
        },
    });

    const setManager = (field: keyof typeof form.data.manager, value: string) => {
        form.setData('manager', { ...form.data.manager, [field]: value });
    };

    const errors = form.errors as Partial<Record<string, string>>;

    const submit = (event: FormEvent) => {
        event.preventDefault();

        // Only the administration sets the manager's account.
        form.transform(({ manager, ...data }) => (isAdmin ? { ...data, manager } : data));
        form.post(editing ? route('academies.update', academy.id) : route('academies.store'), { forceFormData: true, preserveScroll: true });
    };

    const back = editing ? (isAdmin ? route('academies.show', academy.id) : route('dashboard')) : route('academies.index');

    return (
        <AppLayout
            title={editing ? (isAdmin ? t('Edit the academy') : t('Academy profile')) : t('Add an academy')}
            description={
                editing
                    ? academy.name
                    : t('The academy gets its own manager account: the manager signs in and runs its teachers, students and halaqat.')
            }
            back={{ href: back }}
        >
            <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
                <div className="min-w-0 space-y-6 lg:col-span-2">
                    <Card>
                        <CardHeader title={t('The academy')} icon={Building2} />
                        <CardBody className="grid gap-5 sm:grid-cols-2">
                            <Field label={t('Name of the academy')} error={form.errors.name} required className="sm:col-span-2">
                                <Input
                                    value={form.data.name}
                                    onChange={(event) => form.setData('name', event.target.value)}
                                    placeholder={t('For example: Al-Noor academy for the Quran')}
                                    aria-invalid={!!form.errors.name}
                                />
                            </Field>
                            <Field label={t('Short tagline')} error={form.errors.tagline} className="sm:col-span-2" hint={t('Shown under the name on the academies page.')}>
                                <Input value={form.data.tagline} maxLength={160} onChange={(event) => form.setData('tagline', event.target.value)} />
                            </Field>
                            <Field label={t('About the academy')} error={form.errors.description} className="sm:col-span-2">
                                <Textarea
                                    rows={5}
                                    value={form.data.description}
                                    onChange={(event) => form.setData('description', event.target.value)}
                                    placeholder={t('Its halaqat, programs, teachers and who it welcomes...')}
                                />
                            </Field>
                            <Field label={t('Students it welcomes')} error={form.errors.gender} className="sm:col-span-2">
                                <div className="grid grid-cols-3 gap-2">
                                    {(['male', 'female', 'mixed'] as const).map((gender) => (
                                        <button
                                            key={gender}
                                            type="button"
                                            onClick={() => form.setData('gender', gender)}
                                            className={cn(
                                                'rounded-xl border px-3 py-2.5 text-sm font-semibold transition',
                                                form.data.gender === gender
                                                    ? 'border-primary-600 bg-primary-50 text-primary-800 dark:bg-primary-500/10 dark:text-primary-200'
                                                    : 'border-line text-muted hover:border-line-strong',
                                            )}
                                        >
                                            {labels.halaqaGender[gender]}
                                        </button>
                                    ))}
                                </div>
                            </Field>
                            <Field label={t('Email of the academy')} error={form.errors.email}>
                                <Input type="email" dir="ltr" value={form.data.email} onChange={(event) => form.setData('email', event.target.value)} />
                            </Field>
                            <Field label={t('Phone (WhatsApp)')} error={form.errors.phone}>
                                <Input type="tel" dir="ltr" value={form.data.phone} onChange={(event) => form.setData('phone', event.target.value)} />
                            </Field>
                            <Field label={t('Place')} error={form.errors.location} hint={t('City and country, or "Online".')}>
                                <Input value={form.data.location} onChange={(event) => form.setData('location', event.target.value)} />
                            </Field>
                            <Field label={t('Timezone')} error={form.errors.timezone}>
                                <Select value={form.data.timezone} onChange={(event) => form.setData('timezone', event.target.value)}>
                                    {timezones.map((timezone) => (
                                        <option key={timezone} value={timezone}>
                                            {timezone}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                        </CardBody>
                    </Card>

                    {isAdmin && (
                        <Card>
                            <CardHeader
                                title={t('Manager account')}
                                description={
                                    hasManager
                                        ? t('The manager signs in with this email or phone. Leave the password empty to keep it.')
                                        : t('The manager signs in with this email or phone and the password you set.')
                                }
                                icon={UserCog}
                            />
                            <CardBody className="grid gap-5 sm:grid-cols-2">
                                <Field label={t('Name of the manager')} error={errors['manager.name']} required={!editing || hasManager} className="sm:col-span-2">
                                    <Input value={form.data.manager.name} onChange={(event) => setManager('name', event.target.value)} aria-invalid={!!errors['manager.name']} />
                                </Field>
                                <Field label={t('Email')} error={errors['manager.email']} hint={t('Email or phone is required.')}>
                                    <Input type="email" dir="ltr" value={form.data.manager.email} onChange={(event) => setManager('email', event.target.value)} />
                                </Field>
                                <Field label={t('Phone (WhatsApp)')} error={errors['manager.phone']} hint={t('With the country code, e.g. +201001234567')}>
                                    <Input type="tel" dir="ltr" value={form.data.manager.phone} onChange={(event) => setManager('phone', event.target.value)} />
                                </Field>
                                <Field
                                    label={hasManager ? t('New password') : t('Password')}
                                    error={errors['manager.password']}
                                    required={!hasManager}
                                    hint={hasManager ? t('Leave empty to keep the current password.') : undefined}
                                    className="sm:col-span-2"
                                >
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <PasswordInput
                                                value={form.data.manager.password}
                                                onChange={(event) => setManager('password', event.target.value)}
                                                autoComplete="new-password"
                                            />
                                        </div>
                                        <Button variant="secondary" onClick={() => setManager('password', generatePassword())}>
                                            <Wand2 />
                                            {t('Generate')}
                                        </Button>
                                    </div>
                                </Field>
                            </CardBody>
                        </Card>
                    )}
                </div>

                <div className="min-w-0 space-y-6">
                    <Card>
                        <CardHeader title={t('Logo')} />
                        <CardBody>
                            <LogoUpload
                                name={form.data.name}
                                currentUrl={academy?.logo_url ?? null}
                                file={form.data.logo}
                                removed={form.data.remove_logo}
                                onChange={(file) => form.setData((data) => ({ ...data, logo: file, remove_logo: false }))}
                                onRemove={() => form.setData((data) => ({ ...data, logo: null, remove_logo: true }))}
                                error={form.errors.logo}
                            />
                        </CardBody>
                    </Card>

                    <Card className="lg:sticky lg:top-24">
                        <CardHeader title={t('Settings')} icon={Settings2} />
                        <CardBody className="space-y-5">
                            <Switch
                                checked={form.data.accepts_requests}
                                onChange={(value) => form.setData('accepts_requests', value)}
                                label={t('Accepts join requests')}
                                description={t('Students without academy can ask to join it from the academies page.')}
                            />
                            {isAdmin && (
                                <Switch
                                    checked={form.data.is_active}
                                    onChange={(value) => form.setData('is_active', value)}
                                    label={t('Active academy')}
                                    description={t('The members of a deactivated academy cannot sign in.')}
                                />
                            )}
                            <div className="flex flex-col gap-2 border-t border-line pt-5">
                                <Button type="submit" size="lg" loading={form.processing}>
                                    <Save />
                                    {editing ? t('Save changes') : t('Create the academy')}
                                </Button>
                                <LinkButton href={back} variant="ghost">
                                    {t('Cancel')}
                                </LinkButton>
                            </div>
                            {isAdmin && !editing && (
                                <p className="flex gap-2 text-xs leading-relaxed text-muted">
                                    <KeyRound className="mt-0.5 size-3.5 shrink-0 text-gold-600" />
                                    {t('Share the sign-in details with the manager; they can change the password from their profile.')}
                                </p>
                            )}
                        </CardBody>
                    </Card>
                </div>
            </form>
        </AppLayout>
    );
}
