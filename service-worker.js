const CACHE_VERSION = 'v1';
const CACHE_NAME = `drop-and-roll-cache-${CACHE_VERSION}`;
const APP_SHELL = [
  './',
  'index.html',
  'manifest.json',
  'main.js',
  'config.js',
  'constants.js',
  'DifficultyConfig.js',
  'StartScene.js',
  'GameScene.js',
  'utils/bitmapTextFactory.js',
  'sprites/Background.png',
  'audio/Map1Music.mp3'
];
const APP_SHELL_URLS = APP_SHELL.map((path) => new URL(path, self.location).toString());
const OFFLINE_FALLBACK = new URL('index.html', self.location).toString();

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== 'basic'
          ) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => caches.match(OFFLINE_FALLBACK));
    })
  );
});
