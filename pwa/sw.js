/* Arcade Perdido · service worker (funciona sin conexión) */
importScripts('games.js');
const CACHE = 'arcade-perdido-' + ARCADE_VERSION;
const CORE = ['./', 'index.html', 'common.css', 'common.js', 'phys.js', 'games.js', 'config.js', 'indextv.html', 'indexpro.html', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/icon.svg'];
const FILES = CORE.concat(GAMES.map((g) => g.file), (self.GAMES_PRO || []).map((g) => g.file));

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(FILES.map((f) => c.add(f).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then((c) => c.match(req, { ignoreSearch: true }).then((hit) => {
    const net = fetch(req).then((res) => { if (res && res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  })));
});
