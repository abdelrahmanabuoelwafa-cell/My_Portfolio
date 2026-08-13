// Service Worker - unregisters the old PWA so the
// static portfolio page always loads the latest version.
const CACHE_NAME = 'lamp-login-v2';

self.addEventListener('install', function() {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  if (event.request.mode === 'navigate') {
    return;
  }
  event.respondWith(fetch(event.request));
});
