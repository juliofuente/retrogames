/*!
 * bannergames.js — intersticial con un reto animado (como los vídeos) para poner en cualquier web.
 *
 *   <script src="https://juegosboom.com/bannergames/bannergames.js?profile=cerillas&lang=es" async></script>
 *
 * Parámetros (en la URL del script o como data-profile / data-lang en la etiqueta):
 *   profile  (obligatorio) el perfil: se carga <carpeta del script>/<profile>.json  (p. ej. cerillas.json)
 *   lang     es | en  (si no se pone: el idioma de la página)
 * Todo lo demás (dirección del juego, textos, colores, retraso, frecuencia, retos) va en el .json del perfil.
 *
 * Qué hace: a los pocos segundos abre un intersticial con un reto que se resuelve solo (cuenta atrás y solución
 * animada) y un botón para jugar. Al cerrarlo se minimiza: en ordenador queda jugando en bucle en una ventanita fija
 * arriba a la derecha; en móvil queda una barra fija abajo con el botón (sin animación, para no tapar la página).
 * Con la ✕ de la ventanita o de la barra se quita del todo durante unas horas. Para probar: añade ?bgreset=1 a la
 * dirección de la página y se olvida lo que recuerda (frecuencia y cierres).
 * Va dentro de un Shadow DOM: no le afectan los estilos de la web ni los cambia.
 *
 * Perfiles «playable» (los juegos que no caben en un reto animado): el intersticial lleva el juego de verdad en un
 * iframe (<juego>?playable=1), empieza directamente en un nivel y, al superarlo o perder, sale el botón para jugar al
 * juego entero. Minimizado no se juega: en ordenador queda una ventanita con el juego en pausa y su botón; en móvil, la barra.
 */
