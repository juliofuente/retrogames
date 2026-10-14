// Fusiona bolas|#141a2e
(function () {
  const { ri, clamp } = Arcade;
  const C = 5, R = 7;
  const COL = ['#ff6b6b', '#ffa94d', '#ffd43b', '#94d82d', '#38d9a9', '#3bc9db', '#4dabf7', '#748ffc', '#9775fa', '#da77f2', '#f783ac', '#e64980', '#fd7e14', '#fab005', '#40c057', '#15aabf'];
  const lg = (v) => Math.round(Math.log2(v));
  const fmt = (v) => (v >= 1e6 ? Math.round(v / 1e6) + 'M' : v >= 10000 ? Math.round(v / 1000) + 'K' : '' + v);

  function geo(g) { const s = g.s, Ha = g.bot - g.top - 150; s.cs = Math.min((g.W - 20) / C, Ha / R, 80); s.ox = (g.W - s.cs * C) / 2; s.oy = g.top + 50; s.ly = Math.min(g.bot - 60, s.oy + s.cs * R + 70); }
  function nextVal(s) { const top = clamp(lg(s.maxV) - 2, 1, 6); return Math.pow(2, ri(1, top)); }
  function landRow(s, c) { for (let r = 0; r < R; r++) if (!s.b[r][c]) return r; return -1; }
  function shoot(g, c) {
    const s = g.s; if (s.fly || s.busy || s.done) return;
    const r = landRow(s, c); if (r < 0) { Arcade.sfx.bad(); s.shake = 0.3; return; }
    s.fly = { c, r, v: s.cur, y: s.ly, ty: s.oy + (r + 0.5) * s.cs };
    s.cur = s.next; s.next = nextVal(s); Arcade.sfx.whoosh();
  }
  function settle(g, c, r) {
    const s = g.s; let chain = 0;
    const step = () => {
      const v = s.b[r][c]; if (!v) return finish();
      const nbs = [[r, c - 1], [r, c + 1], [r - 1, c], [r + 1, c]].filter(([y, x]) => y >= 0 && y < R && x >= 0 && x < C && s.b[y][x] && s.b[y][x].v === v.v);
      if (!nbs.length) return finish();
      chain++;
      for (const [y, x] of nbs) { s.b[y][x] = null; g.burst(s.ox + (x + 0.5) * s.cs, s.oy + (y + 0.5) * s.cs, { n: 5, color: COL[lg(v.v) % COL.length], speed: 140, size: 4 }); }
      v.v *= Math.pow(2, nbs.length); v.pop = 1;
      s.maxV = Math.max(s.maxV, v.v);
      g.addScore(v.v * (chain > 1 ? chain : 1), s.ox + (c + 0.5) * s.cs, s.oy + (r + 0.5) * s.cs);
      Arcade.sfx.combo(chain * 2 + nbs.length);
      if (chain > 1) g.float('×' + chain, s.ox + (c + 0.5) * s.cs, s.oy + r * s.cs, '#ffd43b', 22);
      // gravedad hacia arriba: la bola resultante sube si hay hueco
      gravity(s);
      for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) if (s.b[y][x] === v) { r = y; c = x; }
      s.busy = true; setTimeout(() => { s.busy = false; if (g.state === 'play') step(); }, 160);
    };
    const finish = () => {
      // otras bolas movidas por la gravedad también pueden fusionarse
      for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) { const v = s.b[y][x]; if (!v) continue; for (const [yy, xx] of [[y, x + 1], [y + 1, x]]) if (yy < R && xx < C && s.b[yy][xx] && s.b[yy][xx].v === v.v) { c = x; r = y; s.busy = true; setTimeout(() => { s.busy = false; if (g.state === 'play') step(); }, 160); return; } }
      if (s.maxV >= s.goal && !s.done) { s.done = true; setTimeout(() => { if (g.state === 'play') g.win(); }, 500); return; }
      let full = true; for (let x = 0; x < C; x++) if (landRow(s, x) >= 0) full = false;
      if (full) { g.message(Arcade.T('¡Sin hueco!', 'No room left!'), 1.2); setTimeout(() => { if (g.state === 'play' && g.die()) { for (let y = 3; y < R; y++) s.b[y].fill(null); } }, 900); }
    };
    step();
  }
  function gravity(s) { for (let x = 0; x < C; x++) { const col = []; for (let y = 0; y < R; y++) if (s.b[y][x]) col.push(s.b[y][x]); for (let y = 0; y < R; y++) s.b[y][x] = col[y] || null; } }

  Arcade.game({
    /*THEME*/ home: 'indexpro.html', tag: 'Dispara y fusiona números', deco: ['2️⃣', '4️⃣', '8️⃣', '🔵', '🟣', '💥'], font: 'round', bg: ['#2a3157', '#141a2e'],
    music: { mode: 'mixo', bpm: 118, wave: 'triangle', style: 'arcade', root: 60 }, voice: { wave: 'triangle', mul: 1.2, echo: 0.25 },
    ambient: { e: ['⚪'], n: 8, vy: -18, sway: 16, alpha: 0.07, size: [10, 24] },
    en: { title: 'Fuse Balls', tag: 'Shoot and merge numbers', help: '<b>Tap</b> a column (or drag to aim and let go) to shoot the ball upwards: it sticks under the others. When it touches balls with the <b>same number</b> they all merge: two make double, three make four times… and the result can keep merging in a chain! Make the target ball each level asks for. If every column is full, you lose a life.', tvHelp: '◀ ▶ aim · OK to shoot.', dict: { 'Objetivo: ': 'Target: ', '¡Sin hueco!': 'No room left!', 'Siguiente': 'Next' } },
    tvHelp: '◀ ▶ apuntar · OK para disparar.',
    id: 'fusionabolas', title: 'Fusiona bolas', emoji: '🔵', color: '#748ffc', origin: 'Fuse Ballz / Drop the Number / Ballz',
    help: '<b>Toca</b> una columna (o arrastra para apuntar y suelta) para disparar la bola hacia arriba: se pega debajo de las demás. Si toca bolas con el <b>mismo número</b>, se fusionan todas: dos hacen el doble, tres el cuádruple… ¡y el resultado puede seguir fusionándose en cadena! Consigue la bola objetivo de cada nivel. Si todas las columnas se llenan, pierdes una vida.',
    lives: 3, levels: 0, cap: 16,
    demo(g) {
      const s = g.s; if (s.fly || s.busy || s.done) return { wait: 0.25 };
      let best = 0, bv = -1e9;
      for (let c = 0; c < C; c++) { const r0 = landRow(s, c); if (r0 < 0) continue; let v = -r0;
        for (const [y, x] of [[r0, c - 1], [r0, c + 1], [r0 - 1, c]]) if (y >= 0 && x >= 0 && x < C && s.b[y][x] && s.b[y][x].v === s.cur) v += 20;
        if (r0 > 0 && s.b[r0 - 1][c].v > s.cur) v += 2; v += Math.random(); if (v > bv) { bv = v; best = c; } }
      return { tap: [s.ox + (best + 0.5) * s.cs, s.ly - s.cs * 0.2], after: 0.7, say: bv >= 20 ? Arcade.T('Toca su columna: se junta con su igual', 'Tap its column: it joins its twin') : Arcade.T('Toca una columna para disparar', 'Tap a column to shoot') };
    },
    setup(g) {
      g.s = { b: [...Array(R)].map(() => new Array(C).fill(null)), aim: 2, fly: null, busy: false, done: false, maxV: 4, shake: 0 };
      const s = g.s; s.goal = Math.pow(2, clamp(6 + Math.floor(g.lv / 2), 6, 12));
      const pre = Math.min(3, Math.floor(g.lv / 3));
      for (let y = 0; y < pre; y++) for (let x = 0; x < C; x++) if (Math.random() < 0.7) s.b[y][x] = { v: Math.pow(2, ri(1, 4)), pop: 0 };
      gravity(s);
      // sin parejas al empezar
      for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) { const v = s.b[y][x]; if (!v) continue; let guard = 0; while (guard++ < 20 && ((x > 0 && s.b[y][x - 1] && s.b[y][x - 1].v === v.v) || (y > 0 && s.b[y - 1][x] && s.b[y - 1][x].v === v.v))) v.v = Math.pow(2, ri(1, 5)); }
      s.cur = nextVal(s); s.next = nextVal(s);
      geo(g);
    },
    layout(g) { if (g.s.b) geo(g); },
    down(g, p) { const s = g.s; s.aim = clamp(Math.floor((p.x - s.ox) / s.cs), 0, C - 1); s.drag = true; },
    move(g, p) { const s = g.s; const a = clamp(Math.floor((p.x - s.ox) / s.cs), 0, C - 1); if (a !== s.aim) { s.aim = a; Arcade.sfx.tick(); } },
    up(g, p) { const s = g.s; if (!s.drag) return; s.drag = false; shoot(g, s.aim); },
    hover(g, x) { const s = g.s; s.aim = clamp(Math.floor((x - s.ox) / s.cs), 0, C - 1); },
    key(g, k, d) { if (!d) return; const s = g.s; if (k === 'ArrowLeft') { s.aim = Math.max(0, s.aim - 1); Arcade.sfx.tick(); } else if (k === 'ArrowRight') { s.aim = Math.min(C - 1, s.aim + 1); Arcade.sfx.tick(); } else if (k === ' ' || k === 'ArrowUp') shoot(g, s.aim); },
    update(g, dt) {
      const s = g.s; s.shake = Math.max(0, s.shake - dt);
      for (const row of s.b) for (const v of row) if (v && v.pop) v.pop = Math.max(0, v.pop - dt * 4);
      if (s.fly) {
        const f = s.fly; f.y -= dt * 1800;
        if (f.y <= f.ty) { s.b[f.r][f.c] = { v: f.v, pop: 1 }; s.fly = null; Arcade.tone(260, 0.05, 'square', 0.05); s.maxV = Math.max(s.maxV, f.v); settle(g, f.c, f.r); }
      }
    },
    draw(g, ctx) {
      const s = g.s, W = g.W, H = g.H;
      const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#3b4380'); bg.addColorStop(1, '#0d1120');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      if (!s.b) return;
      const cs = s.cs, sh = s.shake ? Math.sin(s.shake * 60) * 4 : 0;
      ctx.fillStyle = 'rgba(0,0,0,.3)'; Arcade.rr(ctx, s.ox - 6 + sh, s.oy - 6, cs * C + 12, cs * R + 12, 14); ctx.fill();
      // columna apuntada
      ctx.fillStyle = 'rgba(255,255,255,.08)'; Arcade.rr(ctx, s.ox + s.aim * cs + 3, s.oy, cs - 6, s.ly - s.oy, 10); ctx.fill();
      const lr = landRow(s, s.aim);
      const ball = (x, y, v, z, a) => {
        const i = lg(v), c = COL[(i - 1) % COL.length];
        ctx.globalAlpha = a ?? 1;
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, z, 0, 6.3); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.arc(x - z * 0.3, y - z * 0.35, z * 0.32, 0, 6.3); ctx.fill();
        const t = fmt(v); Arcade.txt(ctx, t, x, y + 1, z * (t.length > 3 ? 0.55 : t.length > 2 ? 0.7 : 0.85), '#fff', 'center', 900, 'rgba(0,0,0,.35)', Arcade.TFONT);
        ctx.globalAlpha = 1;
      };
      if (lr >= 0 && !s.fly) ball(s.ox + (s.aim + 0.5) * cs, s.oy + (lr + 0.5) * cs, s.cur, cs * 0.42, 0.22);
      for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) { const v = s.b[y][x]; if (v) ball(s.ox + (x + 0.5) * cs + sh, s.oy + (y + 0.5) * cs, v.v, cs * 0.44 * (1 + v.pop * 0.18)); }
      if (s.fly) ball(s.ox + (s.fly.c + 0.5) * cs, s.fly.y, s.fly.v, cs * 0.42);
      // lanzador
      const lx = s.ox + (s.aim + 0.5) * cs;
      Arcade.emoji(ctx, '🔺', lx, s.ly + cs * 0.55, cs * 0.4);
      if (!s.fly) ball(lx, s.ly, s.cur, cs * 0.42);
      Arcade.txt(ctx, 'Siguiente', s.ox + C * cs - 26, s.ly - cs * 0.62, 11, '#bac8ff', 'center', 800);
      ball(s.ox + C * cs - 26, s.ly - cs * 0.1, s.next, cs * 0.26, 0.8);
      Arcade.txt(ctx, 'Objetivo: ', W / 2 - 4, g.top + 22, 15, '#dbe4ff', 'right', 800);
      ball(W / 2 + 22, g.top + 22, s.goal, 18);
    },
  });
})();
