// Service worker: permite jugar sin conexión.
// Estrategia "red primero": siempre se sirve la versión publicada más reciente
// y la caché solo se usa cuando no hay red. Al añadir archivos nuevos,
// inclúyelos en PRECACHE y sube VERSION.
const VERSION = 'v1.0.0';
const CACHE = `wordcrash-${VERSION}`;

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/main.js',
  './js/engine.js',
  './js/renderer.js',
  './js/ui.js',
  './js/audio.js',
  './js/storage.js',
  './js/config.js',
  './js/utils.js',
  './js/data/languages.js',
  './js/data/words/es.js',
  './js/data/words/en.js',
  './js/data/words/fr.js',
  './js/data/words/de.js',
  './js/data/words/pt.js',
  './js/data/words/it.js',
  './assets/fonts/chakra-petch-latin-500-normal.woff2',
  './assets/fonts/chakra-petch-latin-600-normal.woff2',
  './assets/fonts/chakra-petch-latin-700-normal.woff2',
  './assets/fonts/ibm-plex-sans-latin-400-normal.woff2',
  './assets/fonts/ibm-plex-sans-latin-500-normal.woff2',
  './assets/fonts/ibm-plex-sans-latin-600-normal.woff2',
  './assets/fonts/jetbrains-mono-latin-500-normal.woff2',
  './assets/fonts/jetbrains-mono-latin-600-normal.woff2',
  './assets/fonts/jetbrains-mono-latin-700-normal.woff2',
  './assets/icons/favicon.svg',
  './assets/icons/icon-192.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('wordcrash-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request, { ignoreSearch: true });
        if (cached) return cached;
        if (request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      }),
  );
});
