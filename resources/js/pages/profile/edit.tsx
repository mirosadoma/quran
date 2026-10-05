import { useForm } from '@inertiajs/react';
import { Bell, KeyRound, Save, UserRound } from 'lucide-react';
import type { FormEvent } from 'react';
import { AvatarUpload } from '@/components/ui/avatar-upload';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Field, Input, Select, Switch, Textarea } from '@/components/ui/form';
import { PasswordInput } from '@/components/ui/password-input';
import AppLayout from '@/layouts/app-layout';
import { useTrans } from '@/lib/i18n';
import { useLabels } from '@/lib/labels';
import type { Gender, Locale, Role } from '@/types';

interface ProfileProps {
    profile: {
        name: string;
        email: string | null;
        phone: string | null;
        role: Role;
        gender: Gender | null;
        birth_date: string | null;
        country: string | null;
        timezone: string;
        locale: Locale;
        bio: string | null;
        guardian_name: string | null;
        guardian_phone: string | null;
        notify_email: boolean;
        notify_whatsapp: boolean;
        avatar_url: string | null;
    };
    timezones: string[];
}

export default function ProfileEdit({ profile, timezones }: ProfileProps) {
    const { t } = useTrans();
    const labels = useLabels();

    const form = useForm({
        _method: 'put',
        name: profile.name,
        email: profile.email ?? '',
        phone: profile.phone ?? '',
        gender: profile.gender ?? ('' as Gender | ''),
        birth_date: profile.birth_date ?? '',
        country: profile.country ?? '',
        timezone: profile.timezone,
        locale: profile.locale,
        bio: profile.bio ?? '',
        guardian_name: profile.guardian_name ?? '',
        guardian_phone: profile.guardian_phone ?? '',
        notify_email: profile.notify_email,
        notify_whatsapp: profile.notify_whatsapp,
        avatar: null as File | null,
        remove_avatar: false,
    });

    const passwordForm = useForm({ current_password: '', password: '', password_confirmation: '' });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(route('profile.update'), { forceFormData: true, preserveScroll: true, onSuccess: () => form.setData('avatar', null) });
    };

    const changePassword = (event: FormEvent) => {
        event.preventDefault();
        passwordForm.put(route('profile.password'), { preserveScroll: true, onSuccess: () => passwordForm.reset() });
    };

    return (
        <AppLayout title={t('My profile')} description={labels.role[profile.role]}>
            <div className="grid gap-6 lg:grid-cols-3">
                <form onSubmit={submit} className="space-y-6 lg:col-span-2">
                    <Card>
                        <CardHeader title={t('Personal information')} icon={UserRound} />
                        <CardBody className="space-y-5">
                            <AvatarUpload
                                name={form.data.name}
                                currentUrl={profile.avatar_url}
                                file={form.data.avatar}
                                removed={form.data.remove_avatar}
                                onChange={(file) => form.setData((data) => ({ ...data, avatar: file, remove_avatar: false }))}
                                onRemove={() => form.setData((data) => ({ ...data, avatar: null, remove_avatar: true }))}
                                error={form.errors.avatar}
                            />
                            <div className="grid gap-5 sm:grid-cols-2">
                                <Field label={t('Full name')} error={form.errors.name} required className="sm:col-span-2">
                                    <Input value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} />
                                </Field>
                                <Field label={t('Email')} error={form.errors.email}>
                                    <Input type="email" dir="ltr" value={form.data.email} onChange={(event) => form.setData('email', event.target.value)} />
                                </Field>
                                <Field label={t('Phone (WhatsApp)')} error={form.errors.phone}>
                                    <Input type="tel" dir="ltr" value={form.data.phone} onChange={(event) => form.setData('phone', event.target.value)} />
                                </Field>
                                <Field label={t('Gender')} error={form.errors.gender}>
                                    <Select value={form.data.gender} onChange={(event) => form.setData('gender', event.target.value as Gender | '')}>
                                        <option value="">{t('Not specified')}</option>
                                        <option value="male">{labels.gender.male}</option>
                                        <option value="female">{labels.gender.female}</option>
                                    </Select>
                                </Field>
                                <Field label={t('Date of birth')} error={form.errors.birth_date}>
                                    <Input type="date" value={form.data.birth_date} onChange={(event) => form.setData('birth_date', event.target.value)} />
                                </Field>
                                <Field label={t('Country')} error={form.errors.country}>
                                    <Input value={form.data.country} onChange={(event) => form.setData('country', event.target.value)} />
                                </Field>
                                <Field label={t('Timezone')} error={form.errors.timezone} hint={t('All session times are shown in this timezone.')}>
                                    <Select value={form.data.timezone} onChange={(event) => form.setData('timezone', event.target.value)}>
                                        {timezones.map((timezone) => (
                                            <option key={timezone} value={timezone}>
                                                {timezone}
                                            </option>
                                        ))}
                                    </Select>
                                </Field>
                                <Field label={t('Language')} error={form.errors.locale}>
                                    <Select value={form.data.locale} onChange={(event) => form.setData('locale', event.target.value as Locale)}>
                                        <option value="ar">العربية</option>
                                        <option value="en">English</option>
                                    </Select>
                                </Field>
                                {profile.role === 'teacher' && (
                                    <Field label={t('About me')} error={form.errors.bio} className="sm:col-span-2">
                                        <Textarea value={form.data.bio} onChange={(event) => form.setData('bio', event.target.value)} />
                                    </Field>
                                )}
                                {profile.role === 'student' && (
                                    <>
                                        <Field label={t('Guardian name')} error={form.errors.guardian_name}>
                                            <Input value={form.data.guardian_name} onChange={(event) => form.setData('guardian_name', event.target.value)} />
                                        </Field>
                                        <Field label={t('Guardian phone')} error={form.errors.guardian_phone}>
                                            <Input
                                                type="tel"
                                                dir="ltr"
                                                value={form.data.guardian_phone}
                                                onChange={(event) => form.setData('guardian_phone', event.target.value)}
                                            />
                                        </Field>
                                    </>
                                )}
                            </div>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader title={t('Notifications')} icon={Bell} description={t('Notifications always appear inside the platform.')} />
                        <CardBody className="space-y-4">
                            <Switch
                                checked={form.data.notify_email}
                                onChange={(value) => form.setData('notify_email', value)}
                                label={t('Email notifications')}
                                description={t('Session reminders, cancellations and recitation feedback.')}
                            />
                            <Switch
                                checked={form.data.notify_whatsapp}
                                onChange={(value) => form.setData('notify_whatsapp', value)}
                                label={t('WhatsApp notifications')}
                                description={t('Sent to your phone number (or the guardian phone).')}
                            />
                        </CardBody>
                        <CardFooter>
                            <Button type="submit" loading={form.processing}>
                                <Save />
                                {t('Save changes')}
                            </Button>
                        </CardFooter>
                    </Card>
                </form>

                <form onSubmit={changePassword}>
                    <Card className="lg:sticky lg:top-24">
                        <CardHeader title={t('Change password')} icon={KeyRound} />
                        <CardBody className="space-y-4">
                            <Field label={t('Current password')} error={passwordForm.errors.current_password}>
                                <PasswordInput
                                    value={passwordForm.data.current_password}
                                    onChange={(event) => passwordForm.setData('current_password', event.target.value)}
                                    autoComplete="current-password"
                                />
                            </Field>
                            <Field label={t('New password')} error={passwordForm.errors.password}>
                                <PasswordInput
                                    value={passwordForm.data.password}
                                    onChange={(event) => passwordForm.setData('password', event.target.value)}
                                    autoComplete="new-password"
                                />
                            </Field>
                            <Field label={t('Confirm password')} error={passwordForm.errors.password_confirmation}>
                                <PasswordInput
                                    value={passwordForm.data.password_confirmation}
                                    onChange={(event) => passwordForm.setData('password_confirmation', event.target.value)}
                                    autoComplete="new-password"
                                />
                            </Field>
                        </CardBody>
                        <CardFooter>
                            <Button type="submit" variant="secondary" loading={passwordForm.processing}>
                                {t('Update password')}
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </div>
        </AppLayout>
    );
}
