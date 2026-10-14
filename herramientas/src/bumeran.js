// Bumerán|#1b2a4a
(function () {
  const { ri, pick, clamp } = Arcade;
  const COLS = 7, ROWS = 9, ALL = ['🍎', '🍋', '🍇', '🫐', '🍊'], WILD = '⭐';
  const TINT = { '🍎': '#ff6b6b', '🍋': '#ffe066', '🍇': '#b197fc', '🫐': '#74c0fc', '🍊': '#ffa94d', '⭐': '#fff3bf' };

  function geo(g) {
    const s = g.s, availW = g.W - 20, availH = g.bot - g.top - 60;
    s.cs = Math.min(availW / (COLS + 1.2), availH / ROWS);
    s.ox = (g.W - s.cs * (COLS + 1.2)) / 2; s.oy = g.top + 46 + (availH - s.cs * ROWS) / 2;
  }
  function count(s) { let n = 0; for (const row of s.f) for (const v of row) if (v) n++; return n; }
  function present(s) { const set = new Set(); for (const row of s.f) for (const v of row) if (v && v !== WILD) set.add(v); return [...set]; }
  function gravity(s) {
    for (let c = 0; c < COLS; c++) {
      const col = []; for (let r = ROWS - 1; r >= 0; r--) if (s.f[r][c]) col.push(s.f[r][c]);
      for (let r = ROWS - 1, i = 0; r >= 0; r--, i++) s.f[r][c] = col[i] || null;
    }
  }
  function finishShot(g, got) {
    const s = g.s, sh = s.shot;
    s.shot = null;
    gravity(s);
    if (sh.n) {
      g.addScore(10 * sh.n * sh.n, s.ox + (COLS + 0.6) * s.cs, s.oy + (s.prow + 0.5) * s.cs - 20);
      if (sh.n >= 3) { g.float('¡x' + sh.n + '!', g.W / 2, s.oy - 10, '#ffd166', 28); g.flash('#74c0fc', 0.15); }
      Arcade.sfx.coin();
    }
    const types = present(s);
    s.held = got || (types.length ? pick(types) : WILD);
    const left = count(s);
    if (left <= s.target) { g.addScore(200 * g.level + (s.target - left) * 100, g.W / 2, g.H / 2); g.win(); return; }
    if (!sh.n) {
      g.float('¡Fallo!', s.ox + COLS * s.cs * 0.5, s.oy + (sh.r + 0.5) * s.cs, '#ff6b6b', 22);
      g.die();
    }
  }
  function step(g) {
    const s = g.s, sh = s.shot;
    let nc = sh.c, nr = sh.r;
    if (sh.dir === 'L') nc--; else nr++;
    if (sh.dir === 'L' && nc < 0) { sh.dir = 'D'; return; }
    if (nr >= ROWS) { finishShot(g, null); return; }
    const b = s.f[nr][nc];
    if (!b) { sh.c = nc; sh.r = nr; return; }
    if (b === sh.t || b === WILD || sh.t === WILD) {
      if (sh.t === WILD && b !== WILD) sh.t = b;
      s.f[nr][nc] = null; sh.n++; sh.c = nc; sh.r = nr;
      g.burst(s.ox + (nc + 0.5) * s.cs, s.oy + (nr + 0.5) * s.cs, { n: 8, color: TINT[b], speed: 160, size: 3 });
      Arcade.sfx.combo(sh.n);
      return;
    }
    // choca con una pieza distinta: se intercambian
    s.f[nr][nc] = sh.t; Arcade.sfx.move();
    finishShot(g, b);
  }

  Arcade.game({
    id: 'bumeran', title: 'Bumerán', emoji: '🪃', color: '#74c0fc', origin: 'Plotting / Flipull (Taito, 1989)',
    help: '<b>Toca una fila</b> para lanzar tu pieza hacia la izquierda. Rompe todas las piezas <b>iguales</b> seguidas que encuentre; al chocar con una distinta, <b>se la queda</b> y esa vuelve a tu mano. Si llega a la pared, cae por la primera columna. Deja menos piezas que el objetivo para pasar de nivel. Un lanzamiento que no rompe nada te cuesta una vida. ⭐ vale por cualquiera.',
    lives: 3, levels: Infinity,
    theme: { font: 'Uncial Antiqua', ambient: 'fireflies', music: { tempo: 112, scale: 'dorian', root: 220, wave: 'triangle', lead: 'square' }, sfx: { wave: 'triangle', pitch: 1.1 } },
    setup(g) {
      g.s = { f: [], shot: null, acc: 0, prow: ROWS - 1 };
      const s = g.s, nt = Math.min(ALL.length, 3 + Math.floor((g.level - 1) / 4));
      const types = ALL.slice(0, nt);
      for (let r = 0; r < ROWS; r++) s.f.push(new Array(COLS).fill(null));
      const base = Math.min(ROWS - 3, 4 + Math.floor(g.level / 4));
      for (let c = 0; c < COLS; c++) {
        const h = clamp(base - Math.floor(c / 3) + ri(-1, 1), 2, ROWS - 2);
        for (let r = ROWS - h; r < ROWS; r++) s.f[r][c] = Math.random() < 0.04 ? WILD : pick(types);
      }
      s.start = count(s); s.target = Math.max(2, Math.round(s.start * (0.3 - Math.min(g.level, 18) * 0.012)));
      s.held = pick(present(s));
      geo(g);
    },
    layout(g) { if (g.s.f) geo(g); },
    down(g, p) {
      const s = g.s; if (s.shot) return;
      const r = clamp(Math.floor((p.y - s.oy) / s.cs), 0, ROWS - 1);
      s.prow = r; s.shot = { c: COLS, r, dir: 'L', t: s.held, n: 0 }; s.held = null; s.acc = 0;
      Arcade.tone(300, 0.06, 'triangle', 0.08, 300);
    },
    key(g, k, d) {
      if (!d) return; const s = g.s;
      if (k === 'ArrowUp') s.prow = Math.max(0, s.prow - 1); else if (k === 'ArrowDown') s.prow = Math.min(ROWS - 1, s.prow + 1);
      else if (k === ' ' && !s.shot) { s.shot = { c: COLS, r: s.prow, dir: 'L', t: s.held, n: 0 }; s.held = null; }
    },
    update(g, dt) {
      const s = g.s;
      if (!s.shot) return;
      s.acc += dt;
      while (s.shot && s.acc >= 0.035) { s.acc -= 0.035; step(g); if (g.state !== 'play') return; }
    },
    draw(g, ctx) {
      const s = g.s, W = g.W, H = g.H;
      Arcade.bg(ctx, W, H, '#2b2350', '#1b2a4a', '#0a0f1f');
      ctx.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < H; y += 60) { ctx.fillRect(0, y + 52, W, 8); }
      for (let y = 30, r = 0; y < H; y += 60, r++) for (let x = 14 + (r % 2) * 20; x < W; x += 44) Arcade.emoji(ctx, ['📚', '📕', '📗', '📘'][(x + r) % 4], x, y + 20, 22, { alpha: 0.16 });
      Arcade.decor(ctx, g.t, [{ e: '🕯️', x: 18, y: H - 30, s: 26, a: 0.7 }, { e: '🔮', x: W - 22, y: H - 30, s: 26, a: 0.7, bob: 3 }]);
      Arcade.glow(ctx, 18, H - 46, 40, 'rgba(255,200,100,.6)', 0.4 + Math.sin(g.t * 9) * 0.05);
      Arcade.amb(g, ctx);
      if (!s.f) return;
      const cs = s.cs;
      ctx.fillStyle = 'rgba(255,255,255,.05)'; Arcade.rr(ctx, s.ox - 6, s.oy - 6, cs * COLS + 12, cs * ROWS + 12, 14); ctx.fill();
      ctx.fillStyle = '#4c6ef5'; ctx.fillRect(s.ox - 8, s.oy - 6, 5, cs * ROWS + 12);
      // fila objetivo
      ctx.fillStyle = 'rgba(116,192,252,.08)'; ctx.fillRect(s.ox, s.oy + s.prow * cs, cs * (COLS + 1.2), cs);
      const tile = (x, y, v, a) => {
        ctx.globalAlpha = a == null ? 1 : a;
        ctx.fillStyle = TINT[v]; Arcade.rr(ctx, x + 2, y + 2, cs - 4, cs - 4, cs * 0.2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.3)'; Arcade.rr(ctx, x + 5, y + 4, cs - 10, cs * 0.25, cs * 0.1); ctx.fill();
        Arcade.emoji(ctx, v, x + cs / 2, y + cs / 2 + 1, cs * 0.58);
        ctx.globalAlpha = 1;
      };
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (s.f[r][c]) tile(s.ox + c * cs, s.oy + r * cs, s.f[r][c]);
      if (s.shot) { Arcade.glow(ctx, s.ox + (s.shot.c + 0.5) * cs, s.oy + (s.shot.r + 0.5) * cs, cs, 'rgba(255,255,255,.7)', 0.5); tile(s.ox + s.shot.c * cs, s.oy + s.shot.r * cs, s.shot.t); }
      // jugador
      const px = s.ox + (COLS + 0.6) * cs, py = s.oy + (s.prow + 0.5) * cs;
      if (s.held) tile(s.ox + (COLS + 0.05) * cs, py - cs * 0.5, s.held, 0.95);
      Arcade.emoji(ctx, '🧙', s.ox + (COLS + 0.95) * cs, py + cs * 0.1, cs * 0.62);
      const left = count(s);
      Arcade.txt(ctx, 'Quedan ' + left + '  ·  objetivo ≤ ' + s.target, W / 2, s.oy - 24, 15, left <= s.target ? '#69db7c' : '#dbe4ff', 'center', 800, 'rgba(0,0,0,.4)');
    },
  });
})();
