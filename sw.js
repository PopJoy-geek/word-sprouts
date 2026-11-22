/* Word Sprouts PWA service worker. Bump this name when the offline shell changes. */
const CACHE_NAME = 'word-sprouts-v11';
const scopedUrl = (path) => new URL(path, self.registration.scope).toString();
const APP_SHELL = [
  scopedUrl('./'),
  scopedUrl('offline.html'),
  scopedUrl('manifest.webmanifest'),
  scopedUrl('favicon.svg'),
  scopedUrl('icon-96.png'),
  scopedUrl('icon-192.png'),
  scopedUrl('icon-512.png'),
  scopedUrl('apple-touch-icon.png')
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(scopedUrl('./'), copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(scopedUrl('./'))) || caches.match(scopedUrl('offline.html')))
    );
    return;
  }

  if (['style', 'script', 'font', 'image'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
        return cached || network;
      })
    );
  }
});
