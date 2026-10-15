/* Arcade Perdido · service worker
   Solo se registra si la página pone window.withpwa = true (ver arcadePWA en config.js).
   Estrategia «red primero»: con conexión siempre se usa lo último del servidor (y se guarda una copia);
   sin conexión se sirve la copia guardada. Así nunca se mezcla un HTML nuevo con un .js viejo. */
const CACHE = 'arcade-perdido-v3';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== CACHE && /^arcade-perdido-/.test(k)).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fetch(req).then((res) => {
    if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then((hit) => hit || caches.match(req, { ignoreSearch: true }))));
});
