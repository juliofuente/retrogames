// Pivote|#0b1f3a
(function () {
  const { ri, pick, clamp, dist } = Arcade;
  const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
  const RIGHT = { up: 'right', right: 'down', down: 'left', left: 'up' };
  const LEFT = { up: 'left', left: 'down', down: 'right', right: 'up' };

  function key(c1, r1, c2, r2) { return r1 === r2 ? 'h' + Math.min(c1, c2) + ',' + r1 : 'v' + c1 + ',' + Math.min(r1, r2); }
  function valid(s, c, r, d) { const nc = c + D[d][0], nr = r + D[d][1]; return nc >= 0 && nc < s.NC && nr >= 0 && nr < s.NR; }
  function pos(s, m) { return { x: s.ox + (m.c + D[m.dir][0] * m.p) * s.sp, y: s.oy + (m.r + D[m.dir][1] * m.p) * s.sp }; }
  function mirror(s, k) {
    const h = k[0] === 'h', [c, r] = k.slice(1).split(',').map(Number);
    return h ? 'h' + (s.NC - 2 - c) + ',' + r : 'v' + (s.NC - 1 - c) + ',' + r;
  }
  function genGold(g) {
    const s = g.s, target = Math.min(Math.floor((s.NC - 1) * s.NR * 0.9), 8 + g.level * 2);
    const set = new Set();
    let tries = 0;
    while (set.size < target && tries++ < 500) {
      let c = ri(0, Math.floor((s.NC - 1) / 2)), r = ri(1, s.NR - 2);
      const steps = ri(3, 7);
      for (let i = 0; i < steps && set.size < target; i++) {
        const opts = Object.keys(D).filter(d => valid(s, c, r, d));
        const d = pick(opts), nc = c + D[d][0], nr = r + D[d][1];
        const k = key(c, r, nc, nr);
        set.add(k); set.add(mirror(s, k));
        c = nc; r = nr;
      }
    }
    s.gold = set; s.found = new Set();
  }
  function placeActors(g) {
    const s = g.s;
    s.pl = { c: Math.floor(s.NC / 2), r: s.NR - 1, dir: 'up', p: 0, q: null };
    s.en = [];
    const n = Math.min(5, 1 + Math.floor(g.level / 2));
    for (let i = 0; i < n; i++) s.en.push({ c: i % 2 ? s.NC - 1 : 0, r: i < 2 ? 0 : Math.floor(s.NR / 2) - 1, dir: 'down', p: 0, sp: 1.15 + Math.min(g.level, 18) * 0.07 + i * 0.05 });
  }
  function arrive(g, m, isPlayer) {
    const s = g.s, nc = m.c + D[m.dir][0], nr = m.r + D[m.dir][1];
    if (isPlayer) {
      const k = key(m.c, m.r, nc, nr), p = { x: s.ox + (m.c + nc) / 2 * s.sp, y: s.oy + (m.r + nr) / 2 * s.sp };
      if (s.gold.has(k)) {
        if (s.found.has(k)) { s.found.delete(k); Arcade.sfx.bad(); g.float('¡Tapado!', p.x, p.y, '#ff6b6b', 18); g.addScore(-50); }
        else {
          s.found.add(k); g.addScore(100, p.x, p.y); Arcade.sfx.combo(s.found.size % 12); g.ring(p.x, p.y, { color: '#ffd60a', r: s.sp * 0.8 });
          g.burst(p.x, p.y, { n: 8, color: ['#ffd60a', '#fff3b0'], speed: 120, size: 3 });
          if (s.found.size === s.gold.size) { g.addScore(500 * g.level, g.W / 2, g.H / 2); for (const kk of s.found) { const h = kk[0] === 'h', [c, r] = kk.slice(1).split(',').map(Number); g.burst(s.ox + (c + (h ? 0.5 : 0)) * s.sp, s.oy + (r + (h ? 0 : 0.5)) * s.sp, { n: 3, emoji: '✨', size: 14, speed: 100 }); } g.win(); }
        }
      }
    }
    m.c = nc; m.r = nr; m.p -= 1;
    if (isPlayer) {
      if (m.q && valid(s, m.c, m.r, m.q)) { m.dir = m.q; m.q = null; Arcade.sfx.move(); }
      if (!valid(s, m.c, m.r, m.dir)) {
        for (const d of [RIGHT[m.dir], LEFT[m.dir], OPP[m.dir]]) if (valid(s, m.c, m.r, d)) { m.dir = d; break; }
      }
    } else {
      let opts = Object.keys(D).filter(d => valid(s, m.c, m.r, d) && d !== OPP[m.dir]);
      if (!opts.length) opts = [OPP[m.dir]];
      if (Math.random() < 0.45) {
        const pl = s.pl;
        opts.sort((a, b) => dist(m.c + D[a][0], m.r + D[a][1], pl.c, pl.r) - dist(m.c + D[b][0], m.r + D[b][1], pl.c, pl.r));
        m.dir = opts[0];
      } else m.dir = pick(opts);
    }
  }
  function turn(g, dir) {
    const m = g.s.pl;
    if (dir === OPP[m.dir] && m.p < 0.08) { if (valid(g.s, m.c, m.r, dir)) { m.dir = dir; m.q = null; } }
    else if (dir === OPP[m.dir]) { m.c += D[m.dir][0]; m.r += D[m.dir][1]; m.dir = dir; m.p = 1 - m.p; m.q = null; Arcade.sfx.move(); }
    else m.q = dir;
  }

  Arcade.game({
    id: 'pivote', title: 'Pivote', emoji: '🐡', color: '#4cc9f0', origin: 'Clu Clu Land (Nintendo, 1984)',
    help: 'El pez globo <b>nunca se para</b>. <b>Desliza</b> hacia un lado y girará en el siguiente poste. Desliza hacia atrás para dar la vuelta. Bajo algunos tramos hay <b>oro escondido</b>: pasa por ellos para descubrirlos todos. ¡Ojo! Si pasas otra vez por un tramo descubierto, <b>se vuelve a tapar</b>. Evita a los erizos 🦔.',
    lives: 3, levels: Infinity,
    theme: { font: 'Fredoka', ambient: 'bubbles', music: { tempo: 126, scale: 'penta', root: 247, wave: 'triangle', lead: 'sine' }, sfx: { wave: 'sine', pitch: 1.2 } },
    setup(g) {
      g.s = { inv: 1.5 };
      const s = g.s;
      s.NC = g.W < g.H ? 5 : 8;
      const availW = g.W - 48, availH = g.bot - g.top - 70;
      let sp = availW / (s.NC - 1);
      s.NR = clamp(Math.floor(availH / sp) + 1, 5, 10);
      genLayout(g);
      genGold(g); placeActors(g);
    },
    layout(g) { if (g.s.NC) genLayout(g); },
    swipe(g, dir) { turn(g, dir); },
    key(g, k, down) { if (!down) return; const m = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' }[k]; if (m) turn(g, m); },
    update(g, dt) {
      const s = g.s;
      s.inv = Math.max(0, s.inv - dt);
      const pl = s.pl;
      pl.p += (2.3 + Math.min(g.level, 20) * 0.03) * dt;
      while (pl.p >= 1 && g.state === 'play') arrive(g, pl, true);
      if (g.state !== 'play') return;
      const pp = pos(s, pl);
      for (const e of s.en) {
        e.p += e.sp * dt;
        while (e.p >= 1) arrive(g, e, false);
        const ep = pos(s, e);
        if (s.inv <= 0 && dist(pp.x, pp.y, ep.x, ep.y) < s.sp * 0.42) {
          g.burst(pp.x, pp.y, { n: 18, color: ['#4cc9f0', '#fff'], speed: 220 });
          if (g.die()) { placeActors(g); s.inv = 2; }
          return;
        }
      }
    },
    draw(g, ctx) {
      const s = g.s, W = g.W, H = g.H;
      const PAL = [['#0f4c75', '#0b3456', '#04162a'], ['#0b6e6e', '#0b4a52', '#062a2f'], ['#3c2a8c', '#251a63', '#100a33'], ['#1d6f8f', '#124463', '#081d33'], ['#5a189a', '#3c096c', '#10002b']];
      const pal = PAL[(g.level - 1) % PAL.length];
      Arcade.bg(ctx, W, H, pal[0], pal[1], pal[2]);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) { const x = W * (0.15 + i * 0.25) + Math.sin(g.t * 0.4 + i) * 30; ctx.fillStyle = 'rgba(180,230,255,.045)'; ctx.beginPath(); ctx.moveTo(x - 20, 0); ctx.lineTo(x + 30, 0); ctx.lineTo(x + 120, H); ctx.lineTo(x + 30, H); ctx.fill(); }
      ctx.restore();
      for (let i = 0; i < 3; i++) { const sp = 18 + i * 9, x = ((g.t * sp + i * 300) % (W + 120)) - 60, y = g.top + 30 + (i * 0.31 % 1) * (g.bot - g.top - 60); Arcade.emoji(ctx, ['🐠', '🐟', '🦑'][i], i % 2 ? W - x : x, y + Math.sin(g.t + i) * 10, 22, { alpha: 0.35, flip: !(i % 2) }); }
      for (let x = 10, i = 0; x < W; x += 46, i++) Arcade.emoji(ctx, ['🌿', '🪸', '🌿', '🐚'][i % 4], x, H - 14, i % 4 === 3 ? 18 : 30, { alpha: 0.6, rot: i % 4 === 3 ? 0 : Math.sin(g.t * 1.3 + i) * 0.15 });
      Arcade.amb(g, ctx);
      if (!s.gold) return;
      const sp = s.sp;
      // tramos
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = sp * 0.12;
      ctx.beginPath();
      for (let r = 0; r < s.NR; r++) { ctx.moveTo(s.ox, s.oy + r * sp); ctx.lineTo(s.ox + (s.NC - 1) * sp, s.oy + r * sp); }
      for (let c = 0; c < s.NC; c++) { ctx.moveTo(s.ox + c * sp, s.oy); ctx.lineTo(s.ox + c * sp, s.oy + (s.NR - 1) * sp); }
      ctx.stroke();
      // oro descubierto
      for (const k of s.found) {
        const h = k[0] === 'h', [c, r] = k.slice(1).split(',').map(Number);
        const x1 = s.ox + c * sp, y1 = s.oy + r * sp, x2 = x1 + (h ? sp : 0), y2 = y1 + (h ? 0 : sp);
        ctx.strokeStyle = '#b8860b'; ctx.lineWidth = sp * 0.24; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.shadowColor = '#ffd60a'; ctx.shadowBlur = 10; ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = sp * 0.17; ctx.stroke(); ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = sp * 0.04; ctx.stroke();
      }
      // postes
      for (let r = 0; r < s.NR; r++) for (let c = 0; c < s.NC; c++) {
        const x = s.ox + c * sp, y = s.oy + r * sp;
        ctx.fillStyle = '#1b4965'; ctx.beginPath(); ctx.arc(x, y, sp * 0.11, 0, 6.28); ctx.fill();
        ctx.fillStyle = '#9ad1d4'; ctx.beginPath(); ctx.arc(x - sp * 0.02, y - sp * 0.02, sp * 0.07, 0, 6.28); ctx.fill();
      }
      for (const e of s.en) { const p = pos(s, e); Arcade.emoji(ctx, '🦔', p.x, p.y, sp * 0.5, { flip: e.dir === 'right' }); }
      const pl = s.pl, pp = pos(s, pl);
      if (!(s.inv > 0 && Math.floor(g.t * 10) % 2)) Arcade.emoji(ctx, '🐡', pp.x, pp.y, sp * 0.56, { flip: pl.dir === 'right', rot: pl.dir === 'up' ? -0.3 : pl.dir === 'down' ? 0.3 : 0 });
      if (pl.q) { // indicador del giro pendiente
        const nx = s.ox + (pl.c + D[pl.dir][0]) * sp, ny = s.oy + (pl.r + D[pl.dir][1]) * sp;
        ctx.strokeStyle = '#4cc9f0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(nx, ny, sp * 0.2, 0, 6.28); ctx.stroke();
        Arcade.txt(ctx, { up: '▲', down: '▼', left: '◀', right: '▶' }[pl.q], nx, ny, sp * 0.18, '#4cc9f0');
      }
      Arcade.txt(ctx, '💰 ' + s.found.size + ' / ' + s.gold.size, W / 2, s.oy - sp * 0.35 - 6, 16, '#ffd60a', 'center', 800, 'rgba(0,0,0,.5)');
    },
  });
  function genLayout(g) {
    const s = g.s, availW = g.W - 48, availH = g.bot - g.top - 70;
    s.sp = Math.min(availW / (s.NC - 1), availH / (s.NR - 1));
    s.ox = (g.W - s.sp * (s.NC - 1)) / 2;
    s.oy = g.top + 46 + (availH - s.sp * (s.NR - 1)) / 2;
  }
})();
