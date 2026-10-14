// Agujeros|#05070f
(function () {
  const { ri, shuffle } = Arcade;
  const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };

  function geo(g) {
    const s = g.s, Wa = g.W - 16, Ha = g.bot - g.top - 70;
    s.cs = Math.min(Wa / s.NC, Ha / (s.NR + 1));
    s.ox = (g.W - s.cs * s.NC) / 2; s.oy = g.top + 60 + (Ha - s.cs * (s.NR + 1)) / 2 + s.cs;
  }
  const isLadEnd = (s, c, f) => s.lad.has(c + ',' + f) || s.lad.has(c + ',' + (f - 1));
  const holeAt = (s, c, r) => r % 3 === 0 ? s.holes.get(c + ',' + r / 3) : null;
  function canMove(s, m, d, player) {
    const nc = m.c + D[d][0], nr = m.r + D[d][1];
    if (nc < 0 || nc >= s.NC || nr < 0 || nr >= s.NR) return false;
    if (d === 'left' || d === 'right') {
      if (m.r % 3) return false;
      if (player) { const h = holeAt(s, nc, nr); if (h && h.open) return false; }
      return true;
    }
    if (d === 'up') return m.r % 3 === 0 ? s.lad.has(m.c + ',' + (m.r / 3 - 1)) : true;
    return m.r % 3 === 0 ? s.lad.has(m.c + ',' + m.r / 3) : true;
  }
  const epos = (s, m) => ({ x: s.ox + (m.c + 0.5 + (m.moving ? D[m.dir][0] * m.p : 0)) * s.cs, y: s.oy + (m.r + (m.moving ? D[m.dir][1] * m.p : 0)) * s.cs });

  Arcade.game({
    id: 'agujeros', title: 'Agujeros', emoji: '🕳️', color: '#63e6be', origin: 'Space Panic (Universal, 1980)',
    help: '<b>Desliza</b> para moverte por los pisos y escaleras. <b>Toca</b> para <b>cavar un agujero</b> delante de ti (varios toques). Cuando un alienígena 👽 caiga dentro, <b>toca otra vez</b> para taparlo antes de que escape. Elimina a todos antes de quedarte sin oxígeno. Tú no puedes cruzar los agujeros abiertos.',
    lives: 3, levels: 10,
    setup(g) {
      g.s = { holes: new Map(), al: [], inv: 1.5, oxy: 100 };
      const s = g.s;
      s.NC = g.W < g.H ? 11 : 17; s.F = 5; s.NR = (s.F - 1) * 3 + 1;
      s.lad = new Set();
      for (let f = 0; f < s.F - 1; f++) {
        const cols = shuffle([...Array(s.NC).keys()]), pk = [];
        for (const c of cols) { if (pk.length >= 3) break; if (pk.every(o => Math.abs(o - c) > 2)) pk.push(c); }
        for (const c of pk) s.lad.add(c + ',' + f);
      }
      geo(g);
      s.pl = { c: Math.floor(s.NC / 2), r: s.NR - 1, dir: 'left', face: 'left', p: 0, moving: false, want: null };
      const n = Math.min(7, 3 + Math.floor(g.level / 2));
      s.total = n; s.killed = 0;
      for (let i = 0; i < n; i++) s.al.push({ c: i % 2 ? s.NC - 1 : 0, r: (i % (s.F - 1)) * 3, dir: i % 2 ? 'left' : 'right', p: 0, moving: true, sp: 1.5 + g.level * 0.1 + Math.random() * 0.3, trap: 0, delay: i * 1.5 });
    },
    layout(g) { if (g.s.lad) geo(g); },
    swipe(g, d) {
      const m = g.s.pl; m.want = d; if (d === 'left' || d === 'right') m.face = d;
      if (m.moving && d === OPP[m.dir]) { m.c += D[m.dir][0]; m.r += D[m.dir][1]; m.dir = d; m.p = 1 - m.p; }
    },
    tap(g) {
      const s = g.s, m = s.pl;
      if (m.moving || m.r % 3) { Arcade.sfx.bad(); return; }
      const f = m.r / 3, c = m.c + (m.face === 'left' ? -1 : 1);
      if (c < 0 || c >= s.NC || isLadEnd(s, c, f)) { Arcade.sfx.bad(); return; }
      const k = c + ',' + f; let h = s.holes.get(k);
      const x = s.ox + (c + 0.5) * s.cs, y = s.oy + m.r * s.cs;
      if (!h) { h = { prog: 0, open: false, fill: 0, al: null }; s.holes.set(k, h); }
      if (!h.open) { h.prog += 0.34; Arcade.tone(160, 0.05, 'square', 0.06); g.burst(x, y, { n: 4, color: '#adb5bd', speed: 100, size: 2 }); if (h.prog >= 1) { h.open = true; Arcade.tone(240, 0.08, 'square', 0.07); } return; }
      h.fill += h.al ? 0.5 : 1;
      Arcade.tone(300, 0.05, 'square', 0.06);
      if (h.fill >= 1) {
        if (h.al) { h.al.dead = true; s.killed++; g.addScore(300 * g.level, x, y - 20); Arcade.sfx.coin(); g.burst(x, y, { n: 12, emoji: '💥', size: 14, speed: 150 }); }
        s.holes.delete(k);
        if (s.killed >= s.total) { g.addScore(Math.floor(s.oxy) * 20, g.W / 2, g.H / 2); g.win(); }
      }
    },
    key(g, k, d) { if (!d) return; const m = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[k]; if (m) this.swipe(g, m); else if (k === ' ') this.tap(g); },
    update(g, dt) {
      const s = g.s, m = s.pl;
      s.inv = Math.max(0, s.inv - dt);
      s.oxy -= (1 + g.level * 0.06) * dt;
      if (s.oxy <= 0) { g.message('¡Sin oxígeno!', 1.3); if (g.die()) s.oxy = 100; return; }
      if (m.moving) {
        m.p += 4 * dt;
        if (m.p >= 1) {
          m.c += D[m.dir][0]; m.r += D[m.dir][1]; m.p = 0;
          if (m.want && m.want !== m.dir && canMove(s, m, m.want, true)) m.dir = m.want;
          if (!canMove(s, m, m.dir, true)) m.moving = false;
        }
      } else if (m.want && canMove(s, m, m.want, true)) { m.dir = m.want; m.moving = true; }
      const pp = epos(s, m);
      for (const a of s.al) {
        if (a.dead) continue;
        if (a.delay > 0) { a.delay -= dt; continue; }
        if (a.trap > 0) {
          a.trap -= dt;
          if (a.trap <= 0) { const h = s.holes.get(a.hk); if (h) s.holes.delete(a.hk); a.sp *= 1.15; Arcade.tone(500, 0.2, 'sawtooth', 0.05, 300); }
          continue;
        }
        a.p += a.sp * dt;
        if (a.p >= 1) {
          a.c += D[a.dir][0]; a.r += D[a.dir][1]; a.p = 0;
          const h = holeAt(s, a.c, a.r);
          if (h && h.open && !h.al) { h.al = a; a.trap = Math.max(2.5, 5.5 - g.level * 0.25); a.hk = a.c + ',' + a.r / 3; Arcade.sfx.pop(); continue; }
          let opts = Object.keys(D).filter(d => canMove(s, a, d, false) && d !== OPP[a.dir]);
          if (!opts.length) opts = [OPP[a.dir]];
          if (Math.random() < 0.5) { const sc = (d) => Math.abs(a.r + D[d][1] - m.r) * 2 + Math.abs(a.c + D[d][0] - m.c); opts.sort((x, y) => sc(x) - sc(y)); } else shuffle(opts);
          a.dir = opts[0];
        }
        const ap = epos(s, a);
        if (s.inv <= 0 && Math.hypot(ap.x - pp.x, ap.y - pp.y) < s.cs * 0.65) {
          g.burst(pp.x, pp.y - s.cs * 0.4, { n: 16, color: ['#63e6be', '#fff'], speed: 200 });
          if (g.die()) { m.c = Math.floor(s.NC / 2); m.r = s.NR - 1; m.moving = false; m.want = null; s.inv = 2; }
          return;
        }
      }
      for (const [k, h] of s.holes) if (h.al && h.al.dead) h.al = null;
      s.al = s.al.filter(a => !a.dead);
    },
    draw(g, ctx) {
      const s = g.s, W = g.W, H = g.H;
      ctx.fillStyle = '#05070f'; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 60; i++) { ctx.fillStyle = 'rgba(255,255,255,' + (0.1 + (i % 5) * 0.12) + ')'; ctx.fillRect((i * 97) % W, (i * 61) % H, 1.5, 1.5); }
      if (!s.lad) return;
      const cs = s.cs;
      for (const k of s.lad) {
        const [c, f] = k.split(',').map(Number), x = s.ox + (c + 0.5) * cs, y0 = s.oy + f * 3 * cs, y1 = s.oy + (f + 1) * 3 * cs;
        ctx.strokeStyle = '#ffd43b'; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(x - cs * 0.3, y0); ctx.lineTo(x - cs * 0.3, y1); ctx.moveTo(x + cs * 0.3, y0); ctx.lineTo(x + cs * 0.3, y1);
        for (let y = y0 + cs * 0.5; y < y1; y += cs * 0.5) { ctx.moveTo(x - cs * 0.3, y); ctx.lineTo(x + cs * 0.3, y); }
        ctx.stroke();
      }
      for (let f = 0; f < s.F; f++) {
        const y = s.oy + f * 3 * cs;
        for (let c = 0; c < s.NC; c++) {
          const h = s.holes.get(c + ',' + f), x = s.ox + c * cs;
          if (h && h.open) { ctx.fillStyle = '#000'; ctx.fillRect(x, y, cs, cs * 0.3); ctx.strokeStyle = '#63e6be'; ctx.strokeRect(x + 1, y, cs - 2, cs * 0.3); continue; }
          ctx.fillStyle = '#20c997'; ctx.fillRect(x, y, cs + 0.5, cs * 0.3);
          if (h) { ctx.fillStyle = '#05070f'; const w = cs * h.prog * 0.9; ctx.fillRect(x + (cs - w) / 2, y, w, cs * 0.2); }
        }
      }
      for (const a of s.al) {
        if (a.delay > 0) continue;
        const p = epos(s, a);
        if (a.trap > 0) { const h = s.holes.get(a.hk); Arcade.emoji(ctx, '👽', p.x, p.y - cs * 0.15 + Math.sin(g.t * 25) * 1.5, cs * 0.8); if (h) { ctx.fillStyle = 'rgba(32,201,151,.8)'; ctx.fillRect(p.x - cs / 2, p.y - cs * 0.1, cs * h.fill, cs * 0.12); } continue; }
        Arcade.emoji(ctx, '👽', p.x, p.y - cs * 0.5, cs * 0.85);
      }
      const p = epos(s, s.pl);
      if (!(s.inv > 0 && Math.floor(g.t * 10) % 2)) Arcade.emoji(ctx, '👨‍🚀', p.x, p.y - cs * 0.55, cs * 0.95, { flip: s.pl.face === 'right' });
      if (!s.pl.moving && s.pl.r % 3 === 0) { const fx = s.ox + (s.pl.c + (s.pl.face === 'left' ? -0.5 : 1.5)) * cs; Arcade.emoji(ctx, '⛏️', fx, p.y - cs * 0.3, cs * 0.4, { alpha: 0.5 }); }
      // oxígeno
      const k = Math.max(0, s.oxy / 100);
      ctx.fillStyle = 'rgba(255,255,255,.1)'; Arcade.rr(ctx, 20, g.top + 14, W - 40, 12, 6); ctx.fill();
      ctx.fillStyle = k < 0.25 ? '#ff6b6b' : '#63e6be'; Arcade.rr(ctx, 20, g.top + 14, (W - 40) * k, 12, 6); ctx.fill();
      Arcade.txt(ctx, 'O₂', 30, g.top + 36, 12, '#c3fae8', 'center', 900);
      Arcade.txt(ctx, '👽 ' + (s.total - s.killed), W - 30, g.top + 36, 13, '#c3fae8', 'center', 900);
    },
  });
})();
