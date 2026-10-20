/**
 * Loader of the JavaScript tests (node --test): compiles the TypeScript / TSX of resources/js with the transformer
 * Vite already ships (oxc, through rolldown), resolves the "@/" alias, reads JSON files, ignores CSS, and swaps the
 * Inertia runtime for the stub of tests/js/stubs. No test runner is added to the project: Node's own runner and
 * its mock timers do the work.
 */
import { existsSync, readFileSync } from 'node:fs';
import { register } from 'node:module';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolvePath(dirname(fileURLToPath(import.meta.url)), '../..');

register(import.meta.url, { data: { root } });

globalThis.__TEST_ROOT__ = root;

let transformSync;
let settings;

const EXTENSIONS = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

const STUBS = {
    '@inertiajs/react': 'tests/js/stubs/inertia-react.tsx',
};

function withExtension(path) {
    if (/\.(m?js|json|tsx?|css)$/.test(path) && existsSync(path)) {
        return path;
    }

    for (const extension of EXTENSIONS) {
        if (existsSync(path + extension)) {
            return path + extension;
        }
    }

    return path;
}

export async function initialize(data) {
    settings = data;
}

export async function resolve(specifier, context, next) {
    const base = settings?.root ?? root;

    if (specifier in STUBS) {
        return { url: pathToFileURL(resolvePath(base, STUBS[specifier])).href, shortCircuit: true };
    }

    if (specifier.startsWith('@/')) {
        return { url: pathToFileURL(withExtension(resolvePath(base, 'resources/js', specifier.slice(2)))).href, shortCircuit: true };
    }

    if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
        const path = withExtension(resolvePath(dirname(fileURLToPath(context.parentURL)), specifier));

        if (existsSync(path)) {
            return { url: pathToFileURL(path).href, shortCircuit: true };
        }
    }

    return next(specifier, context);
}

export async function load(url, context, next) {
    if (url.startsWith('file:') && /\.tsx?$/.test(url) && !url.includes('/node_modules/')) {
        transformSync ??= (await import('rolldown/experimental')).transformSync;
        const file = fileURLToPath(url);
        const { code, errors } = transformSync(file, readFileSync(file, 'utf8'), { lang: url.endsWith('.tsx') ? 'tsx' : 'ts', jsx: { runtime: 'automatic' } });

        if (errors.length > 0) {
            throw new Error(`${file}: ${errors.map((error) => error.message).join('\n')}`);
        }

        return { format: 'module', source: code, shortCircuit: true };
    }

    if (url.startsWith('file:') && url.endsWith('.json') && !url.includes('/node_modules/')) {
        return { format: 'module', source: `export default ${readFileSync(fileURLToPath(url), 'utf8')};`, shortCircuit: true };
    }

    if (url.endsWith('.css')) {
        return { format: 'module', source: '', shortCircuit: true };
    }

    return next(url, context);
}
