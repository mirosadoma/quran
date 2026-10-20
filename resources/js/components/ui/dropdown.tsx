import { Menu, MenuButton, MenuItem, MenuItems, MenuSeparator } from '@headlessui/react';
import { Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { Fragment, type ReactElement, type ReactNode, type Ref, useCallback, useEffect, useRef } from 'react';
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
    /** Called when the pointer or the keyboard reaches the item (true) and leaves it (false), with its element. */
    onActiveChange?: (active: boolean, element: HTMLElement | null) => void;
    children: ReactNode;
}

const itemClasses = 'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-ink transition data-focus:bg-surface-muted';

interface ItemBodyProps extends Omit<DropdownItemProps, 'children'> {
    focus: boolean;
    children: ReactNode;
    ref?: Ref<HTMLElement>;
    /** The role, the id, the handlers and the data attributes the menu gives its item. */
    [prop: string]: unknown;
}

/**
 * The element of a menu item. The menu hands it its props (role, handlers, data-focus...) merged with ours,
 * so every one of them goes on the element; `focus` says whether the pointer or the keyboard is on the item.
 */
function ItemBody({ icon: Icon, href, method, danger, focus, onActiveChange, children, ref, ...menuProps }: ItemBodyProps) {
    const element = useRef<HTMLElement | null>(null);

    const setElement = useCallback(
        (node: HTMLElement | null) => {
            element.current = node;

            if (typeof ref === 'function') {
                ref(node);
            } else if (ref) {
                ref.current = node;
            }
        },
        [ref],
    );

    useEffect(() => {
        if (!onActiveChange) {
            return;
        }

        onActiveChange(focus, element.current);

        return () => onActiveChange(false, null);
    }, [focus, onActiveChange]);

    const content = (
        <>
            {Icon && <Icon className={cn('size-4 shrink-0', danger ? 'text-rose-500' : 'text-muted')} />}
            <span className="truncate">{children}</span>
        </>
    );

    const classes = cn(itemClasses, danger && 'text-rose-600 dark:text-rose-400');

    if (href) {
        return (
            <Link ref={setElement as never} href={href} method={method} as={method && method !== 'get' ? 'button' : 'a'} className={classes} {...menuProps}>
                {content}
            </Link>
        );
    }

    return (
        <button ref={setElement as Ref<HTMLButtonElement>} type="button" className={classes} {...menuProps}>
            {content}
        </button>
    );
}

export function DropdownItem({ children, ...props }: DropdownItemProps) {
    return (
        <MenuItem>
            {({ focus }) => (
                <ItemBody {...props} focus={focus}>
                    {children}
                </ItemBody>
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
