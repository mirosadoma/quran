import { router, useForm } from '@inertiajs/react';
import { Mail, Save, Send } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/form';
import { PasswordInput } from '@/components/ui/password-input';
import { useTrans } from '@/lib/i18n';

export type MailMailer = 'env' | 'smtp' | 'log';
export type MailEncryption = 'tls' | 'ssl' | 'none';

/**
 * The outgoing email settings as the settings page shows them (never the password itself).
 */
export interface MailSummary {
    mailer: MailMailer;
    host: string | null;
    port: number;
    username: string | null;
    password_set: boolean;
    encryption: MailEncryption;
    from_address: string | null;
    from_name: string | null;
    /** What the .env file says. */
    env: { mailer: string; host: string | null; from: string | null };
    /** What sends now. */
    effective: { mailer: string; from: string | null };
}

/**
 * The SMTP server and the sender, saved by the administration instead of the .env file, with a test email.
 */
export function MailSettingsCard({ mail, adminEmail }: { mail: MailSummary; adminEmail: string | null }) {
    const { t } = useTrans();
    const [testing, setTesting] = useState(false);

    const form = useForm({
        mail_mailer: mail.mailer,
        mail_host: mail.host ?? '',
        mail_port: mail.port || 587,
        mail_username: mail.username ?? '',
        mail_password: '',
        mail_encryption: mail.encryption,
        mail_from_address: mail.from_address ?? '',
        mail_from_name: mail.from_name ?? '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.put(route('settings.mail.update'), { preserveScroll: true, onSuccess: () => form.setData('mail_password', '') });
    };

    const sendTest = () => {
        setTesting(true);
        router.post(route('settings.mail.test'), {}, { preserveScroll: true, onFinish: () => setTesting(false) });
    };

    const smtp = form.data.mail_mailer === 'smtp';

    return (
        <form onSubmit={submit}>
            <Card>
                <CardHeader
                    title={t('Outgoing email (SMTP)')}
                    description={t('The server that sends the password reset links and the notifications. What you save here replaces the .env file at once.')}
                    icon={Mail}
                />
                <CardBody className="grid gap-5 sm:grid-cols-2">
                    <Field label={t('Sending method')} error={form.errors.mail_mailer} className="sm:col-span-2">
                        <Select value={form.data.mail_mailer} onChange={(event) => form.setData('mail_mailer', event.target.value as MailMailer)}>
                            <option value="env">{t('As set in the .env file (:mailer)', { mailer: mail.env.mailer })}</option>
                            <option value="smtp">{t('SMTP server')}</option>
                            <option value="log">{t('Log only (nothing is sent)')}</option>
                        </Select>
                    </Field>

                    {smtp && (
                        <>
                            <Field label={t('Host')} error={form.errors.mail_host} required>
                                <Input dir="ltr" value={form.data.mail_host} onChange={(event) => form.setData('mail_host', event.target.value)} placeholder="smtp.gmail.com" />
                            </Field>
                            <div className="grid grid-cols-2 gap-4">
                                <Field label={t('Port')} error={form.errors.mail_port} required>
                                    <Input
                                        type="number"
                                        dir="ltr"
                                        min={1}
                                        max={65535}
                                        value={form.data.mail_port}
                                        onChange={(event) => form.setData('mail_port', Number(event.target.value))}
                                    />
                                </Field>
                                <Field label={t('Encryption')} error={form.errors.mail_encryption}>
                                    <Select value={form.data.mail_encryption} onChange={(event) => form.setData('mail_encryption', event.target.value as MailEncryption)}>
                                        <option value="tls">{t('TLS (port 587)')}</option>
                                        <option value="ssl">{t('SSL (port 465)')}</option>
                                        <option value="none">{t('None')}</option>
                                    </Select>
                                </Field>
                            </div>
                            <Field label={t('Username')} error={form.errors.mail_username}>
                                <Input dir="ltr" value={form.data.mail_username} onChange={(event) => form.setData('mail_username', event.target.value)} autoComplete="off" />
                            </Field>
                            <Field label={t('Password')} error={form.errors.mail_password} hint={mail.password_set ? t('Leave it empty to keep the saved password.') : undefined}>
                                <PasswordInput
                                    value={form.data.mail_password}
                                    onChange={(event) => form.setData('mail_password', event.target.value)}
                                    placeholder={mail.password_set ? '••••••••••' : ''}
                                    autoComplete="new-password"
                                />
                            </Field>
                        </>
                    )}

                    <Field label={t('Sender address')} error={form.errors.mail_from_address} hint={!form.data.mail_from_address && mail.env.from ? t('Now: :from', { from: mail.env.from }) : undefined}>
                        <Input type="email" dir="ltr" value={form.data.mail_from_address} onChange={(event) => form.setData('mail_from_address', event.target.value)} placeholder="no-reply@example.com" />
                    </Field>
                    <Field label={t('Sender name')} error={form.errors.mail_from_name}>
                        <Input value={form.data.mail_from_name} onChange={(event) => form.setData('mail_from_name', event.target.value)} />
                    </Field>
                </CardBody>
                <CardFooter className="justify-between">
                    <p className="text-xs text-muted">
                        {t('Sending now: :mailer, from :from', { mailer: mail.effective.mailer, from: mail.effective.from ?? '—' })}
                        {adminEmail && <span className="block">{t('The test goes to your own email: :email', { email: adminEmail })}</span>}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={sendTest} loading={testing} disabled={form.isDirty}>
                            <Send />
                            {t('Send a test email')}
                        </Button>
                        <Button type="submit" loading={form.processing}>
                            <Save />
                            {t('Save email settings')}
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </form>
    );
}
