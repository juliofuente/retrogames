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
   (se recuerda durante la sesión).
   idioma:
     'auto' → detecta el idioma del navegador o la tele (español si es es/ca/gl/eu; si no, inglés)
              y muestra un botón 🇪🇸 / 🇬🇧 para cambiarlo (se recuerda en el dispositivo).
     'es'   → siempre en español (sin botón).
     'en'   → siempre en inglés (sin botón).
   También se puede forzar con ?lang=es o ?lang=en en la URL.
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
  var q = /[?&]tv=([01])/.exec(location.search || '');
  try {
    if (q) sessionStorage.setItem('arc_tv_sess', q[1]);
    else { var ss = sessionStorage.getItem('arc_tv_sess'); if (ss !== null) q = [0, ss]; }
  } catch (e) {}
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
  var q = /[?&]lang=(es|en)/.exec(location.search || '');
  if (q) { try { localStorage.setItem('arc_lang', q[1]); } catch (e) {} return q[1]; }
  try { var v = localStorage.getItem('arc_lang'); if (v === 'es' || v === 'en') return v; } catch (e) {}
  var l = (navigator.languages && navigator.languages[0]) || navigator.language || 'es';
  return /^(es|ca|gl|eu)\b/i.test(l) ? 'es' : 'en';
}
function arcadeElegirIdioma(l) {
  try { localStorage.setItem('arc_lang', l); } catch (e) {}
}
