/*
 * Service worker of the installable app (PWA).
 *
 * - Pages and data always come from the network (they are personal and change constantly).
 * - Built assets (/build/assets/*, content-hashed) are cached for faster starts.
 * - Without a connection, page visits show /offline.html.
 *
 * Bump VERSION whenever offline.html changes.
 */
const VERSION = 1;
const STATIC_CACHE = `rattil-static-v${VERSION}`;
const ASSETS_CACHE = 'rattil-assets';
const OFFLINE_URL = '/offline.html';
const MAX_ASSETS = 150;

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(STATIC_CACHE)
            .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(keys.filter((key) => key.startsWith('rattil-static-') && key !== STATIC_CACHE).map((key) => caches.delete(key)));

            if (self.registration.navigationPreload) {
                await self.registration.navigationPreload.enable();
            }

            await self.clients.claim();
        })(),
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') {
        return;
    }

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) {
        return;
    }

    if (request.mode === 'navigate') {
        event.respondWith(pageOrOfflineFallback(event));
    } else if (url.pathname.startsWith('/build/assets/')) {
        event.respondWith(cacheFirst(request));
    }
});

async function pageOrOfflineFallback(event) {
    try {
        return (await event.preloadResponse) || (await fetch(event.request));
    } catch {
        return (await caches.match(OFFLINE_URL, { cacheName: STATIC_CACHE })) || Response.error();
    }
}

async function cacheFirst(request) {
    const cache = await caches.open(ASSETS_CACHE);
    const cached = await cache.match(request);

    if (cached) {
        return cached;
    }

    const response = await fetch(request);

    if (response.ok && response.type === 'basic') {
        await cache.put(request, response.clone());
        await trim(cache);
    }

    return response;
}

/**
 * Every deploy produces new file names; drop the oldest entries so the cache stays small.
 */
async function trim(cache) {
    const keys = await cache.keys();

    await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ASSETS)).map((key) => cache.delete(key)));
}
