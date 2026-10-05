import { router } from '@inertiajs/react';
import { Archive, ArchiveRestore, Eye, LogIn, Pencil, Power, Trash } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { DropdownItem, DropdownSeparator } from '@/components/ui/dropdown';
import { ConfirmDialog } from '@/components/ui/modal';
import { useTrans } from '@/lib/i18n';
import type { AcademyItem } from '@/types';

export function AcademyStatusBadge({ academy }: { academy: AcademyItem }) {
    const { t } = useTrans();

    if (academy.archived) {
        return <Badge tone="slate">{t('Archived')}</Badge>;
    }

    return academy.is_active ? (
        <Badge tone="emerald" dot>
            {t('Active')}
        </Badge>
    ) : (
        <Badge tone="rose">{t('Deactivated')}</Badge>
    );
}

/**
 * The actions of the administration on an academy: enter it, edit, deactivate, archive, restore, delete.
 */
export function useAcademyActions() {
    const [archiving, setArchiving] = useState<AcademyItem | null>(null);
    const [deleting, setDeleting] = useState<AcademyItem | null>(null);
    const [processing, setProcessing] = useState(false);
    const { t } = useTrans();

    const visit = (method: 'post' | 'patch' | 'delete', url: string, after?: () => void) => {
        router.visit(url, {
            method,
            preserveScroll: true,
            onStart: () => setProcessing(true),
            onFinish: () => {
                setProcessing(false);
                after?.();
            },
        });
    };

    const items = (academy: AcademyItem, withView = true) =>
        academy.archived ? (
            <>
                {withView && (
                    <DropdownItem icon={Eye} href={route('academies.show', academy.id)}>
                        {t('View')}
                    </DropdownItem>
                )}
                <DropdownItem icon={ArchiveRestore} onClick={() => visit('patch', route('academies.restore', academy.id))}>
                    {t('Restore')}
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem icon={Trash} danger onClick={() => setDeleting(academy)}>
                    {t('Delete permanently')}
                </DropdownItem>
            </>
        ) : (
            <>
                {withView && (
                    <DropdownItem icon={Eye} href={route('academies.show', academy.id)}>
                        {t('View')}
                    </DropdownItem>
                )}
                <DropdownItem icon={LogIn} onClick={() => visit('post', route('academies.impersonate', academy.id))}>
                    {t('Enter the academy')}
                </DropdownItem>
                <DropdownItem icon={Pencil} href={route('academies.edit', academy.id)}>
                    {t('Edit')}
                </DropdownItem>
                <DropdownItem icon={Power} onClick={() => visit('patch', route('academies.toggle', academy.id))}>
                    {academy.is_active ? t('Deactivate') : t('Activate')}
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem icon={Archive} danger onClick={() => setArchiving(academy)}>
                    {t('Archive')}
                </DropdownItem>
            </>
        );

    const dialogs = (
        <>
            <ConfirmDialog
                open={archiving !== null}
                onClose={() => setArchiving(null)}
                onConfirm={() => archiving && visit('delete', route('academies.destroy', archiving.id), () => setArchiving(null))}
                processing={processing}
                variant="gold"
                title={t('Archive :name?', { name: archiving?.name ?? '' })}
                message={t('The academy and everything in it are kept, but its manager, teachers and students cannot sign in until you restore it.')}
                confirmLabel={t('Archive')}
            />
            <ConfirmDialog
                open={deleting !== null}
                onClose={() => setDeleting(null)}
                onConfirm={() => deleting && visit('delete', route('academies.force-destroy', deleting.id), () => setDeleting(null))}
                processing={processing}
                title={t('Delete :name permanently?', { name: deleting?.name ?? '' })}
                message={t('Its halaqat, sessions and records, and the accounts of its manager and teachers are deleted for good. Its students keep their accounts and continue without academy.')}
                confirmLabel={t('Delete permanently')}
            />
        </>
    );

    return { items, dialogs, visit, processing };
}
