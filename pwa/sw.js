/* Arcade Perdido · service worker DESACTIVADO (v2.8.1)
   Antes cacheaba los juegos para jugar sin conexión, pero mezclaba versiones viejas y nuevas de los .js y .html.
   Este worker solo existe para que los navegadores que tenían el antiguo lo sustituyan: borra todas las cachés,
   se da de baja y recarga las pestañas abiertas para que carguen todo de la red.
   Para volver a activar la PWA: recuperar el sw.js anterior (git log -- pwa/sw.js) y el register('sw.js')
   de common.js, index.html, indexpro.html e indextv.html. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.map((k) => caches.delete(k))))
    .then(() => self.registration.unregister())
    .then(() => self.clients.matchAll({ type: 'window' }))
    .then((cs) => cs.forEach((c) => c.navigate(c.url).catch(() => {}))));
});
