/*!
 * juegoaleatorio.js — intersticial con un juego de JuegosBoom al azar: deja jugar tres niveles y luego invita a seguir
 * en juegosboom.com. Al cerrarlo queda una barra abajo que va pasando los nombres de los juegos, cada uno con su enlace.
 *
 *   <script src="https://juegosboom.com/bannergames/juegoaleatorio.js?lang=es" async></script>
 *
 * Parámetros (en la URL del script o como data-… en la etiqueta), todos opcionales:
 *   lang          es | en (si no se pone: el idioma de la página)
 *   niveles       cuántos niveles se dejan jugar (3)
 *   coleccion     solo juegos de esas colecciones, separadas por comas: main, pro, mesa, soli, orientales
 *   juegos        solo esos juegos (ids separados por comas, p. ej. atasco,jarras,sudoku)
 *   delay         segundos hasta que sale (3)
 *   horas         cada cuántas horas puede volver a salir a pantalla completa; antes sale ya la barra (12)
 *   cerrado       horas sin salir nada si cierran la barra con ✕ (24)
 * La lista de juegos es juegos.json, junto a este archivo (la genera herramientas/bannergames_playable.php).
 * Para probar: ?bgreset=1 en la dirección de la página olvida lo que recuerda.
 */
(function () {
  'use strict';
  const script = document.currentScript || [...document.getElementsByTagName('script')].reverse().find((s) => /juegoaleatorio(\.min)?\.js/.test(s.src));
  if (!script || window.__juegoaleatorio) return;
  window.__juegoaleatorio = true;
  const src = new URL(script.src, location.href), Q = src.searchParams, ds = script.dataset;
  const opt = (k, d) => Q.get(k) || ds[k] || d;
  const LANG = String(opt('lang', document.documentElement.lang || navigator.language || 'es')).slice(0, 2).toLowerCase() === 'en' ? 'en' : 'es';
  const NLV = Math.max(1, Math.min(20, +opt('niveles', 3) || 3));
  const COLS = String(opt('coleccion', '')).split(',').map((s) => s.trim()).filter(Boolean);
  const ONLY = String(opt('juegos', '')).split(',').map((s) => s.trim()).filter(Boolean);
  const DELAY = +opt('delay', 3), EVERY = +opt('horas', 12), CLOSED = +opt('cerrado', 24), H = 3600e3;
  const BASE = src.href.replace(/[^/]*$/, '');
  const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(src.hostname);   // pruebas en local: los juegos del servidor de pruebas

  const K = 'juegoaleatorio:';
  const get = (k) => { try { return localStorage.getItem(K + k) || ''; } catch (e) { return ''; } };
  const put = (k, v) => { try { localStorage.setItem(K + k, String(v)); } catch (e) { /* sin almacenamiento */ } };
  if (/[?&]bgreset=1/.test(location.search)) { try { Object.keys(localStorage).filter((k) => k.startsWith(K)).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* nada */ } }

  const TX = {
    es: { brand: 'JuegosBoom', level: 'Nivel {a} de {b}', loading: 'Cargando el juego…', other: '🎲 Otro', close: 'Cerrar', later: 'Seguir leyendo',
      cta: 'Jugar gratis en JuegosBoom ▶', cleared: '🎉 ¡Nivel {a} superado! Ahora el {b} de {c}',
      endTitle: '¡Has superado {n} niveles!', endSub: '¿Quieres seguir jugando? Te quedan {n} niveles más de {g}.', endSubAll: '¿Quieres seguir jugando? Hay cientos de juegos más.',
      endCta: 'Seguir jugando ▶', otherGame: '🎲 Probar otro juego', overTitle: '¡Casi!', overSub: 'Te has quedado en el nivel {a} de {b}.', again: '🔄 Otra vez',
      play: 'Jugar ▶', ticker: '🎮 Juegos gratis' },
    en: { brand: 'JuegosBoom', level: 'Level {a} of {b}', loading: 'Loading the game…', other: '🎲 Another', close: 'Close', later: 'Keep reading',
      cta: 'Play free on JuegosBoom ▶', cleared: '🎉 Level {a} cleared! Now level {b} of {c}',
      endTitle: 'You cleared {n} levels!', endSub: 'Want to keep playing? {g} has {n} more levels.', endSubAll: 'Want to keep playing? There are hundreds more games.',
      endCta: 'Keep playing ▶', otherGame: '🎲 Try another game', overTitle: 'So close!', overSub: 'You got to level {a} of {b}.', again: '🔄 Again',
      play: 'Play ▶', ticker: '🎮 Free games' },
  }[LANG];
  const fmt = (s, o) => String(s).replace(/\{(\w)\}/g, (_, k) => (o[k] != null ? o[k] : ''));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  if (Date.now() - (+get('closed') || 0) < CLOSED * H) return;   // cerraron la barra hace poco
  fetch(BASE + 'juegos.json', { mode: 'cors', credentials: 'omit' })
    .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(start)
    .catch((e) => console.warn('juegoaleatorio: no se pudo cargar juegos.json', e));

  function start(J) {
    let games = (J.games || []).filter((g) => (!COLS.length || COLS.includes(g.c)) && (!ONLY.length || ONLY.includes(g.id)));
    if (!games.length) return console.warn('juegoaleatorio: ningún juego con esos filtros');
    const SITE = LOCAL ? src.origin : (J.site || 'https://juegosboom.com');
    // el juego dentro del intersticial va siempre con su idioma en la dirección (/<id>/es); el botón, a la página normal
    const gameUrl = (g, extra) => { const u = new URL(SITE + '/' + g.id + (LANG === 'en' ? '/en' : extra ? '/es' : '')); if (extra) u.search = extra; return u; };
    const ctaUrl = (g) => { const u = gameUrl(g); if (!LOCAL) { u.searchParams.set('utm_source', location.hostname || 'web'); u.searchParams.set('utm_medium', 'juegoaleatorio'); u.searchParams.set('utm_campaign', g.id); } return u.href; };
    const title = (g) => g.t[LANG] || g.t.es;
    const pick = () => { const last = get('last'); let g; do { g = games[Math.floor(Math.random() * games.length)]; } while (games.length > 1 && g.id === last); put('last', g.id); return g; };

    // ---------- interfaz en un Shadow DOM ----------
    const host = document.createElement('div');
    host.setAttribute('data-juegoaleatorio', '');
    host.style.cssText = 'all:initial;position:fixed;z-index:2147483000;inset:auto;';
    const root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    root.innerHTML = `<style>
      :host{all:initial}
      *{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-tap-highlight-color:transparent}
      .ov{position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(8,8,14,.74);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);opacity:0;transition:opacity .25s}
      .ov.on{display:flex}.ov.vis{opacity:1}
      .card{--b1:#2b2f36;--b2:#14161a;position:relative;width:min(460px,100%);height:min(860px,calc(100vh - 32px));height:min(860px,calc(100dvh - 32px));display:flex;flex-direction:column;border-radius:22px;overflow:hidden;
        background:linear-gradient(var(--b1),var(--b2));box-shadow:0 24px 70px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.08);transform:scale(.92);transition:transform .3s cubic-bezier(.2,1.4,.4,1)}
      .ov.vis .card{transform:none}
      @media (max-width:767px){.ov{padding:0}.card{width:100%;height:100%;border-radius:0}}
      .top{display:flex;align-items:center;gap:8px;padding:8px 8px 8px 14px;color:#fff;font-weight:800}
      .tt{flex:1;min-width:0;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .lv{flex:none;padding:5px 10px;border-radius:99px;background:rgba(255,255,255,.16);font-size:13px;font-weight:800;white-space:nowrap}
      .ob{flex:none;height:34px;padding:0 10px;border-radius:99px;border:0;background:rgba(255,255,255,.14);color:#fff;font-size:13px;font-weight:800;cursor:pointer}
      .x{flex:none;width:36px;height:36px;border-radius:50%;border:0;background:rgba(255,255,255,.14);color:#fff;font-size:18px;line-height:36px;cursor:pointer}
      .x:hover,.ob:hover{background:rgba(255,255,255,.26)}
      .body{flex:1;min-height:0;position:relative;background:#000}
      .body iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:#000}
      .ld{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#fff;font-weight:800;font-size:16px;background:linear-gradient(var(--b1),var(--b2));transition:opacity .4s}
      .ld b{font-size:64px;animation:bob 1s ease-in-out infinite alternate}.ld.gone{opacity:0;pointer-events:none}
      .hint,.toast{position:absolute;left:10px;right:10px;padding:9px 12px;border-radius:12px;background:rgba(0,0,0,.76);color:#fff;font-size:14px;font-weight:700;line-height:1.3;text-align:center;pointer-events:none;transition:opacity .5s,transform .5s}
      .hint{top:10px}.toast{top:42%;font-size:18px;padding:14px;background:rgba(0,0,0,.82)}
      .gone{opacity:0}.hint.gone{transform:translateY(-10px)}.toast.gone{transform:scale(.9)}
      .pc{position:absolute;inset:0;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.55);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)}
      .pc.on{display:flex;animation:fade .3s}
      .pcc{width:100%;max-width:340px;padding:22px 18px 16px;border-radius:20px;text-align:center;background:linear-gradient(var(--b1),var(--b2));box-shadow:0 16px 50px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.12);animation:pop .35s cubic-bezier(.2,1.4,.4,1)}
      .pcc .em{font-size:58px;line-height:1}.pcc h3{margin:8px 0 4px;color:#fff;font-size:24px;font-weight:900}.pcc p{margin:0 0 14px;color:#eee;font-size:15px;line-height:1.35}
      .cta{display:flex;align-items:center;justify-content:center;height:52px;padding:0 12px;border-radius:16px;background:#ffd43b;color:#2b1a0e;font-weight:900;font-size:18px;text-decoration:none;text-align:center;
        box-shadow:0 6px 0 rgba(0,0,0,.25);animation:pulse 1.6s infinite}
      .cta:active{transform:translateY(3px);box-shadow:0 3px 0 rgba(0,0,0,.25)}
      @keyframes pulse{0%{box-shadow:0 6px 0 rgba(0,0,0,.25),0 0 0 0 #ffd43baa}70%{box-shadow:0 6px 0 rgba(0,0,0,.25),0 0 0 14px #ffd43b00}100%{box-shadow:0 6px 0 rgba(0,0,0,.25),0 0 0 0 #ffd43b00}}
      .lnk{display:block;margin:8px auto 0;background:none;border:0;color:#ddd;font-size:15px;padding:6px;cursor:pointer;text-decoration:underline}
      .foot{padding:10px 14px 12px;display:flex;flex-direction:column;gap:2px}
      .foot .lnk{margin-top:2px;font-size:14px}
      .bar{position:fixed;left:8px;right:8px;bottom:8px;bottom:calc(8px + env(safe-area-inset-bottom));max-width:720px;margin:0 auto;display:none;align-items:center;gap:10px;padding:7px 7px 7px 12px;border-radius:16px;
        background:linear-gradient(90deg,#2b1f5c,#14102e);box-shadow:0 8px 30px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.1);animation:up .35s ease-out}
      .bar.on{display:flex}
      .bl{flex:none;color:#ffd43b;font-weight:900;font-size:13px;line-height:1.1;max-width:74px}
      .tk{flex:1;min-width:0;height:40px;position:relative;overflow:hidden}
      .tk a{position:absolute;inset:0;display:flex;align-items:center;gap:8px;color:#fff;font-weight:800;font-size:16px;text-decoration:none;transition:transform .45s cubic-bezier(.3,1.2,.5,1),opacity .45s}
      .tk a span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tk a b{font-size:24px;flex:none}
      .tk a.in{transform:translateY(100%);opacity:0}.tk a.out{transform:translateY(-100%);opacity:0}
      .bar .cta{height:40px;font-size:15px;border-radius:12px;flex:none;animation:none;padding:0 14px}
      .bar .x{width:30px;height:30px;line-height:30px;font-size:14px}
      @keyframes pop{from{transform:scale(.8);opacity:0}}@keyframes up{from{transform:translateY(120%)}}@keyframes bob{to{transform:translateY(-10px)}}@keyframes fade{from{opacity:0}}
      @media (prefers-reduced-motion:reduce){.cta{animation:none}}
    </style>
    <div class="ov" role="dialog" aria-modal="true" aria-label="${esc(TX.brand)}">
      <div class="card"><div class="top"><span class="tt"></span><span class="lv"></span><button class="ob" data-a="other">${esc(TX.other)}</button><button class="x" data-a="close" aria-label="${esc(TX.close)}">✕</button></div>
        <div class="body"><div class="ld"><b></b><span>${esc(TX.loading)}</span></div><div class="hint gone"></div><div class="toast gone"></div>
          <div class="pc"><div class="pcc"><div class="em"></div><h3></h3><p></p><a class="cta" target="_blank" rel="noopener"></a><button class="lnk" data-a=""></button></div></div></div>
        <div class="foot"><a class="cta fcta" target="_blank" rel="noopener">${esc(TX.cta)}</a><button class="lnk" data-a="close">${esc(TX.later)}</button></div></div>
    </div>
    <div class="bar" role="complementary" aria-label="${esc(TX.ticker)}"><span class="bl">${esc(TX.ticker)}</span><div class="tk"></div><a class="cta bcta" target="_blank" rel="noopener">${esc(TX.play)}</a><button class="x" data-a="bye" aria-label="${esc(TX.close)}">✕</button></div>`;
    (document.body || document.documentElement).appendChild(host);
    const $ = (s) => root.querySelector(s);
    const ov = $('.ov'), card = $('.card'), body = $('.body'), ld = $('.ld'), hint = $('.hint'), toast = $('.toast'), pc = $('.pc'), bar = $('.bar');
    let G = null, ifr = null, ready = false, lvl = 1, done = 0, hintT = 0, toastT = 0, mode = 'off', prevOverflow = null;
    const lock = (on) => { const s = document.documentElement.style; if (on) { if (prevOverflow === null) prevOverflow = s.overflow; s.overflow = 'hidden'; } else if (prevOverflow !== null) { s.overflow = prevOverflow; prevOverflow = null; } };
    const post = (m) => { try { ifr && ifr.contentWindow.postMessage({ bannergames: m }, '*'); } catch (e) { /* nada */ } };
    const setLv = () => { $('.lv').textContent = fmt(TX.level, { a: Math.min(lvl, NLV), b: NLV }); };
    const noHint = () => { hint.classList.add('gone'); clearTimeout(hintT); };

    function load(g) {
      G = g; ready = false; lvl = 1; done = 0;
      if (ifr) ifr.remove();
      pc.classList.remove('on'); toast.classList.add('gone'); noHint();
      card.style.setProperty('--b1', g.bg[0]); card.style.setProperty('--b2', g.bg[1]);
      $('.tt').textContent = g.e + ' ' + title(g); ld.querySelector('b').textContent = g.e; ld.classList.remove('gone');
      hint.textContent = (g.h && g.h[LANG]) || ''; $('.fcta').href = ctaUrl(g); setLv();
      ifr = document.createElement('iframe'); ifr.title = title(g);
      ifr.src = gameUrl(g, 'playable=1').href;
      ifr.setAttribute('allow', 'autoplay; fullscreen; gamepad'); ifr.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      body.insertBefore(ifr, body.firstChild);
      setTimeout(() => ld.classList.add('gone'), 12000);   // por si el juego no avisa
    }
    function endCard(kind) {
      noHint(); toast.classList.add('gone');
      const left = G.lv - done;
      pc.querySelector('.em').textContent = kind === 'end' ? '🏆' : '😅';
      pc.querySelector('h3').textContent = kind === 'end' ? fmt(TX.endTitle, { n: done }) : TX.overTitle;
      pc.querySelector('p').textContent = kind === 'end' ? (left > 0 ? fmt(TX.endSub, { n: left, g: title(G) }) : TX.endSubAll) : fmt(TX.overSub, { a: lvl, b: NLV });
      const a = pc.querySelector('.cta'); a.href = ctaUrl(G); a.textContent = kind === 'end' ? TX.endCta : TX.cta;
      const b = pc.querySelector('.lnk'); b.dataset.a = kind === 'end' ? 'other' : 'retry'; b.textContent = kind === 'end' ? TX.otherGame : TX.again;
      pc.classList.add('on');
      setTimeout(() => a.focus({ preventScroll: true }), 60);
    }
    addEventListener('message', (e) => {
      const m = e.data; if (!ifr || e.source !== ifr.contentWindow || !m || typeof m.bannergames !== 'string') return;
      if (m.bannergames === 'ready') {
        ready = true; ld.classList.add('gone');
        if (hint.textContent) { hint.classList.remove('gone'); clearTimeout(hintT); hintT = setTimeout(noHint, 7000); }
      } else if (m.bannergames === 'win') {
        done++; noHint();
        if (done >= NLV || done >= G.lv) return void setTimeout(() => endCard('end'), 1300);
        toast.textContent = fmt(TX.cleared, { a: lvl, b: lvl + 1, c: NLV }); toast.classList.remove('gone');
        clearTimeout(toastT); toastT = setTimeout(() => { toast.classList.add('gone'); lvl++; setLv(); post('next'); }, 1900);
      } else if (m.bannergames === 'over') setTimeout(() => endCard('over'), 900);
    });
    addEventListener('blur', () => setTimeout(() => { if (ifr && document.activeElement === host) noHint(); }, 0));   // al tocar el juego se quita el aviso

    // ---------- barra de abajo: va pasando los juegos ----------
    let tkT = 0, tkI = 0, order = null;
    function tick() {
      if (!order) { order = games.slice().sort(() => Math.random() - 0.5); if (G) order = [G].concat(order.filter((x) => x !== G)); }
      const g = order[tkI++ % order.length], tk = $('.tk'), old = tk.querySelector('a:not(.out)');
      const a = document.createElement('a'); a.href = ctaUrl(g); a.target = '_blank'; a.rel = 'noopener'; a.className = 'in';
      a.innerHTML = `<b>${esc(g.e)}</b><span>${esc(title(g))}</span>`; tk.appendChild(a);
      requestAnimationFrame(() => requestAnimationFrame(() => a.classList.remove('in')));
      if (old) { old.classList.add('out'); setTimeout(() => old.remove(), 500); }
      $('.bcta').href = a.href;
    }
    function set(m) {
      mode = m;
      ov.classList.toggle('on', m === 'full'); bar.classList.toggle('on', m === 'bar');
      if (m === 'full') { requestAnimationFrame(() => ov.classList.add('vis')); lock(true); } else { ov.classList.remove('vis'); lock(false); }
      clearInterval(tkT);
      if (m === 'bar') { if (ifr) { ifr.remove(); ifr = null; } tick(); tkT = setInterval(() => { if (!document.hidden) tick(); }, 3200); }
    }
    root.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      if (e.target === ov) return set('bar');
      const a = e.target.closest('[data-a]'); if (!a) return;
      const k = a.dataset.a;
      if (k === 'close') set('bar');
      else if (k === 'other') load(pick());
      else if (k === 'retry') { pc.classList.remove('on'); post('retry'); try { ifr.focus(); } catch (er) { /* nada */ } }
      else if (k === 'bye') { put('closed', Date.now()); set('off'); host.remove(); }
    });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && mode === 'full') set('bar'); });

    const recently = Date.now() - (+get('seen') || 0) < EVERY * H;
    setTimeout(() => { if (recently) return set('bar'); put('seen', Date.now()); load(pick()); set('full'); }, Math.max(0, (recently ? 1 : DELAY) * 1000));
  }
})();
