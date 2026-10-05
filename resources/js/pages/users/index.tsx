import { Link, router, usePage } from '@inertiajs/react';
import { Eye, EllipsisVertical, Pencil, Power, Trash, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { RoleBadge } from '@/components/badges';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button, LinkButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/form';
import { ConfirmDialog } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { Table, Td, Th, Tr } from '@/components/ui/table';
import { Tabs } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { cleanQuery, cn, colorOf, formatNumber } from '@/lib/utils';
import type { Paginated, Role, UserItem } from '@/types';

interface Filters {
    role: Role | null;
    status: 'active' | 'inactive' | null;
    search: string;
    academy_id: number | null;
}

interface UsersIndexProps {
    users: Paginated<UserItem>;
    filters: Filters;
    counts: Record<'all' | Role, number>;
    /** Every academy, for the administration's filter (empty for a manager). */
    academies: { id: number; name: string }[];
}

export default function UsersIndex({ users, filters, counts, academies }: UsersIndexProps) {
    const { t, locale } = useTrans();
    const { auth } = usePage().props;
    const dates = useDates();
    const [deleting, setDeleting] = useState<UserItem | null>(null);
    const isAdmin = auth.user?.role === 'admin';

    const apply = (changes: Partial<Filters>) => {
        router.get(route('users.index'), cleanQuery({ ...filters, ...changes }), { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <AppLayout
            title={isAdmin ? t('Users') : t('Teachers and students')}
            description={isAdmin ? t('The accounts of the platform: administration, academy managers, teachers and students.') : t('The teachers and students of your academy.')}
            actions={
                <LinkButton href={route('users.create', cleanQuery({ role: filters.role, academy_id: filters.academy_id }))}>
                    <UserPlus />
                    {t('Add a user')}
                </LinkButton>
            }
        >
            <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
                <Tabs
                    value={filters.role ?? 'all'}
                    onChange={(role) => apply({ role: role === 'all' ? null : (role as Role) })}
                    items={[
                        { value: 'all', label: t('All'), count: counts.all },
                        { value: 'student', label: t('Students'), count: counts.student },
                        { value: 'teacher', label: t('Teachers'), count: counts.teacher },
                        ...(isAdmin
                            ? [
                                  { value: 'manager', label: t('Academy managers'), count: counts.manager },
                                  { value: 'admin', label: t('Admins'), count: counts.admin },
                              ]
                            : []),
                    ]}
                />
                <div className="flex flex-1 flex-col gap-3 sm:flex-row lg:justify-end">
                    <SearchInput
                        value={filters.search}
                        onSearch={(search) => apply({ search })}
                        placeholder={t('Name, email or phone...')}
                        className="sm:w-72"
                    />
                    {academies.length > 0 && (
                        <div className="sm:w-56">
                            <Select
                                value={filters.academy_id ?? ''}
                                onChange={(event) => apply({ academy_id: Number(event.target.value) || null })}
                                aria-label={t('Academy')}
                            >
                                <option value="">{t('All academies')}</option>
                                {academies.map((academy) => (
                                    <option key={academy.id} value={academy.id}>
                                        {academy.name}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    )}
                    <div className="sm:w-44">
                        <Select value={filters.status ?? ''} onChange={(event) => apply({ status: (event.target.value || null) as Filters['status'] })}>
                            <option value="">{t('All statuses')}</option>
                            <option value="active">{t('Active')}</option>
                            <option value="inactive">{t('Deactivated')}</option>
                        </Select>
                    </div>
                </div>
            </div>

            <Card className="overflow-hidden">
                {users.data.length === 0 ? (
                    <EmptyState icon={Users} title={t('No users found')} />
                ) : (
                    <Table>
                        <thead>
                            <tr>
                                <Th>{t('Name')}</Th>
                                <Th>{t('Role')}</Th>
                                {isAdmin && <Th>{t('Academy')}</Th>}
                                <Th>{t('Halaqat')}</Th>
                                <Th>{t('Memorized')}</Th>
                                <Th>{t('Status')}</Th>
                                <Th>{t('Last sign in')}</Th>
                                <Th />
                            </tr>
                        </thead>
                        <tbody>
                            {users.data.map((user) => (
                                <Tr key={user.id}>
                                    <Td>
                                        <Link href={route('users.show', user.id)} className="flex items-center gap-3">
                                            <Avatar name={user.name} src={user.avatar_url} size="sm" />
                                            <span className="min-w-0">
                                                <span className="block truncate font-semibold text-ink hover:text-primary-700">{user.name}</span>
                                                <span className="block truncate text-xs text-muted" dir="ltr">
                                                    {user.email ?? user.phone}
                                                </span>
                                            </span>
                                        </Link>
                                    </Td>
                                    <Td>
                                        <RoleBadge role={user.role} />
                                    </Td>
                                    {isAdmin && (
                                        <Td className="text-sm">
                                            {user.academy ? (
                                                <span className="block max-w-44 truncate text-ink">{user.academy.name}</span>
                                            ) : user.role === 'student' ? (
                                                <span className="text-xs text-muted">{t('Independent')}</span>
                                            ) : (
                                                <span className="text-xs text-muted">—</span>
                                            )}
                                        </Td>
                                    )}
                                    <Td>
                                        {user.role === 'student' ? (
                                            <div className="flex max-w-56 flex-wrap gap-1">
                                                {(user.halaqat ?? []).length === 0 && <span className="text-xs text-muted">—</span>}
                                                {user.halaqat?.map((halaqa) => (
                                                    <span key={halaqa.id} className={cn('rounded-md px-2 py-0.5 text-xs font-medium', colorOf(halaqa.color).soft)}>
                                                        {halaqa.name}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : user.role === 'teacher' ? (
                                            <span className="text-sm text-ink">{t(':count halaqat', { count: user.teaching_halaqat_count ?? 0 })}</span>
                                        ) : (
                                            <span className="text-xs text-muted">—</span>
                                        )}
                                    </Td>
                                    <Td className="tabular-nums">
                                        {user.role === 'student' ? formatNumber(user.memorized_ayahs, locale) : <span className="text-muted">—</span>}
                                    </Td>
                                    <Td>
                                        {user.is_active ? <Badge tone="emerald" dot>{t('Active')}</Badge> : <Badge tone="slate">{t('Deactivated')}</Badge>}
                                    </Td>
                                    <Td className="text-xs text-muted">{user.last_login_at ? dates.relative(user.last_login_at) : t('Never')}</Td>
                                    <Td>
                                        <div className="flex justify-end">
                                            <Dropdown
                                                trigger={
                                                    <Button variant="ghost" size="icon-sm" aria-label={t('Options')}>
                                                        <EllipsisVertical />
                                                    </Button>
                                                }
                                            >
                                                <DropdownItem icon={Eye} href={route('users.show', user.id)}>
                                                    {t('View')}
                                                </DropdownItem>
                                                <DropdownItem icon={Pencil} href={route('users.edit', user.id)}>
                                                    {t('Edit')}
                                                </DropdownItem>
                                                <DropdownItem icon={Power} href={route('users.toggle-active', user.id)} method="patch">
                                                    {user.is_active ? t('Deactivate') : t('Activate')}
                                                </DropdownItem>
                                                <DropdownSeparator />
                                                <DropdownItem icon={Trash} danger onClick={() => setDeleting(user)}>
                                                    {t('Delete')}
                                                </DropdownItem>
                                            </Dropdown>
                                        </div>
                                    </Td>
                                </Tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </Card>

            <Pagination data={users} className="mt-6" />

            <ConfirmDialog
                open={deleting !== null}
                onClose={() => setDeleting(null)}
                onConfirm={() => deleting && router.delete(route('users.destroy', deleting.id), { preserveScroll: true, onFinish: () => setDeleting(null) })}
                title={t('Delete :name?', { name: deleting?.name ?? '' })}
                message={t('All attendance and recitation records of this user will be deleted permanently. Deactivate the account instead to keep the history.')}
                confirmLabel={t('Delete permanently')}
            />
        </AppLayout>
    );
}
