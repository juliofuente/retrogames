/* Arcade Watch · motor de los juegos para relojes Wear OS (QuickJS)
   Es el motor de la web (pwa/common.js) sin DOM: los juegos (herramientas/src/<id>.js) se cargan tal cual y llaman a
   Arcade.game({...}) igual que en el navegador. Lo que cambia:
   · el canvas es falso (canvas.js): apunta las órdenes y Java las pinta;
   · los menús, la pausa y el fin de partida se pintan en el canvas, pensados para una pantalla redonda;
   · el sonido, la vibración y el guardado se piden a Java (colas y funciones __*);
   · la corona del reloj (o el bisel) manda flechas ← → a los juegos que las usan.
   Funciones que llama Java: __init, __frame, __input, __rotary, __key, __back, __pause, __takeSounds, __newStrings… */
(function (G) {
  'use strict';
  const A = (G.Arcade = {});
  const TAU = Math.PI * 2;
  const EF = 'emoji';
  A.EF = EF;
  A.FONT = 'sans-serif';

  /* ---------- lo mínimo del navegador que esperan los juegos ---------- */
  const log = (...a) => { try { G.__log && G.__log(a.map(String).join(' ')); } catch (_) {} };
  G.console = { log, info: log, warn: log, error: log, debug() {} };
  G.window = G;
  let CLOCK = 0;   // milisegundos de juego (avanza con cada fotograma)
  G.performance = { now: () => CLOCK };
  const timers = []; let tid = 1;
  G.setTimeout = (fn, ms, ...args) => { const id = tid++; timers.push({ id, at: CLOCK + (+ms || 0), fn, args }); return id; };
  G.setInterval = (fn, ms, ...args) => { const id = tid++; timers.push({ id, at: CLOCK + Math.max(10, +ms || 0), fn, args, every: Math.max(10, +ms || 0) }); return id; };
  G.clearTimeout = G.clearInterval = (id) => { const i = timers.findIndex((t) => t.id === id); if (i >= 0) timers.splice(i, 1); };
  G.requestAnimationFrame = () => 0;
  function runTimers() {
    for (let guard = 0; guard < 200; guard++) {
      let k = -1;
      for (let i = 0; i < timers.length; i++) if (timers[i].at <= CLOCK && (k < 0 || timers[i].at < timers[k].at)) k = i;
      if (k < 0) return;
      const t = timers[k];
      if (t.every) t.at += t.every; else timers.splice(k, 1);
      try { t.fn(...t.args); } catch (e) { log('timer: ' + e + '\n' + (e && e.stack)); }
    }
  }
  G.localStorage = {
    getItem(k) { const v = G.__storeGet ? G.__storeGet(String(k)) : null; return v == null ? null : v; },
    setItem(k, v) { if (G.__storeSet) G.__storeSet(String(k), String(v)); },
    removeItem(k) { if (G.__storeSet) G.__storeSet(String(k), null); },
  };

  /* ---------- almacenamiento ---------- */
  A.get = (k, d) => { try { const v = localStorage.getItem('arc_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
  A.set = (k, v) => { try { localStorage.setItem('arc_' + k, JSON.stringify(v)); } catch (e) {} };

  /* ---------- fuentes y utilidades (igual que pwa/common.js) ---------- */
  const FONTS = {
    round: '"Arial Rounded MT Bold","SF Pro Rounded",ui-rounded,"Nunito","Varela Round",system-ui,sans-serif',
    serif: 'Georgia,"Palatino Linotype","Book Antiqua",Palatino,serif',
    mono: '"Courier New",ui-monospace,Menlo,Consolas,monospace',
    impact: 'Impact,Haettenschweiler,"Arial Narrow Bold","Arial Black",sans-serif',
    comic: '"Comic Sans MS","Chalkboard SE","Comic Neue",cursive,sans-serif',
    wide: '"Arial Black","Helvetica Neue",Arial,sans-serif',
    fancy: '"Trebuchet MS","Lucida Grande",Tahoma,sans-serif',
  };
  A.rand = (a, b) => a + Math.random() * (b - a);
  A.ri = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  A.pick = (a) => a[Math.floor(Math.random() * a.length)];
  A.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  A.lerp = (a, b, t) => a + (b - a) * t;
  A.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  A.shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  A.inPoly = (x, y, pts) => {
    let ins = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
    }
    return ins;
  };
  A.polyArea = (pts) => { let a = 0; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j].x + pts[i].x) * (pts[j].y - pts[i].y); return Math.abs(a / 2); };
  A.segDist = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
    let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  };
  A.rr = (ctx, x, y, w, h, r) => {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  };
  A.txt = (ctx, s, x, y, size, color, align, weight, stroke, font) => {
    s = A.L(String(s));
    ctx.font = (weight || 800) + ' ' + Math.round(size) + 'px ' + (font || A.FONT);
    ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    if (stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size / 5); ctx.strokeStyle = stroke; ctx.strokeText(s, x, y); }
    ctx.fillStyle = color || '#fff'; ctx.fillText(s, x, y);
  };
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* ---------- emojis cacheados ---------- */
  // Los emojis nuevos (Unicode 12+, p. ej. 🫐 🪨 🥲 🙂‍↔️) no existen en muchos móviles y PCs: se ven como un cuadrado,
  // dos dibujos pegados o nada. Antes de usar uno se comprueba si el sistema lo pinta en color; si no, se cambia por
  // un parecido más antiguo (FALLBACK) o, si es un círculo/cuadrado de color, se dibuja a mano.
  const SHAPE = { '🟢': ['o', '#40c057'], '🟡': ['o', '#fcc419'], '🟣': ['o', '#9c36b5'], '🟠': ['o', '#fd7e14'], '🟤': ['o', '#8d5524'], '🔴': ['o', '#e03131'], '🔵': ['o', '#1c7ed6'],
    '🟦': ['s', '#1c7ed6'], '🟩': ['s', '#40c057'], '🟥': ['s', '#e03131'], '🟨': ['s', '#fcc419'], '🟪': ['s', '#9c36b5'], '🟧': ['s', '#fd7e14'], '🟫': ['s', '#8d5524'], '🪙': ['o', '#fab005'] };
  A.FALLBACK = { '🪙': '💰', '🪵': '🏏', '🫐': '🍇', '🪨': '🌑', '🫧': '⚪', '🪐': '🌍', '🧊': '💎', '🥲': '😢', '🥹': '🥺', '🥱': '😪', '🪴': '🌱', '🪃': '🔄', '🦩': '🦢', '🪶': '🍃',
    '🤍': '💖', '🪵': '🌰', '🥶': '😨', '🪄': '✨', '🪞': '🔲', '🪀': '🎯', '🪁': '🎈', '🪽': '🕊️', '🪲': '🐞', '🪳': '🐜', '🛻': '🚚', '🪺': '🐣', '🪸': '🌿',
    '🪟': '🔲', '🪷': '🌸', '🪓': '🔨', '🧌': '👹', '🪢': '➰', '🪜': '📶', '🪅': '🎉', '🪱': '🐛', '🛞': '⚙️', '🪼': '🐙', '🪛': '🔧', '🪚': '🔨', '🪦': '⚰️',
    '🧄': '🧅', '🫥': '😶', '🟰': '=', '🧍': '🚶', '🥸': '🤓', '🪖': '⛑️', '🪣': '🥫', '🥏': '💿', '🧃': '🥤', '🪗': '🎹', '🫣': '🙈', '🪑': '💺',
    '🦭': '🐳', '🦨': '🦝', '🦧': '🦍', '🛺': '🚗', '🦼': '♿', '🛼': '⛸️', '🦫': '🐿️', '🦽': '♿', '🦦': '🦝', '🦤': '🦃', '🦯': '🦮' };
  /* ---------- emojis ---------- */
  // El reloj pinta los emojis con su propia fuente (Java guarda cada uno en una caché de mapas de bits). Si el reloj no
  // tiene un emoji (Wear OS antiguo), se usa el parecido de FALLBACK o, si es un círculo o cuadrado de color, se dibuja.
  const eok = new Map();
  function emojiOK(ch) {
    let v = eok.get(ch);
    if (v === undefined) { try { v = G.__hasGlyph ? !!G.__hasGlyph(ch) : true; } catch (_) { v = true; } eok.set(ch, v); }
    return v;
  }
  function emojiFix(ch) {
    if (!A.FALLBACK[ch] && !SHAPE[ch] && ch.indexOf('‍') < 0) return ch;
    if (emojiOK(ch)) return ch;
    if (SHAPE[ch]) return SHAPE[ch];
    if (A.FALLBACK[ch]) return A.FALLBACK[ch];
    return ch.split('‍')[0];
  }
  A.emojiFix = (ch) => { const f = emojiFix(ch); return typeof f === 'string' ? f : ch; };
  A.dpr = 1;
  function shape(ctx, fx, size) {   // círculo o cuadrado de color con brillo, como en la web
    const r = size * 0.42, gr = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r * 1.2);
    gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(0.35, fx[1]); gr.addColorStop(1, fx[1]);
    ctx.fillStyle = gr; ctx.beginPath();
    if (fx[0] === 'o') ctx.arc(0, 0, r, 0, TAU); else ctx.roundRect(-r, -r, 2 * r, 2 * r, r * 0.25);
    ctx.fill(); ctx.lineWidth = Math.max(1, r * 0.08); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.stroke();
  }
  A.emoji = (ctx, ch, x, y, size, o) => {
    size = Math.max(4, Math.round(size));
    const fx = emojiFix(String(ch));
    if (o || typeof fx !== 'string') {
      ctx.save(); ctx.translate(x, y);
      if (o) {
        if (o.rot) ctx.rotate(o.rot);
        if (o.flip) ctx.scale(-1, 1);
        if (o.sx || o.sy) ctx.scale(o.sx || 1, o.sy || 1);
        if (o.alpha != null) ctx.globalAlpha = ctx.globalAlpha * o.alpha;
      }
      if (typeof fx === 'string') ctx._emoji(fx, 0, 0, size); else shape(ctx, fx, size);
      ctx.restore();
    } else ctx._emoji(fx, x, y, size);
  };

  /* ---------- transiciones de casilla a casilla ---------- */
  // Para juegos de tablero: en vez de dibujar cada pieza en su casilla de golpe, se dibuja donde devuelve
  //   const [x, y, k] = Arcade.glide(pieza, xDestino, yDestino)
  // La pieza (un objeto que se conserva mientras exista) se desliza suavemente hasta su casilla; al aparecer crece con
  // un pequeño rebote (k va de 0 a 1: úsalo como escala). Si un objeto deja de dibujarse un rato y vuelve, salta sin
  // animación. o.speed (opcional) cambia la rapidez (por defecto 16 ≈ 0,15 s).
  A.fdt = 1 / 60; A.fno = 0;
  A.glide = (o, x, y, speed) => {
    if (!o || typeof o !== 'object') return [x, y, 1];
    const gl = o.__gl || (o.__gl = { x, y, a: 0, f: -9 });
    if (A.fno - gl.f > 20) { gl.x = x; gl.y = y; if (gl.f > -9) gl.a = 1; }   // reaparece tras no dibujarse: sin animación
    if (gl.f !== A.fno) {
      const k = 1 - Math.exp(-(speed || o.speed || 16) * A.fdt);
      gl.x += (x - gl.x) * k; gl.y += (y - gl.y) * k;
      if (Math.abs(x - gl.x) < 0.3) gl.x = x; if (Math.abs(y - gl.y) < 0.3) gl.y = y;
      if (gl.a < 1) gl.a = Math.min(1, gl.a + A.fdt * 5.5);
      gl.f = A.fno;
    }
    const t = gl.a, c = 1.70158;
    const sc = t >= 1 ? 1 : 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);   // easeOutBack
    return [gl.x, gl.y, Math.max(0, sc)];
  };
  // Dibuja algo centrado en (x, y) escalado k (para usar con el k de Arcade.glide): Arcade.scaled(ctx, x, y, k, () => {...})
  A.scaled = (ctx, x, y, k, fn) => { if (k === 1) return fn(); ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.translate(-x, -y); fn(); ctx.restore(); };

  /* ---------- caras del protagonista ---------- */
  // Repertorio de caras por estado de ánimo. g.face() devuelve la cara actual del protagonista;
  // el motor la cambia sola (al azar, al recibir daño, al sumar puntos, al ganar…) y el juego
  // puede forzarla con g.mood('scared'), g.mood('hot'), etc.
  A.FACES = {
    idle: ['😀', '🙂', '😊', '😉', '☺️', '😋', '🤔', '🤨', '🙄', '🙂‍↔️', '🙂‍↕️', '😎', '🤗'],
    happy: ['😀', '😊', '😉', '🥰', '😍', '😘', '😋', '🤗'],
    laugh: ['🤣', '😂', '😀'],
    money: ['🤑', '😍', '🤣'],
    win: ['🥳', '😎', '🥹', '😍'],
    hurt: ['😱', '😭', '😢', '😨', '😥', '🥲'],
    scared: ['😨', '😱', '😳', '😲', '🥺'],
    sad: ['😢', '🥲', '😥', '🥺'],
    angry: ['😡', '😠'],
    sick: ['🤢'], hot: ['🥵'], cold: ['🥶'],
    surprise: ['😲', '😳', '🤨'],
    effort: ['😤', '🥵', '😬'],
  };
  const MOOD_PRI = { idle: 0, happy: 1, money: 1, laugh: 2, surprise: 2, effort: 2, sick: 3, hot: 3, cold: 3, scared: 4, angry: 4, sad: 5, hurt: 6, win: 7 };
  // Enemigos compartidos entre juegos: cosas "malas" (calaveras, bichos, monstruos…).
  A.FOES = ['💀', '🦂', '👻', '🦈', '🧟', '🧛', '👽', '👾', '🕷️', '🐍', '🦇', '👹', '👺', '🤖', '🐊', '🦖', '🧌', '😈', '🦠', '🐀', '☠️', '🐺', '🦑', '🐙'];
  A.FOES_SMALL = ['🕷️', '🦂', '🦠', '🐀', '🦇', '🐍', '🪳', '🦟', '🐜', '🪲'];
  A.FOES_BIG = ['👹', '🧟', '🧛', '👽', '🦖', '🐊', '🦈', '🧌', '😈', '🤖', '👾', '💀', '👻'];
  // Enemigo n de la lista (repite entre juegos). A.foeSet(k, semilla) → k enemigos distintos.
  A.foe = (n, list) => { const l = list || A.FOES; return l[((n % l.length) + l.length) % l.length]; };
  A.foeSet = (k, seed, list) => { const l = (list || A.FOES).slice(), r = rng(hash('foes' + (seed || 0))); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l.slice(0, k); };

  /* ---------- hacia dónde mira cada emoji ---------- */
  // Ángulo (radianes, 0 = derecha, π/2 = abajo) hacia el que "mira" el emoji tal cual se dibuja.
  // Las caras miran hacia abajo (de frente). Los animales y vehículos de perfil suelen mirar a la izquierda.
  // Si un emoji no está aquí, no se gira. Añade los nuevos que uses.
  const L_ = Math.PI, R_ = 0, U_ = -Math.PI / 2, D_ = Math.PI / 2, UR = -Math.PI / 4, UL = -3 * Math.PI / 4;
  A.FACING = {};
  const face = (list, a) => list.split(' ').forEach((e) => { if (e) A.FACING[e] = a; });
  face('😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 ☺️ 😚 😙 🥲 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 🤯 🤠 🥳 😎 🤓 🧐 😕 😟 🙁 ☹️ 😮 😯 😲 😳 🥺 🥹 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 ☠️ 👹 👺 👻 👽 👾 🤖 🙂‍↔️ 🙂‍↕️ 😺 😸 😹 😻 😼 😽 🙀 😿 😾 🧟 🧛 🧌 🧙 🧝 🥷 🦸 🦹 🤴 👸 👑 🐸 🐷 🐮 🐵 🙈 🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐔 🐧 🐥 🐣 🦉 🦇 🐙 🦀 🐞 🕷️ 🦋 🎃 🤡 ⛄ ☃️', D_);
  face('🐟 🐠 🐡 🐬 🐳 🐋 🦈 🐊 🐀 🐁 🐈 🐈‍⬛ 🐕 🐩 🐎 🦖 🦕 🐢 🐌 🐛 🐜 🐝 🪲 🪳 🦗 🦟 🐦 🐦‍⬛ 🕊️ 🦆 🦅 🐓 🐤 🐇 🐿️ 🦔 🐘 🦏 🦛 🐪 🐫 🦒 🦘 🐃 🐂 🐄 🐖 🐏 🐑 🐐 🦌 🐅 🐆 🦓 🦍 🦧 🐒 🦦 🦨 🦡 🦫 🦤 🦚 🦜 🦢 🦩 🐉 🦎 🐍 🦂 🦐 🦞 🦑 🦭 🚗 🚙 🚕 🚌 🚎 🚐 🚑 🚒 🚚 🚛 🚜 🏎️ 🏍️ 🛵 🛺 🚂 🚃 🚋 🚞 🚝 🚄 🚅 🚈 🚁 🚤 🛥️ ⛴️ 🚢 🛳️ 🏃 🚶 🏊 🏄 🚣 🧗 🤸 🏇 ⛷️ 🏂 🚴 🚵 🛹 🛼 🦽 🦼 🛷 🧹 🔫 🪃 🦯 🗡️ 🔪 🪓 🎠 🐲', L_);
  face('🛸 🚀', UR); face('✈️ 🛩️', UR);
  face('👉 ➡️ ▶️ ⏩ 🔜', R_); face('👈 ⬅️ ◀️ ⏪ 🔙', L_); face('👆 ⬆️ 🔼 ☝️ 🔝 🎈 🪁', U_); face('👇 ⬇️ 🔽', D_);
  face('↗️', UR); face('↖️', UL); face('🏹', UR);
  const VS = /[︎️]/g;
  A.facing = (e) => { const f = A.FACING[e]; return f !== undefined ? f : A.FACING[String(e).replace(VS, '')]; };
  // Dibuja el emoji orientado según su movimiento (dx, dy).
  //   o.mode: 'auto' (gira hacia donde va; si es de perfil y va de lado, solo se voltea)
  //           'flip' (solo voltea izquierda/derecha; las caras se inclinan un poco)
  //   El resto de opciones (alpha, sx, sy…) pasan a A.emoji.
  A.emojiTo = (ctx, e, x, y, size, dx, dy, o) => {
    o = Object.assign({}, o || {});
    const base = A.facing(e), sp = Math.hypot(dx || 0, dy || 0);
    if (base === undefined || sp < 1e-6) return A.emoji(ctx, e, x, y, size, o);
    const ang = Math.atan2(dy, dx), mode = o.mode || 'auto', side = Math.abs(Math.cos(base)) > 0.9;
    delete o.mode;
    const horiz = Math.abs(dx) >= Math.abs(dy) * 1.2;
    if (side && (horiz || mode === 'flip')) {
      const goingLeft = dx < 0, lookLeft = Math.cos(base) < 0;
      if (goingLeft !== lookLeft) o.flip = !o.flip;
      if (mode !== 'flip' && !horiz) o.rot = (o.rot || 0) + (dy / sp) * (goingLeft ? -0.5 : 0.5);
    } else if (mode === 'flip') {
      o.rot = (o.rot || 0) + Math.max(-0.35, Math.min(0.35, (dx / sp) * 0.35)) * (Math.sin(base) > 0 ? -1 : 1);
    } else {
      let r = ang - base;
      if (side && Math.cos(ang) * Math.cos(base) < 0) { o.flip = !o.flip; r = ang - (Math.PI - base); } // volteado: ahora mira al lado contrario
      o.rot = (o.rot || 0) + r;
    }
    A.emoji(ctx, e, x, y, size, o);
  };

  /* ---------- audio: los juegos piden sonidos y Java los sintetiza (Synth.java) ---------- */
  // Cada sonido son 8 números: [tipo, a, b, c, d, e, f, eco]
  //   tipo 0 = tono  [0, frecuencia, duración, onda, volumen, deslizamiento, retardo, eco]  (onda: 0 square 1 sawtooth 2 triangle 3 sine)
  //   tipo 1 = ruido [1, duración, volumen, frecuencia del filtro (0 = sin filtro), retardo, 0, 0, eco]
  //   tipo 2 = vibración [2, milisegundos, 0, 0, 0, 0, 0, 0]
  const SQ = [];
  const WAVES = { square: 0, sawtooth: 1, triangle: 2, sine: 3 };
  A.muted = A.get('muted', false);
  A.musicOn = false;   // en el reloj no hay música de fondo (batería y altavoz pequeño)
  A.voice = { wave: 'square', mul: 1, echo: 0.18 };
  A.audio = () => null;
  A.tone = (f, d = 0.1, type = 'square', v = 0.1, slide = 0, delay = 0) => {
    if (A.muted || SQ.length > 400) return;
    f *= A.voice.mul;
    SQ.push(0, f, d, WAVES[type] ?? 0, v, slide ? slide * A.voice.mul : 0, delay, A.voice.echo || 0);
  };
  A.noise = (d = 0.3, v = 0.2, freq = 0, delay = 0) => { if (A.muted || SQ.length > 400) return; SQ.push(1, d, v, freq, delay, 0, 0, A.voice.echo || 0); };
  A.buzz = (ms) => { if (A.muted) return; const t = Array.isArray(ms) ? ms.reduce((a, b) => a + b, 0) : +ms || 0; if (t > 0) SQ.push(2, Math.min(600, t), 0, 0, 0, 0, 0, 0); };
  G.__takeSounds = () => { const a = new Float32Array(SQ); SQ.length = 0; return a; };

  A.sfx = {
    pop() { A.tone(520, 0.08, A.voice.wave, 0.08, 420); },
    coin() { A.tone(988, 0.07, A.voice.wave, 0.07); A.tone(1319, 0.14, A.voice.wave, 0.07, 0, 0.06); },
    hit() { A.tone(200, 0.32, 'sawtooth', 0.12, -140); A.noise(0.18, 0.12, 900); },
    boom() { A.noise(0.5, 0.3, 1200); A.tone(90, 0.45, 'sine', 0.3, -50); },
    win() { [0, 4, 7, 12, 16].forEach((n, i) => A.tone(523 * Math.pow(2, n / 12), 0.18, A.voice.wave, 0.09, 0, i * 0.08)); A.tone(1046, 0.5, 'triangle', 0.08, 0, 0.42); },
    lose() { [7, 5, 3, 0, -5].forEach((n, i) => A.tone(392 * Math.pow(2, n / 12), 0.22, 'sawtooth', 0.07, 0, i * 0.14)); },
    tick() { A.tone(760, 0.03, A.voice.wave, 0.035); },
    move() { A.tone(300, 0.05, 'triangle', 0.08, 60); },
    up() { A.tone(400, 0.16, A.voice.wave, 0.08, 520); A.tone(800, 0.12, 'triangle', 0.05, 400, 0.08); },
    bad() { A.tone(150, 0.12, 'square', 0.07, -30); },
    whoosh() { A.noise(0.25, 0.12, 2400); },
    combo(n) { A.tone(523 * Math.pow(2, Math.min(n, 12) / 12), 0.1, A.voice.wave, 0.08); A.tone(784 * Math.pow(2, Math.min(n, 12) / 12), 0.14, 'triangle', 0.06, 0, 0.05); },
  };

  /* ---------- música: en el reloj no hay ---------- */
  const M = (A.music = { song: null, playing: false, rate: 1, start() {}, stop() {} });

  /* ---------- modo e idioma ---------- */
  A.config = { modo: 'automatico', jugadoresMax: 1, rondasMultijugador: 1 };
  A.tv = false;
  A.single = true;
  A.lang = 'es';
  let EN = false;
  const T = (es, en) => (EN ? en : es);
  A.T = T;
  const COMMON_EN = { 'Nivel': 'Level', 'nivel': 'level', 'Oleada': 'Wave', 'oleada': 'wave', 'Ronda': 'Round', 'ronda': 'round', 'Velocidad': 'Speed', 'velocidad': 'speed',
    '¡Vamos!': "Let's go!", 'Quedan ': 'Left: ', 'Siguiente': 'Next', 'Más rápido': 'Faster', '¡Perfecto!': 'Perfect!', 'Jugador ': 'Player ' };
  let FR = []; const tcache = new Map();
  A.setDict = (d) => { FR = Object.entries(Object.assign({}, COMMON_EN, d || {})).sort((a, b) => b[0].length - a[0].length); tcache.clear(); };
  A.setDict({});
  A.L = (s) => {
    if (!EN || typeof s !== 'string') return s;
    let r = tcache.get(s); if (r !== undefined) return r;
    r = s; for (const [a, b] of FR) if (r.indexOf(a) >= 0) r = r.split(a).join(b);
    r = r.replace(/[¡¿]/g, '');
    if (tcache.size > 3000) tcache.clear(); tcache.set(s, r); return r;
  };

  /* =====================================================================================================
     Juegos registrados y partida
     ===================================================================================================== */
  const GAMES = [];
  A.game = (def) => { GAMES.push(def); return null; };
  let W = 300, H = 300, ctx = null, scene = 'boot', run = null, sel = 0, firstErr = null;
  const strip = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const hasArrows = (def) => !!def.key && /ArrowLeft|ArrowRight/.test(String(def.key));
  const MODES_CAP = (def) => def.cap || 20;

  /* textos en varias líneas, para la pantalla pequeña */
  function wrap(text, maxW, size, weight) {
    ctx.font = (weight || 700) + ' ' + Math.round(size) + 'px ' + A.FONT;
    const ws = String(text).split(' '), out = []; let cur = '';
    for (const w of ws) { const t2 = cur ? cur + ' ' + w : w; if (ctx.measureText(t2).width > maxW && cur) { out.push(cur); cur = w; } else cur = t2; }
    if (cur) out.push(cur);
    return out;
  }
  function lines(text, cx, y, maxW, size, color, weight, lh, maxLines) {
    let L = wrap(text, maxW, size, weight);
    if (maxLines && L.length > maxLines) { L = L.slice(0, maxLines); L[maxLines - 1] = L[maxLines - 1].replace(/[ ,.;:]*\S*$/, '') + '…'; }
    L.forEach((ln, i) => A.txt(ctx, ln, cx, y + i * size * (lh || 1.3), size, color, 'center', weight || 700));
    return L.length;
  }
  function pill(x, y, w, h, fill, text, size, color) {
    ctx.fillStyle = fill; A.rr(ctx, x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
    if (text) A.txt(ctx, text, x, y + 1, size, color || '#fff', 'center', 900);
  }
  const inBtn = (b, x, y) => b && Math.hypot(x - b.x, y - b.y) <= b.r;

  /* ---------- una partida: el mismo objeto g que en la web ---------- */
  function Runner(def) {
    const accent = def.color || '#ffcc33';
    const TFONT = FONTS[def.font] || FONTS.round;
    A.TFONT = TFONT;
    A.voice = Object.assign({ wave: 'square', mul: 1, echo: 0.18 }, def.voice || {});
    const CAP = MODES_CAP(def);
    if (def.levels === 0) { def.levels = CAP <= 16 ? 60 : CAP <= 20 ? 80 : CAP <= 25 ? 100 : 120; def.__inf = true; }
    const hasLevels = def.levels != null;
    const KEY = (k) => k + '_' + def.id;
    const unlockedOf = () => Math.min(A.get(KEY('lv'), 1), def.levels || 1);
    const lvOf = (n) => {
      if (!hasLevels) return Math.min(n, def.cap || 1e9);
      const f = Math.min(1, Math.max(0, (n - 1) / Math.max(1, def.levels - 1)));
      return Math.round(1 + f * (CAP - 1));
    };
    const spdOf = () => {
      const f = hasLevels ? Math.min(1, (g.level - 1) / (def.levels * 0.3)) : Math.min(1, g.t / 60);
      const warm = Math.min(1, 0.45 + 0.55 * (g.lt || 0) / 2.5);
      return (0.85 + 0.15 * f) * warm;
    };
    const LV = A.L(def.levelLabel || 'Nivel');
    const g = {
      def, ctx, canvas: ctx.canvas, W, H, top: Math.round(H * 0.16), bot: Math.round(H * 0.94), t: 0, rt: 0,
      score: 0, level: 1, lives: def.lives ?? 3, state: 'menu', s: {},
      pointers: new Map(), parts: [], floats: [], rings: [], amb: [], shakeT: 0, shakeA: 0, banner: null,
      flashT: 0, flashC: '#fff', iris: 0, lvLives: 0, demoOn: false, mp: null,
      best: A.get(KEY('best'), 0), unlocked: unlockedOf(),
      fc: { e: '😀', kind: 'idle', t: 0, next: 3 },
    };
    let ov = null, scoreBump = 0, lastScore = 0;
    /* --- cara del protagonista --- */
    g.face = () => g.fc.e;
    g.mood = (kind, dur = 1.2) => {
      const f = g.fc; if (!A.FACES[kind]) kind = 'idle';
      if (f.t > 0 && (MOOD_PRI[f.kind] || 0) > (MOOD_PRI[kind] || 0)) return;
      let e = A.pick(A.FACES[kind]); if (e === f.e && A.FACES[kind].length > 1) e = A.pick(A.FACES[kind]);
      f.kind = kind; f.e = e; f.t = dur;
    };
    function updFace(dt) {
      const f = g.fc;
      if (f.t > 0) { f.t -= dt; if (f.t <= 0) { f.kind = 'idle'; f.e = A.pick(A.FACES.idle.slice(0, 6)); f.next = A.rand(2, 4); } return; }
      f.next -= dt; if (f.next <= 0) { f.e = A.pick(A.FACES.idle); f.next = A.rand(2.5, 6); }
    }
    Object.defineProperty(g, 'lv', { get() { return lvOf(g.level); } });
    Object.defineProperty(g, 'mode', { get() { return 'normal'; } });
    Object.defineProperty(g, 'speed', { get() { return spdOf(); } });
    A.current = g;
    g.hud = () => {};
    g.demoSay = () => {};
    /* --- efectos (igual que en la web) --- */
    g.float = (text, x, y, color, size) => g.floats.push({ text: A.L(String(text)), x, y, color: color || '#fff', size: size || 22, life: 1 });
    g.addScore = (n, x, y, color) => {
      g.score += n;
      if (n > 0) g.mood(n >= 300 ? 'money' : n >= 50 ? 'laugh' : 'happy', n >= 50 ? 1.1 : 0.7); else if (n < 0) g.mood('sad', 1);
      if (x != null) {
        g.float((n > 0 ? '+' : '') + n, x, y, color || '#ffe066', n >= 500 ? 30 : n >= 100 ? 24 : 20);
        if (n >= 100) g.ring(x, y, n >= 500 ? '#ffd43b' : accent, 36 + Math.min(n, 1500) / 18, n >= 500 ? 6 : 4);
        if (n >= 500) g.burst(x, y, { n: 10, emoji: '✨', size: 14, speed: 180, grav: 40 });
      }
    };
    const scCache = new Map();
    g.scenery = (list, n, o = {}) => {
      const y0 = o.y0 ?? g.top, y1 = o.y1 ?? g.bot, key = list.join('') + '|' + n + '|' + Math.round(g.W) + '|' + Math.round(y0) + '|' + Math.round(y1);
      let pts = scCache.get(key);
      if (!pts) {
        const r = rng(hash(def.id + key)), sz = o.size || [16, 30]; pts = [];
        for (let i = 0; i < n; i++) pts.push({ x: r() * g.W, y: y0 + r() * (y1 - y0), e: list[Math.floor(r() * list.length)], s: sz[0] + r() * (sz[1] - sz[0]), rot: (r() - 0.5) * (o.rot ?? 0.5), ph: r() * TAU });
        if (scCache.size > 24) scCache.clear(); scCache.set(key, pts);
      }
      for (const p of pts) A.emoji(ctx, p.e, p.x, p.y + (o.bob ? Math.sin(g.rt * 1.5 + p.ph) * o.bob : 0), p.s, { alpha: o.alpha ?? 0.25, rot: p.rot });
    };
    g.burst = (x, y, o = {}) => {
      const n = Math.min(o.n || 12, 24);   // el reloj va justo de potencia: como mucho 24 partículas por estallido
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, sp = (o.speed || 180) * (0.4 + Math.random() * 0.8);
        g.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up || 0), life: o.life || 0.7, max: o.life || 0.7,
          color: o.color ? (Array.isArray(o.color) ? A.pick(o.color) : o.color) : null, emoji: o.emoji || null,
          size: o.size || 4, grav: o.grav ?? 300, rot: Math.random() * 6, sq: o.square });
      }
    };
    g.ring = (x, y, color, r = 60, w = 4) => g.rings.push({ x, y, color: color || '#fff', r, w, t: 0 });
    g.flash = (color = '#fff', t = 0.18) => { g.flashC = color; g.flashT = t; g.flashMax = t; };
    g.confetti = (n = 60) => {
      const cols = ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7', '#da77f2', '#ff922b', accent];
      n = Math.min(n, 40);
      for (let i = 0; i < n; i++) g.parts.push({ x: Math.random() * g.W, y: g.top - 20 - Math.random() * 80, vx: A.rand(-60, 60), vy: A.rand(60, 220), life: 2.4, max: 2.4, color: A.pick(cols), size: A.rand(2.5, 5), grav: 60, rot: Math.random() * 6, sq: true });
    };
    g.shake = (t = 0.3, a = 8) => { g.shakeT = t; g.shakeA = a; };
    g.message = (text, dur = 1.4, sub) => { g.banner = { text: A.L(String(text)), sub: sub ? A.L(String(sub)) : sub, t: dur, max: dur }; };
    /* --- ambiente --- */
    function initAmbient() {
      g.amb = []; const a = def.ambient; if (!a) return;
      const n = Math.min(a.n || 12, 10);
      for (let i = 0; i < n; i++) g.amb.push({ x: Math.random() * g.W, y: Math.random() * g.H, s: A.rand(a.size ? a.size[0] : 10, a.size ? a.size[1] : 22), e: A.pick(a.e), ph: Math.random() * TAU, sp: A.rand(0.6, 1.4) });
    }
    function updAmbient(dt) {
      const a = def.ambient; if (!a) return;
      for (const p of g.amb) {
        p.ph += dt * p.sp;
        const vy = (a.vy ?? 25) * p.sp, vx = (a.vx ?? 0) * p.sp;
        p.y += vy * dt; p.x += vx * dt + Math.sin(p.ph) * (a.sway ?? 12) * dt;
        if (p.y > g.H + 30) { p.y = -20; p.x = Math.random() * g.W; }
        if (p.y < -30) { p.y = g.H + 20; p.x = Math.random() * g.W; }
        if (p.x > g.W + 30) p.x = -20; if (p.x < -30) p.x = g.W + 20;
      }
    }
    function drawAmbient() {
      const a = def.ambient; if (!a) return;
      const al = a.alpha ?? 0.22;
      for (const p of g.amb) A.emoji(ctx, p.e, p.x, p.y, p.s, { alpha: a.twinkle ? al * (0.5 + 0.5 * Math.sin(p.ph * 3)) : al, rot: a.spin ? p.ph : 0 });
    }
    /* --- vidas, fin y niveles --- */
    g.die = function () {
      if (g.state !== 'play') return false;
      g.lives--; A.sfx.hit(); g.mood('hurt', 1.8); A.buzz(180); g.shake(0.35, 10); g.flash('#ff3b3b', 0.25);
      if (g.lives <= 0) { g.state = 'dying'; setTimeout(g.over, 900); return false; }
      return true;
    };
    function saveBest() { if (g.score > g.best) { g.best = g.score; A.set(KEY('best'), g.best); return true; } return false; }
    g.over = function () {
      if (g.state === 'over' || g.state === 'menu' || g.state === 'gone') return;
      g.state = 'over'; A.sfx.lose(); g.fc.t = 0; g.mood('sad', 99);
      ov = { kind: 'over', t: 0, rec: saveBest() };
    };
    g.win = function (stars) {
      if (g.state !== 'play') return;
      g.state = 'win'; A.sfx.win(); A.buzz([40, 60, 40]); g.fc.t = 0; g.mood('win', 99);
      if (stars == null) { const lost = g.lvLives - g.lives; stars = def.lives === 0 ? 3 : lost <= 0 ? 3 : lost === 1 ? 2 : 1; }
      if (g.level + 1 > g.unlocked && g.level < def.levels) { g.unlocked = g.level + 1; A.set(KEY('lv'), g.unlocked); }
      saveBest(); g.confetti(40); g.flash('#ffffff', 0.25);
      ov = { kind: g.level >= def.levels ? 'done' : 'win', t: 0, stars };
    };
    function begin() {
      g.parts = []; g.floats = []; g.rings = []; g.banner = null; g.pointers.clear(); g.lt = 0; ov = null;
      g.s = {}; def.setup(g); def.layout && def.layout(g);
      g.state = 'play'; g.iris = 0.001; g.lvLives = g.lives; g.fc.t = 0; g.mood('happy', 1);
      if (hasLevels) g.message(LV + ' ' + g.level, 1.3); else g.message('¡Vamos!', 1);
      A.sfx.whoosh();
    }
    function start(level) { g.level = level || 1; g.score = 0; g.lives = def.lives ?? 3; g.t = 0; begin(); if (def.onStart) def.onStart(g); }
    g.restart = () => start(hasLevels ? g.level : 1);
    function next() { g.level++; begin(); }
    function pause() { if (g.state !== 'play') return; g.state = 'pause'; ov = { kind: 'pause', t: 0 }; for (const p of [...g.pointers.values()]) endPtr(p, true); }
    function resume() { g.state = 'play'; ov = null; }

    /* --- entrada (igual que en la web: down/move/up y, si procede, tap o swipe) --- */
    function endPtr(p, cancel) {
      g.pointers.delete(p.id);
      if (g.state !== 'play') return;
      if (def.up) def.up(g, p);
      if (cancel) return;
      const dx = p.x - p.sx, dy = p.y - p.sy, d = Math.hypot(dx, dy), dt = CLOCK - p.t0;
      if (d < 16 && dt < 400) { if (def.tap) def.tap(g, p); }
      else if (d > 28 && dt < 700 && def.swipe) {
        const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        g.swipeFx = { x0: p.sx, y0: p.sy, x1: p.x, y1: p.y, t: 0.2 }; def.swipe(g, dir, p);
      }
    }
    const R = {
      g, def,
      start(level) { start(level || (hasLevels ? g.unlocked : 1)); },
      input(type, id, x, y) {
        if (ov) { if (type === 2) ovTap(x, y); return; }
        if (type === 0) {
          const p = { id, x, y, sx: x, sy: y, t0: CLOCK, type: 'touch' };
          g.pointers.set(id, p);
          if (g.state === 'play') { g.tapFx = { x, y, t: 0.25 }; if (def.down) def.down(g, p); }
        } else {
          const p = g.pointers.get(id); if (!p) return;
          p.x = x; p.y = y;
          if (type === 1) { if (g.state === 'play' && def.move) def.move(g, p); }
          else endPtr(p, type === 3);
        }
      },
      key(k, down) { if (ov) { if (down && (k === ' ' || k === 'Enter')) ovTap(W / 2, H / 2); return; } if (g.state === 'play' && def.key) def.key(g, k, down); },
      rotary(d) {
        if (ov || g.state !== 'play' || !hasArrows(def)) return;
        const k = d > 0 ? 'ArrowRight' : 'ArrowLeft';
        def.key(g, k, true); setTimeout(() => { if (g.state === 'play') def.key(g, k, false); }, 70);
      },
      back() {   // true = la partida lo ha gestionado; false = volver a la lista de juegos
        if (g.state === 'play' || g.state === 'dying') { if (g.state === 'play') pause(); else { g.state = 'gone'; return false; } return true; }
        return false;
      },
      pause() { pause(); },
      step,
    };
    /* --- pantallas encima del juego (pausa, fin, nivel superado) --- */
    const MENU_BTN = () => ({ x: W / 2, y: H * 0.86, r: 24 });
    function ovTap(x, y) {
      if (!ov || ov.t < 0.45) return;   // evita el toque «de rebote» justo al perder
      A.sfx.tick();
      if (inBtn(MENU_BTN(), x, y)) { g.state = 'gone'; ov = null; toLauncher(); return; }
      if (ov.kind === 'pause') resume();
      else if (ov.kind === 'over') g.restart();
      else if (ov.kind === 'win') next();
      else if (ov.kind === 'done') start(1);
    }
    function drawOverlay(dt) {
      ov.t += dt;
      const k = Math.min(1, ov.t * 4), cx = W / 2;
      ctx.globalAlpha = 0.72 * k; ctx.fillStyle = '#0b0820'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = k;
      const pop = 0.6 + 0.4 * Math.min(1, ov.t * 3);
      if (ov.kind === 'pause') {
        A.emoji(ctx, '⏸️', cx, H * 0.33, 54 * pop);
        A.txt(ctx, T('Pausa', 'Paused'), cx, H * 0.52, 26, '#fff', 'center', 900, null, TFONT);
        A.txt(ctx, T('Toca para seguir', 'Tap to resume'), cx, H * 0.64, 15, '#ffe066', 'center', 800);
      } else if (ov.kind === 'over') {
        A.emoji(ctx, '💥', cx, H * 0.24, 46 * pop);
        A.txt(ctx, T('Fin de la partida', 'Game over'), cx, H * 0.39, 19, '#fff', 'center', 900, null, TFONT);
        A.txt(ctx, String(g.score), cx, H * 0.52, 44 * pop, '#ffd43b', 'center', 900, 'rgba(0,0,0,.5)', TFONT);
        A.txt(ctx, ov.rec && g.score > 0 ? '🏆 ' + T('¡Nuevo récord!', 'New record!') : T('Récord', 'Best') + ': ' + g.best, cx, H * 0.635, 14, ov.rec ? '#ffd43b' : '#ced4da', 'center', 800);
        A.txt(ctx, '🔄 ' + T('Toca para reintentar', 'Tap to retry'), cx, H * 0.735, 14, '#fff', 'center', 800);
      } else {
        const done = ov.kind === 'done';
        A.emoji(ctx, done ? '🏆' : '🎉', cx, H * 0.24, 46 * pop);
        A.txt(ctx, done ? T('¡Juego completado!', 'Game complete!') : LV + ' ' + g.level + ' ' + T('superado', 'cleared'), cx, H * 0.39, 19, '#fff', 'center', 900, null, TFONT);
        for (let i = 0; i < 3; i++) { const on = i < ov.stars, sk = Math.min(1, Math.max(0, (ov.t - 0.15 - i * 0.18) * 5)); A.emoji(ctx, '⭐', cx + (i - 1) * 34, H * 0.505, (on ? 30 : 24) * (0.4 + 0.6 * sk), { alpha: on ? sk : 0.25 }); }
        A.txt(ctx, String(g.score), cx, H * 0.625, 22, '#ffd43b', 'center', 900, 'rgba(0,0,0,.5)', TFONT);
        A.txt(ctx, done ? '🔄 ' + T('Toca: otra vez', 'Tap: play again') : '▶ ' + T('Toca:', 'Tap:') + ' ' + LV.toLowerCase() + ' ' + (g.level + 1), cx, H * 0.735, 14, '#fff', 'center', 800);
      }
      const b = MENU_BTN();
      ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      A.txt(ctx, '☰', b.x, b.y + 1, 20, '#fff', 'center', 900);
      ctx.globalAlpha = 1;
    }
    /* --- marcador para pantalla redonda: puntos arriba en el centro y vidas debajo --- */
    function drawHud(dt) {
      if (g.score !== lastScore) { scoreBump = 1; lastScore = g.score; } scoreBump = Math.max(0, scoreBump - dt * 5);
      const s = String(g.score), sz = 15 * (1 + scoreBump * 0.25);
      ctx.font = '900 15px ' + A.FONT; const w = Math.max(44, ctx.measureText(s).width + 26);
      pill(W / 2, H * 0.072, w, 22, 'rgba(0,0,0,.45)', '', 0);
      A.txt(ctx, s, W / 2, H * 0.072 + 1, sz, '#fff', 'center', 900);
      if (def.lives !== 0 && g.lives > 0) {
        const ic = def.lifeIcon || '❤️', n = g.lives;
        if (n <= 5) for (let i = 0; i < n; i++) A.emoji(ctx, ic, W / 2 + (i - (n - 1) / 2) * 13, H * 0.125, 11);
        else A.txt(ctx, ic + '×' + n, W / 2, H * 0.125, 11, '#fff', 'center', 800);
      }
    }
    let vign = null;
    function step(dt) {
      g.rt += dt;
      if (g.state === 'play') updFace(dt);
      const live = g.state === 'play' || g.state === 'dying';
      if (g.state === 'play') { g.lt = (g.lt || 0) + dt; const sdt = dt * g.speed; g.t += sdt; def.update(g, sdt); }
      updAmbient(dt);
      if (live || ov) {
        for (const p of g.parts) { p.life -= dt; p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 4; }
        g.parts = g.parts.filter((p) => p.life > 0);
        for (const f of g.floats) { f.life -= dt * 0.9; f.y -= 40 * dt; }
        g.floats = g.floats.filter((f) => f.life > 0);
        for (const r of g.rings) r.t += dt * 2.2;
        g.rings = g.rings.filter((r) => r.t < 1);
        if (g.banner) { g.banner.t -= dt; if (g.banner.t <= 0) g.banner = null; }
      }
      if (g.flashT > 0) g.flashT -= dt;
      if (g.iris > 0) { g.iris += dt * 2.2; if (g.iris >= 1) g.iris = 0; }
      A.fdt = dt; A.fno++;
      ctx.save();
      if (g.shakeT > 0) { g.shakeT -= dt; ctx.translate((Math.random() - 0.5) * g.shakeA, (Math.random() - 0.5) * g.shakeA); }
      def.draw(g, ctx);
      drawAmbient();
      for (const r of g.rings) { ctx.globalAlpha = 1 - r.t; ctx.strokeStyle = r.color; ctx.lineWidth = r.w * (1 - r.t) + 1; ctx.beginPath(); ctx.arc(r.x, r.y, r.r * (0.2 + r.t * 0.8), 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = 1;
      for (const p of g.parts) {
        const al = Math.max(0, p.life / p.max);
        if (p.emoji) A.emoji(ctx, p.emoji, p.x, p.y, p.size, { alpha: al, rot: p.rot });
        else if (p.sq) { ctx.globalAlpha = Math.min(1, al * 2); ctx.fillStyle = p.color; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size); ctx.restore(); ctx.globalAlpha = 1; }
        else { ctx.globalAlpha = al; ctx.fillStyle = p.color || '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.5 + al * 0.5), 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
      }
      if (g.tapFx && g.state === 'play') { const f = g.tapFx; f.t -= dt; if (f.t > 0) { ctx.globalAlpha = f.t * 2; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, f.y, Math.max(1, 26 - f.t * 60), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; } }
      if (g.swipeFx) { const f = g.swipeFx; f.t -= dt; if (f.t > 0) { ctx.globalAlpha = f.t * 2.5; ctx.strokeStyle = accent; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(f.x0, f.y0); ctx.lineTo(f.x1, f.y1); ctx.stroke(); ctx.globalAlpha = 1; } else g.swipeFx = null; }
      for (const f of g.floats) {
        const pop = 1 + Math.max(0, f.life - 0.82) * 3;
        ctx.globalAlpha = Math.min(1, f.life * 2);
        A.txt(ctx, f.text, f.x, f.y, f.size * pop, f.color, 'center', 900, 'rgba(0,0,0,.6)', TFONT);
        ctx.globalAlpha = 1;
      }
      if (!vign) { vign = ctx.createRadialGradient(W / 2, H / 2, W * 0.36, W / 2, H / 2, W * 0.56); vign.addColorStop(0, 'rgba(0,0,0,0)'); vign.addColorStop(1, 'rgba(0,0,0,0.45)'); }
      ctx.fillStyle = vign; ctx.fillRect(0, 0, W, H);
      if (g.banner) {
        const b = g.banner, k = Math.min(1, (b.max - b.t) * 6, b.t * 3), sc = 0.7 + 0.3 * Math.min(1, (b.max - b.t) * 5);
        ctx.globalAlpha = k;
        ctx.save(); ctx.translate(W / 2, H * 0.42); ctx.scale(sc, sc);
        const fs = Math.min(36, W / 8.5);
        A.txt(ctx, b.text, 2, 3, fs, 'rgba(0,0,0,.45)', 'center', 900, null, TFONT);
        A.txt(ctx, b.text, 0, 0, fs, '#fff', 'center', 900, accent, TFONT);
        if (b.sub) A.txt(ctx, b.sub, 0, fs * 0.95, 14, '#fff', 'center', 800, 'rgba(0,0,0,.6)');
        ctx.restore(); ctx.globalAlpha = 1;
      }
      if (g.flashT > 0) { ctx.globalAlpha = Math.max(0, g.flashT / g.flashMax) * 0.45; ctx.fillStyle = g.flashC; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
      if (g.iris > 0) {
        const r = Math.hypot(W, H) * 0.6 * Math.pow(g.iris, 1.4);
        ctx.fillStyle = def.bg ? def.bg[1] : '#000'; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(W / 2, H / 2, Math.max(1, r), 0, TAU, true); ctx.fill('evenodd');
      }
      ctx.restore();
      if (g.state !== 'gone' && !ov) drawHud(dt);
      if (ov) drawOverlay(dt);
    }
    g.s = {}; def.setup(g); def.layout && def.layout(g);
    initAmbient();
    return R;
  }

  /* =====================================================================================================
     Lista de juegos (pantalla de inicio): un juego cada vez, se cambia con la corona, deslizando o con ‹ ›
     ===================================================================================================== */
  const LCH = { t: 0, slide: 0, dir: 0, help: null, swipe: null };
  function toLauncher() { timers.length = 0; run = null; scene = 'launcher'; LCH.t = 0; LCH.help = null; A.current = null; }
  function choose(d) {
    if (!GAMES.length) return;
    sel = (sel + d + GAMES.length) % GAMES.length; A.set('watch_sel', sel);
    LCH.slide = 1; LCH.dir = d; A.sfx.tick(); A.buzz(8);
  }
  function play() {
    const def = GAMES[sel]; if (!def) return;
    const seen = A.get('seen_' + def.id, false);
    if (!seen && !LCH.help) { LCH.help = { t: 0 }; A.sfx.tick(); return; }
    A.set('seen_' + def.id, true); LCH.help = null;
    try { run = Runner(def); scene = 'game'; run.start(); }
    catch (e) { fail(e); }
  }
  const ARROW_L = () => ({ x: W * 0.085, y: H / 2, r: 30 }), ARROW_R = () => ({ x: W * 0.915, y: H / 2, r: 30 });
  function launcherInput(type, id, x, y) {
    if (type === 0) LCH.swipe = { x, y, t0: CLOCK };
    if (type !== 2 || !LCH.swipe) return;
    const s = LCH.swipe, dx = x - s.x, dy = y - s.y; LCH.swipe = null;
    if (LCH.help) { if (LCH.help.t > 0.3) play(); return; }
    if (Math.abs(dx) > 34 && Math.abs(dx) > Math.abs(dy)) { choose(dx < 0 ? 1 : -1); return; }
    if (Math.hypot(dx, dy) > 20) return;
    if (inBtn(ARROW_L(), x, y)) choose(-1); else if (inBtn(ARROW_R(), x, y)) choose(1); else play();
  }
  function bgOf(def) { return def.bg || ['#2b1a5c', '#1a1033']; }
  function drawLauncher(dt) {
    LCH.t += dt; LCH.slide = Math.max(0, LCH.slide - dt * 5);
    const def = GAMES[sel];
    if (!def) { ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H); A.txt(ctx, 'Sin juegos', W / 2, H / 2, 18); return; }
    const bg = bgOf(def), gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, bg[0]); gr.addColorStop(1, bg[1]); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    const off = LCH.slide * LCH.dir * W * 0.35, al = 1 - LCH.slide * 0.8;
    // puntos de página
    const n = GAMES.length, dw = 9;
    for (let i = 0; i < n; i++) { ctx.fillStyle = i === sel ? '#fff' : 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(W / 2 + (i - (n - 1) / 2) * dw, H * 0.075, i === sel ? 3.2 : 2.3, 0, TAU); ctx.fill(); }
    if (LCH.help) { drawHelp(def, dt); return; }
    ctx.save(); ctx.translate(off, 0); ctx.globalAlpha = al;
    // halo y mascota
    const cy = H * 0.36, bounce = Math.sin(LCH.t * 2.4) * 4;
    const halo = ctx.createRadialGradient(W / 2, cy, 4, W / 2, cy, W * 0.24);
    halo.addColorStop(0, 'rgba(255,255,255,.35)'); halo.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(W / 2, cy, W * 0.24, 0, TAU); ctx.fill();
    A.emoji(ctx, def.emoji || '🎮', W / 2, cy + bounce, W * 0.24, { rot: Math.sin(LCH.t * 1.3) * 0.08 });
    const title = EN && def.en && def.en.title ? def.en.title : def.title;
    const tf = FONTS[def.font] || FONTS.round;
    A.txt(ctx, title, W / 2, H * 0.6, Math.min(26, (W * 0.78) / Math.max(5, title.length) * 1.75), '#fff', 'center', 900, def.color || 'rgba(0,0,0,.5)', tf);
    const best = A.get('best_' + def.id, 0), lv = A.get('lv_' + def.id, 1);
    A.txt(ctx, '🏆 ' + best + (def.levels != null ? '   🚩 ' + lv : ''), W / 2, H * 0.695, 13, 'rgba(255,255,255,.9)', 'center', 800);
    const tag = EN && def.en && def.en.tag ? def.en.tag : def.tag || '';
    if (tag) lines(tag, W / 2, H * 0.76, W * 0.62, 11.5, 'rgba(255,255,255,.75)', 700, 1.2, 2);
    ctx.restore(); ctx.globalAlpha = 1;
    const blink = 0.85 + 0.15 * Math.sin(LCH.t * 4);
    ctx.globalAlpha = blink; pill(W / 2, H * 0.9, 104, 26, def.color || '#ffd43b', '▶ ' + T('Jugar', 'Play'), 14, '#1b1b2f'); ctx.globalAlpha = 1;
    if (n > 1) for (const [b, s] of [[ARROW_L(), '‹'], [ARROW_R(), '›']]) A.txt(ctx, s, b.x, b.y, 34, 'rgba(255,255,255,.7)', 'center', 900);
  }
  function drawHelp(def, dt) {
    const h = LCH.help; h.t += dt;
    const help = strip(EN && def.en && def.en.help ? def.en.help : def.help);
    const first = help.split(/(?<=[.!?])\s+/)[0] || help;
    A.emoji(ctx, def.emoji || '🎮', W / 2, H * 0.2, 34);
    A.txt(ctx, T('¿Cómo se juega?', 'How to play'), W / 2, H * 0.32, 15, '#ffe066', 'center', 900);
    const nl = lines(first, W / 2, H * 0.42, W * 0.74, 13.5, '#fff', 700, 1.3, 6);
    if (hasArrows(def)) A.txt(ctx, '⌚ ' + T('También con la corona ↻', 'Also with the crown ↻'), W / 2, H * 0.42 + nl * 17.5 + 6, 12, 'rgba(255,255,255,.8)', 'center', 800);
    pill(W / 2, H * 0.88, 110, 26, def.color || '#ffd43b', T('¡Entendido!', 'Got it!'), 13, '#1b1b2f');
  }
  function fail(e) {
    firstErr = String(e && e.message || e); log('ERROR: ' + firstErr + '\n' + (e && e.stack || ''));
    run = null; scene = 'error';
  }
  function drawError() {
    ctx.fillStyle = '#300'; ctx.fillRect(0, 0, W, H);
    A.txt(ctx, '😵 Error', W / 2, H * 0.3, 22, '#fff');
    lines(firstErr || '', W / 2, H * 0.45, W * 0.7, 11, '#fcc', 600, 1.3, 6);
    A.txt(ctx, T('Toca para volver', 'Tap to go back'), W / 2, H * 0.85, 12, '#fff');
  }

  /* =====================================================================================================
     Lo que llama Java
     ===================================================================================================== */
  // __init(idioma, lado): idioma ('es' | 'en') y lado del lienzo lógico, que es cuadrado (el reloj lo escala). Antes de cargar los juegos.
  G.__init = (lang, size) => {
    W = H = +size || 300; A.lang = lang === 'en' ? 'en' : 'es'; EN = A.lang === 'en';
    ctx = new G.__Ctx({ width: W, height: H });
    A.ctx = ctx;
  };
  // __start(): después de cargar los juegos. Traduce sus textos y abre la lista.
  G.__start = () => {
    for (const def of GAMES) if (EN && def.en) { def.title = def.en.title || def.title; def.tag = def.en.tag || def.tag; def.help = def.en.help || def.help; }
    sel = Math.min(Math.max(0, A.get('watch_sel', 0) | 0), Math.max(0, GAMES.length - 1));
    toLauncher();
    return GAMES.length;
  };
  G.__gameIds = () => GAMES.map((d) => d.id).join(',');
  // __frame(ms): avanza y pinta un fotograma; devuelve cuántos números hay en el búfer de órdenes
  G.__frame = (ms) => {
    let dt = (+ms || 0) / 1000; if (dt > 0.05) dt = 0.05; if (dt < 0) dt = 0;
    CLOCK += dt * 1000;
    G.__cmdReset(); ctx._frameStart();
    runTimers();
    try {
      if (scene === 'game' && run) run.step(dt);
      else if (scene === 'error') drawError();
      else drawLauncher(dt);
    } catch (e) { fail(e); G.__cmdReset(); ctx._frameStart(); drawError(); }
    return G.__cmdLen();
  };
  // __input(tipo, id, x, y): 0 = baja el dedo, 1 = se mueve, 2 = se levanta, 3 = cancelado. Coordenadas lógicas.
  G.__input = (type, id, x, y) => {
    try {
      if (scene === 'game' && run) run.input(type, id, x, y);
      else if (scene === 'error') { if (type === 2) toLauncher(); }
      else launcherInput(type, id, x, y);
    } catch (e) { fail(e); }
  };
  // __rotary(pasos): corona o bisel; positivo = sentido horario
  G.__rotary = (d) => {
    try {
      if (scene === 'game' && run) run.rotary(d);
      else if (scene === 'launcher' && !LCH.help) choose(d > 0 ? 1 : -1);
    } catch (e) { fail(e); }
  };
  G.__key = (k, down) => { try { if (scene === 'game' && run) run.key(k, !!down); else if (down && scene === 'launcher') { if (k === 'ArrowLeft') choose(-1); else if (k === 'ArrowRight') choose(1); else if (k === ' ' || k === 'Enter') play(); } } catch (e) { fail(e); } };
  // __back(): botón o gesto de volver. Devuelve 1 si se ha usado y 0 si la app debe cerrarse.
  G.__back = () => {
    if (scene === 'game' && run) { if (run.back()) return 1; toLauncher(); return 1; }
    if (scene === 'error' || LCH.help) { LCH.help = null; toLauncher(); return 1; }
    return 0;
  };
  // __pause(): la app pasa a segundo plano o se apaga la pantalla
  G.__pause = () => { try { if (scene === 'game' && run) run.pause(); } catch (_) {} };
  G.__state = () => (scene === 'game' && run ? run.g.state : scene);
  G.__debug = () => JSON.stringify({ scene, sel, state: run && run.g.state, score: run && run.g.score, level: run && run.g.level, lives: run && run.g.lives, err: firstErr });
  // pruebas: elegir juego por id
  G.__select = (id) => { const i = GAMES.findIndex((d) => d.id === id); if (i >= 0) { sel = i; toLauncher(); } return i; };
})(globalThis);
