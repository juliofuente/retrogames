// Hextris|#101225
(function () {
  const { ri, clamp, pick } = Arcade;
  const C = 9, R = 16, SQ3 = Math.sqrt(3);
  const COLS = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#38d9a9', '#4dabf7', '#9775fa', '#f783ac', '#e599f7', '#74c0fc'];
  // coordenadas: columna/fila en pantalla (desplazadas: las columnas impares bajan media casilla) ↔ axiales
  const toAx = (c, r) => [c, r - (c - (c & 1)) / 2];
  const toOff = (q, r) => [q, r + (q - (q & 1)) / 2];
  const rot = ([q, r]) => [-r, q + r];   // 60°
  // todas las piezas de 4 hexágonos distintas (salvo giro), generadas al cargar
  const SHAPES = (() => {
    const D = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]], norm = (cs) => { const mq = Math.min(...cs.map((c) => c[0])), mr = Math.min(...cs.map((c) => c[1])); return cs.map(([q, r]) => [q - mq, r - mr]).sort((a, b) => a[0] - b[0] || a[1] - b[1]); };
    const canon = (cs) => { let best = null; let c = cs; for (let k = 0; k < 6; k++) { c = c.map(rot); const n = JSON.stringify(norm(c)); if (!best || n < best) best = n; } return best; };
    let set = [[[0, 0]]];
    for (let n = 1; n < 4; n++) { const nx = new Map(); for (const cs of set) for (const [q, r] of cs) for (const [dq, dr] of D) { const p = [q + dq, r + dr]; if (cs.some((c) => c[0] === p[0] && c[1] === p[1])) continue; const ncs = cs.concat([p]); nx.set(canon(ncs), norm(ncs)); } set = [...nx.values()]; }
    return set.map((cs) => { const cq = Math.round(cs.reduce((a, c) => a + c[0], 0) / 4), cr = Math.round(cs.reduce((a, c) => a + c[1], 0) / 4); return cs.map(([q, r]) => [q - cq, r - cr]); });
  })();
  function cellsOf(p) { const [aq, ar] = toAx(p.c, p.r); let sh = SHAPES[p.k]; for (let i = 0; i < p.rot; i++) sh = sh.map(rot); return sh.map(([q, r]) => toOff(aq + q, ar + r)); }
  const fits = (b, cells) => cells.every(([c, r]) => c >= 0 && c < C && r < R && (r < 0 || b[r * C + c] < 0));
  function geo(g) { const s = g.s, Ha = g.bot - g.top - 70; s.hs = Math.min((g.W - 20) / (1.5 * C + 0.5), Ha / (SQ3 * (R + 0.5))); s.ox = (g.W - s.hs * (1.5 * C + 0.5)) / 2; s.oy = g.top + 60 + (Ha - s.hs * SQ3 * (R + 0.5)) / 2; }
  const XY = (s, c, r) => [s.ox + s.hs + c * 1.5 * s.hs, s.oy + (r + (c & 1) * 0.5 + 0.5) * SQ3 * s.hs];
  function hex(ctx, x, y, h, col, alpha) {
    ctx.globalAlpha = alpha ?? 1; ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; ctx.lineTo(x + Math.cos(a) * h * 0.93, y + Math.sin(a) * h * 0.93); } ctx.closePath();
    const gr = ctx.createLinearGradient(x, y - h, x, y + h); gr.addColorStop(0, '#fff'); gr.addColorStop(0.3, col); gr.addColorStop(1, col);
    ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = (alpha ?? 1) * 0.35; ctx.fillStyle = gr; ctx.fill(); ctx.globalAlpha = 1;
  }
  function spawn(g) {
    const s = g.s; s.p = { k: s.next, rot: 0, c: Math.floor(C / 2), r: -1 }; s.next = ri(0, SHAPES.length - 1); s.fallT = 0; s.lockT = 0;
    if (!fits(s.b, cellsOf(s.p))) { s.dead = 1; g.mood('hurt', 1); Arcade.sfx.hit(); g.shake(0.4, 8); }
  }
  function tryMove(g, dc, dr, drot) {
    const s = g.s; if (!s.p || s.dead || s.done) return false;
    const np = { ...s.p, c: s.p.c + dc, r: s.p.r + dr, rot: (s.p.rot + (drot || 0) + 6) % 6 };
    if (fits(s.b, cellsOf(np))) { s.p = np; return true; }
    if (drot) for (const k of [1, -1]) { const q = { ...np, c: np.c + k }; if (fits(s.b, cellsOf(q))) { s.p = q; return true; } }   // pequeño empujón al girar
    return false;
  }
  function lock(g) {
    const s = g.s, col = SHAPES.length ? s.p.k : 0; for (const [c, r] of cellsOf(s.p)) { if (r < 0) { s.dead = 1; g.mood('hurt', 1); Arcade.sfx.hit(); return; } s.b[r * C + c] = col; }
    Arcade.tone(180, 0.05, 'square', 0.06); s.p = null;
    const full = []; for (let r = 0; r < R; r++) { let ok = true; for (let c = 0; c < C; c++) if (s.b[r * C + c] < 0) { ok = false; break; } if (ok) full.push(r); }
    if (full.length) {
      s.clearing = { rows: full, t: 0 };
      for (let k = 0; k < full.length * 3; k++) setTimeout(() => Arcade.tone(523 * Math.pow(2, [0, 4, 7, 12, 16, 19, 24, 28, 31, 36, 40, 43][k] / 12), 0.1, 'triangle', 0.06), k * 45);
      g.addScore([0, 100, 300, 600, 1000][Math.min(4, full.length)] * Math.max(1, Math.round(g.lv / 2)), g.W / 2, XY(s, 0, full[0])[1]);
      if (full.length >= 2) g.shake(0.2, 5);
    } else spawn(g);
  }
  function finishClear(g) {
    const s = g.s, rows = s.clearing.rows; s.clearing = null;
    const nb = new Array(C * R).fill(-1); let dst = R - 1;
    for (let r = R - 1; r >= 0; r--) { if (rows.includes(r)) continue; for (let c = 0; c < C; c++) nb[dst * C + c] = s.b[r * C + c]; dst--; }
    s.b = nb; s.lines += rows.length;
    if (s.lines >= s.goal) { s.done = true; g.confetti(70); g.addScore(300 * g.lv, g.W / 2, g.H / 2); setTimeout(() => { if (g.state === 'play') g.win(); }, 900); return; }
    spawn(g);
  }
  // demo: prueba todos los giros y columnas y elige la mejor caída
  function best(s) {
    let bestP = null, bs = -1e9;
    for (let rt = 0; rt < 6; rt++) for (let c = 0; c < C; c++) {
      let p = { ...s.p, rot: rt, c, r: -1 }; if (!fits(s.b, cellsOf(p))) continue;
      while (fits(s.b, cellsOf({ ...p, r: p.r + 1 }))) p.r++;
      const b = s.b.slice(); let bad = false; for (const [cc, r] of cellsOf(p)) { if (r < 0) bad = true; else b[r * C + cc] = 0; } if (bad) continue;
      let lines = 0, holes = 0, hgt = 0, agg = 0;
      for (let r = 0; r < R; r++) { let ok = true; for (let cc = 0; cc < C; cc++) if (b[r * C + cc] < 0) ok = false; if (ok) lines++; }
      for (let cc = 0; cc < C; cc++) { let top = R; for (let r = 0; r < R; r++) if (b[r * C + cc] >= 0) { top = r; break; } hgt = Math.max(hgt, R - top); agg += R - top; for (let r = top + 1; r < R; r++) if (b[r * C + cc] < 0) holes++; }
      const v = lines * 8 - holes * 4 - agg * 0.35 - hgt * 0.6;
      if (v > bs) { bs = v; bestP = p; }
    }
    return bestP;
  }

  Arcade.game({
    /*THEME*/ home: 'indexpro.html', tag: 'Bloques que caen, pero hexagonales', deco: ['⬡', '🔷', '🔶', '💠', '🧩', '🏆'], font: 'wide', bg: ['#1c1f45', '#101225'],
    music: { mode: 'minor', bpm: 132, wave: 'square', style: 'drive', root: 57 }, voice: { wave: 'square', mul: 1, echo: 0.2 },
    /*EN*/ en: { title: 'Hextris', tag: 'Falling blocks, but hexagonal', help: 'Falling-block game on a grid of <b>hexagons</b>. Pieces of 4 hexagons fall: <b>swipe left or right</b> (or drag) to move them, <b>tap</b> to rotate them and <b>swipe down</b> to drop them. Fill a whole <b>zigzag row</b> across the board and it disappears. Clear the rows the level asks for before the pieces reach the top.', tvHelp: '◀ ▶ move · ▲ or OK rotate · ▼ drop.', dict: { 'Filas: ': 'Rows: ', 'Siguiente': 'Next' } },
    /*TV*/ tvHelp: '◀ ▶ mover · ▲ u OK girar · ▼ soltar.',
    id: 'hextris', title: 'Hextris', emoji: '🔷', color: '#748ffc', origin: 'Hextris / Hex Tetris (Lutanho)',
    help: 'Bloques que caen en un tablero de <b>hexágonos</b>. Bajan piezas de 4 hexágonos: <b>desliza a izquierda o derecha</b> (o arrastra) para moverlas, <b>toca</b> para girarlas y <b>desliza hacia abajo</b> para dejarlas caer. Llena una <b>fila en zigzag</b> de lado a lado y desaparece. Haz las filas que pide el nivel antes de que las piezas lleguen arriba.',
    lives: 3, levels: 0, cap: 20,
    /*SC*/ demo(g) {
      const s = g.s; if (!s.p || s.dead || s.done || s.clearing) return { wait: 0.1 };
      if (!s.target || s.target.id !== s.pid) { s.target = best(s); if (s.target) s.target.id = s.pid; }
      const t = s.target; if (!t) return { key: 'ArrowDown', dur: 0.05, after: 0.1 };
      if (s.p.rot !== t.rot) return { key: 'ArrowUp', dur: 0.04, after: 0.08, say: s.lines ? null : Arcade.T('Llena filas en zigzag', 'Fill zigzag rows') };
      if (s.p.c !== t.c) return { key: s.p.c < t.c ? 'ArrowRight' : 'ArrowLeft', dur: 0.04, after: 0.06 };
      return { key: 'ArrowDown', dur: 0.05, after: 0.3 };
    },
    setup(g) {
      g.s = { b: new Array(C * R).fill(-1), next: ri(0, SHAPES.length - 1), lines: 0, goal: clamp(4 + Math.floor(g.lv * 0.6), 4, 16), spd: clamp(1.2 + g.lv * 0.12, 1.2, 4), dead: 0, done: false, pid: 0 };
      geo(g); spawn(g);
    },
    layout(g) { if (g.s.b) geo(g); },
    down(g, p) { g.s.dragX = p.x; },
    move(g, p) { const s = g.s; if (s.dragX == null) return; const step = s.hs * 1.5; while (p.x - s.dragX > step) { tryMove(g, 1, 0); s.dragX += step; s.dragged = true; } while (s.dragX - p.x > step) { tryMove(g, -1, 0); s.dragX -= step; s.dragged = true; } },
    up(g) { g.s.dragX = null; },
    tap(g) { const s = g.s; if (s.dragged) { s.dragged = false; return; } if (tryMove(g, 0, 0, 1)) Arcade.tone(600, 0.04, 'square', 0.04); },
    swipe(g, d) { const s = g.s; if (s.dragged) { s.dragged = false; if (d !== 'down') return; } if (d === 'down') { while (tryMove(g, 0, 1)); s.fallT = 1; Arcade.sfx.whoosh(); } else if (d === 'up') tryMove(g, 0, 0, 1); },
    key(g, k, d) { if (!d) return; if (k === 'ArrowLeft') tryMove(g, -1, 0); else if (k === 'ArrowRight') tryMove(g, 1, 0); else if (k === 'ArrowUp' || k === ' ') tryMove(g, 0, 0, 1); else if (k === 'ArrowDown') { while (tryMove(g, 0, 1)); g.s.fallT = 1; } },
    update(g, dt) {
      const s = g.s; if (!s.b) return;
      if (s.dead) { s.dead -= dt; if (s.dead <= 0) { s.dead = 0; if (g.state === 'play' && g.die()) Arcade.current.def.setup(g); } return; }
      if (s.done) return;
      if (s.clearing) { s.clearing.t += dt / 0.35; if (s.clearing.t >= 1) finishClear(g); return; }
      if (!s.p) return;
      s.fallT += dt * s.spd;
      if (s.fallT >= 1) { s.fallT = 0; if (!tryMove(g, 0, 1)) { lock(g); s.pid++; } }
    },
    draw(g, ctx) {
      const s = g.s, W = g.W, H = g.H;
      const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1c1f45'); bg.addColorStop(1, '#080915');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      if (!s.b) return;
      const h = s.hs;
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        const [x, y] = XY(s, c, r), v = s.b[r * C + c], clr = s.clearing && s.clearing.rows.includes(r);
        if (v < 0) { ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1; ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; ctx.lineTo(x + Math.cos(a) * h * 0.93, y + Math.sin(a) * h * 0.93); } ctx.closePath(); ctx.stroke(); continue; }
        if (clr) { const k = s.clearing.t; hex(ctx, x, y, h * (1 - k * 0.6), '#fff', 1 - k); } else hex(ctx, x, y, h, COLS[v % COLS.length]);
      }
      if (s.p && !s.dead) {
        // sombra de dónde caerá
        let gp = { ...s.p }; while (fits(s.b, cellsOf({ ...gp, r: gp.r + 1 }))) gp.r++;
        for (const [c, r] of cellsOf(gp)) if (r >= 0) { const [x, y] = XY(s, c, r); hex(ctx, x, y, h, COLS[s.p.k % COLS.length], 0.18); }
        const off = Math.min(1, s.fallT) * 0;
        for (const [c, r] of cellsOf(s.p)) if (r >= 0) { const [x, y] = XY(s, c, r + off); hex(ctx, x, y, h, COLS[s.p.k % COLS.length]); }
      }
      // siguiente pieza
      Arcade.txt(ctx, 'Siguiente', W - 60, g.top + 14, 11, '#a5b4fc', 'center', 800);
      for (const [q, r] of SHAPES[s.next]) { const x = W - 60 + q * 1.5 * 8, y = g.top + 38 + (r + q / 2) * SQ3 * 8; hex(ctx, x, y, 8, COLS[s.next % COLS.length]); }
      Arcade.txt(ctx, 'Filas: ' + Math.min(s.lines, s.goal) + '/' + s.goal, W / 2, g.top + 22, 16, '#dbe4ff', 'center', 900);
    },
  });
})();
