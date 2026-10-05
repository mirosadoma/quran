import { Menu, MenuButton, MenuItem, MenuItems, MenuSeparator } from '@headlessui/react';
import { Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { Fragment, type ReactElement, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DropdownProps {
    trigger: ReactElement;
    children: ReactNode;
    align?: 'start' | 'end';
    className?: string;
}

export function Dropdown({ trigger, children, align = 'end', className }: DropdownProps) {
    return (
        <Menu>
            <MenuButton as={Fragment}>{trigger}</MenuButton>
            <MenuItems
                transition
                anchor={`bottom ${align}`}
                className={cn(
                    'z-50 w-56 rounded-2xl border border-line bg-surface p-1.5 shadow-xl shadow-primary-950/10 outline-none [--anchor-gap:8px]',
                    'transition duration-100 ease-out data-closed:scale-95 data-closed:opacity-0',
                    className,
                )}
            >
                {children}
            </MenuItems>
        </Menu>
    );
}

interface DropdownItemProps {
    icon?: LucideIcon;
    href?: string;
    method?: 'get' | 'post' | 'put' | 'patch' | 'delete';
    onClick?: () => void;
    danger?: boolean;
    children: ReactNode;
}

const itemClasses = 'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-ink transition data-focus:bg-surface-muted';

export function DropdownItem({ icon: Icon, href, method, onClick, danger = false, children }: DropdownItemProps) {
    const content = (
        <>
            {Icon && <Icon className={cn('size-4 shrink-0', danger ? 'text-rose-500' : 'text-muted')} />}
            <span className="truncate">{children}</span>
        </>
    );

    const classes = cn(itemClasses, danger && 'text-rose-600 dark:text-rose-400');

    return (
        <MenuItem>
            {href ? (
                <Link href={href} method={method} as={method && method !== 'get' ? 'button' : 'a'} className={classes}>
                    {content}
                </Link>
            ) : (
                <button type="button" onClick={onClick} className={classes}>
                    {content}
                </button>
            )}
        </MenuItem>
    );
}

export function DropdownSeparator() {
    return <MenuSeparator className="my-1 h-px bg-line" />;
}

export function DropdownLabel({ children }: { children: ReactNode }) {
    return <div className="px-3 pb-1.5 pt-1 text-xs font-semibold text-muted">{children}</div>;
}
