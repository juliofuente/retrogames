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
    const T = D.texts[LANG] || D.texts.es || D.texts[Object.keys(D.texts)[0]];
    const C = Object.assign({ bg1: '#4a2c17', bg2: '#1f130a', accent: '#ff922b', cta: '#ffd43b', ctaText: '#2b1a0e' }, D.colors || {});
    const URL_ = (() => { try { const u = new URL(D.url, location.href); if (!u.searchParams.has('utm_source')) { u.searchParams.set('utm_source', location.hostname || 'web'); u.searchParams.set('utm_medium', 'bannergames'); u.searchParams.set('utm_campaign', profile); } return u.href; } catch (e) { return D.url; } })();
    const scene = SCENES[D.type] ? SCENES[D.type](D, T, C) : null;
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
    let mode = 'off', prevOverflow = null;
    const desktop = () => matchMedia('(min-width: 768px) and (hover: hover)').matches || innerWidth >= 1024;
    const place = (slot) => { const el = root.querySelector('[data-slot="' + slot + '"]'); if (el && canvas.parentNode !== el) el.appendChild(canvas); };
    const lock = (on) => { const s = document.documentElement.style; if (on) { if (prevOverflow === null) prevOverflow = s.overflow; s.overflow = 'hidden'; } else if (prevOverflow !== null) { s.overflow = prevOverflow; prevOverflow = null; } };
    function set(m) {
      mode = m; ov.classList.toggle('on', m === 'full'); mini.classList.toggle('on', m === 'mini'); bar.classList.toggle('on', m === 'bar');
      if (m === 'full') { place('full'); requestAnimationFrame(() => ov.classList.add('vis')); lock(true); setTimeout(() => { const b = $('.ov .cta'); if (b) b.focus({ preventScroll: true }); }, 50); } else { ov.classList.remove('vis'); lock(false); }
      if (m === 'mini') place('mini');
      scene.run(m === 'full' || m === 'mini', canvas);
    }
    const minimize = () => set(desktop() ? 'mini' : 'bar');
    root.addEventListener('click', (e) => {
      const a = e.target.closest('[data-a]'); if (e.target.closest('a')) return;   // los botones de jugar abren la web
      if (e.target === ov) return minimize();                                       // clic fuera de la tarjeta
      if (e.target.closest('.cv')) return void window.open(URL_, '_blank', 'noopener');   // tocar el reto también lleva a jugar
      if (!a) return;
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
})();
