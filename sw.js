// Service worker for the driver and manager PWAs. Only precaches the
// static app shell (HTML/CSS/JS/icons) so those pages load instantly and
// still open offline -- every /api/ call always goes straight to the
// network so trip data, logins, and status updates are never served stale.
const CACHE_NAME = 'lcsr-app-shell-v4';
const PRECACHE_URLS = [
  '/driver.html',
  '/driver-profile.html',
  '/driver-hours.html',
  '/driver-w4.html',
  '/manage-drivers.html',
  '/assets/styles.css',
  '/assets/i18n.js',
  '/assets/driver.js',
  '/assets/driver-profile.js',
  '/assets/driver-hours.js',
  '/assets/driver-w4.js',
  '/assets/manage-drivers.js',
  '/assets/logo-mark.svg',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (!PRECACHE_URLS.includes(url.pathname)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((res) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, res.clone()));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
