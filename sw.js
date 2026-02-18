// Haggly Service Worker — enables offline use (PWA)
const CACHE_NAME = 'haggly-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/guide.html',
  '/about.html',
  '/privacy.html',
  '/terms.html',
  '/contact.html',
  '/404.html',
  '/manifest.json',
  '/translations.js',
  '/ui-strings.js',
  '/localize.js',
  '/icon-192.svg',
  '/icon-512.svg',
  '/guides/bangkok-haggling.html',
  '/guides/marrakech-haggling.html',
  '/guides/istanbul-haggling.html',
  '/guides/mexico-city-haggling.html',
  '/guides/bali-haggling.html',
  '/guides/haiti-haggling.html',
  '/guides/facebook-marketplace.html'
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
