import '../css/app.css';
import '@fontsource/ibm-plex-sans-arabic/300.css';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import '@fontsource/ibm-plex-sans-arabic/700.css';
import '@fontsource/amiri/400.css';
import '@fontsource/amiri/700.css';

import { createInertiaApp, type ResolvedComponent } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import { NavigationLoader } from '@/components/layout/loading-screen';
import { translate } from '@/lib/i18n';
import { setupPwa } from '@/lib/pwa';
import type { SharedProps } from '@/types';

const pages = import.meta.glob<{ default: ResolvedComponent }>('./pages/**/*.tsx');

setupPwa();

createInertiaApp({
    title: (title, page) => {
        const name = (page.props.app as { name?: string } | undefined)?.name ?? 'Wird';

        return title ? `${title} · ${name}` : name;
    },
    resolve: async (name) => {
        const page = pages[`./pages/${name}.tsx`];

        if (!page) {
            throw new Error(`Page not found: ${name}`);
        }

        return (await page()).default;
    },
    setup({ el, App, props }) {
        if (!el) {
            return;
        }

        const shared = props.initialPage.props as unknown as SharedProps;

        createRoot(el).render(
            <>
                <App {...props} />
                <Toaster richColors closeButton position="top-center" dir="auto" toastOptions={{ className: 'font-sans' }} />
                {/* The loading screen of the slow page changes: the companion pondering over the logo */}
                <NavigationLoader
                    name={shared.app.name}
                    logoUrl={shared.app.logo_url}
                    label={() => translate(document.documentElement.lang === 'ar' ? 'ar' : 'en', 'Loading…')}
                />
            </>,
        );
    },
    progress: {
        color: '#c98f2f',
        delay: 150,
    },
});
