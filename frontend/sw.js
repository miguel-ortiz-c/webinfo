// Service Worker version
const CACHE_NAME = 'everytel-offline-v8';

// Agregamos los CDNs (Tailwind e Iconos) para que la app se vea bonita sin internet
const urlsToCache = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/css/styles.css',
    '/js/app.js',
    '/js/config.js',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/feather-icons'
];

self.addEventListener('install', event => {
    self.skipWaiting(); // Obliga a instalarse de inmediato
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            // Usamos allSettled para que si falla un link externo, no cancele todo
            return Promise.allSettled(urlsToCache.map(url => cache.add(url)));
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Borramos cachés viejas para no saturar la memoria
                    if (cacheName !== CACHE_NAME && cacheName !== 'everytel-api-cache' && !cacheName.startsWith('proyecto-')) {
                        console.log('Borrando caché antigua:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => clients.claim())
    );
});

// Offline core logic
self.addEventListener('fetch', event => {
    // Ignore non-GET requests
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // 1. Upload strategy (Pictures)
    if (url.pathname.startsWith('/uploads/')) {
        event.respondWith(
            caches.match(event.request, { ignoreSearch: true }).then(cachedResponse => {
                if (cachedResponse) return cachedResponse;
                return fetch(event.request).catch(() => new Response("Imagen offline no encontrada", { status: 404 }));
            })
        );
        return;
    }

    // 2. Global Strategy (API, HTML, JS, CSS, CDNs)
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Si hay internet, clonamos la respuesta y la guardamos en la caché para el futuro
                // (status 0 es para archivos de otros dominios como Tailwind)
                if (response && (response.status === 200 || response.status === 0)) {
                    const clonedResponse = response.clone();
                    const cacheKey = url.pathname.startsWith('/api/') ? 'everytel-api-cache' : CACHE_NAME;
                    caches.open(cacheKey).then(cache => cache.put(event.request, clonedResponse));
                }
                return response; // Devolvemos la web actualizada
            })
            .catch(async () => {
                // Offline fallback

                // A. API cache query
                if (url.pathname.startsWith('/api/')) {
                    const apiRes = await caches.match(event.request, { ignoreSearch: false });
                    if (apiRes) return apiRes;
                    return new Response(null, { status: 503, statusText: 'Offline API' });
                }

                // B. Si es un archivo estático (CSS, JS, Imagen)
                const staticRes = await caches.match(event.request, { ignoreSearch: true });
                if (staticRes) return staticRes;

                // C. Navigation Request Fallback
                // Returns structural HTML when offline
                if (event.request.mode === 'navigate') {
                    if (url.pathname.includes('dashboard')) {
                        return caches.match('/dashboard.html');
                    }
                    return caches.match('/index.html'); // Fallback final
                }

                return new Response("Contenido no disponible offline", { status: 503 });
            })
    );
});