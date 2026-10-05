import { useForm } from '@inertiajs/react';
import { Bell, BookOpen, GraduationCap, KeyRound, Save, School, ShieldCheck, UserRound, Wand2 } from 'lucide-react';
import { type FormEvent, useMemo } from 'react';
import { AvatarUpload } from '@/components/ui/avatar-upload';
import { Button, LinkButton } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { CheckboxList } from '@/components/ui/checkbox-list';
import { Checkbox, Field, Input, Select, Switch, Textarea } from '@/components/ui/form';
import { PasswordInput } from '@/components/ui/password-input';
import AppLayout from '@/layouts/app-layout';
import { useTrans } from '@/lib/i18n';
import { useLabels } from '@/lib/labels';
import { cn, generatePassword } from '@/lib/utils';
import type { Gender, HalaqaGender, Locale, Role, UserDetails } from '@/types';

interface HalaqaOption {
    id: number;
    academy_id: number | null;
    name: string;
    color: string;
    gender: HalaqaGender;
    teacher: string | null;
    students_count: number;
    capacity: number | null;
}

interface UserFormProps {
    user: (UserDetails & { academy_id: number | null; halaqat: number[] }) | null;
    defaults: { role: Role; academy_id: number | null; timezone: string; locale: Locale; halaqa_id: number | null } | null;
    halaqat: HalaqaOption[];
    /** The academies the administration chooses from (empty for a manager, whose accounts join their academy). */
    academies: { id: number; name: string }[];
    /** The roles the signed-in user may give. */
    roles: Role[];
    timezones: string[];
}

const roleIcons = { student: GraduationCap, teacher: BookOpen, manager: School, admin: ShieldCheck };

