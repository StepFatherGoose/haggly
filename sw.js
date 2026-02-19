// Haggly Service Worker — enables offline use (PWA)
const CACHE_NAME = 'haggly-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/phrases.html',
  '/guide.html',
  '/about.html',
  '/privacy.html',
  '/terms.html',
  '/contact.html',
  '/manifest.json',
  '/ui-strings.js',
  '/localize.js',
  '/consent.js',
  '/icon.svg',
  '/icon-maskable.svg',
  '/social-card.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});
