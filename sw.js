// N'CARD service worker — enables "Add to Home Screen" install + offline use.
// Strategy: stale-while-revalidate. The app shell is a single self-contained
// HTML file (all images/fonts are inlined as base64), so caching just this
// handful of files is enough for the whole app to work offline.
const CACHE_NAME = 'ncard-cache-v1';
const APP_SHELL = [
  './NCARD.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle same-origin GET requests — let everything else (camera
  // streams, cross-origin calls, etc.) pass straight through untouched.
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        const networkFetch = fetch(event.request)
          .then((response) => {
            if (response && response.ok) cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => cached); // offline: fall back to whatever we have cached
        return cached || networkFetch;
      })
    )
  );
});
