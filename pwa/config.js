/* Arcade Perdido · configuración
   ─────────────────────────────────────────────────────────────────────────────
   modo:
     'modonormal'    → siempre modo táctil (móvil / tablet), aunque se abra en una tele.
     'modotv'        → siempre modo TV (se juega con el mando: cruceta + OK + Atrás).
     'seleccionable' → el jugador elige con el botón 📺 / 📱 y se recuerda en el dispositivo.
                       Hasta que elija, se usa la detección automática.
     'automatico'    → detecta la tele por el navegador (Fire TV, Android TV, Google TV,
                       Tizen, webOS, Bravia…).
   En 'seleccionable' y 'automatico' también se puede forzar con ?tv=1 o ?tv=0 en la URL
   (solo para esa página; en el menú del juego sale el botón 📱 Modo móvil / 📺 Modo TV para cambiarlo).
   idioma:
     'auto' → detecta el idioma del navegador o la tele (español si es es/ca/gl/eu; si no, inglés)
              y muestra un botón 🇪🇸 / 🇬🇧 para cambiarlo (se recuerda en el dispositivo).
     'es'   → siempre en español (sin botón).
     'en'   → siempre en inglés (sin botón).
   También se puede forzar con ?lang=es o ?lang=en en la URL.
   Variables que puede poner cada página ANTES de cargar config.js / common.js:
     window.withpwa = true       → activa la PWA (service worker sw.js + manifest: instalable y sin conexión).
                                    Sin definir o false: no hay PWA y se borran el service worker y las cachés antiguas.
     window.isSingleGame = true  → el juego va solo (p. ej. dentro de una app Android): sin botón a la portada,
                                    sin favoritos ni estadísticas; el botón Atrás del mando no sale del juego.
                                    Sin definir o false (por defecto): 🏠 a la portada, favoritos y estadísticas.
   jugadoresMax: máximo de jugadores por turnos en modo TV (1–4).
   rondasMultijugador: rondas (un nivel por turno) en los juegos con niveles. */
var ARCADE_CONFIG = {
  modo: 'automatico',
  idioma: 'auto',
  jugadoresMax: 4,
  rondasMultijugador: 5,
};

function arcadeTVDetectado() {
  return /AFT[A-Z0-9]|Android ?TV|GoogleTV|Google TV|SmartTV|SMART-TV|BRAVIA|Tizen|Web0S|webOS|NetCast|HbbTV|CrKey|AppleTV|Philips|Hisense|VIDAA|Roku|Opera TV|Silk.*AFT/i.test(navigator.userAgent || '');
}
function arcadeEsTV() {
  var m = ARCADE_CONFIG.modo;
  if (m === 'modotv') return true;
  if (m === 'modonormal') return false;
  // ?tv=1 / ?tv=0 solo vale para la página que lo lleva (antes se guardaba en la sesión y ya no se podía salir del modo TV)
  var q = /[?&]tv=([01])/.exec(location.search || '');
  try { sessionStorage.removeItem('arc_tv_sess'); } catch (e) {}
  if (q) return q[1] === '1';
  if (m === 'seleccionable') {
    try { var v = localStorage.getItem('arc_tvmode'); if (v !== null) return v === '1'; } catch (e) {}
  }
  return arcadeTVDetectado();
}
function arcadeElegirTV(on) {
  try { localStorage.setItem('arc_tvmode', on ? '1' : '0'); sessionStorage.removeItem('arc_tv_sess'); } catch (e) {}
}

function arcadeIdioma() {
  var c = ARCADE_CONFIG.idioma;
  if (c === 'es' || c === 'en') return c;
  var site = window.ARCADE_SITE;   // web PHP: /pivote/en fuerza el idioma (sin guardarlo)
  if (site && (site.lang === 'es' || site.lang === 'en')) return site.lang;
  var q = /[?&]lang=(es|en)/.exec(location.search || '');
  if (q) { try { localStorage.setItem('arc_lang', q[1]); } catch (e) {} return q[1]; }
  try { var v = localStorage.getItem('arc_lang'); if (v === 'es' || v === 'en') return v; } catch (e) {}
  var l = (navigator.languages && navigator.languages[0]) || navigator.language || 'es';
  return /^(es|ca|gl|eu)\b/i.test(l) ? 'es' : 'en';
}
function arcadeElegirIdioma(l) {
  try { localStorage.setItem('arc_lang', l); } catch (e) {}
  try { document.cookie = 'arc_lang=' + l + ';path=/;max-age=63072000;SameSite=Lax'; } catch (e) {}
}

/* PWA: solo con window.withpwa = true (y servida por http/https). El service worker es «red primero»: con conexión
   siempre carga lo último y solo usa la caché sin conexión, así nunca mezcla versiones. */
function arcadePWA() {
  var on = window.withpwa === true && /^https?:/.test(location.protocol) && 'serviceWorker' in navigator;
  try {
    if (on) { navigator.serviceWorker.register('sw.js').catch(function () {}); return; }
    var scope = new URL('./', document.baseURI).href;   // solo el de esta carpeta (no toca otras apps del mismo dominio)
    if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { if (r.scope === scope) r.unregister(); }); }).catch(function () {});
    if (window.caches) caches.keys().then(function (ks) { ks.filter(function (k) { return /^arcade-perdido-/.test(k); }).forEach(function (k) { caches.delete(k); }); }).catch(function () {});
    var m = document.querySelector('link[rel=manifest]'); if (m) m.parentNode.removeChild(m);
  } catch (e) {}
}
