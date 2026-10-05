import { Link, useForm, usePage } from '@inertiajs/react';
import { Building2, CircleHelp, Mail, MessageCircle, Phone, Send } from 'lucide-react';
import type { FormEvent } from 'react';
import { PageHero } from '@/components/site/section';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/form';
import PublicLayout from '@/layouts/public-layout';
import { useTrans } from '@/lib/i18n';

export default function Contact() {
    const { auth, app } = usePage().props;
    const { t } = useTrans();
    const user = auth.user;

    const form = useForm({
        name: user?.name ?? '',
        email: user?.email ?? '',
        phone: user?.phone ?? '',
        subject: '',
        message: '',
        // Left empty by people; filled by spam robots.
        website: '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();

        form.post(route('site.contact.store'), {
            preserveScroll: true,
            onSuccess: () => form.reset('subject', 'message'),
        });
    };

    const whatsapp = app.contact.phone ? `https://wa.me/${app.contact.phone.replace(/[^0-9]/g, '')}` : null;

    return (
        <PublicLayout title={t('Contact us')} description={t('Write to the administration of the platform: questions, suggestions, or adding your academy.')}>
            <PageHero
                eyebrow={t('Contact us')}
                title={t('We are happy to hear from you')}
                description={t('Write to the administration of the platform: questions, suggestions, or adding your academy.')}
            />

            <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.5fr_1fr] lg:px-8">
                <form onSubmit={submit} className="space-y-5 rounded-3xl border border-line bg-surface p-6 sm:p-8">
                    <div>
                        <h2 className="text-xl font-bold text-ink">{t('Send us a message')}</h2>
                        <p className="mt-1 text-sm text-muted">{t('We reply by email or phone, God willing.')}</p>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field label={t('Your name')} error={form.errors.name} required className="sm:col-span-2">
                            <Input value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} autoComplete="name" />
                        </Field>
                        <Field label={t('Email')} error={form.errors.email} hint={t('Email or phone is required.')}>
                            <Input type="email" dir="ltr" value={form.data.email} onChange={(event) => form.setData('email', event.target.value)} autoComplete="email" />
                        </Field>
                        <Field label={t('Phone (WhatsApp)')} error={form.errors.phone}>
                            <Input type="tel" dir="ltr" value={form.data.phone} onChange={(event) => form.setData('phone', event.target.value)} autoComplete="tel" />
                        </Field>
                        <Field label={t('Subject')} error={form.errors.subject} className="sm:col-span-2">
                            <Input value={form.data.subject} maxLength={150} onChange={(event) => form.setData('subject', event.target.value)} />
                        </Field>
                        <Field label={t('Your message')} error={form.errors.message} required className="sm:col-span-2">
                            <Textarea rows={6} maxLength={5000} value={form.data.message} onChange={(event) => form.setData('message', event.target.value)} />
                        </Field>
                    </div>

                    <div aria-hidden className="hidden">
                        <label>
                            Website
                            <input tabIndex={-1} autoComplete="off" value={form.data.website} onChange={(event) => form.setData('website', event.target.value)} />
                        </label>
                    </div>

                    <Button type="submit" size="lg" loading={form.processing} className="w-full sm:w-auto">
                        <Send className="rtl:-scale-x-100" />
                        {t('Send the message')}
                    </Button>
                </form>

                <div className="space-y-5">
                    {(app.contact.email || app.contact.phone) && (
                        <div className="space-y-3 rounded-3xl border border-line bg-surface p-6">
                            <h2 className="font-bold text-ink">{t('Reach us directly')}</h2>
                            {app.contact.email && (
                                <a href={`mailto:${app.contact.email}`} className="flex items-center gap-3 rounded-2xl bg-surface-muted p-3 text-sm font-semibold text-ink hover:text-primary-700">
                                    <Mail className="size-5 text-primary-600" />
                                    <span dir="ltr">{app.contact.email}</span>
                                </a>
                            )}
                            {app.contact.phone && (
                                <a href={`tel:${app.contact.phone}`} className="flex items-center gap-3 rounded-2xl bg-surface-muted p-3 text-sm font-semibold text-ink hover:text-primary-700">
                                    <Phone className="size-5 text-primary-600" />
                                    <span dir="ltr">{app.contact.phone}</span>
                                </a>
                            )}
                            {whatsapp && (
                                <a
                                    href={whatsapp}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-3 rounded-2xl bg-emerald-600 p-3 text-sm font-semibold text-white hover:bg-emerald-700"
                                >
                                    <MessageCircle className="size-5" />
                                    {t('WhatsApp')}
                                </a>
                            )}
                        </div>
                    )}

                    <div className="rounded-3xl border border-line bg-surface p-6">
                        <span className="flex size-11 items-center justify-center rounded-2xl bg-gold-50 text-gold-700 dark:bg-gold-500/10 dark:text-gold-300">
                            <Building2 className="size-5" />
                        </span>
                        <h2 className="mt-4 font-bold text-ink">{t('Do you run an academy or a Quran school?')}</h2>
                        <p className="mt-2 text-sm leading-relaxed text-muted">
                            {t('Tell us its name, place and number of teachers and students. We create it on the platform with an account for its manager.')}
                        </p>
                    </div>

                    <div className="rounded-3xl border border-line bg-surface p-6">
                        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
                            <CircleHelp className="size-5" />
                        </span>
                        <h2 className="mt-4 font-bold text-ink">{t('Maybe your question is already answered')}</h2>
                        <p className="mt-2 text-sm leading-relaxed text-muted">{t('Have a look at the frequently asked questions and the guide of the system.')}</p>
                        <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
                            <Link href={route('site.faq')} className="text-primary-700 hover:underline dark:text-primary-300">
                                {t('FAQ')}
                            </Link>
                            <span className="text-line-strong">·</span>
                            <Link href={route('site.guide')} className="text-primary-700 hover:underline dark:text-primary-300">
                                {t('System guide')}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}
