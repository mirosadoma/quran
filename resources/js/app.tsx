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
import { setupPwa } from '@/lib/pwa';

const pages = import.meta.glob<{ default: ResolvedComponent }>('./pages/**/*.tsx');

setupPwa();

createInertiaApp({
    title: (title, page) => {
        const name = (page.props.app as { name?: string } | undefined)?.name ?? 'Rattil';

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

        createRoot(el).render(
            <>
                <App {...props} />
                <Toaster richColors closeButton position="top-center" dir="auto" toastOptions={{ className: 'font-sans' }} />
            </>,
        );
    },
    progress: {
        color: '#c98f2f',
        delay: 150,
    },
});