(function () {
  'use strict';
  const script = document.currentScript || [...document.getElementsByTagName('script')].reverse().find((s) => /bannergames(\.min)?\.js/.test(s.src));
  if (!script) return;
  const src = new URL(script.src, location.href), Q = src.searchParams;
  const profile = String(Q.get('profile') || script.dataset.profile || '').replace(/[^a-z0-9_-]/gi, '');
  if (!profile) return console.warn('bannergames: falta ?profile=');
  window.__bannergames = window.__bannergames || {};
  if (window.__bannergames[profile]) return;
  window.__bannergames[profile] = true;
  const LANG = String(Q.get('lang') || script.dataset.lang || document.documentElement.lang || navigator.language || 'es').slice(0, 2).toLowerCase();
  const BASE = src.href.replace(/[^/]*$/, '');

  // ---------- recuerdo (frecuencia y cierres): por navegador, puede fallar y no pasa nada ----------
  const K = 'bannergames:' + profile + ':';
  const get = (k) => { try { return +localStorage.getItem(K + k) || 0; } catch (e) { return 0; } };
  const put = (k, v) => { try { localStorage.setItem(K + k, String(v)); } catch (e) { /* sin almacenamiento */ } };
  if (/[?&]bgreset=1/.test(location.search)) { try { Object.keys(localStorage).filter((k) => k.startsWith(K)).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* nada */ } }

  fetch(BASE + profile + '.json', { mode: 'cors', credentials: 'omit' })
    .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(start)
    .catch((e) => console.warn('bannergames: no se pudo cargar ' + profile + '.json', e));

  function start(D) {
    const now = Date.now(), H = 3600e3;
    if (now - get('closed') < (D.closed_hours || 24) * H) return;              // lo cerraron del todo hace poco
    // idioma: el pedido si el perfil lo tiene (textos y, en los retos de preguntas, preguntas); si no, el primero que haya
    const L_ = D.texts[LANG] && (!D.items || D.items[LANG]) ? LANG : D.items ? Object.keys(D.items)[0] : D.texts.es ? 'es' : Object.keys(D.texts)[0];
    const T = D.texts[L_]; D.lang = L_;
    const C = Object.assign({ bg1: '#4a2c17', bg2: '#1f130a', accent: '#ff922b', cta: '#ffd43b', ctaText: '#2b1a0e' }, D.colors || {});
    const pick = (v) => (v && typeof v === 'object' ? v[L_] || v[Object.keys(v)[0]] : v);   // url y play pueden ir por idioma
    D.url = pick(D.url); D.play = pick(D.play);
    const URL_ = (() => { try { const u = new URL(D.url, location.href); if (!u.searchParams.has('utm_source')) { u.searchParams.set('utm_source', location.hostname || 'web'); u.searchParams.set('utm_medium', 'bannergames'); u.searchParams.set('utm_campaign', profile); } return u.href; } catch (e) { return D.url; } })();
    const scene = SCENES[D.type] ? SCENES[D.type](D, T, C, URL_) : null;
    if (!scene) return console.warn('bannergames: tipo desconocido ' + D.type);
    const ui = buildUI(T, C, URL_, scene);
    const recently = now - get('seen') < (D.every_hours || 12) * H;
    setTimeout(() => (recently ? ui.minimize() : (put('seen', Date.now()), ui.full())), Math.max(0, (recently ? 1 : D.delay || 3) * 1000));
  }

  // ======================================================================
  // Interfaz: intersticial, ventanita (ordenador) y barra (móvil), en un Shadow DOM
  // ======================================================================
  function buildUI(T, C, URL_, scene) {
    const host = document.createElement('div');
    host.setAttribute('data-bannergames', '');
    host.style.cssText = 'all:initial;position:fixed;z-index:2147483000;inset:auto;';
    const root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    root.innerHTML = `<style>
      :host{all:initial}
      *{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-tap-highlight-color:transparent}
      .ov{position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(12,8,5,.72);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);opacity:0;transition:opacity .25s}
      .ov.on{display:flex}.ov.vis{opacity:1}
      .card{position:relative;width:min(440px,100%);height:min(720px,calc(100vh - 32px));height:min(720px,calc(100dvh - 32px));display:flex;flex-direction:column;border-radius:22px;overflow:hidden;
        background:linear-gradient(${C.bg1},${C.bg2});box-shadow:0 24px 70px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.08);transform:scale(.92);transition:transform .3s cubic-bezier(.2,1.4,.4,1)}
      .ov.vis .card{transform:none}
      .top{display:flex;align-items:center;justify-content:space-between;padding:12px 12px 0 18px;color:#fff3d6;font-weight:800;font-size:15px;letter-spacing:.02em}
      .cv{flex:1;min-height:0;position:relative;cursor:pointer}.cv canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
      .foot{padding:12px 16px 16px;display:flex;flex-direction:column;gap:8px}
      .cta{display:flex;align-items:center;justify-content:center;height:56px;border-radius:16px;background:${C.cta};color:${C.ctaText};font-weight:900;font-size:20px;text-decoration:none;
        box-shadow:0 6px 0 rgba(0,0,0,.25),0 0 0 0 ${C.cta}88;animation:pulse 1.6s infinite}
      .cta:active{transform:translateY(3px);box-shadow:0 3px 0 rgba(0,0,0,.25)}
      @keyframes pulse{0%{box-shadow:0 6px 0 rgba(0,0,0,.25),0 0 0 0 ${C.cta}aa}70%{box-shadow:0 6px 0 rgba(0,0,0,.25),0 0 0 14px ${C.cta}00}100%{box-shadow:0 6px 0 rgba(0,0,0,.25),0 0 0 0 ${C.cta}00}}
      .later{background:none;border:0;color:#d8c4a8;font-size:14px;padding:6px;cursor:pointer;text-decoration:underline}
      .x{width:36px;height:36px;border-radius:50%;border:0;background:rgba(255,255,255,.14);color:#fff;font-size:18px;line-height:36px;cursor:pointer}
      .x:hover{background:rgba(255,255,255,.26)}
      .mini{position:fixed;top:16px;right:16px;width:300px;height:330px;display:none;flex-direction:column;border-radius:16px;overflow:hidden;background:linear-gradient(${C.bg1},${C.bg2});
        box-shadow:0 12px 40px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.1);animation:pop .3s ease-out}
      .mini.on{display:flex}
      .mh{display:flex;align-items:center;gap:6px;padding:8px 8px 0 12px;color:#fff3d6;font-weight:800;font-size:13px}.mh span{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .mh button{width:28px;height:28px;border-radius:50%;border:0;background:rgba(255,255,255,.14);color:#fff;font-size:14px;cursor:pointer}
      .mini .cv{flex:1}.mini .cta{height:40px;font-size:15px;margin:0 10px 10px;border-radius:12px;animation:none;box-shadow:0 4px 0 rgba(0,0,0,.25)}
      .bar{position:fixed;left:8px;right:8px;bottom:8px;bottom:calc(8px + env(safe-area-inset-bottom));display:none;align-items:center;gap:10px;padding:8px 8px 8px 14px;border-radius:16px;
        background:linear-gradient(90deg,${C.bg1},${C.bg2});box-shadow:0 8px 30px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.1);animation:up .35s ease-out;cursor:pointer}
      .bar.on{display:flex}
      .bt{flex:1;color:#fff3d6;font-weight:800;font-size:14px;line-height:1.2}
      .bar .cta{height:42px;padding:0 18px;font-size:16px;border-radius:12px;flex:none}
      .bar .x{width:30px;height:30px;line-height:30px;font-size:14px;flex:none}
      @keyframes pop{from{transform:scale(.8);opacity:0}}@keyframes up{from{transform:translateY(120%)}}
      .card.play{width:min(460px,100%);height:min(860px,calc(100vh - 32px));height:min(860px,calc(100dvh - 32px))}
      .card.play .top{padding:8px 8px 8px 16px}.card.play .cv{cursor:default;background:#000}
      .card.play .foot{padding:10px 14px 12px;gap:4px}.card.play .foot .cta{height:50px;font-size:18px}
      @media (max-width:767px){.ov.play{padding:0}.card.play{width:100%;height:100%;border-radius:0}}
      .pw{position:absolute;inset:0}.pw iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:#000}
      .ld{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#fff3d6;font-weight:800;font-size:16px;background:linear-gradient(${C.bg1},${C.bg2});transition:opacity .4s}
      .ld b{font-size:64px;animation:bob 1s ease-in-out infinite alternate}.ld.gone{opacity:0;pointer-events:none}
      .hint{position:absolute;left:10px;right:10px;top:10px;padding:9px 12px;border-radius:12px;background:rgba(0,0,0,.72);color:#fff;font-size:14px;font-weight:700;line-height:1.3;text-align:center;pointer-events:none;transition:opacity .6s,transform .6s}
      .hint.gone{opacity:0;transform:translateY(-10px)}
      .pc{position:absolute;inset:0;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.55);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)}
      .pc.on{display:flex;animation:fade .3s}
      .pcc{width:100%;max-width:340px;padding:22px 18px 16px;border-radius:20px;text-align:center;background:linear-gradient(${C.bg1},${C.bg2});box-shadow:0 16px 50px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.12);animation:pop .35s cubic-bezier(.2,1.4,.4,1)}
      .pcc .em{font-size:58px;line-height:1}.pcc h3{margin:8px 0 4px;color:#fff;font-size:24px;font-weight:900}.pcc p{margin:0 0 14px;color:#f0e2c8;font-size:15px;line-height:1.35}
      .pcc .cta{height:54px;font-size:19px}.pcc .later{margin-top:6px}
      @keyframes bob{to{transform:translateY(-10px)}}@keyframes fade{from{opacity:0}}
      @media (prefers-reduced-motion:reduce){.cta{animation:none}}
    </style>
    <div class="ov" role="dialog" aria-modal="true" aria-label="${esc(T.brand)}">
      <div class="card"><div class="top"><span>${esc(T.brand)}</span><button class="x" data-a="min" aria-label="${esc(T.close)}">✕</button></div>
        <div class="cv" data-slot="full"></div>
        <div class="foot"><a class="cta" href="${esc(URL_)}" target="_blank" rel="noopener">${esc(T.cta)}</a><button class="later" data-a="min">${esc(T.later)}</button></div></div>
    </div>
    <div class="mini" role="complementary" aria-label="${esc(T.mini)}"><div class="mh"><span>${esc(T.brand)}</span><button data-a="full" aria-label="${esc(T.expand)}">⤢</button><button data-a="close" aria-label="${esc(T.close)}">✕</button></div>
      <div class="cv" data-slot="mini"></div><a class="cta" href="${esc(URL_)}" target="_blank" rel="noopener">${esc(T.cta)}</a></div>
    <div class="bar" role="complementary" data-a="full"><span class="bt">${esc(T.bar)}</span><a class="cta" href="${esc(URL_)}" target="_blank" rel="noopener">${esc(T.barCta)}</a><button class="x" data-a="close" aria-label="${esc(T.close)}">✕</button></div>`;
    (document.body || document.documentElement).appendChild(host);
    const $ = (s) => root.querySelector(s), ov = $('.ov'), mini = $('.mini'), bar = $('.bar');
    const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true');
    const live = scene.el || null;   // perfiles jugables: el juego (iframe) vive siempre en el intersticial; el canvas solo en la ventanita
    if (live) { $('.card').classList.add('play'); ov.classList.add('play'); $('[data-slot="full"]').appendChild(live); }
    let mode = 'off', prevOverflow = null;
    const desktop = () => matchMedia('(min-width: 768px) and (hover: hover)').matches || innerWidth >= 1024;
    const place = (slot) => { const el = root.querySelector('[data-slot="' + slot + '"]'); if (el && canvas.parentNode !== el) el.appendChild(canvas); };
    const lock = (on) => { const s = document.documentElement.style; if (on) { if (prevOverflow === null) prevOverflow = s.overflow; s.overflow = 'hidden'; } else if (prevOverflow !== null) { s.overflow = prevOverflow; prevOverflow = null; } };
    function set(m) {
      mode = m; ov.classList.toggle('on', m === 'full'); mini.classList.toggle('on', m === 'mini'); bar.classList.toggle('on', m === 'bar');
      if (m === 'full') { if (!live) place('full'); requestAnimationFrame(() => ov.classList.add('vis')); lock(true); setTimeout(() => { const b = $('.ov .cta'); if (b) b.focus({ preventScroll: true }); }, 50); } else { ov.classList.remove('vis'); lock(false); }
      if (m === 'mini') place('mini');
      if (live) { scene.active(m === 'full'); scene.run(m === 'mini', canvas); } else scene.run(m === 'full' || m === 'mini', canvas);
    }
    const minimize = () => set(desktop() ? 'mini' : 'bar');
    root.addEventListener('click', (e) => {
      const a = e.target.closest('[data-a]'); if (e.target.closest('a')) return;   // los botones de jugar abren la web
      if (e.target === ov) return minimize();                                       // clic fuera de la tarjeta
      if (!a && e.target.closest('.cv') && !(live && mode === 'full')) return void window.open(URL_, '_blank', 'noopener');   // tocar el reto también lleva a jugar
      if (!a) return;
      if (a.dataset.a === 'retry') return scene.retry && scene.retry();
      if (a.dataset.a === 'min') minimize();
      else if (a.dataset.a === 'full') set('full');
      else if (a.dataset.a === 'close') { put('closed', Date.now()); set('off'); host.remove(); }
    });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && mode === 'full') minimize(); });
    addEventListener('resize', () => { if (mode === 'mini' && !desktop()) set('bar'); else if (mode === 'bar' && desktop()) set('mini'); });
    return { full: () => set('full'), minimize };
  }

  // ======================================================================
  // Escenas: cada tipo de perfil dibuja su reto en el canvas, en bucle
  // ======================================================================
  const SCENES = {};
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2), back = (t) => { t = clamp(t, 0, 1); const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const rr = (ctx, x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
  const FONT = (px, w = 900) => w + ' ' + Math.round(px) + 'px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
  const text = (ctx, s, x, y, px, col, o = {}) => {
    ctx.save(); ctx.font = FONT(px, o.w || 900); ctx.textAlign = o.a || 'center'; ctx.textBaseline = 'middle';
    if (o.mw) { const w = ctx.measureText(s).width; if (w > o.mw) { ctx.translate(x, y); ctx.scale(o.mw / w, o.mw / w); x = 0; y = 0; } }
    if (o.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = px * 0.18; ctx.strokeStyle = o.stroke; ctx.strokeText(s, x, y); }
    ctx.fillStyle = col; ctx.fillText(s, x, y); ctx.restore();
  };
  // bucle de animación común: solo dibuja mientras se ve (y no con la pestaña oculta)
  function loop(draw) {
    let on = false, cv = null, raf = 0, last = 0, ro = null;
    const size = () => { if (!cv) return; const r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1); const w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d)); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } return [r.width, r.height, d]; };
    const frame = (ts) => { raf = 0; if (!on || !cv) return; const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0; last = ts; if (!document.hidden) { const s = size(); if (s && s[0] > 10) { const ctx = cv.getContext('2d'); ctx.setTransform(s[2], 0, 0, s[2], 0, 0); draw(ctx, s[0], s[1], dt); } } raf = requestAnimationFrame(frame); };
    return { run(v, canvas) {
      on = v; if (canvas && cv !== canvas) { cv = canvas; if (window.ResizeObserver) { if (ro) ro.disconnect(); ro = new ResizeObserver(() => size()); ro.observe(cv); } }
      if (on && !raf) { last = 0; raf = requestAnimationFrame(frame); }
    } };
  }

  // ----------------------------------------------------------------------
  // CERILLAS: la cuenta mal hecha, cuenta atrás y la solución cerilla a cerilla (como los vídeos)
  // ----------------------------------------------------------------------
  SCENES.cerillas = function (D, T, C) {
    const SEGS = { 0: [1, 1, 1, 1, 1, 1, 0], 1: [0, 1, 1, 0, 0, 0, 0], 2: [1, 1, 0, 1, 1, 0, 1], 3: [1, 1, 1, 1, 0, 0, 1], 4: [0, 1, 1, 0, 0, 1, 1], 5: [1, 0, 1, 1, 0, 1, 1], 6: [1, 0, 1, 1, 1, 1, 1], 7: [1, 1, 1, 0, 0, 0, 0], 8: [1, 1, 1, 1, 1, 1, 1], 9: [1, 1, 1, 1, 0, 1, 1] };
    const SEGXY = [[0, 0, 1, 0], [1, 0, 1, 1], [1, 1, 1, 2], [0, 2, 1, 2], [0, 1, 0, 2], [0, 0, 0, 1], [0, 1, 1, 1]];
    const OPS = { '+': '+', '-': '−', '*': '×', '/': '÷', '=': '=' };
    const segsOf = (eq) => [...eq].filter((c) => /\d/.test(c)).flatMap((c) => SEGS[c]);
    const pretty = (eq) => [...eq].map((c) => OPS[c] || c).join(' ');
    const pool = (D.puzzles || []).filter((p) => p[2] <= (D.max_count || 2));
    const WAIT = D.wait || 8, SEL = 1.0, MOVE = 1.4, STEP = SEL + MOVE + 0.35, TIN = 1.1, TEND = 2.8;
    let P, sol, from, to, NM, tk, t = 0, TS, TD, DUR, last = -1;
    function next() {
      let i; do { i = Math.floor(Math.random() * pool.length); } while (pool.length > 1 && i === last); last = i; P = pool[i];
      sol = P[3][0]; tk = [...P[0]]; const a = segsOf(P[0]), b = segsOf(sol); from = []; to = [];
      a.forEach((v, k) => { if (v && !b[k]) from.push(k); if (!v && b[k]) to.push(k); });
      NM = Math.max(1, from.length, to.length); t = 0; TS = TIN + WAIT; TD = TS + NM * STEP; DUR = TD + TEND;
    }
    next();
    let G = null;   // geometría según el tamaño del canvas
    function geo(W, H) {
      const nd = tk.filter((c) => /\d/.test(c)).length, no = tk.length - nd, small = W < 360;
      const L = Math.min((W * 0.86) / (nd * 1.5 + no * 1.2), H * 0.16), th = Math.max(3.5, L * 0.15);
      const total = nd * L + (nd - 1 + no) * 0.5 * L + no * 0.7 * L, cy = H * (small ? 0.47 : 0.45);
      let x = W / 2 - total / 2; const pos = [], opx = [];
      tk.forEach((c, i) => { if (i) x += 0.5 * L; if (/\d/.test(c)) { pos.push([x, cy - L]); x += L; } else { opx.push([x + 0.35 * L, c]); x += 0.7 * L; } });
      return { W, H, L, th, cy, pos, opx, small, key: W + 'x' + H + P[0] };
    }
    const ends = (i) => { const [x, y] = G.pos[(i / 7) | 0], [a, b, c, e] = SEGXY[i % 7], L = G.L, pad = L * 0.06; return b === e ? [x + a * L + pad, y + b * L, x + c * L - pad, y + e * L] : [x + a * L, y + b * L + pad, x + c * L, y + e * L - pad]; };
    function stick(ctx, x1, y1, x2, y2, th, o = {}) {
      const len = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1);
      ctx.save(); ctx.translate(x1, y1); ctx.rotate(ang); if (o.alpha != null) ctx.globalAlpha = o.alpha;
      if (o.ghost) { ctx.strokeStyle = o.ghost; ctx.lineWidth = Math.max(1.5, th * 0.18); ctx.setLineDash([th * 0.8, th * 0.6]); rr(ctx, 0, -th / 2, len, th, th / 2); ctx.stroke(); ctx.restore(); return; }
      if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = th * 2.2; }
      ctx.fillStyle = 'rgba(0,0,0,.28)'; rr(ctx, 2, -th / 2 + 3, len, th, th / 2); ctx.fill();
      const gr = ctx.createLinearGradient(0, -th / 2, 0, th / 2); gr.addColorStop(0, '#f3c98b'); gr.addColorStop(0.5, '#d99a52'); gr.addColorStop(1, '#a8692e');
      ctx.fillStyle = gr; rr(ctx, 0, -th * 0.38, len - th * 0.6, th * 0.76, th * 0.3); ctx.fill(); ctx.shadowBlur = 0;
      const hx = len - th * 0.75, hr = th * 0.62, hg = ctx.createRadialGradient(hx - hr * 0.3, -hr * 0.35, hr * 0.1, hx, 0, hr * 1.1);
      hg.addColorStop(0, '#ff8a6a'); hg.addColorStop(0.6, '#d9381e'); hg.addColorStop(1, '#8f1d0c'); ctx.fillStyle = hg; ctx.beginPath(); ctx.ellipse(hx, 0, hr * 1.25, hr, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    function flame(ctx, x, y, sz, k) {
      for (let i = 0; i < 3; i++) { const f = Math.sin(t * 22 + i * 2) * 0.12, r = sz * (1 - i * 0.28); ctx.save(); ctx.globalAlpha = (i === 2 ? 0.9 : 0.6) * k; ctx.fillStyle = ['#ff6b00', '#ffa94d', '#fff3bf'][i]; ctx.beginPath(); ctx.ellipse(x, y - r * 0.6, r * 0.5 * (1 + f), r * (1.05 - f), 0, 0, 6.3); ctx.fill(); ctx.restore(); }
    }
    const head = (i) => { const [x1, y1, x2, y2] = ends(i); return [x2 - (x2 - x1) * 0.08, y2 - (y2 - y1) * 0.08]; };
    const hand = (ctx, x, y, k) => { ctx.save(); ctx.globalAlpha = k; ctx.font = Math.round(G.L * 0.75) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('👆', x, y); ctx.restore(); };

    function draw(ctx, W, H, dt) {
      t += dt; if (t >= DUR) { next(); G = null; }
      if (!G || G.key !== W + 'x' + H + P[0]) G = geo(W, H);
      const L = G.L, th = G.th, m = Math.min(W, H);
      // fondo: degradado y madera
      const bg = ctx.createRadialGradient(W / 2, H * 0.42, 10, W / 2, H * 0.5, Math.max(W, H) * 0.75); bg.addColorStop(0, C.bg1); bg.addColorStop(1, C.bg2); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.globalAlpha = 0.07; ctx.strokeStyle = '#000'; ctx.lineWidth = 1; for (let y = 8; y < H; y += 14) { ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(W * 0.3, y + 4, W * 0.6, y - 4, W, y + 2); ctx.stroke(); } ctx.restore();
      const act = { m: T.move, r: T.remove, a: T.add }[P[1]], nm = P[2] === 1 ? T.one : T.many, done = t >= TD;
      const stepOf = (k) => (t < TS + k * STEP ? 'wait' : t < TS + k * STEP + SEL ? 'sel' : t < TS + k * STEP + SEL + MOVE ? 'move' : 'done'), mvOf = (k) => clamp((t - (TS + k * STEP + SEL)) / MOVE, 0, 1);
      // título
      const fadeIn = clamp(t / 0.4, 0, 1), fadeOut = 1 - clamp((t - (DUR - 0.35)) / 0.35, 0, 1), A = fadeIn * fadeOut;
      ctx.save(); ctx.globalAlpha = A;
      if (done) text(ctx, T.solved, W / 2, H * 0.15, m * 0.085, '#ffe066', { stroke: 'rgba(0,0,0,.45)', mw: W * 0.9 });
      else { text(ctx, act + ' ' + P[2] + ' ' + nm, W / 2, H * 0.12, m * 0.095, '#ffffff', { stroke: 'rgba(0,0,0,.45)', mw: W * 0.9 }); text(ctx, T.fix, W / 2, H * 0.12 + m * 0.085, m * 0.05, '#f0dcc0', { w: 700, mw: W * 0.9 }); }
      // signos y cerillas
      const base = done ? segsOf(sol) : segsOf(P[0]);
      for (const [x, c] of G.opx) text(ctx, OPS[c], x, G.cy + 1, L * 0.75, '#fff3d6', { stroke: 'rgba(0,0,0,.3)' });
      for (let i = 0; i < base.length; i++) {
        const [x1, y1, x2, y2] = ends(i), kt = to.indexOf(i), kf = from.indexOf(i);
        if (!base[i]) {
          if (!done && kt >= 0 && stepOf(kt) === 'done') { stick(ctx, x1, y1, x2, y2, th, { glow: '#69db7c' }); continue; }
          const blink = !done && kt >= 0 && (stepOf(kt) === 'sel' || stepOf(kt) === 'move');
          stick(ctx, x1, y1, x2, y2, th, { ghost: blink ? 'rgba(105,219,124,' + (0.55 + 0.45 * Math.sin(t * 9)) + ')' : 'rgba(255,240,210,.16)' }); continue;
        }
        if (!done && kf >= 0 && (stepOf(kf) === 'move' || stepOf(kf) === 'done')) continue;
        const k0 = clamp((t - 0.1 - i * 0.025) / 0.4, 0, 1), drop = (1 - back(k0)) * H * 0.4; if (k0 <= 0) continue;
        const sel = !done && kf >= 0 && stepOf(kf) === 'sel';
        stick(ctx, x1, y1 - drop, x2, y2 - drop, th, { glow: done ? '#69db7c' : sel ? 'rgba(255,107,0,' + (0.7 + 0.3 * Math.sin(t * 12)) + ')' : null });
        if (sel) { const [hx, hy] = head(i); flame(ctx, hx, hy, th * 2.2, clamp((t - (TS + kf * STEP)) * 3, 0, 1)); }
      }
      // solución: aro + mano, y la cerilla volando (o quemándose, o apareciendo)
      for (let k = 0; k < NM && !done; k++) {
        const st = stepOf(k), fi = from[k], ti = to[k], mv = mvOf(k);
        if (st === 'sel') { const ref = fi != null ? fi : ti, [a1, b1, a2, b2] = ends(ref), kk = clamp((t - (TS + k * STEP)) / 0.25, 0, 1);
          ctx.save(); ctx.globalAlpha = kk * (0.6 + 0.4 * Math.sin(t * 10)); ctx.strokeStyle = fi != null ? '#ffd43b' : '#69db7c'; ctx.lineWidth = Math.max(2, th * 0.5); ctx.beginPath(); ctx.arc((a1 + a2) / 2, (b1 + b2) / 2, L * 0.45, 0, 6.3); ctx.stroke(); ctx.restore();
          hand(ctx, (a1 + a2) / 2 + L * 0.12, Math.max(b1, b2) + L * 0.55 + Math.sin(t * 7) * L * 0.07, kk); }
        if (st !== 'move') continue;
        if (fi != null && ti != null) {
          const [a1, b1, a2, b2] = ends(fi), [c1, d1, c2, d2] = ends(ti), e = ease(mv), up = Math.sin(mv * Math.PI) * L * 0.9;
          const cx = (a1 + a2) / 2 + ((c1 + c2) / 2 - (a1 + a2) / 2) * e, cy = (b1 + b2) / 2 + ((d1 + d2) / 2 - (b1 + b2) / 2) * e - up;
          const hx = ((a2 - a1) + ((c2 - c1) - (a2 - a1)) * e) / 2, hy = ((b2 - b1) + ((d2 - d1) - (b2 - b1)) * e) / 2;
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.sin(mv * Math.PI) * 0.6); stick(ctx, -hx, -hy, hx, hy, th * 1.12, { glow: '#ffd43b' }); flame(ctx, hx, hy, th * 2.3, 1 - mv * 0.5); ctx.restore();
          hand(ctx, cx + L * 0.12, cy + L * 0.6, 1 - clamp((mv - 0.85) / 0.15, 0, 1));
        } else if (fi != null) { const [a1, b1, a2, b2] = ends(fi); stick(ctx, a1, b1 - mv * 50, a2, b2 - mv * 50, th, { alpha: 1 - mv }); flame(ctx, (a1 + a2) / 2, (b1 + b2) / 2 - mv * 50, th * 3 * (1 - mv * 0.5), 1 - mv); }
        else if (ti != null) { const [c1, d1, c2, d2] = ends(ti); stick(ctx, c1, d1, c2, d2, th, { alpha: mv, glow: '#69db7c' }); hand(ctx, (c1 + c2) / 2 + L * 0.12, Math.max(d1, d2) + L * 0.55, 1 - mv); }
      }
      // abajo: cuenta atrás, «solución» o la cuenta buena
      const by = H * (G.small ? 0.8 : 0.79), R = m * (G.small ? 0.1 : 0.085);
      if (t >= TIN && t < TS) {
        const left = TS - t, k = left / WAIT, col = left <= 3 ? '#ff6b6b' : '#ffd43b';
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(W / 2, by, R * 1.15, 0, 6.3); ctx.fill();
        ctx.lineCap = 'round'; ctx.lineWidth = R * 0.22; ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.beginPath(); ctx.arc(W / 2, by, R, 0, 6.3); ctx.stroke();
        ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(W / 2, by, R, -Math.PI / 2, -Math.PI / 2 + 6.283 * k); ctx.stroke();
        text(ctx, String(Math.ceil(left)), W / 2, by + 1, R * 1.0, col);
        if (!G.small) { text(ctx, T.think, W / 2 - R * 3.1, by, m * 0.05, '#fff', { stroke: 'rgba(0,0,0,.4)' }); text(ctx, T.hook, W / 2 + R * 3.3, by, m * 0.04, '#f0dcc0', { w: 700, mw: W / 2 - R * 1.8 }); }
      } else if (t >= TS && !done) {
        const w = Math.min(W * 0.6, m * 0.5), h = m * 0.085; ctx.fillStyle = C.accent; rr(ctx, W / 2 - w / 2, by - h / 2, w, h, h / 2); ctx.fill();
        text(ctx, '💡 ' + T.solution.toUpperCase(), W / 2, by + 1, h * 0.5, '#fff', { mw: w - 16 });
      } else if (done) {
        const k = back((t - TD) / 0.4), w = Math.min(W * 0.84, m * 0.8), h = m * 0.11;
        ctx.save(); ctx.globalAlpha = A; ctx.translate(W / 2, by); ctx.scale(k, k); ctx.fillStyle = '#2b8a3e'; rr(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fill();
        text(ctx, '✔ ' + pretty(sol), 0, 1, h * 0.52, '#fff', { mw: w - 20 }); ctx.restore();
      }
      ctx.restore();
    }
    return loop(draw);
  };

  // ----------------------------------------------------------------------
  // QUIZ: los retos de los vídeos educativos (secuencias, policubos, quién fue, número escondido, idioma alienígena,
  // palabra intrusa, lectura relámpago, problemas, emojimates, cálculo, balanza, ortografía, spelling, inglés).
  // Cada pregunta: tarjeta con el enunciado, 4 opciones, cuenta atrás, respuesta en verde y explicación. En bucle.
  // ----------------------------------------------------------------------
  SCENES.quiz = function (D, T, C) {
    const ITEMS = (D.items && (D.items[D.lang] || D.items[Object.keys(D.items)[0]])) || [];
    const WAIT = D.wait || 10, REVEAL = D.reveal || 4, EF = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji"';
    const F = (px, w = 800) => w + ' ' + Math.round(px) + 'px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif,' + EF;
    const isEmo = (x) => typeof x === 'string' && /\p{Extended_Pictographic}/u.test(x) && !/[a-z0-9]{2}/i.test(x.replace(/\p{Extended_Pictographic}/gu, ''));
    let P, t = 0, last = -1, TOPT, TQ, TUP, TR, DUR;
    function next() {
      let i; do { i = Math.floor(Math.random() * ITEMS.length); } while (ITEMS.length > 1 && i === last); last = i; P = ITEMS[i]; t = 0;
      TOPT = 0.8 + (P.extraT || 0) + ((P.says || P.alien || P.rows || []).length) * 0.2 + (P.scales ? (P.scales.clues.length + 1) * 0.2 : 0) + (P.seq ? P.seq.length * 0.15 : 0);
      TQ = TOPT + 0.4; TUP = TQ + WAIT; TR = TUP + 0.25; DUR = TR + REVEAL + (P.rule && P.rule.lines ? Math.min(3, P.rule.lines.length) * 0.5 : 0);
    }
    if (!ITEMS.length) return loop(() => {});
    next();
    const tx = (ctx, s, x, y, px, col, o = {}) => {   // texto de una línea (encoge para caber en o.mw)
      ctx.save(); ctx.font = F(px, o.w || 800); ctx.textAlign = o.a || 'center'; ctx.textBaseline = 'middle';
      if (o.mw) { const w = ctx.measureText(s).width; if (w > o.mw) { const k = o.mw / w; ctx.translate(x, y); ctx.scale(k, k); x = 0; y = 0; } }
      if (o.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = px * 0.16; ctx.strokeStyle = o.stroke; ctx.strokeText(s, x, y); }
      ctx.fillStyle = col; ctx.fillText(s, x, y); ctx.restore();
    };
    const wrap = (ctx, s, maxW, px, w = 700) => { ctx.font = F(px, w); const out = []; let cur = ''; for (const wd of String(s).split(' ')) { const tt = cur ? cur + ' ' + wd : wd; if (cur && ctx.measureText(tt).width > maxW) { out.push(cur); cur = wd; } else cur = tt; } if (cur) out.push(cur); return out; };
    // ficha de secuencia: emoji, número, letra, tamaño o grupo
    function tok(ctx, tk, cx, cy, s) {
      if (!tk) return;
      if (tk.t === 'e') tx(ctx, tk.v, cx, cy, s * 0.6, '#000');
      else if (tk.t === 'n' || tk.t === 'l') { const d = String(tk.v).length; tx(ctx, String(tk.v), cx, cy, s * (d <= 2 ? 0.5 : d === 3 ? 0.4 : 0.3), tk.t === 'n' ? '#5b3fd1' : '#e2457e', { w: 900 }); }
      else if (tk.t === 's') tx(ctx, tk.e, cx, cy, s * [0.28, 0.48, 0.74][tk.s], '#000');
      else if (tk.t === 'g') { const n = tk.n, gc = n <= 3 ? n : n === 4 ? 2 : n <= 9 ? 3 : 4, rows = Math.ceil(n / gc), f = Math.min(0.52, 0.84 / Math.max(gc, rows)) * s, st = f * 1.05;
        for (let k = 0; k < n; k++) { const r = Math.floor(k / gc), c = k % gc, inRow = Math.min(gc, n - r * gc); tx(ctx, tk.e, cx + (c - (inRow - 1) / 2) * st, cy + (r - (rows - 1) / 2) * st, f, '#000'); } }
      else if (tk.t === 'sep') { ctx.fillStyle = 'rgba(80,60,160,.35)'; ctx.fillRect(cx - 2, cy - s * 0.35, 4, s * 0.7); }
    }
    const tileBg = (ctx, x, y, w, h, c1, c2, ring) => { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.22)'; ctx.shadowBlur = h * 0.12; ctx.shadowOffsetY = h * 0.04; const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; rr(ctx, x, y, w, h, Math.min(w, h) * 0.22); ctx.fill(); ctx.restore(); if (ring) { ctx.lineWidth = Math.max(2, h * 0.06); ctx.strokeStyle = ring; rr(ctx, x, y, w, h, Math.min(w, h) * 0.22); ctx.stroke(); } };
    // medida del enunciado (en un ancho bw); devuelve las piezas con su alto
    function measure(ctx, bw) {
      const parts = []; let h = 14;
      const add = (o) => { parts.push(o); h += o.h; };
      if (P.seq) { const n = P.seq.length, per = n <= 6 ? n : Math.ceil(n / 2), s = Math.min(bw * 0.2, (bw - 20) / per - 6); add({ t: 'seq', h: (s + 8) * Math.ceil(n / per) + 6, s, per }); }
      if (P.rows) { const rh = bw * 0.12; add({ t: 'rows', h: rh * P.rows.length, rh }); }
      if (P.scales) { const rh = bw * 0.13; add({ t: 'scales', h: rh * (P.scales.clues.length + 1), rh }); }
      if (P.cubes) { const Cb = P.cubes, mh = Math.max(...Cb.h.flat()), u = Math.min((bw - 40) / (Cb.cols + Cb.rows * 0.5), bw * 0.55 / (mh + Cb.rows * 0.5)); add({ t: 'cubes', h: u * (mh + Cb.rows * 0.5) + 16, u }); }
      if (P.flash) add({ t: 'flash', h: bw * 0.34 });
      if (P.alien) { const rh = bw * 0.12; add({ t: 'alien', h: rh * P.alien.length, rh }); }
      if (P.big) add({ t: 'big', h: bw * 0.24 });
      if (P.emoji && !P.rows) add({ t: 'emoji', h: bw * 0.17 });
      if (P.text) { let fz = bw * 0.066, Ls = wrap(ctx, P.text, bw - 36, fz); if (Ls.length > 4) { fz = bw * 0.054; Ls = wrap(ctx, P.text, bw - 36, fz); } add({ t: 'text', h: Ls.length * fz * 1.3 + 6, fz, Ls }); }
      if (P.note) add({ t: 'note', h: bw * 0.085 });
      if (P.says) { const rh = bw * 0.1; add({ t: 'says', h: rh * P.says.length, rh }); }
      if (P.sub) { const fz = bw * 0.05, Ls = wrap(ctx, '«' + P.sub + '»', bw - 36, fz, 600); add({ t: 'sub', h: Ls.length * fz * 1.3 + 4, fz, Ls }); }
      if (P.expr) { ctx.font = F(100, 800); const w = Math.max(ctx.measureText(P.expr).width, ctx.measureText(P.expr.replace('?', P.answer)).width) / 100, fz = Math.min(bw * 0.16, (bw - 40) / w); add({ t: 'expr', h: fz * 1.5, fz }); }
      return { parts, h: h + 12 };
    }
    function body(ctx, M, x0, y0, bw, solved) {
      let y = y0 + 14; const cx = x0 + bw / 2, appear = (k) => clamp((t - 0.35 - k * 0.2) / 0.25, 0, 1);
      for (const p of M.parts) {
        if (p.t === 'seq') { const n = P.seq.length, rowsN = Math.ceil(n / p.per);
          P.seq.forEach((tk, k) => { const a = clamp((t - 0.3 - k * 0.15) / 0.2, 0, 1); if (a <= 0) return; const r = Math.floor(k / p.per), inRow = Math.min(p.per, n - r * p.per), c = k % p.per;
            const x = cx + (c - (inRow - 1) / 2) * (p.s + 6) - p.s / 2, yy = y + 4 + r * (p.s + 8), blank = k === P.b;
            ctx.save(); ctx.globalAlpha = a; tileBg(ctx, x, yy, p.s, p.s, blank ? (solved ? '#d3f9d8' : '#fff3bf') : '#f6f2ff', blank ? (solved ? '#8ce99a' : '#ffd43b') : '#d9ccff', blank ? (solved ? '#2f9e44' : '#e8590c') : null);
            if (blank && !solved) tx(ctx, '?', x + p.s / 2, yy + p.s / 2 + 1, p.s * 0.55, '#e8590c', { w: 900 }); else tok(ctx, blank ? P.ans : tk, x + p.s / 2, yy + p.s / 2, p.s); ctx.restore(); });
          void rowsN; }
        if (p.t === 'rows') P.rows.forEach((row, ri) => { const a = appear(ri); if (a <= 0) return; const ry = y + ri * p.rh + p.rh / 2, isQ = ri === P.rows.length - 1;
          if (isQ) { ctx.fillStyle = 'rgba(255,212,59,.22)'; rr(ctx, x0 + 8, ry - p.rh * 0.46, bw - 16, p.rh * 0.92, 12); ctx.fill(); }
          const items = row.map((it, j) => (isQ && j === row.length - 1 && solved ? P.answer : String(it)));
          ctx.save(); ctx.globalAlpha = a; tx(ctx, items.join(' '), cx, ry + 1, p.rh * 0.52, isQ ? (solved ? '#2f9e44' : '#3b2a7a') : '#3b2a7a', { mw: bw - 30 }); ctx.restore(); });
        if (p.t === 'scales') { const { E, clues, q } = P.scales, all = clues.concat([[q, null]]), side = (arr) => arr.map(([i, c]) => (c <= 5 ? E[i].repeat(c) : c + '×' + E[i])).join(' ');
          all.forEach(([Lf, Rt], si) => { const a = appear(si); if (a <= 0) return; const ry = y + si * p.rh + p.rh / 2, isQ = Rt === null;
            ctx.save(); ctx.globalAlpha = a; if (isQ) { ctx.fillStyle = 'rgba(112,72,232,.15)'; rr(ctx, x0 + 8, ry - p.rh * 0.46, bw - 16, p.rh * 0.92, 12); ctx.fill(); }
            tx(ctx, side(Lf), x0 + bw * 0.27, ry, p.rh * 0.42, '#000', { mw: bw * 0.4 }); tx(ctx, '⚖️', cx, ry, p.rh * 0.5, '#000');
            tx(ctx, isQ ? (solved ? P.answer : '❓') : side(Rt), x0 + bw * 0.73, ry, p.rh * 0.42, isQ && solved ? '#2f9e44' : '#000', { mw: bw * 0.4, w: 900 }); ctx.restore(); }); }
        if (p.t === 'cubes') drawCubes(ctx, P.cubes, cx, y + p.h - 8, p.u, solved);
        if (p.t === 'flash') { const fx = x0 + 16, fw = bw - 32, fh = p.h - 10, c = t - 0.5, Fl = P.flash, mid = y + 4 + fh / 2;
          ctx.fillStyle = '#2d2a4a'; rr(ctx, fx, y + 4, fw, fh, 16); ctx.fill();
          if (solved) tx(ctx, Fl.word, cx, mid, fh * 0.36, '#69db7c', { mw: fw - 20, w: 900 });
          else if (c >= 0 && c < 0.9) tx(ctx, String(3 - Math.floor(c / 0.3)), cx, mid, fh * 0.42, '#ffd43b', { w: 900 });
          else if (c >= 0.9 && c < 0.9 + Fl.dur) tx(ctx, Fl.word, cx, mid, fh * 0.36, '#fff', { mw: fw - 20, w: 900 });
          else if (c >= 0.9) tx(ctx, '#####', cx, mid, fh * 0.3, '#6f6a99', { w: 900 }); }
        if (p.t === 'alien') P.alien.forEach(([ph, pic], i) => { const a = appear(i); if (a <= 0) return; const ry = y + i * p.rh + p.rh / 2, isQ = pic == null, half = (bw - 24) * 0.58;
          ctx.save(); ctx.globalAlpha = a; if (isQ) { ctx.fillStyle = 'rgba(177,151,252,.25)'; rr(ctx, x0 + 6, ry - p.rh * 0.46, bw - 12, p.rh * 0.92, 10); ctx.fill(); }
          ctx.fillStyle = '#e9fff2'; rr(ctx, x0 + 12, ry - p.rh * 0.33, half, p.rh * 0.66, p.rh * 0.3); ctx.fill(); tx(ctx, '👽 ' + ph, x0 + 12 + half / 2, ry + 1, p.rh * 0.34, '#2aa36b', { mw: half - 12 });
          tx(ctx, isQ ? (solved ? P.answer : '❓') : pic, x0 + 12 + half + (bw - 24 - half) / 2, ry, p.rh * 0.45, '#000', { mw: bw - half - 36 }); ctx.restore(); });
        if (p.t === 'big' || p.t === 'emoji') tx(ctx, p.t === 'big' ? P.big : P.emoji, cx, y + p.h / 2, p.h * 0.72, '#000');
        if (p.t === 'text') p.Ls.forEach((ln, i) => { const ly = y + p.fz * 0.66 + i * p.fz * 1.3; tx(ctx, P.blank ? ln.replace('_', solved ? P.answer : '____') : ln, cx, ly, p.fz, P.blank && solved && ln.includes('_') ? '#2f9e44' : '#212529', { w: 700, mw: bw - 24 }); });
        if (p.t === 'note') { ctx.font = F(p.h * 0.5, 800); const nw = Math.min(bw - 30, ctx.measureText(P.note).width + p.h * 0.8); ctx.fillStyle = '#fff3bf'; rr(ctx, cx - nw / 2, y + p.h * 0.1, nw, p.h * 0.8, p.h * 0.3); ctx.fill(); tx(ctx, P.note, cx, y + p.h / 2, p.h * 0.48, '#8a6200', { mw: nw - 12 }); }
        if (p.t === 'says') P.says.forEach(([e, sx], i) => { const a = appear(i); if (a <= 0) return; const ry = y + i * p.rh + p.rh / 2, bx = x0 + p.rh * 1.2, bwid = bw - p.rh * 1.2 - 14;
          ctx.save(); ctx.globalAlpha = a; tx(ctx, e, x0 + p.rh * 0.62, ry, p.rh * 0.62, '#000'); ctx.fillStyle = '#f3efff'; rr(ctx, bx, ry - p.rh * 0.36, bwid, p.rh * 0.72, p.rh * 0.24); ctx.fill();
          tx(ctx, '«' + sx + '»', bx + 10, ry + 1, p.rh * 0.4, '#3b2a7a', { a: 'left', w: 700, mw: bwid - 20 }); ctx.restore(); });
        if (p.t === 'sub') p.Ls.forEach((ln, i) => tx(ctx, ln, cx, y + p.fz * 0.66 + i * p.fz * 1.3, p.fz, '#6741d9', { w: 600, mw: bw - 24 }));
        if (p.t === 'expr') { const qi = P.expr.lastIndexOf('?'), pre = P.expr.slice(0, qi), post = P.expr.slice(qi + 1), mid = solved ? P.answer : '?'; ctx.font = F(p.fz, 800);
          const wp = ctx.measureText(pre).width, wm = ctx.measureText(mid).width, xs = cx - (wp + wm + ctx.measureText(post).width) / 2, ey = y + p.h / 2;
          tx(ctx, pre, xs, ey, p.fz, '#3b2a7a', { a: 'left' }); tx(ctx, mid, xs + wp, ey, p.fz, solved ? '#2f9e44' : '#e8590c', { a: 'left' }); tx(ctx, post, xs + wp + wm, ey, p.fz, '#3b2a7a', { a: 'left' }); }
        y += p.h;
      }
    }
    function drawCubes(ctx, Cb, cx, by, u, solved) {
      const dx = u * 0.5, dy = u * 0.5, x0 = cx - (Cb.cols * u + Cb.rows * dx) / 2, n = parseInt(Cb.color.slice(1), 16), c0 = [n >> 16, (n >> 8) & 255, n & 255];
      const light = 'rgb(' + c0.map((v) => Math.round(v + (255 - v) * 0.45)) + ')', dark = 'rgb(' + c0.map((v) => Math.round(v * 0.72)) + ')'; let k = 0;
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(1, u * 0.045); ctx.strokeStyle = '#2d2a4a';
      const poly = (pts, fill) => { ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); };
      for (let y = Cb.rows - 1; y >= 0; y--) for (let x = 0; x < Cb.cols; x++) for (let z = 0; z < Cb.h[y][x]; z++) {
        const a = clamp((t - 0.35 - k++ * 0.03) / 0.15, 0, 1); if (a <= 0) continue; ctx.globalAlpha = a;
        const X = x0 + x * u + y * dx, Y = by - (z + 1) * u - y * dy - (1 - back(a)) * u * 0.6;
        poly([[X, Y], [X + u, Y], [X + u, Y + u], [X, Y + u]], Cb.color); poly([[X, Y], [X + dx, Y - dy], [X + u + dx, Y - dy], [X + u, Y]], light); poly([[X + u, Y], [X + u + dx, Y - dy], [X + u + dx, Y + u - dy], [X + u, Y + u]], dark);
      }
      ctx.globalAlpha = 1;
      if (solved) for (let y = Cb.rows - 1; y >= 0; y--) for (let x = 0; x < Cb.cols; x++) { const hh = Cb.h[y][x], X = x0 + x * u + y * dx + u / 2 + dx / 2, Y = by - hh * u - y * dy - dy / 2;
        ctx.fillStyle = '#1b1033'; ctx.beginPath(); ctx.arc(X, Y, u * 0.24, 0, 6.3); ctx.fill(); tx(ctx, String(hh), X, Y + 1, u * 0.3, '#ffd43b', { w: 900 }); }
      ctx.restore();
    }
    function draw(ctx, W, H, dt) {
      t += dt; if (t >= DUR) next();
      const m = Math.min(W, H), solved = t >= TR, fade = Math.min(clamp(t / 0.3, 0, 1), 1 - clamp((t - (DUR - 0.3)) / 0.3, 0, 1));
      const bg = ctx.createRadialGradient(W / 2, H * 0.35, 10, W / 2, H * 0.5, Math.max(W, H) * 0.8); bg.addColorStop(0, C.bg1); bg.addColorStop(1, C.bg2); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.globalAlpha = 0.06; ctx.fillStyle = '#fff'; for (let k = 0; k < 12; k++) { ctx.beginPath(); ctx.moveTo(W / 2, H * 0.4); const a1 = k * 0.5236 + t * 0.05, a2 = a1 + 0.22; ctx.lineTo(W / 2 + Math.cos(a1) * W * 1.5, H * 0.4 + Math.sin(a1) * W * 1.5); ctx.lineTo(W / 2 + Math.cos(a2) * W * 1.5, H * 0.4 + Math.sin(a2) * W * 1.5); ctx.fill(); } ctx.restore();
      ctx.save(); ctx.globalAlpha = fade;
      // pregunta arriba
      const qy = H * 0.075, head = solved ? '✅ ' + T.answer : T.question;
      tx(ctx, head, W / 2, qy, m * 0.068, solved ? '#69db7c' : '#fff', { stroke: 'rgba(0,0,0,.35)', mw: W * 0.92, w: 900 });
      // opciones abajo (2×2) y la tarjeta en medio, encogida si no cabe
      const opts = P.opts || [], oc = 2, orows = Math.ceil(opts.length / oc), gap = Math.max(6, W * 0.02), ow = (W * 0.92 - gap) / oc, oh = Math.min(H * 0.085, ow * 0.42);
      const oy0 = H - 12 - orows * (oh + gap) + gap, bw = W * 0.9, x0 = (W - bw) / 2, cy0 = qy + m * 0.06, avail = oy0 - cy0 - 12;
      const M = measure(ctx, bw), k = Math.min(1, avail / M.h), ch = M.h * k, cy = cy0 + Math.max(0, (avail - ch) / 2);   // centrada en el hueco libre
      ctx.save(); ctx.translate(W / 2, cy); ctx.scale(k, k); ctx.translate(-W / 2, 0);
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 20; ctx.fillStyle = '#fff'; rr(ctx, x0, 0, bw, M.h, 18); ctx.fill(); ctx.restore();
      if (solved) { ctx.lineWidth = 5; ctx.strokeStyle = '#40c057'; rr(ctx, x0, 0, bw, M.h, 18); ctx.stroke(); }
      body(ctx, M, x0, 0, bw, solved); ctx.restore();
      // cuenta atrás en la esquina de la tarjeta
      if (t >= TQ && t < TUP) { const left = TUP - t, R = m * 0.055, rx = W / 2 + bw * k / 2 - R * 0.5, ry = cy + R * 0.3, col = left <= 3 ? '#ff6b6b' : '#ffd43b';
        ctx.fillStyle = '#1b1033'; ctx.beginPath(); ctx.arc(rx, ry, R * 1.15, 0, 6.3); ctx.fill(); ctx.lineCap = 'round'; ctx.lineWidth = R * 0.24; ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.beginPath(); ctx.arc(rx, ry, R, 0, 6.3); ctx.stroke();
        ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(rx, ry, R, -Math.PI / 2, -Math.PI / 2 + 6.283 * left / WAIT); ctx.stroke(); tx(ctx, String(Math.ceil(left)), rx, ry + 1, R, col, { w: 900 }); }
      // opciones (o, al resolver, la explicación en su sitio)
      const rule = P.rule || {};
      if (!solved || t < TR + 1.4 || !rule.text) opts.forEach((o, i) => {
        const a = clamp((t - TOPT - i * 0.08) / 0.25, 0, 1); if (a <= 0) return; const r = Math.floor(i / oc), c = i % oc, x = (W - (ow * oc + gap)) / 2 + c * (ow + gap), y = oy0 + r * (oh + gap), ok = i === P.ok;
        ctx.save(); ctx.globalAlpha = a * (solved && !ok ? 0.35 : 1) * (solved ? 1 - clamp((t - TR - 1.1) / 0.3, 0, 1) : 1);
        tileBg(ctx, x, y, ow, oh, solved && ok ? '#d3f9d8' : '#f6f2ff', solved && ok ? '#8ce99a' : '#d9ccff', solved && ok ? '#2f9e44' : null);
        ctx.fillStyle = solved && ok ? '#2f9e44' : '#7048e8'; ctx.beginPath(); ctx.arc(x + oh * 0.42, y + oh / 2, oh * 0.24, 0, 6.3); ctx.fill(); tx(ctx, 'ABCD'[i], x + oh * 0.42, y + oh / 2 + 1, oh * 0.28, '#fff', { w: 900 });
        if (o && typeof o === 'object') tok(ctx, o, x + ow / 2 + oh * 0.2, y + oh / 2, oh * 0.95);
        else tx(ctx, String(o), x + ow / 2 + oh * 0.2, y + oh / 2 + 1, isEmo(o) ? oh * 0.5 : oh * 0.4, '#3b2a7a', { w: 800, mw: ow - oh * 1.0 });
        ctx.restore();
      });
      if (solved && t >= TR + 1.1 && rule.text) {   // explicación
        const a = clamp((t - TR - 1.1) / 0.3, 0, 1), bx = W * 0.05, bwid = W * 0.9, top = oy0 - 4, bh = H - 10 - top;
        ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#fffdf5'; rr(ctx, bx, top, bwid, bh, 14); ctx.fill(); ctx.fillStyle = '#40c057'; rr(ctx, bx, top, 7, bh, 3); ctx.fill();
        const lines = [('💡 ' + rule.text)].concat((rule.lines || []).slice(0, 3)), fz = Math.min(bh / (lines.length * 1.35 + 0.6), m * 0.045);
        lines.forEach((ln, i) => tx(ctx, ln, bx + bwid / 2 + 3, top + fz * 0.95 + i * fz * 1.35, i ? fz * 0.95 : fz, i ? '#2b8a3e' : '#212529', { w: i ? 800 : 700, mw: bwid - 24 }));
        if (rule.toks && !rule.lines) { const s = Math.min(fz * 1.6, (bwid - 20) / rule.toks.length); rule.toks.forEach((tk, j) => tok(ctx, tk, bx + bwid / 2 + (j - (rule.toks.length - 1) / 2) * s, top + fz * 2.6, s)); }
        ctx.restore();
      }
      ctx.restore();
    }
    return loop(draw);
  };

  // ----------------------------------------------------------------------
  // PLAYABLE: el juego de verdad en un iframe; al superar el nivel (o perder), tarjeta con el botón de jugar.
  // El juego (pwa/common.js con ?playable=1) avisa con postMessage {bannergames:'ready'|'win'|'over'}.
  // ----------------------------------------------------------------------
  SCENES.playable = function (D, T, C, URL_) {
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const el = document.createElement('div'); el.className = 'pw';
    el.innerHTML = `<div class="ld"><b>${esc(D.emoji || '🎮')}</b><span>${esc(T.loading || '…')}</span></div>`
      + (T.hint ? `<div class="hint gone">${esc(T.hint)}</div>` : '')
      + `<div class="pc"><div class="pcc"><div class="em"></div><h3></h3><p></p><a class="cta" href="${esc(URL_)}" target="_blank" rel="noopener">${esc(T.cta)}</a><button class="later" data-a="retry">${esc(T.again)}</button></div></div>`;
    const ld = el.querySelector('.ld'), hint = el.querySelector('.hint'), pc = el.querySelector('.pc');
    let ifr = null, ready = false, ended = false, hintT = 0;
    const src = (() => { try { const u = new URL(D.play, BASE);
      if (/^(localhost|127\.0\.0\.1)$/.test(new URL(BASE).hostname)) { const b = new URL(BASE); u.protocol = b.protocol; u.host = b.host; }   /* pruebas en local */
      u.searchParams.set('playable', '1'); if (D.level > 1) u.searchParams.set('lv', D.level); return u.href; } catch (e) { return D.play; } })();
    const post = (m) => { try { ifr && ifr.contentWindow.postMessage({ bannergames: m }, '*'); } catch (e) { /* nada */ } };
    const fill = (k, n) => String(T[k] || '').replace('{n}', n);
    const noHint = () => { if (hint) hint.classList.add('gone'); clearTimeout(hintT); };
    addEventListener('blur', () => setTimeout(() => { if (ifr && document.activeElement === host()) noHint(); }, 0));   // al tocar el juego (el foco pasa al iframe) se quita el aviso
    const host = () => el.getRootNode().host || null;
    function card(kind, m) {
      ended = true; noHint();
      const left = D.levels > 1 ? D.levels - (m.level || 1) : 0;
      pc.querySelector('.em').textContent = kind === 'win' ? '🎉' : m.record ? '🏆' : '😅';
      pc.querySelector('h3').textContent = kind === 'win' ? T.winTitle : m.record ? T.recordTitle : T.overTitle;
      pc.querySelector('p').textContent = kind === 'win' ? (left > 0 ? fill('winSub', left) : T.winSubEnd) : D.levels > 1 ? T.overSub : fill('overSubScore', m.score || 0);
      pc.classList.add('on');
      setTimeout(() => { const b = pc.querySelector('.cta'); if (b) b.focus({ preventScroll: true }); }, 60);
    }
    addEventListener('message', (e) => {
      const m = e.data; if (!ifr || e.source !== ifr.contentWindow || !m || typeof m.bannergames !== 'string') return;
      if (m.bannergames === 'ready') {
        ready = true; ld.classList.add('gone');
        if (hint) { hint.classList.remove('gone'); clearTimeout(hintT); hintT = setTimeout(() => hint.classList.add('gone'), (D.hint_seconds || 7) * 1000); }
      } else if (m.bannergames === 'win') setTimeout(() => card('win', m), 1300);   // primero el confeti del juego
      else if (m.bannergames === 'over') setTimeout(() => card('over', m), 900);
    });
    // ventanita (ordenador): el juego en pausa, con su emoji botando
    const poster = loop((ctx, W, H, dt) => {
      poster.t = (poster.t || 0) + dt; const t = poster.t;
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, C.bg1); g.addColorStop(1, C.bg2); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const sz = Math.min(W, H) * 0.42, y = H * 0.42 - Math.abs(Math.sin(t * 2.6)) * H * 0.08;
      ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(W / 2, H * 0.42 + sz * 0.45, sz * 0.32 * (1 - Math.abs(Math.sin(t * 2.6)) * 0.3), sz * 0.07, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      text(ctx, D.emoji || '🎮', W / 2, y, sz, '#fff', { w: 400 });
      text(ctx, ended ? T.miniEnd || T.mini : ready ? T.miniPaused || T.mini : T.mini, W / 2, H * 0.84, Math.min(20, W * 0.065), '#fff3d6', { mw: W * 0.9 });
    });
    return {
      el,
      run: poster.run,
      active(on) {
        if (on && !ifr) {
          ifr = document.createElement('iframe'); ifr.src = src; ifr.title = T.brand || 'game';
          ifr.setAttribute('allow', 'autoplay; fullscreen; gamepad'); ifr.setAttribute('loading', 'eager');
          ifr.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
          el.insertBefore(ifr, el.firstChild);
          setTimeout(() => ld.classList.add('gone'), 12000);   // por si el juego no avisa
        } else if (!on && ifr && ready && !ended) post('pause');
        if (on && ifr) setTimeout(() => { try { ifr.focus(); } catch (e) { /* nada */ } }, 80);
      },
      retry() { pc.classList.remove('on'); ended = false; post('retry'); try { ifr.focus(); } catch (e) { /* nada */ } },
    };
  };
})();
