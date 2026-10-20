/**
 * What the components need from @inertiajs/react when they render in the tests, without a page or a server.
 * The page props come from `setPageProps` (tests/js/support.ts).
 */
import type { AnchorHTMLAttributes, ReactNode } from 'react';

type Props = Record<string, unknown>;

let pageProps: Props = {};

export function __setPageProps(props: Props): void {
    pageProps = props;
}

export function usePage(): { props: Props; url: string; component: string } {
    return { props: pageProps, url: '/', component: 'test' };
}

export function Link({ href, children, method: _method, as: _as, ...rest }: { href: string; children?: ReactNode; method?: string; as?: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
    return (
        <a href={href} {...rest}>
            {children}
        </a>
    );
}

export function Head({ children }: { title?: string; children?: ReactNode }) {
    return <>{children}</>;
}

export const router = {
    on: () => () => undefined,
    post: () => undefined,
    reload: () => undefined,
    visit: () => undefined,
};

export function usePoll(): void {}