export default function UserForm({ user, defaults, halaqat, academies, roles, timezones }: UserFormProps) {
    const { t } = useTrans();
    const labels = useLabels();
    const editing = user !== null;
    const choosesAcademy = academies.length > 0;

    const form = useForm({
        _method: editing ? 'put' : 'post',
        name: user?.name ?? '',
        email: user?.email ?? '',
        phone: user?.phone ?? '',
        password: '',
        role: user?.role ?? defaults?.role ?? ('student' as Role),
        academy_id: user?.academy_id ?? defaults?.academy_id ?? ('' as number | ''),
        gender: user?.gender ?? ('' as Gender | ''),
        birth_date: user?.birth_date ?? '',
        country: user?.country ?? '',
        timezone: user?.timezone ?? defaults?.timezone ?? 'Africa/Cairo',
        locale: user?.locale ?? defaults?.locale ?? ('ar' as Locale),
        bio: user?.bio ?? '',
        guardian_name: user?.guardian_name ?? '',
        guardian_phone: user?.guardian_phone ?? '',
        zoom_user_id: user?.zoom_user_id ?? '',
        admin_notes: user?.admin_notes ?? '',
        is_active: user?.is_active ?? true,
        notify_email: user?.notify_email ?? true,
        notify_whatsapp: user?.notify_whatsapp ?? true,
        avatar: null as File | null,
        remove_avatar: false,
        halaqat: user?.halaqat ?? (defaults?.halaqa_id ? [defaults.halaqa_id] : ([] as number[])),
        send_credentials: !editing,
    });

    const halaqaOptions = useMemo(
        () =>
            halaqat
                .filter((halaqa) => !choosesAcademy || halaqa.academy_id === form.data.academy_id)
                .filter((halaqa) => halaqa.gender === 'mixed' || !form.data.gender || halaqa.gender === form.data.gender)
                .map((halaqa) => ({
                    id: halaqa.id,
                    name: halaqa.name,
                    meta: [halaqa.teacher, `${halaqa.students_count}${halaqa.capacity ? ` / ${halaqa.capacity}` : ''} ${t('students')}`]
                        .filter(Boolean)
                        .join(' · '),
                })),
        [halaqat, choosesAcademy, form.data.academy_id, form.data.gender, t],
    );

    const submit = (event: FormEvent) => {
        event.preventDefault();

        const url = editing ? route('users.update', user.id) : route('users.store');

        form.post(url, { forceFormData: true });
    };

    return (
        <AppLayout
            title={editing ? t('Edit user') : t('Add a user')}
            description={editing ? user.name : t('The user signs in with the email or phone number and the password you set.')}
            back={{ href: editing ? route('users.show', user.id) : route('users.index') }}
        >
            <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <Card>
                        <CardHeader title={t('Account')} icon={KeyRound} />
                        <CardBody className="space-y-5">
                            <Field label={t('Role')} error={form.errors.role}>
                                <div className={cn('grid gap-2', roles.length > 3 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2')}>
                                    {roles.map((role) => {
                                        const Icon = roleIcons[role];

                                        return (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() => form.setData('role', role)}
                                                className={cn(
                                                    'flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-sm font-semibold transition',
                                                    form.data.role === role
                                                        ? 'border-primary-600 bg-primary-50 text-primary-800 dark:bg-primary-500/10 dark:text-primary-200'
                                                        : 'border-line text-muted hover:border-line-strong',
                                                )}
                                            >
                                                <Icon className="size-5" />
                                                {labels.role[role]}
                                            </button>
                                        );
                                    })}
                                </div>
                            </Field>

                            {choosesAcademy && form.data.role !== 'admin' && (
                                <Field
                                    label={t('Academy')}
                                    error={form.errors.academy_id}
                                    required={form.data.role !== 'student'}
                                    hint={form.data.role === 'student' ? t('Leave empty for a student who studies on their own, without academy.') : undefined}
                                >
                                    <Select
                                        value={form.data.academy_id}
                                        onChange={(event) =>
                                            form.setData((data) => ({
                                                ...data,
                                                academy_id: event.target.value === '' ? '' : Number(event.target.value),
                                                halaqat: [],
                                            }))
                                        }
                                        aria-invalid={!!form.errors.academy_id}
                                    >
                                        <option value="">{form.data.role === 'student' ? t('Without academy (independent)') : t('Choose the academy')}</option>
                                        {academies.map((academy) => (
                                            <option key={academy.id} value={academy.id}>
                                                {academy.name}
                                            </option>
                                        ))}
                                    </Select>
                                </Field>
                            )}

                            <div className="grid gap-5 sm:grid-cols-2">
                                <Field label={t('Full name')} error={form.errors.name} required className="sm:col-span-2">
                                    <Input value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} aria-invalid={!!form.errors.name} />
                                </Field>
                                <Field label={t('Email')} error={form.errors.email} hint={t('Email or phone is required.')}>
                                    <Input type="email" dir="ltr" value={form.data.email} onChange={(event) => form.setData('email', event.target.value)} />
                                </Field>
                                <Field label={t('Phone (WhatsApp)')} error={form.errors.phone} hint={t('With the country code, e.g. +201001234567')}>
                                    <Input type="tel" dir="ltr" value={form.data.phone} onChange={(event) => form.setData('phone', event.target.value)} />
                                </Field>
                                <Field
                                    label={editing ? t('New password') : t('Password')}
                                    error={form.errors.password}
                                    required={!editing}
                                    hint={editing ? t('Leave empty to keep the current password.') : undefined}
                                    className="sm:col-span-2"
                                >
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <PasswordInput value={form.data.password} onChange={(event) => form.setData('password', event.target.value)} autoComplete="new-password" />
                                        </div>
                                        <Button variant="secondary" onClick={() => form.setData('password', generatePassword())}>
                                            <Wand2 />
                                            {t('Generate')}
                                        </Button>
                                    </div>
                                </Field>
                            </div>

                            {(!editing || form.data.password) && (
                                <Checkbox
                                    label={t('Send the login details to the user')}
                                    description={t('By email and WhatsApp (if configured).')}
                                    checked={form.data.send_credentials}
                                    onChange={(event) => form.setData('send_credentials', event.target.checked)}
                                />
                            )}
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader title={t('Personal information')} icon={UserRound} />
                        <CardBody className="grid gap-5 sm:grid-cols-2">
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
                            <Field label={t('Timezone')} error={form.errors.timezone}>
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
                        </CardBody>
                    </Card>

                    {form.data.role === 'student' && (
                        <Card>
                            <CardHeader title={t('Student details')} icon={GraduationCap} />
                            <CardBody className="space-y-5">
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <Field label={t('Guardian name')} error={form.errors.guardian_name}>
                                        <Input value={form.data.guardian_name} onChange={(event) => form.setData('guardian_name', event.target.value)} />
                                    </Field>
                                    <Field label={t('Guardian phone')} error={form.errors.guardian_phone} hint={t('Used for WhatsApp when the student has no phone.')}>
                                        <Input type="tel" dir="ltr" value={form.data.guardian_phone} onChange={(event) => form.setData('guardian_phone', event.target.value)} />
                                    </Field>
                                </div>
                                <Field label={t('Halaqat')} error={form.errors.halaqat}>
                                    <CheckboxList
                                        options={halaqaOptions}
                                        value={form.data.halaqat}
                                        onChange={(ids) => form.setData('halaqat', ids)}
                                        showAvatars={false}
                                        emptyText={
                                            choosesAcademy && form.data.academy_id === ''
                                                ? t('Choose the academy first to list its halaqat.')
                                                : t('No active halaqat match this student.')
                                        }
                                    />
                                </Field>
                            </CardBody>
                        </Card>
                    )}

                    {form.data.role === 'teacher' && (
                        <Card>
                            <CardHeader title={t('Teacher details')} icon={BookOpen} />
                            <CardBody className="space-y-5">
                                <Field label={t('About the teacher')} error={form.errors.bio}>
                                    <Textarea
                                        value={form.data.bio}
                                        onChange={(event) => form.setData('bio', event.target.value)}
                                        placeholder={t('Ijazah, experience, specialization...')}
                                    />
                                </Field>
                                <Field label={t('Zoom user (email)')} error={form.errors.zoom_user_id} hint={t('Only if the academy uses Zoom with a license for this teacher.')}>
                                    <Input dir="ltr" value={form.data.zoom_user_id} onChange={(event) => form.setData('zoom_user_id', event.target.value)} />
                                </Field>
                            </CardBody>
                        </Card>
                    )}
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader title={t('Photo')} />
                        <CardBody>
                            <AvatarUpload
                                name={form.data.name}
                                currentUrl={user?.avatar_url ?? null}
                                file={form.data.avatar}
                                removed={form.data.remove_avatar}
                                onChange={(file) => form.setData((data) => ({ ...data, avatar: file, remove_avatar: false }))}
                                onRemove={() => form.setData((data) => ({ ...data, avatar: null, remove_avatar: true }))}
                                error={form.errors.avatar}
                            />
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader title={t('Notifications')} icon={Bell} />
                        <CardBody className="space-y-4">
                            <Switch checked={form.data.notify_email} onChange={(value) => form.setData('notify_email', value)} label={t('Email notifications')} />
                            <Switch checked={form.data.notify_whatsapp} onChange={(value) => form.setData('notify_whatsapp', value)} label={t('WhatsApp notifications')} />
                        </CardBody>
                    </Card>

                    <Card className="lg:sticky lg:top-24">
                        <CardBody className="space-y-5">
                            <Switch
                                checked={form.data.is_active}
                                onChange={(value) => form.setData('is_active', value)}
                                label={t('Active account')}
                                description={t('Deactivated users cannot sign in.')}
                            />
                            <Field label={t('Administration notes')} error={form.errors.admin_notes} hint={t('Visible to admins only.')}>
                                <Textarea value={form.data.admin_notes} onChange={(event) => form.setData('admin_notes', event.target.value)} />
                            </Field>
                            <div className="flex flex-col gap-2 border-t border-line pt-5">
                                <Button type="submit" size="lg" loading={form.processing}>
                                    <Save />
                                    {editing ? t('Save changes') : t('Create the user')}
                                </Button>
                                <LinkButton href={editing ? route('users.show', user.id) : route('users.index')} variant="ghost">
                                    {t('Cancel')}
                                </LinkButton>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </form>
        </AppLayout>
    );
}
