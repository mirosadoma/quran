import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    build: {
        rolldownOptions: {
            // Only a timing report (not an error); the slow Tailwind scan it pointed at is fixed in app.css.
            checks: { bundlerTimings: false },
            output: {
                // What every page needs gets chunks of its own instead of one shared file over 500 kB: React,
                // Inertia (with the libraries it uses) and the Arabic texts. The browser also keeps the libraries
                // cached when only the platform's code or its translations change.
                codeSplitting: {
                    groups: [
                        { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 30 },
                        { name: 'inertia', test: /node_modules[\\/]@inertiajs[\\/]/, priority: 20 },
                        { name: 'lang-ar', test: /[\\/]lang[\\/]ar\.json$/, priority: 10 },
                    ],
                },
            },
        },
    },
    server: {
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
