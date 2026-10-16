/* Arcade Perdido · motor común v2
   Arcade.game({ id, title, tag, emoji, color, origin, help, deco, font, bg, music, voice, ambient,
                 levels (n | 0 = infinitos | null = sin niveles), cap, lives,
                 setup(g), layout(g), update(g,dt), draw(g,ctx),
                 down/move/up/tap/swipe/hover(g,...), key(g,k,pressed) })               */
(function () {
  'use strict';
  const A = (window.Arcade = {});
  const TAU = Math.PI * 2;
  const EF = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla","EmojiOne Color",sans-serif';
  A.EF = EF;
  A.FONT = 'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
  const FONTS = {
    round: '"Arial Rounded MT Bold","SF Pro Rounded",ui-rounded,"Nunito","Varela Round",system-ui,sans-serif',
    serif: 'Georgia,"Palatino Linotype","Book Antiqua",Palatino,serif',
    mono: '"Courier New",ui-monospace,Menlo,Consolas,monospace',
    impact: 'Impact,Haettenschweiler,"Arial Narrow Bold","Arial Black",sans-serif',
    comic: '"Comic Sans MS","Chalkboard SE","Comic Neue",cursive,sans-serif',
    wide: '"Arial Black","Helvetica Neue",Arial,sans-serif',
    fancy: '"Trebuchet MS","Lucida Grande",Tahoma,sans-serif',
  };

  /* ---------- almacenamiento ---------- */
  A.get = (k, d) => { try { const v = localStorage.getItem('arc_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
  A.set = (k, v) => { try { localStorage.setItem('arc_' + k, JSON.stringify(v)); } catch (e) {} };

  /* ---------- utilidades ---------- */
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
  A.FALLBACK = { '🫐': '🍇', '🪨': '🌑', '🫧': '⚪', '🪐': '🌍', '🧊': '💎', '🥲': '😢', '🥹': '🥺', '🥱': '😪', '🪴': '🌱', '🪃': '🔄', '🦩': '🦢', '🪶': '🍃',
    '🤍': '💖', '🪵': '🌰', '🥶': '😨', '🪄': '✨', '🪞': '🔲', '🪀': '🎯', '🪁': '🎈', '🪽': '🕊️', '🪲': '🐞', '🪳': '🐜', '🛻': '🚚', '🪺': '🐣', '🪸': '🌿',
    '🪟': '🔲', '🪷': '🌸', '🪓': '🔨', '🧌': '👹', '🪢': '➰', '🪜': '📶', '🪅': '🎉', '🪱': '🐛', '🛞': '⚙️', '🪼': '🐙', '🪛': '🔧', '🪚': '🔨', '🪦': '⚰️',
    '🧄': '🧅', '🫥': '😶', '🟰': '=', '🧍': '🚶', '🥸': '🤓', '🪖': '⛑️', '🪣': '🥫', '🥏': '💿', '🧃': '🥤', '🪗': '🎹', '🫣': '🙈', '🪑': '💺',
    '🦭': '🐳', '🦨': '🦝', '🦧': '🦍', '🛺': '🚗', '🦼': '♿', '🛼': '⛸️', '🦫': '🐿️', '🦽': '♿', '🦦': '🦝', '🦤': '🦃', '🦯': '🦮' };
  const eok = new Map();
  let etc = null;
  function emojiOK(ch) {
    let v = eok.get(ch);
    if (v !== undefined) return v;
    v = true;
    try {
      if (!etc) { etc = document.createElement('canvas'); etc.width = etc.height = 64; etc = etc.getContext('2d', { willReadFrequently: true }); }
      const x = etc; x.clearRect(0, 0, 64, 64); x.font = '40px ' + EF; x.textBaseline = 'top';
      if (x.measureText(ch).width > x.measureText('😀').width * 1.35) v = false;  // secuencia ZWJ no soportada: salen dos dibujos
      else {
        x.fillStyle = '#f00'; x.fillText(ch, 4, 4);
        const d = x.getImageData(0, 0, 64, 64).data; let col = false, ink = false;
        for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 40) { ink = true; if (d[i + 1] > 30 || d[i + 2] > 30) { col = true; break; } }
        v = ink && col;  // un emoji en color ignora el rojo; un cuadrado «tofu» o nada sale rojo o vacío
      }
    } catch (_) { v = true; }
    eok.set(ch, v);
    return v;
  }
  function emojiFix(ch) {
    if (!A.FALLBACK[ch] && !SHAPE[ch] && ch.indexOf('\u200d') < 0) return ch;
    if (emojiOK(ch)) return ch;
    if (SHAPE[ch]) return SHAPE[ch];
    if (A.FALLBACK[ch]) return A.FALLBACK[ch];
    return ch.split('\u200d')[0];  // 🙂‍↔️ → 🙂
  }
  A.emojiFix = (ch) => { const f = emojiFix(ch); return typeof f === 'string' ? f : ch; };
  const ec = new Map();
  A.dpr = 1;
  A.emoji = (ctx, ch, x, y, size, o) => {
    size = Math.max(4, Math.round(size));
    const dpr = A.dpr, k = ch + '|' + size + '|' + dpr;
    let c = ec.get(k);
    if (!c) {
      c = document.createElement('canvas');
      const s = Math.ceil(size * 1.35 * dpr);
      c.width = c.height = s;
      const x2 = c.getContext('2d');
      const fx = emojiFix(String(ch));
      if (typeof fx !== 'string') {  // círculo o cuadrado de color dibujado a mano
        const r = size * dpr * 0.42, m = s / 2;
        const gr = x2.createRadialGradient(m - r * 0.35, m - r * 0.35, r * 0.1, m, m, r * 1.2);
        gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(0.35, fx[1]); gr.addColorStop(1, fx[1]);
        x2.fillStyle = gr; x2.beginPath();
        if (fx[0] === 'o') x2.arc(m, m, r, 0, TAU); else if (x2.roundRect) x2.roundRect(m - r, m - r, 2 * r, 2 * r, r * 0.25); else x2.rect(m - r, m - r, 2 * r, 2 * r);
        x2.fill(); x2.lineWidth = Math.max(1, r * 0.08); x2.strokeStyle = 'rgba(0,0,0,.25)'; x2.stroke();
      } else {
        x2.font = Math.round(size * dpr) + 'px ' + EF;
        x2.textAlign = 'center'; x2.textBaseline = 'middle';
        x2.fillText(fx, s / 2, s / 2 + size * dpr * 0.07);
      }
      c.cs = s / dpr;
      if (ec.size > 900) ec.clear();
      ec.set(k, c);
    }
    const w = c.cs;
    if (o) {
      ctx.save(); ctx.translate(x, y);
      if (o.rot) ctx.rotate(o.rot);
      if (o.flip) ctx.scale(-1, 1);
      if (o.sx || o.sy) ctx.scale(o.sx || 1, o.sy || 1);
      if (o.alpha != null) ctx.globalAlpha *= o.alpha;
      ctx.drawImage(c, -w / 2, -w / 2, w, w);
      ctx.restore();
    } else ctx.drawImage(c, x - w / 2, y - w / 2, w, w);
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

  /* ---------- audio ---------- */
  let ac = null, master = null, sfxBus = null, musBus = null, noiseBuf = null;
  A.muted = A.get('muted', false);
  A.musicOn = A.get('music', true);
  A.voice = { wave: 'square', mul: 1, echo: 0.18 };
  function actx() {
    if (!ac) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      try {
        ac = new C();
        master = ac.createGain(); master.gain.value = 0.9;
        const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
        master.connect(comp); comp.connect(ac.destination);
        sfxBus = ac.createGain(); sfxBus.connect(master);
        const dl = ac.createDelay(0.5), fb = ac.createGain(), wet = ac.createGain();
        dl.delayTime.value = 0.13; fb.gain.value = 0.28; wet.gain.value = A.voice.echo;
        sfxBus.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(master);
        musBus = ac.createGain(); musBus.gain.value = 0; musBus.connect(master);
        noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
        const ch = noiseBuf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
      } catch (e) { ac = null; return null; }
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  A.audio = actx;
  A.tone = (f, d = 0.1, type = 'square', v = 0.1, slide = 0, delay = 0) => {
    if (A.muted) return; const c = actx(); if (!c) return;
    f *= A.voice.mul;
    const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide * A.voice.mul), t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + d + 0.05);
  };
  A.noise = (d = 0.3, v = 0.2, freq = 0, delay = 0) => {
    if (A.muted) return; const c = actx(); if (!c) return;
    const t = c.currentTime + delay, s = c.createBufferSource(), g = c.createGain();
    s.buffer = noiseBuf; s.loop = true;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    if (freq) { const bq = c.createBiquadFilter(); bq.type = 'bandpass'; bq.Q.value = 1.2; bq.frequency.setValueAtTime(freq, t); bq.frequency.exponentialRampToValueAtTime(Math.max(60, freq * 0.25), t + d); s.connect(bq); bq.connect(g); }
    else s.connect(g);
    g.connect(sfxBus); s.start(t); s.stop(t + d + 0.05);
  };
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
  A.buzz = (ms) => { try { if (!A.muted && navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };

  /* ---------- música procedural ---------- */
  const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11],
    mixo: [0, 2, 4, 5, 7, 9, 10], harm: [0, 2, 3, 5, 7, 8, 11], phryg: [0, 1, 3, 5, 7, 8, 10] };
  const PROG = { major: [[0, 4, 5, 3], [0, 5, 3, 4], [0, 3, 4, 4], [5, 3, 0, 4], [0, 3, 0, 4]], minor: [[0, 5, 6, 4], [0, 3, 4, 4], [0, 6, 5, 6], [0, 5, 3, 4]] };
  const M = A.music = { song: null, playing: false, step: 0, nextT: 0, timer: null, rate: 1 };
  function buildSong(cfg, id) {
    const r = rng(hash(id + '|' + (cfg.seed || 0)));
    const mode = cfg.mode || 'major', sc = SCALES[mode] || SCALES.major;
    const minorish = /minor|dorian|harm|phryg/.test(mode);
    const prog = (minorish ? PROG.minor : PROG.major)[Math.floor(r() * 4)];
    const root = cfg.root || 57, style = cfg.style || 'arcade';
    const deg = (d) => root + 12 * Math.floor(d / sc.length) + sc[((d % sc.length) + sc.length) % sc.length];
    const N = 64, lead = new Array(N).fill(null), bass = new Array(N).fill(null), kick = [], snare = [], hat = [];
    const motifs = [0, 1].map(() => { const m = []; let d = Math.floor(r() * 3) * 2; for (let i = 0; i < 16; i++) { const rest = r() < (cfg.sparse || 0.32); d += [-2, -1, -1, 0, 1, 1, 2, 3, -3][Math.floor(r() * 9)]; d = Math.max(-2, Math.min(9, d)); m.push(rest ? null : { d, len: r() < 0.25 ? 2 : 1 }); } return m; });
    for (let bar = 0; bar < 4; bar++) {
      const ch = prog[bar], mot = motifs[bar === 3 ? 1 : bar % 2 === 0 ? 0 : (r() < 0.5 ? 0 : 1)];
      for (let i = 0; i < 16; i++) {
        const s = bar * 16 + i, n = mot[i];
        if (n) { const dd = n.d % 2 === 0 || style === 'chill' ? ch + n.d : ch + n.d; lead[s] = { m: deg(dd) + 12, len: n.len }; }
        const bpat = style === 'march' ? [0, 8] : style === 'chill' ? [0, 10] : style === 'waltz' ? [0, 6, 12] : style === 'drive' ? [0, 2, 4, 6, 8, 10, 12, 14] : [0, 4, 8, 12];
        if (bpat.includes(i)) bass[s] = { m: deg(ch) - 12 + (style === 'drive' && i % 4 === 2 ? 12 : 0), len: style === 'drive' ? 1 : 2 };
        if (style !== 'chill') { if (i === 0 || i === 8 || (style === 'drive' && i % 4 === 0) || (style === 'arcade' && i === 10 && r() < 0.5)) kick.push(s); if (i === 4 || i === 12) snare.push(s); }
        if ((style === 'chill' ? i % 4 === 2 : i % 2 === 1) && style !== 'waltz') hat.push(s);
        if (style === 'waltz' && (i === 4 || i === 8)) hat.push(s);
      }
    }
    return { bpm: cfg.bpm || 120, wave: cfg.wave || 'square', bwave: cfg.bwave || 'triangle', lead, bass, kick: new Set(kick), snare: new Set(snare), hat: new Set(hat), vol: cfg.vol || 1 };
  }
  function note(t, midi, dur, wave, v) {
    const f = 440 * Math.pow(2, (midi - 69) / 12), o = ac.createOscillator(), g = ac.createGain();
    o.type = wave; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(musBus); o.start(t); o.stop(t + dur + 0.05);
  }
  function drum(t, kind) {
    if (kind === 'k') { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12); g.gain.setValueAtTime(0.32, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16); o.connect(g); g.connect(musBus); o.start(t); o.stop(t + 0.2); return; }
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = kind === 's' ? 'bandpass' : 'highpass'; f.frequency.value = kind === 's' ? 1800 : 7000;
    const d = kind === 's' ? 0.12 : 0.04;
    g.gain.setValueAtTime(kind === 's' ? 0.16 : 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f); f.connect(g); g.connect(musBus); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.02);
  }
  function tick() {
    if (!M.playing || !ac || !M.song) return;
    const S = M.song, stepDur = 60 / (S.bpm * M.rate) / 4;
    while (M.nextT < ac.currentTime + 0.15) {
      const s = M.step % 64, t = M.nextT;
      const l = S.lead[s]; if (l) note(t, l.m, stepDur * l.len * 1.6, S.wave, 0.045 * S.vol);
      const b = S.bass[s]; if (b) note(t, b.m, stepDur * b.len * 1.8, S.bwave, 0.07 * S.vol);
      if (S.kick.has(s)) drum(t, 'k'); if (S.snare.has(s)) drum(t, 's'); if (S.hat.has(s)) drum(t, 'h');
      M.step++; M.nextT += stepDur;
    }
  }
  M.start = () => {
    if (!M.song || !A.musicOn) return; const c = actx(); if (!c) return;
    musBus.gain.cancelScheduledValues(c.currentTime); musBus.gain.setTargetAtTime(0.55, c.currentTime, 0.2);
    if (M.playing) return;
    M.playing = true; M.nextT = c.currentTime + 0.08;
    if (!M.timer) M.timer = setInterval(tick, 25);
  };
  M.stop = () => {
    if (!M.playing) return; M.playing = false;
    if (ac) { musBus.gain.cancelScheduledValues(ac.currentTime); musBus.gain.setTargetAtTime(0, ac.currentTime, 0.08); }
    clearInterval(M.timer); M.timer = null;
  };

  /* ---------- modo (normal / TV) ---------- */
  A.config = window.ARCADE_CONFIG || { modo: 'automatico', jugadoresMax: 4, rondasMultijugador: 5 };
  A.tv = typeof window.arcadeEsTV === 'function' ? window.arcadeEsTV() : /AFT|Android ?TV|GoogleTV/i.test(navigator.userAgent);
  if (A.tv) document.documentElement.classList.add('tv');

  /* ---------- idioma (es / en) ---------- */
  A.lang = typeof window.arcadeIdioma === 'function' ? window.arcadeIdioma() : (/^(es|ca|gl|eu)/i.test(navigator.language || 'es') ? 'es' : 'en');
  document.documentElement.lang = A.lang;
  const EN = A.lang === 'en';
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

  /* ---------- PWA ---------- */
  /* PWA (service worker + manifest) solo si la página pone window.withpwa = true; si no, se quitan (ver arcadePWA en config.js) */
  try { if (typeof window.arcadePWA === 'function') window.arcadePWA(); } catch (e) {}
  /* Por defecto cada juego es parte de la web: 🏠 a la portada, favoritos y tiempo de juego. window.isSingleGame = true
     → el juego va solo (para meterlo en una app Android o como PWA): sin portada, favoritos ni estadísticas. */
  A.single = window.isSingleGame === true;

  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  /* ---------- motor del juego ---------- */
  A.game = function (def) {
    const accent = def.color || '#ffcc33';
    const root = document.documentElement;
    root.style.setProperty('--accent', accent);
    if (def.bg) { root.style.setProperty('--bg1', def.bg[0]); root.style.setProperty('--bg2', def.bg[1]); root.style.setProperty('--bg', def.bg[1]); }
    const TFONT = FONTS[def.font] || FONTS.round;
    root.style.setProperty('--tfont', TFONT);
    A.TFONT = TFONT;
    if (def.voice) Object.assign(A.voice, def.voice);
    const TV = A.tv, rdef = def.tv === false ? null : def.tv || {};
    let tvdef = TV ? rdef : null;   // en táctil se activa con el pad virtual
    const HOME = TV ? (def.home ? 'indextv?sec=pro' : 'indextv') : (def.home || 'index.html').replace(/index\.html$/, './').replace(/\.html$/, '');
    const SITE = A.single ? null : window.ARCADE_SITE || null;   // lo inyecta index.php cuando el juego se sirve en /<id>
    const homeLink = (cls, label) => A.single ? '' : `<a class="${cls}" href="${HOMEQ()}">🏠 ${label}</a>`;
    const STAT = { s: 0, p: 0 };               // segundos jugados y partidas empezadas (se envían a SITE.api)
    // 🏠: vuelve a la página de listado de la que se vino (la guardan las portadas en sessionStorage 'arc_back');
    // si no hay, a la portada de la web (index.php) o de la PWA
    const BACK = () => { try { const b = sessionStorage.getItem('arc_back'); return b && b[0] === '/' && b[1] !== '/' ? b : null; } catch (_) { return null; } };
    const HOMEQ = () => BACK() || (SITE ? (TV ? SITE.tv : SITE.home)[A.lang] : HOME);
    M.song = buildSong(def.music || {}, def.id);
    /* niveles finitos (v2.11): los antiguos «infinitos» pasan a 60–120 niveles según su tope de dificultad (cap), y la
       dificultad interna g.lv (1…cap) se reparte de forma homogénea por todos ellos según el modo elegido. */
    const CAP = def.cap || 20;
    // Los juegos de niveles generados (levels: 0) se pueden jugar con niveles limitados o en modo infinito, y las dos
    // cosas se combinan con la dificultad (fácil, normal, difícil). En infinito la dificultad sube igual que en los
    // limitados y, al pasar del último, se queda en el máximo y los niveles siguen sin fin.
    const CANINF = def.levels === 0;
    if (def.levels === 0) def.levels = CAP <= 16 ? 60 : CAP <= 20 ? 80 : CAP <= 25 ? 100 : 120;
    const hasLevels = def.levels != null;
    const MODES = { easy: ['😊', 'Fácil', 'Easy'], normal: ['🙂', 'Normal', 'Normal'], hard: ['😈', 'Difícil', 'Hard'] };
    let MODE = A.get('mode_' + def.id, A.get('mode', 'normal')); if (!MODES[MODE]) MODE = 'normal';
    let infinite = CANINF && A.get('inf_' + def.id, A.get('inf', false)) === true;
    const KEY = (k) => k + '_' + def.id + (MODE === 'normal' ? '' : '_' + MODE) + (infinite ? '_inf' : '');
    const unlockedOf = () => infinite ? Math.max(1, A.get(KEY('lv'), 1)) : Math.min(A.get(KEY('lv'), 1), def.levels || 1);
    // dificultad interna del nivel n: fácil 1→60 % del tope · normal 1→tope · difícil 30 %→tope (ya al 75 % de los niveles)
    const lvOf = (n) => {
      if (!hasLevels) return Math.min(n, def.cap || 1e9);
      const f = Math.min(1, Math.max(0, (n - 1) / Math.max(1, def.levels - 1)));
      const [a, b, reach] = MODE === 'easy' ? [1, Math.max(2, Math.round(CAP * 0.6)), 1] : MODE === 'hard' ? [Math.max(1, Math.round(CAP * 0.3)), CAP, 0.75] : [1, CAP, 1];
      return Math.round(a + Math.min(1, f / reach) * (b - a));
    };
    // velocidad del juego (escala dt): empieza más lenta y llega a la normal hacia el 30 % de los niveles (o al minuto en los de récord)
    const spdOf = () => {
      const [lo, hi] = MODE === 'easy' ? [0.72, 0.88] : MODE === 'hard' ? [1.04, 1.15] : [0.85, 1];
      const f = hasLevels ? Math.min(1, (g.level - 1) / (def.levels * 0.3)) : Math.min(1, g.t / 60);
      const warm = Math.min(1, 0.45 + 0.55 * (g.lt || 0) / 2.5);   // cada nivel arranca a medio gas y en 2,5 s va a su velocidad
      return (lo + (hi - lo) * f) * warm;
    };
    // los niveles desbloqueados con la versión de niveles infinitos se convierten a la nueva escala (una vez)
    if (hasLevels && !A.get('lvv2_' + def.id, false)) {
      const u = A.get('lv_' + def.id, 1);
      if (u > 1) A.set('lv_' + def.id, Math.max(1, Math.min(def.levels, 1 + Math.round((Math.min(u, CAP) - 1) / Math.max(1, CAP - 1) * (def.levels - 1)))));
      A.set('lvv2_' + def.id, true);
    }
    const FAVK = 'arc_favs';
    const favs = () => { try { const v = JSON.parse(localStorage.getItem(FAVK) || '[]'); return Array.isArray(v) ? v : []; } catch (_) { return []; } };
    const isFav = () => favs().indexOf(def.id) >= 0;
    if (EN && def.en) { def.title = def.en.title || def.title; def.tag = def.en.tag || def.tag; def.help = def.en.help || def.help; if (def.en.tvHelp) def.tvHelp = def.en.tvHelp; A.setDict(def.en.dict); }
    try { document.title = def.title + ' · Arcade Perdido'; } catch (_) {}
    const LV = A.L(def.levelLabel || 'Nivel'), lvl = LV.toLowerCase();
    const langBtn = () => (A.config.idioma || 'auto') === 'auto' ? `<button class="b sm ghost" data-act="lang">${EN ? '🇪🇸 Español' : '🇬🇧 English'}</button>` : '';

    const canvas = el('canvas'); canvas.id = 'c'; document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const probe = el('div', 'safe-probe'); document.body.appendChild(probe);
    const hud = el('div', 'hud',
      '<button class="hb" id="hP" aria-label="' + T('Pausa', 'Pause') + '">⏸️</button>' +
      '<button class="hb" id="hPad" aria-label="' + T('Pad virtual', 'Virtual pad') + '" style="display:none">🎮</button>' +
      '<div class="pill sc"><span class="lbl">' + T('Puntos', 'Score') + '</span><b id="hS">0</b></div>' +
      '<div class="pill" id="hLP"><span class="lbl" id="hLL">' + T('Nivel', 'Level') + '</span><b id="hL">1</b></div>' +
      '<div class="pill lives" id="hV"></div>' +
      '<div class="pill pl" id="hPl" style="display:none"></div>');
    document.body.appendChild(hud);
    const ov = el('div', 'ov'); document.body.appendChild(ov);
    const $ = (id) => document.getElementById(id);

    const g = {
      def, ctx, canvas, W: 0, H: 0, top: 60, bot: 0, t: 0, rt: 0,
      score: 0, level: 1, lives: def.lives ?? 3, state: 'menu', s: {},
      pointers: new Map(), parts: [], floats: [], rings: [], amb: [], shakeT: 0, shakeA: 0, banner: null,
      flashT: 0, flashC: '#fff', iris: 0, lvLives: 0,
      best: A.get(KEY('best'), 0), unlocked: unlockedOf(),
      fc: { e: '😀', kind: 'idle', t: 0, next: 3 },
    };
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
    Object.defineProperty(g, 'mode', { get() { return MODE; } });
    Object.defineProperty(g, 'speed', { get() { return g.demoOn ? 1 : spdOf(); } });
    A.current = g;

    /* --- HUD --- */
    let lastScore = 0;
    g.hud = function () {
      const sEl = $('hS');
      sEl.textContent = g.score;
      if (g.score !== lastScore) { sEl.parentNode.classList.remove('bump'); void sEl.offsetWidth; sEl.parentNode.classList.add('bump'); lastScore = g.score; }
      $('hLL').textContent = LV;
      $('hL').textContent = g.level + (hasLevels && !infinite ? '/' + def.levels : '');
      const pe = $('hPl');
      if (g.mp) { const P = g.mp.players[g.mp.cur]; pe.style.display = ''; pe.style.borderColor = P.c; pe.innerHTML = '<span class="lbl">' + T('Turno', 'Turn') + '</span><b>' + P.e + ' ' + T('J', 'P') + (g.mp.cur + 1) + '</b>'; }
      else pe.style.display = 'none';
      const v = $('hV');
      if (def.lives === 0) v.style.display = 'none';
      else { const ic = def.lifeIcon || '❤️'; v.textContent = g.lives <= 5 ? ic.repeat(Math.max(0, g.lives)) || '—' : ic + '×' + g.lives; }
    };

    /* --- efectos --- */
    g.float = (text, x, y, color, size) => g.floats.push({ text: A.L(String(text)), x, y, color: color || '#fff', size: size || 22, life: 1 });
    g.addScore = (n, x, y, color) => {
      g.score += n; g.hud();
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
      const n = o.n || 12;
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
      for (let i = 0; i < n; i++) g.parts.push({ x: Math.random() * g.W, y: g.top - 20 - Math.random() * 80, vx: A.rand(-60, 60), vy: A.rand(60, 220), life: 2.4, max: 2.4, color: A.pick(cols), size: A.rand(3, 6), grav: 60, rot: Math.random() * 6, sq: true });
    };
    g.shake = (t = 0.3, a = 8) => { g.shakeT = t; g.shakeA = a; };
    g.message = (text, dur = 1.4, sub) => { g.banner = { text: A.L(String(text)), sub: sub ? A.L(String(sub)) : sub, t: dur, max: dur }; };

    /* --- ambiente --- */
    function initAmbient() {
      g.amb = [];
      const a = def.ambient; if (!a) return;
      const n = a.n || 12;
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

    /* --- vidas y fin --- */
    g.die = function () {
      if (g.state !== 'play') return false;
      if (g.demoOn) { A.sfx.hit(); g.mood('hurt', 1.8); g.shake(0.35, 10); g.flash('#ff3b3b', 0.25); return true; } // en la demo no se pierden vidas
      g.lives--; g.hud(); A.sfx.hit(); g.mood('hurt', 1.8); A.buzz(180); g.shake(0.35, 10); g.flash('#ff3b3b', 0.25);
      if (g.lives <= 0) { g.state = 'dying'; M.stop(); setTimeout(g.over, 900); return false; }
      return true;
    };
    function saveBest() {
      if (g.demoOn) return false;
      if (g.score > g.best) { g.best = g.score; A.set(KEY('best'), g.best); return true; }
      return false;
    }
    const starsHtml = (stars) => '<div class="stars">' + [1, 2, 3].map((i) => `<span class="${i <= stars ? 'on' : ''}" style="animation-delay:${0.15 + i * 0.18}s">⭐</span>`).join('') + '</div>';
    g.over = function () {
      if (g.state === 'over' || g.state === 'menu') return;
      g.state = 'over'; M.stop(); A.sfx.lose(); g.fc.t = 0; g.mood('sad', 99);
      if (g.mp) return mpOver();
      if (g.demoOn) { setTimeout(() => endDemo(), 1600); return; }
      const rec = saveBest();
      show(`<div class="big">💥</div><h2>${T('Fin de la partida', 'Game over')}</h2>
        <div class="score">${g.score}</div>${rec ? `<div class="rec">🏆 ${T('¡Nuevo récord!', 'New record!')}</div>` : `<p class="sub">${T('Récord', 'Best')}: <b>${g.best}</b></p>`}
        ${hasLevels ? `<p class="sub">${T('Llegaste al', 'You reached')} ${lvl} <b>${g.level}</b></p>` : ''}
        <div class="row"><button class="b pri" data-act="restart">🔄 ${hasLevels ? T('Reintentar', 'Retry') + ' ' + lvl + ' ' + g.level : T('Reintentar', 'Retry')}</button><button class="b" data-act="menu">☰ ${T('Menú', 'Menu')}</button></div>`, 'bad');
    };
    g.win = function (stars) {
      if (g.state !== 'play') return;
      g.state = 'win'; M.stop(); A.sfx.win(); A.buzz([40, 60, 40]); g.fc.t = 0; g.mood('win', 99);
      if (stars == null) { const lost = g.lvLives - g.lives; stars = def.lives === 0 ? 3 : lost <= 0 ? 3 : lost === 1 ? 2 : 1; }
      const total = infinite ? Infinity : def.levels;
      if (g.demoOn) { g.confetti(70); setTimeout(() => endDemo(), 2200); return; }
      if (g.level + 1 > g.unlocked && g.level < total) { g.unlocked = g.level + 1; A.set(KEY('lv'), g.unlocked); }
      saveBest();
      g.confetti(70); g.flash('#ffffff', 0.25);
      if (g.mp) return mpWin(stars);
      const st = starsHtml(stars);
      if (g.level >= total) {
        A.set(KEY('done'), true);
        show(`<div class="big">🏆</div><h2>${T('¡Juego completado!', 'Game complete!')}</h2>${st}<div class="score">${g.score}</div>
          <p class="sub">${T('Has superado los ' + total + ' niveles.', 'You beat all ' + total + ' levels.')}</p>
          <div class="row"><button class="b pri" data-act="play" data-lv="1">🔄 ${T('Otra vez', 'Play again')}</button><button class="b" data-act="menu">☰ ${T('Menú', 'Menu')}</button></div>`, 'good');
      } else {
        show(`<div class="big">🎉</div><h2>${T('¡' + LV + ' ' + g.level + ' superado!', LV + ' ' + g.level + ' cleared!')}</h2>${st}<div class="score">${g.score}</div>
          <div class="row"><button class="b pri" data-act="next">${LV} ${g.level + 1} ▶</button><button class="b" data-act="menu">☰ ${T('Menú', 'Menu')}</button></div>`, 'good');
      }
    };

    /* --- multijugador por turnos --- */
    const AV = [{ e: '🔴', c: '#ff6b6b' }, { e: '🔵', c: '#4dabf7' }, { e: '🟢', c: '#69db7c' }, { e: '🟡', c: '#ffd43b' }];
    const MAXP = Math.max(1, Math.min(4, (A.config.jugadoresMax || 4)));
    let nPlayers = TV && tvdef ? Math.min(MAXP, A.get('players', 1)) : 1;
    g.mp = null;
    const P = () => g.mp.players[g.mp.cur];
    const pname = (p) => `<span style="color:${p.c}">${p.e} ${p.name}</span>`;
    function mpStart(level) {
      g.mp = { players: AV.slice(0, nPlayers).map((a, i) => ({ name: T('Jugador ', 'Player ') + (i + 1), e: a.e, c: a.c, score: 0, level: level || 1, lives: def.lives ?? 3, out: false, best: level || 1 })),
        cur: 0, round: 1, rounds: hasLevels ? (A.config.rondasMultijugador || 5) : 1, startLevel: level || 1 };
      turnCard();
    }
    function scoreTable() {
      return '<div class="mptable">' + g.mp.players.map((p, i) => `<div class="${i === g.mp.cur ? 'cur' : ''}${p.out ? ' out' : ''}"><span>${p.e} ${p.name}</span><span>${hasLevels ? '🚩' + p.level : ''}</span><b>${p.score}</b></div>`).join('') + '</div>';
    }
    function turnCard() {
      g.state = 'turn'; M.stop();
      const p = P();
      show(`<div class="big">${p.e}</div><h2>${T('¡Te toca, ', 'Your turn, ')}${pname(p)}!</h2>
        <p class="sub">${hasLevels ? `${T('Ronda', 'Round')} <b>${g.mp.round}</b> ${T('de', 'of')} ${g.mp.rounds} · ${LV} <b>${p.level}</b>` : T('Juega hasta perder todas tus vidas', 'Play until you lose all your lives')}</p>
        ${scoreTable()}
        <button class="b pri wide" data-act="turn">▶ ${T('Empezar turno', 'Start turn')}</button>`, 'turn');
      A.sfx.up();
    }
    function loadPlayer() { const p = P(); g.level = p.level; g.score = p.score; g.lives = p.lives; g.t = 0; begin(); }
    function nextTurn() {
      const ps = g.mp.players, n = ps.length;
      for (let k = 1; k <= n; k++) {
        const j = (g.mp.cur + k) % n;
        if (ps[j].out) continue;
        if (j <= g.mp.cur) g.mp.round++;
        if (hasLevels && g.mp.round > g.mp.rounds) return mpFinal();
        g.mp.cur = j; return turnCard();
      }
      mpFinal();
    }
    function mpOver() {
      const p = P(); p.score = g.score; p.out = true; p.lives = 0;
      show(`<div class="big">💥</div><h2>${pname(p)} ${T('se queda sin vidas', 'is out of lives')}</h2><div class="score">${p.score}</div>
        ${scoreTable()}
        <button class="b pri wide" data-act="nextturn">▶ ${T('Seguir', 'Continue')}</button>`, 'bad');
    }
    function mpWin(stars) {
      const p = P(); p.score = g.score; p.lives = g.lives; p.level = g.level + 1;
      show(`<div class="big">🎉</div><h2>${T('¡' + pname(p) + ' supera el ' + lvl + ' ' + g.level + '!', pname(p) + ' clears ' + lvl + ' ' + g.level + '!')}</h2>${starsHtml(stars)}<div class="score">${g.score}</div>
        ${scoreTable()}
        <button class="b pri wide" data-act="nextturn">▶ ${T('Siguiente turno', 'Next turn')}</button>`, 'good');
    }
    function mpFinal() {
      g.state = 'final'; M.stop();
      const rank = g.mp.players.slice().sort((a, b) => b.score - a.score);
      const med = ['🥇', '🥈', '🥉', '🏅'];
      if (rank[0].score > g.best) { g.best = rank[0].score; A.set(KEY('best'), g.best); }
      A.sfx.win(); g.confetti(90);
      show(`<div class="big">🏆</div><h2>${T('¡Gana ', '')}${pname(rank[0])}${T('!', ' wins!')}</h2>
        <div class="mptable final">${rank.map((p, i) => `<div><span>${med[i]} ${p.e} ${p.name}</span><span>${hasLevels ? '🚩' + p.level : ''}</span><b>${p.score}</b></div>`).join('')}</div>
        <div class="row"><button class="b pri" data-act="play" data-lv="${g.mp.startLevel}">🔄 ${T('Revancha', 'Rematch')}</button><button class="b" data-act="menu">☰ ${T('Menú', 'Menu')}</button></div>`, 'good');
      g.mp = null; g.hud();
    }

    /* --- pantallas --- */
    let focusEl = null;
    function show(html, kind) {
      ov.innerHTML = '<div class="card ' + (kind || '') + '">' + html + '</div>'; ov.classList.add('on');
      if (TV) { focusEl = null; const f = ov.querySelector('.pri') || focusables()[0]; setFocus(f); }
    }
    function hide() { ov.classList.remove('on'); focusEl = null; }
    const toggles = () => `<button class="b sm" data-act="mute">${A.muted ? '🔇' : '🔊'} ${T('Sonido', 'Sound')}</button><button class="b sm" data-act="music">${A.musicOn ? '🎵' : '🚫'} ${T('Música', 'Music')}</button>`;
    // botón 📱/📺: en 'seleccionable', y también cuando el modo TV viene forzado por la URL en un aparato que no es una tele
    const tvForced = () => TV && !(window.arcadeTVDetectado && window.arcadeTVDetectado());
    const modeBtn = () => A.config.modo === 'seleccionable' || (tvForced() && A.config.modo !== 'modotv') ? `<button class="b sm ghost" data-act="tvmode">${TV ? T('📱 Modo móvil', '📱 Mobile mode') : T('📺 Modo TV', '📺 TV mode')}</button>` : '';
    function menu() {
      g.state = 'menu'; M.stop(); g.mp = null; g.demoOn = false; g.hud();
      if (TV && !tvdef) {
        show(`<div class="mcol ml"><div class="logo"><div class="halo"></div><span class="mascot">${def.emoji}</span></div><h1 class="ttl">${def.title}</h1></div>
          <div class="mcol mr"><p class="sub">✋ ${T('Este juego necesita pantalla táctil y no se puede jugar con el mando.', 'This game needs a touch screen and can\'t be played with a remote.')}</p>
          <div class="row">${homeLink('b pri', T('Elegir otro juego', 'Choose another game'))}${modeBtn()}${langBtn()}</div></div>`, 'menu');
        return;
      }
      const deco = (def.deco || []).slice(0, 6).map((e, i) => `<span class="deco d${i}">${e}</span>`).join('');
      let lv = '';
      if (hasLevels && g.unlocked > 1) {
        lv = `<div class="lvhead">${T('Elegir nivel', 'Choose level')} <small>(1–${g.unlocked})</small></div>
          <div class="lvpick"><button class="b sm" data-act="lvstep" data-d="-1" aria-label="−">−</button><input type="range" class="lvr" min="1" max="${g.unlocked}" value="${g.unlocked}" aria-label="${T('Nivel', 'Level')}"><button class="b sm" data-act="lvstep" data-d="1" aria-label="+">+</button>
          <button class="b sm lvgo" data-act="play" data-lv="${g.unlocked}">▶ ${LV} ${g.unlocked}</button></div>`;
      }
      const modes = TV && g.mp ? '' : `<div class="modes">${Object.keys(MODES).map((m) => `<button class="b sm mbtn${m === MODE ? ' on' : ''}" data-act="mode" data-m="${m}">${MODES[m][0]} ${EN ? MODES[m][2] : MODES[m][1]}</button>`).join('')}</div>`
        + (CANINF && !(TV && g.mp) ? `<div class="modes lens"><button class="b sm mbtn${infinite ? '' : ' on'}" data-act="len" data-inf="0">🚩 ${def.levels} ${T('niveles', 'levels')}</button><button class="b sm mbtn${infinite ? ' on' : ''}" data-act="len" data-inf="1">♾️ ${T('Infinito', 'Endless')}</button></div>` : '');
      const favBtn = A.single ? '' : `<button class="b sm fav${isFav() ? ' on' : ''}" data-act="fav">${isFav() ? '❤️ ' + T('En favoritos', 'In favourites') : '🤍 ' + T('Añadir a favoritos', 'Add to favourites')}</button>`;
      const seen = A.get('seen_' + def.id, false); A.set('seen_' + def.id, true);
      const playLabel = hasLevels && g.unlocked > 1 ? T('▶ Continuar · ', '▶ Continue · ') + LV + ' ' + g.unlocked : T('▶ Jugar', '▶ Play');
      const players = TV ? `<div class="lvhead">${T('Jugadores (por turnos)', 'Players (taking turns)')}</div><div class="players">${[1, 2, 3, 4].slice(0, MAXP).map((n) => `<button class="b sm pbtn${n === nPlayers ? ' on' : ''}" data-act="players" data-n="${n}">${n === 1 ? '👤' : AV.slice(0, n).map((a) => a.e).join('')} ${n}</button>`).join('')}</div>` : '';
      const help = TV ? `<div class="tvhelp">🎮 ${def.tvHelp || T('Cruceta para moverte · OK para la acción', 'D-pad to move · OK for the action')}</div><details class="howto"><summary>📖 ${T('Reglas', 'Rules')}</summary><div class="help">${def.help}</div></details>`
        : `<details class="howto"${seen ? '' : ' open'}><summary>📖 ${T('Cómo se juega', 'How to play')}</summary><div class="help">${def.help}</div></details>`;
      show(`<div class="mcol ml"><div class="logo"><div class="halo"></div>${deco}<span class="mascot">${def.emoji}</span></div>
        <h1 class="ttl">${def.title}</h1>
        ${def.tag ? `<div class="tag">${def.tag}</div>` : ''}
        <p class="origin">${T('Mecánica de', 'Based on')} ${def.origin}</p>${help}</div>
        <div class="mcol mr">${modes}<div class="bests"><span>🏆 ${g.best}</span>${hasLevels ? `<span>${infinite ? '♾️' : '🚩'} ${LV} ${g.unlocked}${infinite ? '' : '/' + def.levels}</span>` : `<span>♾️ ${T('Récord', 'High score')}</span>`}</div>
        <button class="b pri wide" data-act="play" data-lv="${hasLevels ? g.unlocked : 1}">${playLabel}</button>
        <button class="b wide" data-act="demo">👀 ${T('Ver demo', 'Watch demo')}</button>
        ${players}${lv}
        <div class="row">${toggles()}${favBtn}</div>
        <div class="row">${homeLink('b sm ghost', T('Todos los juegos', 'All games'))}${modeBtn()}${langBtn()}</div></div>`, 'menu');
      const r = ov.querySelector('.lvr');
      if (r) r.addEventListener('input', () => { const go = ov.querySelector('.lvgo'); go.dataset.lv = r.value; go.textContent = '▶ ' + LV + ' ' + r.value; });
    }
    function pause() {
      if (g.state !== 'play') return;
      g.state = 'pause'; M.stop();
      const acts = (TV && tvdef && tvdef.actions) ? tvdef.actions.map((a, i) => `<button class="b" data-act="gact" data-i="${i}">${a.label}</button>`).join('') : '';
      show(`<div class="big">⏸️</div><h2>${T('Pausa', 'Paused')}</h2>
        <button class="b pri wide" data-act="resume">▶ ${T('Continuar', 'Resume')}</button>
        ${acts ? `<div class="row">${acts}</div>` : ''}
        ${A.single ? '' : `<div class="row"><button class="b sm fav${isFav() ? ' on' : ''}" data-act="fav">${isFav() ? '❤️ ' + T('En favoritos', 'In favourites') : '🤍 ' + T('Añadir a favoritos', 'Add to favourites')}</button></div>`}
        <div class="row">${g.mp ? '' : `<button class="b" data-act="restart">🔄 ${T('Reiniciar', 'Restart')}</button>`}<button class="b" data-act="menu">☰ ${g.mp ? T('Abandonar partida', 'Quit match') : T('Menú', 'Menu')}</button></div>
        <div class="row">${toggles()}</div>
        ${TV ? `<div class="tvhelp">🎮 ${def.tvHelp || ''}</div>` : `<details class="howto"><summary>📖 ${T('Cómo se juega', 'How to play')}</summary><div class="help">${def.help}</div></details>`}`);
    }
    function resume() { g.state = 'play'; hide(); M.start(); }
    function begin() {
      g.parts = []; g.floats = []; g.rings = []; g.banner = null; g.pointers.clear(); g.lt = 0;
      TVC.x = null; TVC.armed = null;
      g.s = {}; def.setup(g); def.layout && def.layout(g);
      g.state = 'play'; hide(); g.hud(); g.iris = 0.001; g.lvLives = g.lives; g.fc.t = 0; g.mood('happy', 1);
      M.rate = 1 + Math.min(g.level - 1, 20) * 0.012; M.start();
      if (g.mp) g.message(P().e + ' ' + P().name, 1.3, hasLevels ? LV + ' ' + g.level : '');
      else if (hasLevels) g.message(LV + ' ' + g.level, 1.3); else g.message('¡Vamos!', 1);
      A.sfx.whoosh();
    }
    function start(level) {
      if (nPlayers > 1) { mpStart(level); return; }
      g.demoOn = false;
      g.mp = null; g.level = level || 1; g.score = 0; g.lives = def.lives ?? 3; g.t = 0; STAT.p++; begin(); if (def.onStart) def.onStart(g);
    }
    /* --- demo: partida automática con un dedo virtual ---
       Cada juego puede definir demo(g) → paso | [pasos] | null. Pasos:
         { tap: [x, y] }   { drag: [[x, y], …], dur }   { swipe: [x, y, 'left'|'right'|'up'|'down'], len }
         { hold: [x, y], dur }   { key: 'ArrowLeft'|' ', dur }   { wait: s }   y en cualquiera say: 'texto'
       Si no lo define, se usa una demo genérica según sus controles. */
    const DM = { q: [], cur: null, fx: 0, fy: 0, press: 0, say: null, sayT: 0, t: 0, p: null };
    function startDemo() {
      g.mp = null; g.level = 1; g.score = 0; g.lives = def.lives ?? 3; g.t = 0; g.demoOn = true;
      Object.assign(DM, { end: false, said: false, q: [], cur: null, fx: g.W / 2, fy: g.bot - 40, press: 0, say: null, sayT: 0, t: 0, p: null });
      begin(); if (def.onStart) def.onStart(g);
    }
    function endDemo() { if (!g.demoOn) return; g.demoOn = false; if (DM.p) { g.pointers.delete(DM.p.id); DM.p = null; } menu(); }
    g.demoSay = (txt, t = 2.6) => { DM.say = A.L(String(txt)); DM.sayT = t; };
    function genericDemo() {
      const first = !DM.said; DM.said = true;
      const plainHelp = String(def.help || '').replace(/<[^>]+>/g, '').split(/(?<=[.!?])\s/)[0];
      if (padOn && def.key && !(rdef && rdef.targets)) {
        const k = A.pick(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', ' ']);
        return { key: k, dur: A.pick([0.08, 0.15, 0.4, 0.7]), after: A.rand(0.05, 0.35), say: first ? (def.tvHelp || plainHelp) : null };
      }
      if (first) g.demoSay(plainHelp, 4);
      const ts = tvTargets() || (rdef && rdef.targets ? rdef.targets(g) : null);
      if (ts && ts.length) {
        const a = A.pick(ts), c = tc(a), mode = (rdef && rdef.mode) || 'tap';
        if (mode === 'swipe') return { swipe: [c.x, c.y, A.pick(['left', 'right', 'up', 'down'])] };
        if (mode === 'drag') { const b = A.pick(ts), d = tc(b); return { drag: [[c.x, c.y], [d.x, d.y]], dur: 0.6 }; }
        return { tap: [c.x, c.y] };
      }
      const cx = g.W / 2, cy = (g.top + g.bot) / 2, r = Math.min(g.W, g.bot - g.top) * 0.3;
      const k = Math.random();
      if (k < 0.35) return { tap: [cx + A.rand(-r, r), cy + A.rand(-r, r)] };
      if (k < 0.6) return { swipe: [cx + A.rand(-r, r) * 0.5, cy + A.rand(-r, r) * 0.5, A.pick(['left', 'right', 'up', 'down'])] };
      if (k < 0.8) return { drag: [[cx + A.rand(-r, r), cy + A.rand(-r, r)], [cx + A.rand(-r, r), cy + A.rand(-r, r)], [cx + A.rand(-r, r), cy + A.rand(-r, r)]], dur: 1 };
      return { hold: [cx + A.rand(-r, r), cy + A.rand(-r, r)], dur: A.rand(0.3, 1) };
    }
    const dPtr = (x, y) => ({ id: -9, x, y, sx: x, sy: y, t0: performance.now(), type: 'demo' });
    function dDown(x, y) { const p = dPtr(x, y); DM.p = p; g.pointers.set(p.id, p); g.tapFx = { x, y, t: 0.25 }; if (def.down) def.down(g, p); DM.press = 1; }
    function dMove(x, y) { const p = DM.p; if (!p) return; p.x = x; p.y = y; if (def.move && g.state === 'play') def.move(g, p); }
    function dUp(tapOK) {
      const p = DM.p; if (!p) return; DM.p = null; g.pointers.delete(p.id); DM.press = 0;
      if (g.state !== 'play') return;
      if (def.up) def.up(g, p);
      const dx = p.x - p.sx, dy = p.y - p.sy, d = Math.hypot(dx, dy), dt = performance.now() - p.t0;
      if (d < 16 && (dt < 400 || tapOK)) { if (def.tap && g.state === 'play') def.tap(g, p); }
      else if (d > 28 && dt < 700 && def.swipe) { const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); g.swipeFx = { x0: p.sx, y0: p.sy, x1: p.x, y1: p.y, t: 0.2 }; def.swipe(g, dir, p); }
    }
    function padFlash(k) { const b = pad.querySelector(`[data-k="${k === ' ' ? 'OK' : k}"]`); if (b) { b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 160); } }
    function demoNext() {
      let st = def.demo ? def.demo(g) : genericDemo();
      if (st === undefined) st = genericDemo();
      if (!st) st = { wait: 0.25 };
      DM.q = Array.isArray(st) ? st.slice() : [st];
    }
    function updDemo(dt) {
      if (g.state !== 'play') return;
      DM.press = Math.max(0, DM.press - (DM.p ? 0 : dt * 4)); if (DM.sayT > 0) DM.sayT -= dt;
      DM.t += dt; if (!DM.end && DM.t > (def.demoTime || 45)) { DM.end = true; if (DM.p) dUp(false); g.message(T('Fin de la demo', 'End of demo'), 1.2); setTimeout(() => endDemo(), 1300); }
      if (DM.end) return;
      if (!DM.cur) { if (!DM.q.length) demoNext(); DM.cur = DM.q.shift(); if (!DM.cur) return; const c = DM.cur; c.ph = 'go'; c.t = 0; if (c.say) g.demoSay(c.say);
        if (c.swipe) { const [x, y, dir] = c.swipe, L = c.len || 90, D = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir]; c.drag = [[x, y], [x + D[0] * L, y + D[1] * L]]; c.dur = c.dur || 0.16; }
        c.at = c.tap || c.hold || (c.drag && c.drag[0]) || null; }
      const c = DM.cur; c.t += dt;
      if (c.ph === 'go') {
        if (c.at) { const [tx, ty] = c.at, dx = tx - DM.fx, dy = ty - DM.fy, d = Math.hypot(dx, dy), sp = Math.max(500, d * 4) * dt;
          if (d > sp) { DM.fx += dx / d * sp; DM.fy += dy / d * sp; return; } DM.fx = tx; DM.fy = ty; }
        c.ph = 'act'; c.t = 0;
        if (c.tap) { dDown(c.tap[0], c.tap[1]); dUp(true); c.ph = 'rest'; c.rest = c.after ?? 0.45; DM.press = 1; return; }
        if (c.hold || c.drag) { dDown(c.at[0], c.at[1]); return; }
        if (c.key) { padFlash(c.key); if (def.key) def.key(g, c.key, true); return; }
        c.ph = 'rest'; c.rest = c.wait ?? 0.3; return;
      }
      if (c.ph === 'act') {
        if (c.hold) { if (c.t >= (c.dur || 0.6)) { dUp(false); c.ph = 'rest'; c.rest = 0.35; } return; }
        if (c.drag) { const pts = c.drag, k = Math.min(1, c.t / (c.dur || 0.5)), segs = pts.length - 1, f = k * segs, i = Math.min(segs - 1, Math.floor(f)), u = f - i;
          DM.fx = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u; DM.fy = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u; dMove(DM.fx, DM.fy);
          if (k >= 1) { dUp(false); c.ph = 'rest'; c.rest = c.after ?? 0.4; } return; }
        if (c.key) { if (c.t >= (c.dur || 0.12)) { if (def.key && g.state === 'play') def.key(g, c.key, false); c.ph = 'rest'; c.rest = c.after ?? 0.25; } return; }
      }
      if (c.ph === 'rest' && c.t >= c.rest) DM.cur = null;
    }
    function drawDemo() {
      const sz = 46, pr = DM.press;
      if (pr > 0) { ctx.globalAlpha = 0.5 * pr; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(DM.fx, DM.fy, 14 + (1 - pr) * 18, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
      A.emoji(ctx, '👆', DM.fx + 4, DM.fy + sz * 0.42, sz * (1 - pr * 0.12), { rot: -0.15 });
      const y = g.top + 4, bw = 86, blink = 0.75 + 0.25 * Math.sin(g.rt * 4);
      ctx.globalAlpha = blink; ctx.fillStyle = 'rgba(0,0,0,.6)'; A.rr(ctx, g.W - bw - 8, y, bw, 24, 12); ctx.fill();
      A.txt(ctx, '👀 DEMO', g.W - 8 - bw / 2, y + 12, 13, '#ffd43b', 'center', 900); ctx.globalAlpha = 1;
      const say = DM.say && DM.sayT > 0 ? DM.say : T('Toca la pantalla para jugar tú', 'Tap the screen to play yourself'), a = DM.say && DM.sayT > 0 ? Math.min(1, DM.sayT * 3) : 0.75;
      ctx.globalAlpha = a; ctx.font = '800 15px ' + A.FONT; const w = Math.min(g.W - 24, ctx.measureText(say).width + 30), yy = g.bot - 54;
      ctx.fillStyle = 'rgba(0,0,0,.72)'; A.rr(ctx, g.W / 2 - w / 2, yy, w, 34, 17); ctx.fill(); A.txt(ctx, say, g.W / 2, yy + 17, 15, '#fff', 'center', 800); ctx.globalAlpha = 1;
    }
    function next() { g.level++; begin(); }
    g.restart = () => start(hasLevels ? g.level : 1);

    ov.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      actx(); A.sfx.tick();
      const act = b.dataset.act;
      if (act === 'play') start(+b.dataset.lv || 1);
      else if (act === 'resume') resume();
      else if (act === 'restart') g.restart();
      else if (act === 'menu') menu();
      else if (act === 'next') next();
      else if (act === 'turn') loadPlayer();
      else if (act === 'demo') startDemo();
      else if (act === 'mode') { MODE = b.dataset.m; A.set('mode_' + def.id, MODE); A.set('mode', MODE); g.best = A.get(KEY('best'), 0); g.unlocked = unlockedOf(); menu(); }
      else if (act === 'len') { infinite = b.dataset.inf === '1'; A.set('inf_' + def.id, infinite); A.set('inf', infinite); g.best = A.get(KEY('best'), 0); g.unlocked = unlockedOf(); menu(); }
      else if (act === 'lvstep') { const r = ov.querySelector('.lvr'); if (r) { r.value = Math.max(1, Math.min(+r.max, +r.value + +b.dataset.d)); r.dispatchEvent(new Event('input')); } }
      else if (act === 'fav') {
        const on = !isFav(), l = favs().filter((x) => x !== def.id); if (on) l.unshift(def.id);
        try { localStorage.setItem(FAVK, JSON.stringify(l)); } catch (_) {}
        b.classList.toggle('on', on); b.textContent = on ? '❤️ ' + T('En favoritos', 'In favourites') : '🤍 ' + T('Añadir a favoritos', 'Add to favourites');
        if (on) { A.sfx.coin && A.sfx.coin(); }
        if (SITE && SITE.fav) { const body = JSON.stringify({ g: SITE.id || def.id, on: on ? 1 : 0, u: statUid() }); try { fetch(SITE.fav, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {}); } catch (_) {} }
      }
      else if (act === 'nextturn') nextTurn();
      else if (act === 'gact') { const a = tvdef.actions[+b.dataset.i]; resume(); a.run(g); }
      else if (act === 'players') { nPlayers = +b.dataset.n; A.set('players', nPlayers); ov.querySelectorAll('.pbtn').forEach((x) => x.classList.toggle('on', x === b)); }
      else if (act === 'tvmode') {
        if (A.config.modo === 'seleccionable' && window.arcadeElegirTV) arcadeElegirTV(!TV);
        let qs = ''; try { const u = new URLSearchParams(location.search); u.delete('tv'); if (A.config.modo !== 'seleccionable' && !TV) u.set('tv', '1'); qs = u.toString(); } catch (_) {}
        location.href = location.pathname + (qs ? '?' + qs : '');
      }
      else if (act === 'mute') { A.muted = !A.muted; A.set('muted', A.muted); b.innerHTML = (A.muted ? '🔇' : '🔊') + ' ' + T('Sonido', 'Sound'); }
      else if (act === 'music') { A.musicOn = !A.musicOn; A.set('music', A.musicOn); b.innerHTML = (A.musicOn ? '🎵' : '🚫') + ' ' + T('Música', 'Music'); }
      else if (act === 'lang') { const nl = EN ? 'es' : 'en'; if (window.arcadeElegirIdioma) arcadeElegirIdioma(nl); if (SITE) { location.href = SITE.play + location.search.replace(/([?&])lang=[a-z]+&?/, '$1').replace(/[?&]$/, ''); return; } try { const u = new URLSearchParams(location.search); u.set('lang', nl); location.search = '?' + u.toString(); } catch (_) { location.reload(); } }
    });
    $('hP').addEventListener('click', () => { actx(); if (g.demoOn) { endDemo(); return; } if (g.state === 'play') pause(); else if (g.state === 'pause') resume(); });

    /* --- tamaño --- */
    let vign = null;
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5); A.dpr = dpr;
      const w = window.innerWidth, h = window.innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      g.W = w; g.H = h;
      g.top = Math.round(hud.getBoundingClientRect().bottom + 6);
      g.bot = h - (probe.offsetHeight || 0) - (TV ? Math.round(h * 0.03) : 0) - (padOn && h > 520 ? pad.offsetHeight : 0);
      vign = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
      vign.addColorStop(0, 'rgba(0,0,0,0)'); vign.addColorStop(1, 'rgba(0,0,0,0.38)');
      initAmbient();
      if (def.layout && g.s) def.layout(g);
    }
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 200));

    /* --- entrada táctil --- */
    canvas.addEventListener('pointerdown', (e) => {
      actx(); e.preventDefault();
      if (g.demoOn) { endDemo(); return; }
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      const p = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t0: performance.now(), type: e.pointerType };
      g.pointers.set(e.pointerId, p);
      if (g.state === 'play') { g.tapFx = { x: p.x, y: p.y, t: 0.25 }; if (def.down) def.down(g, p); }
    }, { passive: false });
    canvas.addEventListener('pointermove', (e) => {
      const p = g.pointers.get(e.pointerId);
      if (!p) { if (g.state === 'play' && def.hover && !TV) def.hover(g, e.clientX, e.clientY); return; }
      p.x = e.clientX; p.y = e.clientY;
      if (g.state === 'play' && def.move) def.move(g, p);
    });
    function end(e) {
      const p = g.pointers.get(e.pointerId); if (!p) return;
      p.x = e.clientX; p.y = e.clientY; g.pointers.delete(e.pointerId);
      if (g.state !== 'play') return;
      if (def.up) def.up(g, p);
      const dx = p.x - p.sx, dy = p.y - p.sy, d = Math.hypot(dx, dy), dt = performance.now() - p.t0;
      if (d < 16 && dt < 400) { if (def.tap) def.tap(g, p); }
      else if (d > 28 && dt < 700 && def.swipe) {
        const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        g.swipeFx = { x0: p.sx, y0: p.sy, x1: p.x, y1: p.y, t: 0.2 };
        def.swipe(g, dir, p);
      }
    }
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('gesturestart', (e) => e.preventDefault());

    /* --- mando de TV: navegación en menús --- */
    function focusables() { return [...ov.querySelectorAll('[data-act]:not([disabled]), a[href], summary')].filter((e) => e.offsetParent !== null); }
    function setFocus(e) {
      if (focusEl) focusEl.classList.remove('tvf');
      focusEl = e || null;
      if (focusEl) { focusEl.classList.add('tvf'); try { focusEl.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (_) {} }
    }
    const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    function bestInDir(items, from, dir, rectOf) {
      const [dx, dy] = DIRV[dir], cx = from.x, cy = from.y;
      let best = null, bs = 1e18;
      for (const it of items) {
        const r = rectOf(it); const tx = r.x - cx, ty = r.y - cy;
        const along = tx * dx + ty * dy; if (along < 6) continue;
        const ortho = Math.abs(tx * dy - ty * dx);
        const sc = along + ortho * 2.2;
        if (sc < bs) { bs = sc; best = it; }
      }
      return best;
    }
    const center = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
    function navFocus(dir) {
      const els = focusables(); if (!els.length) return;
      if (!focusEl || !els.includes(focusEl)) { setFocus(ov.querySelector('.pri') || els[0]); return; }
      const nb = bestInDir(els.filter((e) => e !== focusEl), center(focusEl), dir, center);
      if (nb) { setFocus(nb); A.sfx.tick(); }
    }

    /* --- mando de TV: cursor de casillas dentro del juego --- */
    const TVC = { x: null, y: null, armed: null, last: 0 };
    const tvTargets = () => (tvdef && tvdef.targets ? tvdef.targets(g) || [] : null);
    const tc = (t) => ({ x: t.x + t.w / 2, y: t.y + t.h / 2 });
    function curTarget(ts) {
      if (!ts || !ts.length) return null;
      if (TVC.x == null) { const t0 = tvdef.start ? tvdef.start(g, ts) : ts[Math.floor(ts.length / 2)]; const c = tc(t0); TVC.x = c.x; TVC.y = c.y; }
      let best = null, bd = 1e18;
      for (const t of ts) { const c = tc(t), d = (c.x - TVC.x) ** 2 + (c.y - TVC.y) ** 2; if (d < bd) { bd = d; best = t; } }
      return best;
    }
    function tvMove(dir) {
      const ts = tvTargets(), cur = curTarget(ts); if (!cur) return;
      const nb = bestInDir(ts.filter((t) => t !== cur), tc(cur), dir, tc);
      if (nb) { const c = tc(nb); TVC.x = c.x; TVC.y = c.y; A.sfx.tick(); if (def.hover) def.hover(g, c.x, c.y); }
    }
    const synth = (x, y) => ({ id: -7, x, y, sx: x, sy: y, t0: performance.now(), type: 'tv' });
    function tvTap(t) {
      const c = tc(t), p = synth(c.x, c.y);
      g.pointers.set(p.id, p); g.tapFx = { x: c.x, y: c.y, t: 0.25 };
      if (def.down) def.down(g, p);
      g.pointers.delete(p.id);
      if (g.state !== 'play') return;
      if (def.up) def.up(g, p);
      if (g.state === 'play' && def.tap) def.tap(g, p);
    }
    function tvDrag(a, b) {
      const c0 = tc(a), c1 = tc(b), p = synth(c0.x, c0.y);
      g.pointers.set(p.id, p); if (def.down) def.down(g, p);
      p.x = c1.x; p.y = c1.y; if (def.move) def.move(g, p);
      g.pointers.delete(p.id); if (def.up) def.up(g, p);
      g.swipeFx = { x0: c0.x, y0: c0.y, x1: c1.x, y1: c1.y, t: 0.25 };
    }
    function tvSwipe(a, dir) {
      const [dx, dy] = DIRV[dir], c0 = tc(a), p = synth(c0.x, c0.y);
      g.pointers.set(p.id, p); if (def.down) def.down(g, p);
      p.x = c0.x + dx * a.w; p.y = c0.y + dy * a.h; if (def.move) def.move(g, p);
      g.pointers.delete(p.id); if (def.up) def.up(g, p);
      g.swipeFx = { x0: c0.x, y0: c0.y, x1: p.x, y1: p.y, t: 0.25 };
      if (def.swipe) def.swipe(g, dir, p);
      if (tvdef.follow !== false) { TVC.x = p.x; TVC.y = p.y; }
    }
    function tvOK() {
      const ts = tvTargets(), t = curTarget(ts); if (!t) return;
      const mode = tvdef.mode || 'tap';
      if (TVC.armed) {
        const a = TVC.armed; TVC.armed = null;
        if (mode === 'drag') { if (Math.abs(a.x - t.x) < 1 && Math.abs(a.y - t.y) < 1) tvTap(t); else tvDrag(a, t); }
        else A.sfx.tick();
        return;
      }
      if (t.instant || mode === 'tap' || (tvdef.canArm && !tvdef.canArm(g, t))) { tvTap(t); return; }
      TVC.armed = { x: t.x, y: t.y, w: t.w, h: t.h }; A.sfx.move();
    }
    function drawCursor() {
      const ts = tvTargets(), t = curTarget(ts); if (!t) return;
      const pu = 0.5 + 0.5 * Math.sin(g.rt * 7);
      if (TVC.armed) {
        const a = TVC.armed;
        ctx.save(); ctx.setLineDash([6, 5]); ctx.lineDashOffset = -g.rt * 30; ctx.strokeStyle = '#ffd43b'; ctx.lineWidth = 4;
        A.rr(ctx, a.x + 1, a.y + 1, a.w - 2, a.h - 2, Math.min(12, a.w * 0.2)); ctx.stroke(); ctx.restore();
        A.emoji(ctx, '✋', a.x + a.w - 4, a.y + 4, Math.max(18, Math.min(30, a.w * 0.5)));
        if (tvdef.mode === 'swipe') { const c = tc(a); A.txt(ctx, '◀ ▲ ▼ ▶', c.x, a.y - 12, 13, '#ffd43b', 'center', 900, 'rgba(0,0,0,.6)'); }
      }
      ctx.save();
      ctx.shadowColor = accent; ctx.shadowBlur = 14 + pu * 10;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3 + pu * 1.5;
      A.rr(ctx, t.x - 2, t.y - 2, t.w + 4, t.h + 4, Math.min(12, t.w * 0.22)); ctx.stroke();
      ctx.shadowBlur = 0; ctx.strokeStyle = accent; ctx.lineWidth = 2;
      A.rr(ctx, t.x + 2, t.y + 2, t.w - 4, t.h - 4, Math.min(10, t.w * 0.18)); ctx.stroke();
      ctx.restore();
    }

    /* --- teclado y mando --- */
    function keyName(e) {
      const k = e.key, c = e.keyCode, raw = !k || k === 'Unidentified';
      if (k === 'ArrowUp' || c === 38 || (raw && c === 19)) return 'ArrowUp';
      if (k === 'ArrowDown' || c === 40 || (raw && c === 20)) return 'ArrowDown';
      if (k === 'ArrowLeft' || c === 37 || (raw && c === 21)) return 'ArrowLeft';
      if (k === 'ArrowRight' || c === 39 || (raw && c === 22)) return 'ArrowRight';
      if (k === 'Enter' || k === 'Select' || c === 13 || (raw && (c === 23 || c === 66))) return 'OK';
      if (k === 'Escape' || k === 'Backspace' || k === 'GoBack' || k === 'BrowserBack' || c === 27 || c === 10009 || c === 461 || (raw && (c === 4 || c === 8))) return 'BACK';
      if (k === 'MediaPlayPause' || k === 'MediaPlay' || k === 'MediaPause' || c === 179 || c === 415 || (raw && c === 85)) return 'PLAY';
      if (k === 'MediaRewind' || c === 227 || c === 412 || (raw && c === 89)) return 'REW';
      if (k === 'MediaFastForward' || c === 228 || c === 417 || (raw && c === 90)) return 'FF';
      return k;
    }
    let lastBack = 0;
    function onBack() {
      const now = performance.now(); if (now - lastBack < 300) return; lastBack = now;
      if (g.state === 'play') pause();
      else if (g.state === 'pause') resume();
      else if (g.state === 'menu' && !A.single) location.href = HOMEQ();
      else if (g.state === 'win' || g.state === 'over' || g.state === 'final') menu();
    }
    if (TV) {
      try { history.pushState({ arc: 1 }, ''); window.addEventListener('popstate', () => { onBack(); if (g.state !== 'leaving') history.pushState({ arc: 1 }, ''); }); } catch (_) {}
    }
    const held = new Set();
    window.addEventListener('keydown', (e) => {
      if (g.demoOn && g.state === 'play') { e.preventDefault(); endDemo(); return; }
      const k = keyName(e);
      if (TV) {
        const nav = k.startsWith('Arrow') || k === 'OK' || k === 'BACK' || k === ' ';
        if (nav) e.preventDefault();
        actx();
        if (k === 'BACK') { onBack(); return; }
        if (k === 'PLAY') { if (g.state === 'play') pause(); else if (g.state === 'pause') resume(); return; }
        if (ov.classList.contains('on')) {
          if (e.repeat && k === 'OK') return;
          if (k.startsWith('Arrow')) navFocus(k.slice(5).toLowerCase());
          else if (k === 'OK' || k === ' ') { if (focusEl) focusEl.click(); else navFocus('down'); }
          return;
        }
        if (g.state !== 'play') return;
        const ts = tvTargets();
        if (ts) {
          if (k.startsWith('Arrow')) {
            const now = performance.now(); if (e.repeat && now - TVC.last < 110) return; TVC.last = now;
            const dir = k.slice(5).toLowerCase();
            if (TVC.armed && tvdef.mode === 'swipe') { const a = TVC.armed; TVC.armed = null; tvSwipe(a, dir); }
            else tvMove(dir);
            return;
          }
          if (k === 'OK' || k === ' ') { if (!e.repeat) tvOK(); return; }
        }
        if (e.repeat) return;
        const gk = k === 'OK' ? ' ' : k === 'REW' ? 'r' : k === 'FF' ? 'f' : k;
        held.add(gk);
        if (def.key) def.key(g, gk, true);
        return;
      }
      if (e.repeat) return;
      if (e.key === 'Escape' || e.key === 'p') { if (g.state === 'play') pause(); else if (g.state === 'pause') resume(); return; }
      if (g.state === 'play' && padOn && tvTargets() && (e.key.startsWith('Arrow') || e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); padKey(e.key === ' ' || e.key === 'Enter' ? 'OK' : e.key, true); return; }
      if (g.state === 'play' && def.key) { def.key(g, e.key, true); if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => {
      if (TV) {
        const k = keyName(e), gk = k === 'OK' ? ' ' : k === 'REW' ? 'r' : k === 'FF' ? 'f' : k;
        if (held.has(gk)) { held.delete(gk); if (g.state === 'play' && def.key) def.key(g, gk, false); }
        return;
      }
      if (g.state === 'play' && def.key) def.key(g, e.key, false);
    });
    /* --- pad virtual (táctil): cruceta + OK en pantalla, opcional ---
       En juegos con cursor (tv.targets) mueve el cursor como el mando de la tele; si no, envía flechas y espacio a key(). */
    const padOK = !TV && !!rdef && (!!rdef.targets || !!def.key) && def.pad !== false;
    let padOn = padOK && A.get('pad', true);   // por defecto visible si el juego puede usarla
    const pad = el('div', 'vpad', '<div class="dpad">' + ['up', 'left', 'right', 'down'].map((d) => `<button data-k="Arrow${d[0].toUpperCase() + d.slice(1)}" class="${d}" aria-label="${d}">${{ up: '▲', down: '▼', left: '◀', right: '▶' }[d]}</button>`).join('') + '</div><button class="ok" data-k="OK" aria-label="OK">●</button>');
    document.body.appendChild(pad);
    function padKey(k, down) {
      if (g.state !== 'play') return;
      const ts = tvTargets();
      if (ts) {
        if (!down) return;
        if (k.startsWith('Arrow')) { const dir = k.slice(5).toLowerCase(); if (TVC.armed && tvdef.mode === 'swipe') { const a = TVC.armed; TVC.armed = null; tvSwipe(a, dir); } else tvMove(dir); }
        else tvOK();
        return;
      }
      if (def.key) def.key(g, k === 'OK' ? ' ' : k, down);
    }
    const padHeld = new Map();
    pad.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('[data-k]'); if (!b) return; e.preventDefault(); actx();
      try { b.setPointerCapture(e.pointerId); } catch (_) {}
      const k = b.dataset.k; b.classList.add('on'); padKey(k, true); A.buzz(8);
      // repetición al mantener (cursor y menús)
      clearInterval(padHeld.get(e.pointerId)); padHeld.set(e.pointerId, setInterval(() => { if (tvTargets() && k.startsWith('Arrow')) padKey(k, true); }, 180));
      b.dataset.p = e.pointerId;
    });
    const padUp = (e) => { const b = e.target.closest('[data-k]'); clearInterval(padHeld.get(e.pointerId)); padHeld.delete(e.pointerId); if (!b) return; b.classList.remove('on'); padKey(b.dataset.k, false); };
    pad.addEventListener('pointerup', padUp); pad.addEventListener('pointercancel', padUp);
    pad.addEventListener('contextmenu', (e) => e.preventDefault());
    function setPad(on) {
      padOn = padOK && on; A.set('pad', padOn);
      pad.classList.toggle('on', padOn); $('hPad').classList.toggle('active', padOn);
      tvdef = TV ? rdef : padOn ? rdef : null;
      if (!padOn) { TVC.x = null; TVC.armed = null; }
      resize();
    }
    if (padOK) { $('hPad').style.display = ''; $('hPad').addEventListener('click', () => { actx(); setPad(!padOn); }); }
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
    window.addEventListener('blur', () => pause());

    /* --- tiempo de juego (web PHP: POST a SITE.api; lo guarda data/stats.sqlite) --- */
    const statUid = () => {
      let u = null; try { u = localStorage.getItem('arc_uid'); } catch (_) {}
      if (!/^[a-f0-9]{24}$/.test(u || '')) { u = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join(''); try { localStorage.setItem('arc_uid', u); } catch (_) {} }
      document.cookie = 'arc_uid=' + u + ';path=/;max-age=63072000;SameSite=Lax'; return u;
    };
    const statFlush = () => {
      if (!SITE || !SITE.api || (STAT.s < 1 && !STAT.p)) return;
      const body = JSON.stringify({ g: SITE.id || def.id, s: Math.round(STAT.s), p: STAT.p, u: statUid() }); STAT.s = 0; STAT.p = 0;
      try { if (!(navigator.sendBeacon && navigator.sendBeacon(SITE.api, new Blob([body], { type: 'application/json' })))) fetch(SITE.api, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {}); } catch (_) {}
    };
    if (SITE) { statUid(); setInterval(statFlush, 60000); window.addEventListener('pagehide', statFlush); document.addEventListener('visibilitychange', () => { if (document.hidden) statFlush(); }); }
    A.playStats = STAT;

    /* --- bucle --- */
    let last = performance.now();
    function frame(now) {
      requestAnimationFrame(frame);
      let dt = (now - last) / 1000; last = now;
      if (dt > 0.05) dt = 0.05; if (dt < 0) dt = 0;
      g.rt += dt;
      if (g.state === 'play' && !g.demoOn && !document.hidden) STAT.s += dt;
      if (g.state === 'play') updFace(dt);
      if (g.demoOn) updDemo(dt);
      const live = g.state === 'play' || g.state === 'dying';
      if (g.state === 'play') { g.lt = (g.lt || 0) + dt; const sdt = dt * g.speed; g.t += sdt; def.update(g, sdt); }
      updAmbient(dt);
      if (live || g.state === 'win' || g.state === 'over' || g.state === 'final') {
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
      ctx.setTransform(A.dpr, 0, 0, A.dpr, 0, 0);
      ctx.save();
      if (g.shakeT > 0) { g.shakeT -= dt; ctx.translate((Math.random() - 0.5) * g.shakeA, (Math.random() - 0.5) * g.shakeA); }
      def.draw(g, ctx);
      drawAmbient();
      if (tvdef && tvdef.targets && g.state === 'play' && !g.demoOn) drawCursor();
      for (const r of g.rings) { ctx.globalAlpha = 1 - r.t; ctx.strokeStyle = r.color; ctx.lineWidth = r.w * (1 - r.t) + 1; ctx.beginPath(); ctx.arc(r.x, r.y, r.r * (0.2 + r.t * 0.8), 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = 1;
      for (const p of g.parts) {
        const al = Math.max(0, p.life / p.max);
        if (p.emoji) A.emoji(ctx, p.emoji, p.x, p.y, p.size, { alpha: al, rot: p.rot });
        else if (p.sq) { ctx.globalAlpha = Math.min(1, al * 2); ctx.fillStyle = p.color; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size); ctx.restore(); ctx.globalAlpha = 1; }
        else { ctx.globalAlpha = al; ctx.fillStyle = p.color || '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.5 + al * 0.5), 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
      }
      if (g.tapFx && g.state === 'play') { const f = g.tapFx; f.t -= dt; if (f.t > 0) { ctx.globalAlpha = f.t * 2; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, f.y, 26 - f.t * 60, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; } }
      if (g.swipeFx) { const f = g.swipeFx; f.t -= dt; if (f.t > 0) { ctx.globalAlpha = f.t * 2.5; ctx.strokeStyle = accent; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(f.x0, f.y0); ctx.lineTo(f.x1, f.y1); ctx.stroke(); ctx.globalAlpha = 1; } else g.swipeFx = null; }
      for (const f of g.floats) {
        const pop = 1 + Math.max(0, f.life - 0.82) * 3;
        ctx.globalAlpha = Math.min(1, f.life * 2);
        A.txt(ctx, f.text, f.x, f.y, f.size * pop, f.color, 'center', 900, 'rgba(0,0,0,.6)', TFONT);
        ctx.globalAlpha = 1;
      }
      if (vign) { ctx.fillStyle = vign; ctx.fillRect(0, 0, g.W, g.H); }
      if (g.banner) {
        const b = g.banner, k = Math.min(1, (b.max - b.t) * 6, b.t * 3), sc = 0.7 + 0.3 * Math.min(1, (b.max - b.t) * 5);
        ctx.globalAlpha = k;
        ctx.save(); ctx.translate(g.W / 2, g.H * 0.42); ctx.scale(sc, sc);
        const fs = Math.min(52, g.W / 8.5);
        A.txt(ctx, b.text, 3, 4, fs, 'rgba(0,0,0,.45)', 'center', 900, null, TFONT);
        A.txt(ctx, b.text, 0, 0, fs, '#fff', 'center', 900, accent, TFONT);
        if (b.sub) A.txt(ctx, b.sub, 0, fs * 0.95, 18, '#fff', 'center', 800, 'rgba(0,0,0,.6)');
        ctx.restore(); ctx.globalAlpha = 1;
      }
      if (g.demoOn && g.state !== 'menu') drawDemo();
      if (g.flashT > 0) { ctx.globalAlpha = Math.max(0, g.flashT / g.flashMax) * 0.45; ctx.fillStyle = g.flashC; ctx.fillRect(0, 0, g.W, g.H); ctx.globalAlpha = 1; }
      if (g.iris > 0) {
        const r = Math.hypot(g.W, g.H) * 0.6 * Math.pow(g.iris, 1.4);
        ctx.fillStyle = def.bg ? def.bg[1] : '#000'; ctx.beginPath(); ctx.rect(0, 0, g.W, g.H); ctx.arc(g.W / 2, g.H / 2, Math.max(1, r), 0, TAU, true); ctx.fill('evenodd');
      }
      ctx.restore();
    }

    resize();
    if (padOn) setPad(true);
    g.s = {}; def.setup(g); def.layout && def.layout(g);
    g.hud(); menu();
    requestAnimationFrame(frame);
    return g;
  };
})();
