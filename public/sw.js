/* GHIDAI: only explicitly public, versioned assets may enter this cache. */
const CACHE = 'ghidai-public-v1';
const ASSETS = ['/icons/ghidai-192.png', '/icons/ghidai-512.png', '/offline.html'];
const allowed = url => url.origin === self.location.origin && !url.search && ASSETS.includes(url.pathname);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('ghidai-public-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'CLEAR_PUBLIC_CACHE') {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('ghidai-public-')).map(key => caches.delete(key)))).then(() => event.ports[0]?.postMessage({ cleared: true })));
  }
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (allowed(url)) {
    event.respondWith(caches.match(request, { cacheName: CACHE }).then(hit => hit || fetch(request, { credentials: 'omit' }).then(response => {
      if (response.ok && response.type === 'basic' && !/no-store|private/i.test(response.headers.get('cache-control') || '')) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)));
      }
      return response;
    })));
  } else if (request.mode === 'navigate') {
    // Never store document responses, including authenticated pages and RSC.
    event.respondWith(fetch(request).catch(async () => (await caches.match('/offline.html', { cacheName: CACHE })) || new Response('تعذر الاتصال. لم يُحفظ أي تعديل.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })));
  }
});
