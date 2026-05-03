/* Minimal service worker: network-only pass-through avoids "no-op fetch handler" warnings
   while keeping install/PWA behaviour predictable. */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
