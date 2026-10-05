import { Head, usePage } from '@inertiajs/react';
import { BookOpenCheck, MessagesSquare, Video } from 'lucide-react';
import type { ReactNode } from 'react';
import { IslamicPattern, Logo, StarOrnament } from '@/components/brand';
import { AppButton } from '@/components/install-app';
import { LanguageSwitch, ThemeToggle } from '@/components/layout/topbar';
import { useDocumentDirection, useFlashToasts } from '@/hooks/use-app-shell';
import { useTrans } from '@/lib/i18n';

interface AuthLayoutProps {
    title: string;
    subtitle?: ReactNode;
    children: ReactNode;
}

export default function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
    const { app } = usePage().props;
    const { t, locale } = useTrans();

    useFlashToasts();
    useDocumentDirection();

    const features = [
        { icon: Video, text: t('Live sessions with one click') },
        { icon: BookOpenCheck, text: t('Memorization tracked ayah by ayah') },
        { icon: MessagesSquare, text: t('Group chat and voice recitations') },
    ];

    return (
        <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            <Head title={title} />

            <div className="relative flex flex-col px-5 py-6 sm:px-10">
                <div className="flex items-center justify-between">
                    <Logo />
                    <div className="flex items-center">
                        <AppButton />
                        <LanguageSwitch />
                        <ThemeToggle />
                    </div>
                </div>

                <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
                    <div className="mb-8">
                        <div className="mb-4 flex items-center gap-2 text-gold-500">
                            <StarOrnament className="size-3.5" />
                            <span className="h-px w-10 bg-gold-400/60" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-ink">{title}</h1>
                        {subtitle && <p className="mt-2 leading-relaxed text-muted">{subtitle}</p>}
                    </div>
                    {children}
                </div>

                <p className="text-center text-xs text-muted">
                    © {new Date().getFullYear()} {app.name}
                </p>
            </div>

            <div className="relative hidden overflow-hidden bg-sidebar lg:flex lg:items-center lg:justify-center">
                <IslamicPattern className="text-gold-300/[0.13]" size={96} strokeWidth={1.1} />
                <div className="absolute inset-0 bg-radial from-primary-600/25 via-transparent to-transparent" />
                <div className="absolute -bottom-32 start-1/2 size-[520px] -translate-x-1/2 rounded-full bg-gold-500/10 blur-3xl rtl:translate-x-1/2" />

                <div className="relative max-w-lg px-12 text-center">
                    <div className="mx-auto mb-10 flex size-20 items-center justify-center rounded-[28px] bg-white/5 ring-1 ring-gold-300/20 backdrop-blur">
                        <StarOrnament className="size-9 text-gold-400" />
                    </div>
                    <p className="font-quran text-5xl leading-[1.6] text-white" dir="rtl">
                        <span className="text-gold-400">﴿</span> وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا <span className="text-gold-400">﴾</span>
                    </p>
                    <p className="mt-3 text-sm text-gold-200/80">
                        {locale === 'ar' ? 'سورة المزمل — الآية ٤' : '“And recite the Quran with measured recitation” (73:4)'}
                    </p>

                    <div className="ornament-divider my-10 text-gold-400/70">
                        <StarOrnament className="size-3" />
                    </div>

                    <p className="font-quran text-2xl leading-relaxed text-white/90" dir="rtl">
                        «خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ»
                    </p>
                    <p className="mt-2 text-xs text-sidebar-ink/60">{t('Narrated by Al-Bukhari')}</p>

                    <ul className="mt-12 grid gap-3 text-start">
                        {features.map((feature) => (
                            <li key={feature.text} className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10 backdrop-blur">
                                <span className="flex size-9 items-center justify-center rounded-xl bg-gold-400/15 text-gold-300">
                                    <feature.icon className="size-4.5" />
                                </span>
                                <span className="text-sm font-medium text-sidebar-ink">{feature.text}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
