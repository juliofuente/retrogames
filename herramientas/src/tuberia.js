// Tubería|#2b1a10
(function () {
  const { rand, ri, pick, clamp, shuffle } = Arcade;
  const NC = 9;

  function geo(g) {
    const s = g.s, availW = g.W - 20, availH = g.bot - g.top - 20;
    s.cs = Math.min(availW / NC, availH / s.NR);
    s.ox = (g.W - s.cs * NC) / 2; s.oy = g.top + 8 + (availH - s.cs * s.NR) / 2;
  }
  const cx = (s, c) => s.ox + (c + 0.5) * s.cs, cy = (s, r) => s.oy + (r + 0.5) * s.cs;
  function walk(s, c, r) { return r >= 0 && r < s.NR && c >= 0 && c < NC && s.w[r][c]; }
  function genMaze(g) {
    const s = g.s, mid = Math.floor(NC / 2);
    s.w = []; s.dots = [];
    for (let r = 0; r < s.NR; r++) { s.w.push(new Array(NC).fill(false)); s.dots.push(new Array(NC).fill(false)); }
    s.w[0][mid] = true;
    for (let r = 1; r < s.NR; r += 2) for (let c = 0; c < NC; c++) s.w[r][c] = true;
    for (let r = 2; r < s.NR - 1; r += 2) {
      const n = ri(2, 3), cols = shuffle([...Array(NC).keys()]).slice(0, n);
      for (const c of cols) s.w[r][c] = true;
    }
    s.left = 0;
    for (let r = 1; r < s.NR; r++) for (let c = 0; c < NC; c++) if (s.w[r][c]) { s.dots[r][c] = true; s.left++; }
    s.base = { c: mid, r: 0 };
  }
  function bfsStep(s, from, to) {
    const prev = s.pipe.length > 1 ? s.pipe[s.pipe.length - 2] : null;
    const blocked = new Set(s.pipe.map(p => p.c + ',' + p.r));
    if (prev) blocked.delete(prev.c + ',' + prev.r);
    const q = [from], seen = new Map([[from.c + ',' + from.r, null]]);
    while (q.length) {
      const cur = q.shift();
      if (cur.c === to.c && cur.r === to.r) {
        let n = cur, k = n.c + ',' + n.r;
        while (seen.get(k) && !(seen.get(k).c === from.c && seen.get(k).r === from.r)) { n = seen.get(k); k = n.c + ',' + n.r; }
        return n;
      }
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = cur.c + dc, nr = cur.r + dr, k = nc + ',' + nr;
        if (!walk(s, nc, nr) || seen.has(k) || blocked.has(k)) continue;
        seen.set(k, cur); q.push({ c: nc, r: nr });
      }
    }
    return null;
  }
  function nearestCell(s, x, y) {
    let best = null, bd = 1e9;
    for (let r = 0; r < s.NR; r++) for (let c = 0; c < NC; c++) {
      if (!s.w[r][c]) continue;
      const d = (cx(s, c) - x) ** 2 + (cy(s, r) - y) ** 2;
      if (d < bd) { bd = d; best = { c, r }; }
    }
    return best;
  }
  function lose(g) {
    const s = g.s, h = s.pipe[s.pipe.length - 1];
    g.burst(cx(s, h.c), cy(s, h.r), { n: 18, color: ['#f4a261', '#fff', '#e76f51'], speed: 220 });
    s.pipe = [s.base]; s.en = []; s.hx = cx(s, s.base.c); s.hy = cy(s, s.base.r); s.inv = 1.5; s.spawnT = 1.5;
    g.die();
  }

  Arcade.game({
    id: 'tuberia', title: 'Tubería', emoji: '🛢️', color: '#f4a261', origin: "Oil's Well (Sierra, 1983)",
    help: '<b>Mantén el dedo</b> donde quieras ir: la cabeza 😋 avanza por los túneles y deja detrás una <b>tubería</b>. Come todas las gotas de petróleo. La cabeza se come a los gusanos 🐛, pero si un bicho toca la <b>tubería</b> pierdes una vida. <b>Suelta el dedo</b> para recoger la tubería a toda velocidad. El fuego 🔥 quema también la cabeza.',
    lives: 3, levels: Infinity,
    theme: { font: 'Bungee', ambient: 'dust', music: { tempo: 104, scale: 'blues', root: 196, wave: 'square', swing: 0.3 }, sfx: { wave: 'square', pitch: 0.9 } },
    setup(g) {
      g.s = { en: [], inv: 1, stepT: 0, spawnT: 2, touch: null };
      const s = g.s;
      const availW = g.W - 20, availH = g.bot - g.top - 20;
      let nr = Math.floor(availH / (availW / NC));
      nr = clamp(nr, 8, 16); if (nr % 2) nr--;
      s.NR = nr;
      geo(g); genMaze(g);
      s.pipe = [s.base]; s.hx = cx(s, s.base.c); s.hy = cy(s, s.base.r);
      s.fos = []; for (let r = 1; r < s.NR; r++) for (let c = 0; c < NC; c++) if (!s.w[r][c] && Math.random() < 0.12) s.fos.push({ c, r, e: pick(['🦴', '🪨', '💎', '🐚', '🦕', '🪨']), rot: rand(-1, 1) });
    },
    layout(g) { if (g.s.NR) geo(g); },
    down(g, p) { g.s.touch = p; },
    move(g, p) { g.s.touch = p; },
    up(g, p) { if (g.s.touch && g.s.touch.id === p.id) g.s.touch = null; },
    update(g, dt) {
      const s = g.s;
      s.inv = Math.max(0, s.inv - dt);
      s.stepT += dt;
      const touch = s.touch && g.pointers.has(s.touch.id) ? s.touch : null;
      if (touch) {
        const tgt = nearestCell(s, touch.x, touch.y - (touch.type === 'touch' ? 30 : 0));
        while (s.stepT >= 0.075) {
          s.stepT -= 0.075;
          const head = s.pipe[s.pipe.length - 1];
          if (!tgt || (tgt.c === head.c && tgt.r === head.r)) break;
          const n = bfsStep(s, head, tgt);
          if (!n) break;
          const prev = s.pipe[s.pipe.length - 2];
          if (prev && prev.c === n.c && prev.r === n.r) s.pipe.pop();
          else {
            s.pipe.push(n);
            if (s.dots[n.r][n.c]) {
              s.dots[n.r][n.c] = false; s.left--; g.addScore(10); Arcade.tone(500 + (s.pipe.length % 12) * 40, 0.04, 'square', 0.05); g.burst(cx(s, n.c), cy(s, n.r), { n: 3, color: '#ffb703', speed: 60, size: 2, grav: 0, life: 0.3 });
              if (s.left <= 0) { g.addScore(300 + g.level * 100, g.W / 2, g.H / 2); g.win(); return; }
            }
          }
        }
        if (s.stepT > 0.075) s.stepT = 0;
      } else {
        while (s.stepT >= 0.022) { s.stepT -= 0.022; if (s.pipe.length > 1) s.pipe.pop(); }
      }
      const head = s.pipe[s.pipe.length - 1];
      const k = Math.min(1, dt * 28);
      s.hx += (cx(s, head.c) - s.hx) * k; s.hy += (cy(s, head.r) - s.hy) * k;
      // enemigos
      s.spawnT -= dt;
      if (s.spawnT <= 0) {
        s.spawnT = Math.max(0.7, 2.3 - g.level * 0.11) * rand(0.7, 1.3);
        const rows = []; for (let r = 1; r < s.NR; r += 2) rows.push(r);
        const r = pick(rows), dir = Math.random() < 0.5 ? 1 : -1;
        const fire = g.level >= 2 && Math.random() < Math.min(0.45, 0.12 + g.level * 0.02);
        s.en.push({ r, x: dir > 0 ? -1 : NC, dir, v: (1.4 + Math.min(g.level, 14) * 0.13) * rand(0.85, 1.2), fire });
      }
      for (const e of s.en) e.x += e.dir * e.v * dt;
      s.en = s.en.filter(e => e.x > -1.5 && e.x < NC + 0.5);
      for (const e of s.en) {
        if (e.r === head.r && Math.abs(e.x - head.c) < 0.6) {
          if (e.fire) { if (s.inv <= 0) { lose(g); return; } }
          else { e.dead = true; g.addScore(100, cx(s, head.c), cy(s, head.r) - 20); Arcade.sfx.pop(); g.burst(cx(s, head.c), cy(s, head.r), { n: 10, color: ['#90be6d', '#d8f3dc'], speed: 140 }); g.ring(cx(s, head.c), cy(s, head.r), { color: '#90be6d', r: s.cs }); }
          continue;
        }
        if (s.inv > 0) continue;
        for (let i = 1; i < s.pipe.length - 1; i++) {
          const p = s.pipe[i];
          if (p.r === e.r && Math.abs(e.x - p.c) < 0.5) { lose(g); return; }
        }
      }
      s.en = s.en.filter(e => !e.dead);
    },
    draw(g, ctx) {
      const s = g.s, W = g.W, H = g.H;
      const PAL = [['#8a5a34', '#5a3a22', '#21130a'], ['#7a6a52', '#4f4234', '#1c1610'], ['#8c4a3c', '#5c2a22', '#220d0a'], ['#5b5a7a', '#3b3a52', '#14131f']];
      const pal = PAL[(g.level - 1) % PAL.length];
      Arcade.bg(ctx, W, H, pal[0], pal[1], pal[2]);
      if (!s.w) return;
      const cs = s.cs;
      // cielo y torre de petróleo sobre el pozo
      const skyH = s.oy + cs * 0.9;
      Arcade.bg(ctx, W, skyH, '#4dabf7', '#a5d8ff');
      Arcade.emoji(ctx, '☀️', W - 40, skyH * 0.35, 30);
      Arcade.emoji(ctx, '☁️', (g.t * 12) % (W + 80) - 40, skyH * 0.45, 30, { alpha: 0.8 });
      ctx.fillStyle = '#6b8e23'; ctx.fillRect(0, skyH - 6, W, 6);
      // estratos
      ctx.fillStyle = 'rgba(0,0,0,.1)';
      for (let i = 1; i < 6; i++) { const y = skyH + (H - skyH) * i / 6; ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x <= W; x += 30) ctx.lineTo(x, y + Math.sin(x * 0.03 + i) * 6); ctx.lineTo(W, y + 14); ctx.lineTo(0, y + 14); ctx.fill(); }
      for (const f of s.fos) Arcade.emoji(ctx, f.e, cx(s, f.c), cy(s, f.r), cs * 0.6, { alpha: 0.28, rot: f.rot });
      Arcade.amb(g, ctx);
      // túneles
      for (let r = 0; r < s.NR; r++) for (let c = 0; c < NC; c++) {
        if (!s.w[r][c]) continue;
        ctx.fillStyle = '#1a0e07';
        const right = walk(s, c + 1, r), down = walk(s, c, r + 1);
        ctx.fillRect(s.ox + c * cs + cs * 0.12, s.oy + r * cs + cs * 0.12, cs * (right ? 1 : 0.76), cs * 0.76);
        if (down) ctx.fillRect(s.ox + c * cs + cs * 0.12, s.oy + r * cs + cs * 0.12, cs * 0.76, cs * 1.0);
      }
      // gotas
      for (let r = 0; r < s.NR; r++) for (let c = 0; c < NC; c++) if (s.dots[r][c]) {
        ctx.fillStyle = 'rgba(255,183,3,.25)'; ctx.beginPath(); ctx.arc(cx(s, c), cy(s, r), cs * 0.2, 0, 6.28); ctx.fill();
        ctx.fillStyle = '#ffb703'; ctx.beginPath(); ctx.arc(cx(s, c), cy(s, r), cs * 0.1, 0, 6.28); ctx.fill();
      }
      // tubería
      ctx.lineJoin = ctx.lineCap = 'round';
      ctx.beginPath();
      s.pipe.forEach((p, i) => { const x = i === s.pipe.length - 1 ? s.hx : cx(s, p.c), y = i === s.pipe.length - 1 ? s.hy : cy(s, p.r); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.strokeStyle = '#343a40'; ctx.lineWidth = cs * 0.38; ctx.stroke();
      ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = cs * 0.26; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = cs * 0.07; ctx.stroke();
      Arcade.emoji(ctx, '🛢️', cx(s, s.base.c), cy(s, s.base.r) - cs * 0.1, cs * 0.75);
      for (const e of s.en) Arcade.emoji(ctx, e.fire ? '🔥' : '🐛', s.ox + (e.x + 0.5) * cs, cy(s, e.r), cs * 0.7, { flip: !e.fire && e.dir > 0 });
      if (!(s.inv > 0 && Math.floor(g.t * 10) % 2)) Arcade.emoji(ctx, s.pipe.length > 1 ? '😋' : '😴', s.hx, s.hy, cs * 0.82);
      Arcade.txt(ctx, '🟠 ' + s.left, W - 14, s.oy + cs * 0.5, 15, '#ffb703', 'right', 800, 'rgba(0,0,0,.5)');
    },
  });
})();
