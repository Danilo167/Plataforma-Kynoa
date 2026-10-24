/* Service worker do Kynoa: permite uso offline e instalação como aplicativo (PWA).
   Páginas usam rede primeiro com cópia local de reserva. Demais arquivos usam
   cache com atualização em segundo plano. Mude CACHE_VERSION a cada publicação. */
const CACHE_VERSION = 'kynoa-v2.0.0';

const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/icons/favicon.svg',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/css/tokens.css',
  'assets/css/base.css',
  'assets/css/layout.css',
  'assets/css/components.css',
  'assets/css/adjustments.css',
  'assets/css/print.css',
  'assets/js/core/utils.js',
  'assets/js/core/icons.js',
  'assets/js/core/storage.js',
  'assets/js/core/store.js',
  'assets/js/core/audio.js',
  'assets/js/ui/toast.js',
  'assets/js/ui/notify.js',
  'assets/js/ui/dialog.js',
  'assets/js/ui/router.js',
  'assets/js/data/content.js',
  'assets/js/features/categories.js',
  'assets/js/features/projects.js',
  'assets/js/features/tasks.js',
  'assets/js/features/microsteps.js',
  'assets/js/features/focus.js',
  'assets/js/features/ambient.js',
  'assets/js/features/environment.js',
  'assets/js/features/personalization.js',
  'assets/js/features/community.js',
  'assets/js/features/resources.js',
  'assets/js/features/settings.js',
  'assets/js/features/dashboard.js',
  'assets/js/main.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put('index.html', copy));
          return response;
        })
        .catch(() => caches.match('index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
