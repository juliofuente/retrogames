// Centro|#111827
(function () {
  const { ri, pick, clamp } = Arcade;
  const COL = ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7'], GLY = ['●', '▲', '■', '◆'];
  const SIDES = ['L', 'R', 'T', 'B'];

  function geo(g) {
    const s = g.s, Wa = g.W - 16, Ha = g.bot - g.top - 16;
    s.cs = Math.min(Wa / 10, Ha / 10, 58);
    s.lenH = Math.floor((Wa / s.cs - 4) / 2); s.lenV = Math.floor((Ha / s.cs - 4) / 2);
    s.cx0 = (g.W - 4 * s.cs) / 2; s.cy0 = g.top + 8 + (Ha - 4 * s.cs) / 2;
  }
  const len = (s, side) => (side === 'L' || side === 'R' ? s.lenH : s.lenV);
  // posición en pantalla de la casilla k (0 = la de fuera) de la línea i del lado side
  function cellXY(s, side, i, k) {
    const L = len(s, side), cs = s.cs, d = L - 1 - k; // d = distancia desde el centro (0 pegada)
    if (side === 'L') return [s.cx0 - (d + 1) * cs, s.cy0 + i * cs];
    if (side === 'R') return [s.cx0 + (4 + d) * cs, s.cy0 + i * cs];
    if (side === 'T') return [s.cx0 + i * cs, s.cy0 - (d + 1) * cs];
    return [s.cx0 + i * cs, s.cy0 + (4 + d) * cs];
  }
  function spawn(g) {
    const s = g.s, side = pick(SIDES), i = ri(0, 3), line = s.lines[side][i];
    const p = Math.random() < 0.03 ? { bomb: true, c: 0 } : { c: ri(0, Math.min(3, 1 + g.level)) };
    line.unshift(p);
    s.pieces++;
    if (line.length > len(s, side)) { s.lostAt = [side, i]; Arcade.sfx.boom(); g.shake(0.5, 12); g.state = 'dying'; setTimeout(g.over, 900); }
  }
  function shoot(g, side, i) {
    const s = g.s, line = s.lines[side][i];
    s.beam = { side, i, t: 0.15 };
    let n = 0;
    while (line.length) {
      const last = line[line.length - 1];
      if (last.bomb) { n += line.length; line.length = 0; Arcade.sfx.boom(); g.shake(0.2, 6); g.flash('#ff922b', 0.25); break; }
      if (last.c !== s.pc) break;
      const [x, y] = cellXY(s, side, i, line.length - 1);
      g.burst(x + s.cs / 2, y + s.cs / 2, { n: 6, color: COL[last.c], speed: 160, size: 3 });
      line.pop(); n++;
    }
    if (line.length) { const last = line[line.length - 1]; const t = last.c; last.c = s.pc; s.pc = t; Arcade.sfx.move(); }
    if (n) {
      const pts = 10 * n * (n >= 3 ? n : 1) * g.level;
      const [x, y] = cellXY(s, side, i, Math.max(0, line.length - 1));
      g.addScore(pts, x + s.cs / 2, y);
      Arcade.sfx.combo(n); const [rx, ry] = cellXY(s, side, i, Math.max(0, line.length)); g.ring(rx + s.cs / 2, ry + s.cs / 2, { color: COL[s.pc], r: s.cs * (1 + n * 0.3), w: 4 });
      s.cleared += n;
      const lv = 1 + Math.floor(s.cleared / 35);
      if (lv > g.level) { g.level = lv; g.hud(); g.message('Nivel ' + lv, 1.1); Arcade.sfx.level(); }
    }
  }

  Arcade.game({
    id: 'centro', title: 'Centro', emoji: '🎯', color: '#4dabf7', origin: 'Zoop (Hookstone, 1995)',
    help: 'Las piezas avanzan hacia el centro desde los cuatro lados. <b>Toca una fila o columna</b> para disparar desde el centro: eliminas todas las piezas seguidas <b>de tu color</b>. Al chocar con otra de distinto color, <b>intercambiáis los colores</b>. Si una pieza entra en el cuadro central, se acaba. 💣 limpia toda la línea.',
    lives: 0, levels: null,
    theme: { font: 'Teko', ambient: 'stars', music: { tempo: 140, scale: 'minor', root: 233, wave: 'sawtooth', lead: 'square' }, sfx: { wave: 'sawtooth', pitch: 1 } },
    setup(g) {
      g.s = { lines: {}, pc: 0, spawnT: 1, pieces: 0, cleared: 0, beam: null };
      const s = g.s; geo(g);
      for (const sd of SIDES) s.lines[sd] = [[], [], [], []];
      for (let k = 0; k < 6; k++) spawn(g);
    },
    layout(g) { if (g.s.lines) geo(g); },
    down(g, p) {
      const s = g.s, cs = s.cs, x = p.x, y = p.y;
      const inRows = y >= s.cy0 && y < s.cy0 + 4 * cs, inCols = x >= s.cx0 && x < s.cx0 + 4 * cs;
      let side = null, i = 0;
      if (inRows && x < s.cx0) { side = 'L'; i = Math.floor((y - s.cy0) / cs); }
      else if (inRows && x >= s.cx0 + 4 * cs) { side = 'R'; i = Math.floor((y - s.cy0) / cs); }
      else if (inCols && y < s.cy0) { side = 'T'; i = Math.floor((x - s.cx0) / cs); }
      else if (inCols && y >= s.cy0 + 4 * cs) { side = 'B'; i = Math.floor((x - s.cx0) / cs); }
      else if (inRows && inCols) {
        const dx = x - (s.cx0 + 2 * cs), dy = y - (s.cy0 + 2 * cs);
        if (Math.abs(dx) > Math.abs(dy)) { side = dx < 0 ? 'L' : 'R'; i = Math.floor((y - s.cy0) / cs); }
        else { side = dy < 0 ? 'T' : 'B'; i = Math.floor((x - s.cx0) / cs); }
      }
      if (side) shoot(g, side, clamp(i, 0, 3));
    },
    update(g, dt) {
      const s = g.s;
      if (s.beam) { s.beam.t -= dt; if (s.beam.t <= 0) s.beam = null; }
      s.spawnT -= dt;
      if (s.spawnT <= 0) { s.spawnT = Math.max(0.32, 1.35 - g.level * 0.1); spawn(g); }
    },
    draw(g, ctx) {
      const s = g.s, W = g.W, H = g.H, cs = s.cs;
      Arcade.bg(ctx, W, H, '#0b1026', '#111827', '#05060f');
      Arcade.amb(g, ctx);
      if (!s.lines) return;
      // carriles
      for (const sd of SIDES) for (let i = 0; i < 4; i++) {
        const L = len(s, sd);
        for (let k = 0; k < L; k++) {
          const [x, y] = cellXY(s, sd, i, k);
          ctx.fillStyle = (i + k) % 2 ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.07)';
          ctx.fillRect(x, y, cs, cs);
        }
        const [x, y] = cellXY(s, sd, i, L - 1);
        ctx.fillStyle = 'rgba(255,80,80,.12)'; ctx.fillRect(x, y, cs, cs);
      }
      // centro
      Arcade.glow(ctx, s.cx0 + 2 * cs, s.cy0 + 2 * cs, cs * 4, COL[s.pc], 0.25);
      ctx.fillStyle = '#1f2937'; Arcade.rr(ctx, s.cx0, s.cy0, cs * 4, cs * 4, 10); ctx.fill();
      ctx.shadowColor = COL[s.pc]; ctx.shadowBlur = 16; ctx.strokeStyle = COL[s.pc]; ctx.lineWidth = 3; Arcade.rr(ctx, s.cx0 + 2, s.cy0 + 2, cs * 4 - 4, cs * 4 - 4, 10); ctx.stroke(); ctx.shadowBlur = 0;
      if (s.beam) {
        const b = s.beam, mx = s.cx0 + 2 * cs, my = s.cy0 + 2 * cs;
        ctx.strokeStyle = COL[s.pc]; ctx.globalAlpha = b.t * 6; ctx.lineWidth = cs * 0.25; ctx.beginPath();
        if (b.side === 'L' || b.side === 'R') { const y = s.cy0 + (b.i + 0.5) * cs; ctx.moveTo(mx, y); ctx.lineTo(b.side === 'L' ? 0 : W, y); }
        else { const x = s.cx0 + (b.i + 0.5) * cs; ctx.moveTo(x, my); ctx.lineTo(x, b.side === 'T' ? 0 : H); }
        ctx.stroke(); ctx.globalAlpha = 1;
      }
      Arcade.emoji(ctx, '🐸', s.cx0 + 2 * cs, s.cy0 + 2 * cs, cs * 1.5);
      ctx.fillStyle = COL[s.pc]; ctx.beginPath(); ctx.arc(s.cx0 + 2 * cs, s.cy0 + 2.9 * cs, cs * 0.28, 0, 6.28); ctx.fill();
      Arcade.txt(ctx, GLY[s.pc], s.cx0 + 2 * cs, s.cy0 + 2.9 * cs, cs * 0.3, 'rgba(0,0,0,.6)');
      // piezas
      for (const sd of SIDES) for (let i = 0; i < 4; i++) {
        const line = s.lines[sd][i];
        line.forEach((p, k) => {
          const [x, y] = cellXY(s, sd, i, k);
          if (p.bomb) { Arcade.emoji(ctx, '💣', x + cs / 2, y + cs / 2, cs * 0.75); return; }
          ctx.fillStyle = COL[p.c]; Arcade.rr(ctx, x + 3, y + 3, cs - 6, cs - 6, cs * 0.25); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.3)'; Arcade.rr(ctx, x + 6, y + 5, cs - 12, cs * 0.22, cs * 0.1); ctx.fill();
          Arcade.txt(ctx, GLY[p.c], x + cs / 2, y + cs / 2 + 1, cs * 0.38, 'rgba(0,0,0,.45)');
        });
      }
    },
  });
})();
