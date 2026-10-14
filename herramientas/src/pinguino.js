// Pingüino|#0b2545
(function () {
  const { ri, pick, shuffle, dist } = Arcade;
  const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };

  function geo(g) {
    const s = g.s, Wa = g.W - 16, Ha = g.bot - g.top - 40;
    s.cs = Math.min(Wa / s.C, Ha / s.R);
    s.ox = (g.W - s.cs * s.C) / 2; s.oy = g.top + 32 + (Ha - s.cs * s.R) / 2;
  }
  const inB = (s, c, r) => c >= 0 && c < s.C && r >= 0 && r < s.R;
  const free = (s, c, r) => inB(s, c, r) && !s.b[r][c];
  function gen(g) {
    const s = g.s, C = s.C, R = s.R;
    s.b = []; for (let r = 0; r < R; r++) s.b.push(new Array(C).fill(1));
    const st = [[0, 0]]; s.b[0][0] = 0;
    while (st.length) {
      const [c, r] = st[st.length - 1];
      const opts = shuffle(Object.values(D)).filter(([dx, dy]) => inB(s, c + dx * 2, r + dy * 2) && s.b[r + dy * 2][c + dx * 2]);
      if (!opts.length) { st.pop(); continue; }
      const [dx, dy] = opts[0];
      s.b[r + dy][c + dx] = 0; s.b[r + dy * 2][c + dx * 2] = 0; st.push([c + dx * 2, r + dy * 2]);
    }
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (s.b[r][c] && Math.random() < 0.12) s.b[r][c] = 0;
    s.start = { c: (C - 1) / 2 % 2 ? (C - 1) / 2 - 1 : (C - 1) / 2, r: R - 1 };
    for (let dr = -1; dr <= 0; dr++) for (let dc = -1; dc <= 1; dc++) if (inB(s, s.start.c + dc, s.start.r + dr)) s.b[s.start.r + dr][s.start.c + dc] = 0;
    const ice = []; for (let r = 1; r < R - 1; r++) for (let c = 1; c < C - 1; c++) if (s.b[r][c] === 1) ice.push([c, r]);
    shuffle(ice);
    let placed = 0;
    for (const [c, r] of ice) { if (placed >= 3) break; s.b[r][c] = 2; placed++; }
  }
  function hatch(g) {
    const s = g.s, pl = s.pl, ice = [];
    for (let r = 0; r < s.R; r++) for (let c = 0; c < s.C; c++) if (s.b[r][c] === 1 && dist(c, r, pl.c, pl.r) > 4) ice.push([c, r]);
    if (!ice.length) for (let r = 0; r < s.R; r++) for (let c = 0; c < s.C; c++) if (!s.b[r][c] && dist(c, r, pl.c, pl.r) > 3) ice.push([c, r]);
    if (!ice.length) return;
    const [c, r] = pick(ice);
    s.b[r][c] = 0;
    s.en.push({ c, r, dir: 'up', p: 0, moving: false, hatch: 0.8, stun: 0 });
    s.hatched++;
    g.burst(s.ox + (c + 0.5) * s.cs, s.oy + (r + 0.5) * s.cs, { n: 10, color: '#bde0fe', speed: 120, size: 3 });
  }
  const pos = (s, m) => ({ x: s.ox + (m.c + 0.5 + (m.moving ? D[m.dir][0] * m.p : 0)) * s.cs, y: s.oy + (m.r + 0.5 + (m.moving ? D[m.dir][1] * m.p : 0)) * s.cs });
  function doPush(g) {
    const s = g.s, pl = s.pl, [dx, dy] = D[pl.face], c = pl.c + dx, r = pl.r + dy;
    if (!inB(s, c, r) || !s.b[r][c] || s.slide) return;
    const t = s.b[r][c];
    if (free(s, c + dx, r + dy) && !s.en.some(e => e.c === c + dx && e.r === r + dy && false)) {
      s.b[r][c] = 0; s.slide = { t, c, r, dir: pl.face, p: 0, kills: 0 };
      Arcade.tone(300, 0.08, 'triangle', 0.1, 300);
    } else if (t === 1) {
      s.b[r][c] = 0; g.addScore(30); Arcade.noise(0.15, 0.15);
      g.burst(s.ox + (c + 0.5) * s.cs, s.oy + (r + 0.5) * s.cs, { n: 10, color: ['#caf0f8', '#90e0ef', '#fff'], speed: 160, size: 3 });
    } else Arcade.sfx.bad();
  }
  function killBee(g, e, pts) {
    const s = g.s, p = pos(s, e);
    e.dead = true; s.killed++;
    g.addScore(pts, p.x, p.y - 10);
    g.burst(p.x, p.y, { n: 12, emoji: ['💥', '❄️'], size: 16, speed: 170 }); g.ring(p.x, p.y, { color: '#a5d8ff', r: s.cs * 1.6, w: 5 }); if (pts >= 800) g.flash('#e7f5ff', 0.2);
    Arcade.sfx.pop();
  }
  function checkDiamonds(g) {
    const s = g.s, ds = [];
    for (let r = 0; r < s.R; r++) for (let c = 0; c < s.C; c++) if (s.b[r][c] === 2) ds.push([c, r]);
    if (ds.length !== 3 || s.diaDone) return;
    const rows = ds.every(d => d[1] === ds[0][1]), cols = ds.every(d => d[0] === ds[0][0]);
    if (!rows && !cols) return;
    const vals = ds.map(d => rows ? d[0] : d[1]).sort((a, b) => a - b);
    if (vals[1] === vals[0] + 1 && vals[2] === vals[1] + 1) {
      s.diaDone = true; g.addScore(5000, g.W / 2, g.H / 2); g.message('💎 ¡Diamantes en línea!', 1.6, 'Abejas aturdidas');
      for (const e of s.en) e.stun = 5; Arcade.sfx.win();
    }
  }
  function beeArrive(g, e) {
    const s = g.s;
    e.c += D[e.dir][0]; e.r += D[e.dir][1]; e.p = 0;
    let opts = Object.keys(D).filter(d => free(s, e.c + D[d][0], e.r + D[d][1]) && d !== OPP[e.dir]);
    if (!opts.length && free(s, e.c + D[OPP[e.dir]][0], e.r + D[OPP[e.dir]][1])) opts = [OPP[e.dir]];
    if (!opts.length) {
      // atrapada: rompe un bloque de hielo hacia el pingüino
      const d = Object.keys(D).sort((a, b) => dist(e.c + D[a][0], e.r + D[a][1], s.pl.c, s.pl.r) - dist(e.c + D[b][0], e.r + D[b][1], s.pl.c, s.pl.r))
        .find(d => inB(s, e.c + D[d][0], e.r + D[d][1]) && s.b[e.r + D[d][1]][e.c + D[d][0]] === 1);
      if (d) { s.b[e.r + D[d][1]][e.c + D[d][0]] = 0; opts = [d]; } else { e.moving = false; return; }
    }
    if (Math.random() < 0.55) opts.sort((a, b) => dist(e.c + D[a][0], e.r + D[a][1], s.pl.c, s.pl.r) - dist(e.c + D[b][0], e.r + D[b][1], s.pl.c, s.pl.r));
    else shuffle(opts);
    e.dir = opts[0]; e.moving = true;
  }

  Arcade.game({
    id: 'pinguino', title: 'Pingüino', emoji: '🐧', color: '#90e0ef', origin: 'Pengo (Sega, 1982)',
    help: '<b>Desliza</b> para caminar por el laberinto de hielo. <b>Toca</b> la pantalla para <b>empujar</b> el bloque que tienes delante: sale disparado y aplasta a las abejas 🐝 que pille. Si el bloque no puede moverse, se rompe. Elimina todas las abejas para pasar de nivel. Alinea los 3 diamantes 💎 para un bonus enorme.',
    lives: 3, levels: Infinity,
    theme: { font: 'Baloo 2', ambient: 'snow', music: { tempo: 130, scale: 'major', root: 330, wave: 'triangle', lead: 'square' }, sfx: { wave: 'triangle', pitch: 1.2 } },
    setup(g) {
      g.s = { en: [], killed: 0, hatched: 0, slide: null, inv: 1.5, hatchT: 0.5, diaDone: false };
      const s = g.s;
      if (g.W < g.H) { s.C = 11; s.R = 13; } else { s.C = 17; s.R = 9; }
      gen(g); geo(g);
      s.total = 3 + Math.min(g.level, 9);
      s.pl = { c: s.start.c, r: s.start.r, dir: 'up', face: 'up', p: 0, moving: false, want: null, pushQ: false };
    },
    layout(g) { if (g.s.b) geo(g); },
    swipe(g, d) {
      const pl = g.s.pl; pl.face = d;
      if (pl.moving && d === OPP[pl.dir]) { pl.c += D[pl.dir][0]; pl.r += D[pl.dir][1]; pl.dir = d; pl.p = 1 - pl.p; pl.want = d; return; }
      pl.want = d;
    },
    tap(g) { const pl = g.s.pl; if (pl.moving) pl.pushQ = true; else { pl.want = null; doPush(g); } },
    key(g, k, d) {
      if (!d) return; const m = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[k];
      if (m) this.swipe(g, m); else if (k === ' ') this.tap(g);
    },
    update(g, dt) {
      const s = g.s, pl = s.pl;
      s.inv = Math.max(0, s.inv - dt);
      // pingüino
      if (pl.moving) {
        pl.p += 5 * dt;
        if (pl.p >= 1) {
          pl.c += D[pl.dir][0]; pl.r += D[pl.dir][1]; pl.p = 0; pl.moving = false;
          if (pl.pushQ) { pl.pushQ = false; pl.want = null; doPush(g); }
        }
      }
      if (!pl.moving && pl.want) {
        if (free(s, pl.c + D[pl.want][0], pl.r + D[pl.want][1])) { pl.dir = pl.want; pl.face = pl.want; pl.moving = true; }
        else { pl.face = pl.want; pl.want = null; }
      }
      // bloque deslizando
      const sl = s.slide;
      if (sl) {
        sl.p += 14 * dt;
        for (const e of s.en) if (!e.dead && !e.hatch) { const p = pos(s, e); const bx = s.ox + (sl.c + 0.5 + D[sl.dir][0] * sl.p) * s.cs, by = s.oy + (sl.r + 0.5 + D[sl.dir][1] * sl.p) * s.cs; if (Math.hypot(p.x - bx, p.y - by) < s.cs * 0.7) { sl.kills++; killBee(g, e, 400 * sl.kills); } }
        while (sl.p >= 1) {
          sl.c += D[sl.dir][0]; sl.r += D[sl.dir][1]; sl.p -= 1;
          if (!free(s, sl.c + D[sl.dir][0], sl.r + D[sl.dir][1])) { s.b[sl.r][sl.c] = sl.t; s.slide = null; Arcade.tone(120, 0.08, 'square', 0.08); if (sl.t === 2) checkDiamonds(g); break; }
        }
      }
      s.en = s.en.filter(e => !e.dead);
      if (s.killed >= s.total) { g.addScore(1000 * g.level, g.W / 2, g.H / 2); g.win(); return; }
      // abejas
      s.hatchT -= dt;
      if (s.hatchT <= 0 && s.en.length < 3 && s.hatched < s.total) { s.hatchT = 2.5; hatch(g); }
      const pp = pos(s, pl);
      for (const e of s.en) {
        if (e.hatch > 0) { e.hatch -= dt; if (e.hatch <= 0) beeArrive(g, Object.assign(e, { c: e.c - D[e.dir][0], r: e.r - D[e.dir][1] })); continue; }
        if (e.stun > 0) { e.stun -= dt; }
        else if (e.moving) {
          e.p += (2.1 + Math.min(g.level, 14) * 0.13) * dt;
          if (e.p >= 1) beeArrive(g, e);
        } else beeArrive(g, Object.assign(e, { c: e.c - D[e.dir][0], r: e.r - D[e.dir][1] }));
        const ep = pos(s, e);
        if (Math.hypot(ep.x - pp.x, ep.y - pp.y) < s.cs * 0.6) {
          if (e.stun > 0) { killBee(g, e, 100); continue; }
          if (s.inv <= 0) {
            g.burst(pp.x, pp.y, { n: 16, color: ['#fff', '#000', '#ffd43b'], speed: 200 });
            if (g.die()) { pl.c = s.start.c; pl.r = s.start.r; pl.moving = false; pl.want = null; s.inv = 2; }
            return;
          }
        }
      }
    },
    draw(g, ctx) {
      const s = g.s, W = g.W, H = g.H;
      Arcade.bg(ctx, W, H, '#0b1d3a', '#0b2545', '#13315c');
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let b = 0; b < 3; b++) { ctx.fillStyle = ['rgba(80,255,170,.08)', 'rgba(160,100,255,.07)', 'rgba(80,200,255,.07)'][b]; ctx.beginPath(); ctx.moveTo(0, H * 0.1); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, H * (0.08 + b * 0.05) + Math.sin(x * 0.012 + g.t * 0.6 + b * 2) * 30); for (let x = W; x >= 0; x -= 20) ctx.lineTo(x, H * (0.2 + b * 0.05) + Math.sin(x * 0.01 + g.t * 0.5 + b) * 40); ctx.fill(); }
      ctx.restore();
      Arcade.amb(g, ctx);
      if (!s.b) return;
      const cs = s.cs;
      ctx.fillStyle = '#13315c'; ctx.fillRect(s.ox, s.oy, cs * s.C, cs * s.R);
      ctx.strokeStyle = '#8da9c4'; ctx.lineWidth = 4; ctx.strokeRect(s.ox - 3, s.oy - 3, cs * s.C + 6, cs * s.R + 6);
      const block = (x, y, t) => {
        if (t === 2) { ctx.fillStyle = '#ffd43b'; Arcade.rr(ctx, x + 1, y + 1, cs - 2, cs - 2, cs * 0.15); ctx.fill(); Arcade.emoji(ctx, '💎', x + cs / 2, y + cs / 2, cs * 0.7); return; }
        const gr = ctx.createLinearGradient(x, y, x + cs, y + cs);
        gr.addColorStop(0, '#e0fbfc'); gr.addColorStop(1, '#7fc8f8');
        ctx.fillStyle = gr; Arcade.rr(ctx, x + 1, y + 1, cs - 2, cs - 2, cs * 0.15); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(x + cs * 0.18, y + cs * 0.18, cs * 0.3, cs * 0.08);
      };
      for (let r = 0; r < s.R; r++) for (let c = 0; c < s.C; c++) if (s.b[r][c]) block(s.ox + c * cs, s.oy + r * cs, s.b[r][c]);
      if (s.slide) { const sl = s.slide; block(s.ox + (sl.c + D[sl.dir][0] * sl.p) * cs, s.oy + (sl.r + D[sl.dir][1] * sl.p) * cs, sl.t); }
      for (const e of s.en) {
        const p = pos(s, e);
        if (e.hatch > 0) { Arcade.emoji(ctx, '🥚', p.x, p.y, cs * 0.6, { rot: Math.sin(g.t * 30) * 0.2 }); continue; }
        Arcade.emoji(ctx, '🐝', p.x, p.y + (e.stun > 0 ? 0 : Math.sin(g.t * 12 + e.c) * 2), cs * 0.68, { flip: e.dir === 'right', rot: e.stun > 0 ? g.t * 6 : 0 });
        if (e.stun > 0) Arcade.emoji(ctx, '💫', p.x, p.y - cs * 0.4, cs * 0.35);
      }
      const p = pos(s, s.pl);
      if (!(s.inv > 0 && Math.floor(g.t * 10) % 2)) Arcade.emoji(ctx, '🐧', p.x, p.y, cs * 0.76, { flip: s.pl.face === 'right' });
      Arcade.txt(ctx, '🐝 ' + (s.total - s.killed), W / 2, s.oy - 18, 15, '#ffe066', 'center', 800);
    },
  });
})();
