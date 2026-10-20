import { Link } from '@inertiajs/react';
import { ArrowRight, ChevronLeft, ChevronRight, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { CollectionIcon, HadithCard } from '@/components/hadith/hadith-ui';
import { Button, buttonClasses } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type HadithCollectionItem, type HadithItem, nameOf } from '@/lib/hadith';
import { useTrans } from '@/lib/i18n';
import { arabicDigits } from '@/lib/quran';
import { cn, colorOf, copyText } from '@/lib/utils';

interface HadithPageProps {
    collection: HadithCollectionItem;
    /** Every part of the hadith (most have one).  */
    hadiths: HadithItem[];
    /** The numbers of the hadiths before and after it. */
    previous: number | null;
    next: number | null;
}

/**
 * One hadith by its number, to read, copy or share.
 */
export default function HadithPage({ collection, hadiths, previous, next }: HadithPageProps) {
    const { t, locale } = useTrans();
    const color = colorOf(collection.color);
    const name = nameOf(collection, locale);
    const book = hadiths[0]?.book ?? null;
    const number = hadiths[0]?.number ?? 0;
    const label = locale === 'ar' ? arabicDigits(number) : number;
    const backHref = book ? route('hadith.show', { collection: collection.slug, book: book.number }) : route('hadith.show', collection.slug);

    const copyLink = async () => {
        if (await copyText(window.location.href)) {
            toast.success(t('Copied'));
        }
    };

    return (
        <AppLayout title={`${name} · ${t('Hadith :number', { number: label })}`} hideHeader>
            <Link href={backHref} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
                <ArrowRight className="size-4 ltr:rotate-180" />
                {name}
            </Link>

            <header className={cn('relative mb-5 flex items-center gap-4 overflow-hidden rounded-3xl bg-linear-to-br px-6 py-5 text-white shadow-lg', color.gradient)}>
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                    <CollectionIcon name={collection.icon} className="size-6" />
                </span>
                <div className="min-w-0">
                    <h1 className="font-quran text-xl font-bold sm:text-2xl">
                        {name} · {t('Hadith :number', { number: label })}
                    </h1>
                    {book && <p className="mt-0.5 truncate text-sm text-white/80">{nameOf(book, locale)}</p>}
                </div>
            </header>

            <div className="space-y-4">
                {hadiths.map((hadith) => (
                    <HadithCard key={hadith.id} hadith={hadith} featured linked={false} />
                ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                {previous !== null ? (
                    <Link href={route('hadith.hadith', { collection: collection.slug, number: previous })} className={buttonClasses({ variant: 'secondary' })}>
                        <ChevronLeft className="rtl:rotate-180" />
                        {t('Previous hadith')}
                    </Link>
                ) : (
                    <span />
                )}
                <Button variant="ghost" onClick={() => void copyLink()}>
                    <Link2 />
                    {t('Copy the link')}
                </Button>
                {next !== null ? (
                    <Link href={route('hadith.hadith', { collection: collection.slug, number: next })} className={buttonClasses({ variant: 'secondary' })}>
                        {t('Next hadith')}
                        <ChevronRight className="rtl:rotate-180" />
                    </Link>
                ) : (
                    <span />
                )}
            </div>
        </AppLayout>
    );
}
