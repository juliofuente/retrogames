// Pirámide|#0b0b1a
(function () {
  const { ri, pick, clamp, dist } = Arcade;
  const N = 7;
  const PAL = [['#4dabf7', '#ffd43b', '#ff6b6b'], ['#9775fa', '#63e6be', '#ffa94d'], ['#ff8787', '#74c0fc', '#c0eb75'], ['#20c997', '#f783ac', '#ffe066']];
  const MOVES = { UL: [-1, -1], UR: [-1, 0], DL: [1, 0], DR: [1, 1] };

  function geo(g) {
    const s = g.s, Ha = g.bot - g.top - 40;
    s.cw = Math.min((g.W - 30) / N, Ha / (N * 0.78 + 1.2));
    s.x0 = g.W / 2; s.y0 = g.top + 30 + s.cw * 0.9 + (Ha - s.cw * (N * 0.78 + 1.2)) / 2;
  }
  const cxy = (s, r, c) => ({ x: s.x0 + (c - r / 2) * s.cw, y: s.y0 + r * s.cw * 0.78 });
  const onPyr = (r, c) => r >= 0 && r < N && c >= 0 && c <= r;
  function cfg(lv) { return { need: lv <= 3 ? 1 : lv <= 6 ? 2 : 1, toggle: lv > 6, pal: PAL[(lv - 1) % PAL.length] }; }
  // posición en pantalla de un actor (salto con arco)
  function apos(s, a) {
    if (a.ride) { const p0 = a.ride.from, p1 = cxy(s, -1.2, 0); const k = a.ride.t; return { x: p0.x + (p1.x - p0.x) * k, y: p0.y + (p1.y - p0.y) * k - Math.sin(k * Math.PI) * 30 }; }
    const p = cxy(s, a.r, a.c);
    if (a.j) {
      const q = cxy(s, a.j.r, a.j.c), k = a.j.t;
      return { x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k - Math.sin(k * Math.PI) * s.cw * 0.45 + (a.j.fall ? Math.max(0, k - 1) * 0 : 0) };
    }
    if (a.fall) return { x: p.x, y: p.y + a.fall * a.fall * 900 };
    return p;
  }
  function jump(g, a, mv, dur) { a.j = { r: a.r + MOVES[mv][0], c: a.c + MOVES[mv][1], t: 0, d: dur, mv }; }
  function land(g) {
    const s = g.s, pl = s.pl, k = cfg(g.level);
    pl.r = pl.j.r; pl.c = pl.j.c; pl.j = null;
    if (!onPyr(pl.r, pl.c)) {
      const disc = s.discs.find(d => d.r === pl.r && ((d.side === 'L' && pl.c === -1) || (d.side === 'R' && pl.c === pl.r + 1)));
      if (disc) { s.discs.splice(s.discs.indexOf(disc), 1); pl.ride = { from: cxy(s, pl.r, pl.c), t: 0 }; Arcade.sfx.up(); g.addScore(50); return; }
      pl.fall = 0.001; Arcade.tone(500, 0.8, 'sine', 0.1, -440); return;
    }
    const v = s.cubes[pl.r][pl.c];
    const nv = k.toggle ? (v ? 0 : 1) : Math.min(k.need, v + 1);
    if (nv !== v) { s.cubes[pl.r][pl.c] = nv; if (nv > v) g.addScore(25); Arcade.tone(nv > v ? 520 + nv * 120 : 200, 0.07, 'square', 0.07); const q = cxy(s, pl.r, pl.c); g.ring(q.x, q.y, { color: k.pal[Math.min(2, nv * (k.need === 1 ? 2 : 1))], r: s.cw * 0.7, t: 0.3, w: 3 }); g.burst(q.x, q.y, { n: 5, color: k.pal[2], speed: 100, size: 2.5 }); }
    else Arcade.sfx.tick();
    if (s.cubes.every(row => row.every(x => x === k.need))) { g.addScore(1000 + g.level * 250, g.W / 2, g.H / 2); g.win(); }
  }
  function die(g) {
    const s = g.s;
    s.en = []; s.spawnT = 2; s.inv = 1.5;
    if (g.die()) { const pl = s.pl; if (pl.fall) { pl.r = 0; pl.c = 0; } pl.fall = 0; pl.j = null; pl.ride = null; pl.q = null; }
  }
  function spawnEnemy(g) {
    const s = g.s;
    const coily = !s.en.some(e => e.coily) && Math.random() < 0.4 + g.level * 0.04;
    const green = !coily && g.level >= 3 && Math.random() < 0.12;
    s.en.push({ r: 1, c: ri(0, 1), j: null, hopT: 0.7, coily, snake: false, green, drop: 1 });
  }
  function enemyHop(g, e) {
    const s = g.s, pl = s.pl;
    if (e.coily && e.snake) {
      const tr = pl.ride ? { r: pl.lastR, c: pl.lastC } : pl.j ? { r: pl.j.r, c: pl.j.c } : { r: pl.r, c: pl.c };
      const tp = cxy(s, tr.r, tr.c);
      let best = null, bd = 1e9;
      for (const mv in MOVES) {
        const r = e.r + MOVES[mv][0], c = e.c + MOVES[mv][1];
        const ok = onPyr(r, c) || (r === tr.r && c === tr.c);
        if (!ok) continue;
        const p = cxy(s, r, c), d = dist(p.x, p.y, tp.x, tp.y);
        if (d < bd) { bd = d; best = mv; }
      }
      if (best) jump(g, e, best, 0.42 - Math.min(0.12, g.level * 0.01));
      return;
    }
    jump(g, e, Math.random() < 0.5 ? 'DL' : 'DR', 0.36);
  }

  Arcade.game({
    id: 'piramide', title: 'Pirámide', emoji: '🔺', color: '#ffa94d', origin: 'Q*bert (Gottlieb, 1982)',
    help: '<b>Toca</b> arriba-izquierda, arriba-derecha, abajo-izquierda o abajo-derecha de tu personaje para saltar en diagonal. Cada cubo que pisas <b>cambia de color</b>: píntalos todos del color objetivo. ¡No saltes fuera! Esquiva las bolas 🔴 y la serpiente 🐍. Los discos 🌈 de los lados te devuelven arriba y la serpiente se cae si te sigue. 🟢 congela a los enemigos.',
    lives: 3, levels: Infinity,
    theme: { font: 'Press Start 2P', music: { tempo: 136, scale: 'penta', root: 262, wave: 'square' }, sfx: { wave: 'square', pitch: 1.1 } },
    setup(g) {
      g.s = { cubes: [], en: [], spawnT: 2.5, inv: 1, freeze: 0 };
      const s = g.s;
      for (let r = 0; r < N; r++) s.cubes.push(new Array(r + 1).fill(0));
      s.pl = { r: 0, c: 0, j: null, q: null, fall: 0, ride: null };
      const rows = [2, 3, 4, 5]; const a = pick(rows); let b = pick(rows);
      s.discs = [{ r: a, side: 'L' }, { r: b, side: 'R' }];
      geo(g);
    },
    layout(g) { if (g.s.cubes) geo(g); },
    down(g, p) {
      const s = g.s, pl = s.pl; if (pl.fall || pl.ride) return;
      const at = apos(s, pl), up = p.y < at.y, left = p.x < at.x;
      const mv = up ? (left ? 'UL' : 'UR') : (left ? 'DL' : 'DR');
      if (pl.j) pl.q = mv; else jump(g, pl, mv, 0.3);
    },
    key(g, k, d) {
      if (!d) return; const s = g.s, pl = s.pl; if (pl.fall || pl.ride) return;
      const mv = { q: 'UL', e: 'UR', a: 'DL', d: 'DR', ArrowUp: 'UR', ArrowLeft: 'UL', ArrowDown: 'DL', ArrowRight: 'DR' }[k];
      if (mv) { if (pl.j) pl.q = mv; else jump(g, pl, mv, 0.3); }
    },
    update(g, dt) {
      const s = g.s, pl = s.pl;
      s.inv = Math.max(0, s.inv - dt); s.freeze = Math.max(0, s.freeze - dt);
      if (pl.ride) {
        pl.ride.t += dt / 1.2;
        if (pl.ride.t >= 1) { pl.ride = null; pl.r = 0; pl.c = 0; s.inv = 0.6; }
        else { pl.lastR = pl.r; pl.lastC = pl.c; }
      } else if (pl.fall) {
        pl.fall += dt; if (pl.fall > 0.9) { die(g); return; }
      } else if (pl.j) {
        pl.j.t += dt / pl.j.d;
        if (pl.j.t >= 1) { land(g); if (g.state !== 'play') return; if (pl.q && !pl.fall && !pl.ride) { jump(g, pl, pl.q, 0.3); pl.q = null; } }
      }
      // enemigos
      s.spawnT -= dt;
      if (s.spawnT <= 0 && s.en.length < Math.min(6, 2 + Math.floor(g.level / 3))) { s.spawnT = Math.max(1.4, 3.6 - g.level * 0.18); spawnEnemy(g); }
      if (!s.freeze) for (const e of s.en) {
        if (e.drop > 0) { e.drop -= dt * 2; continue; }
        if (e.fall) { e.fall += dt; if (e.fall > 1) e.dead = true; continue; }
        if (e.j) {
          e.j.t += dt / e.j.d;
          if (e.j.t >= 1) {
            e.r = e.j.r; e.c = e.j.c; e.j = null; e.hopT = e.coily && e.snake ? 0.18 : 0.35;
            if (!onPyr(e.r, e.c)) { e.fall = 0.001; if (e.coily && e.snake) { g.addScore(500, apos(s, e).x, apos(s, e).y - 20); g.float('¡Serpiente fuera!', g.W / 2, g.H / 2, '#ffa94d', 22); Arcade.sfx.win(); } }
            else if (e.coily && !e.snake && e.r === N - 1) { e.snake = true; Arcade.tone(150, 0.3, 'sawtooth', 0.08, 120); }
          }
        } else { e.hopT -= dt; if (e.hopT <= 0) enemyHop(g, e); }
      }
      s.en = s.en.filter(e => !e.dead);
      if (pl.ride || pl.fall || s.inv > 0) return;
      const pp = apos(s, pl);
      for (const e of s.en) {
        if (e.drop > 0 || e.fall) continue;
        const ep = apos(s, e);
        if (dist(pp.x, pp.y, ep.x, ep.y) < s.cw * 0.34) {
          if (e.green) { e.dead = true; s.freeze = 3.5; g.addScore(100, ep.x, ep.y - 20); Arcade.sfx.coin(); continue; }
          g.burst(pp.x, pp.y, { n: 16, emoji: '💬', size: 16, speed: 140 }); g.float('@!#?@!', pp.x, pp.y - 30, '#fff', 22);
          die(g); return;
        }
      }
    },
    draw(g, ctx) {
      const s = g.s, W = g.W, H = g.H;
      Arcade.bg(ctx, W, H, '#1b1040', '#0b0b1a', '#05050d');
      Arcade.glow(ctx, W * 0.8, H * 0.25, W * 0.5, 'rgba(255,120,200,.25)', 1); Arcade.glow(ctx, W * 0.15, H * 0.8, W * 0.5, 'rgba(80,160,255,.25)', 1);
      Arcade.amb(g, ctx, 'stars');
      Arcade.emoji(ctx, '🌙', W - 30, g.top + 70, 30, { alpha: 0.8 });
      if (!s.cubes) return;
      const cw = s.cw, k = cfg(g.level), cols = k.need === 2 ? k.pal : [k.pal[0], k.pal[2], k.pal[2]];
      const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const r = Math.round(((n >> 16) & 255) * f), gg = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f); return `rgb(${r},${gg},${b})`; };
      for (let r = 0; r < N; r++) for (let c = 0; c <= r; c++) {
        const { x, y } = cxy(s, r, c), hw = cw / 2, hh = cw * 0.26, sd = cw * 0.52;
        ctx.fillStyle = shade(cols[s.cubes[r][c]], 1);
        ctx.beginPath(); ctx.moveTo(x, y - hh); ctx.lineTo(x + hw, y); ctx.lineTo(x, y + hh); ctx.lineTo(x - hw, y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#5c5f8a'; ctx.beginPath(); ctx.moveTo(x - hw, y); ctx.lineTo(x, y + hh); ctx.lineTo(x, y + hh + sd); ctx.lineTo(x - hw, y + sd); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#3b3d63'; ctx.beginPath(); ctx.moveTo(x + hw, y); ctx.lineTo(x, y + hh); ctx.lineTo(x, y + hh + sd); ctx.lineTo(x + hw, y + sd); ctx.closePath(); ctx.fill();
      }
      for (const d of s.discs) {
        const p = cxy(s, d.r, d.side === 'L' ? -1 : d.r + 1);
        ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, 0.4);
        const gr = ctx.createConicGradient ? ctx.createConicGradient(g.t * 3, 0, 0) : null;
        if (gr) { ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7', '#da77f2', '#ff6b6b'].forEach((c, i) => gr.addColorStop(i / 5, c)); ctx.fillStyle = gr; } else ctx.fillStyle = '#da77f2';
        ctx.beginPath(); ctx.arc(0, 0, cw * 0.3, 0, 6.28); ctx.fill(); ctx.restore();
      }
      // objetivo
      Arcade.txt(ctx, 'Objetivo', 46, g.top + 16, 11, '#adb5bd', 'center', 700);
      ctx.fillStyle = k.pal[2]; ctx.beginPath(); ctx.moveTo(46, g.top + 26); ctx.lineTo(66, g.top + 36); ctx.lineTo(46, g.top + 46); ctx.lineTo(26, g.top + 36); ctx.fill();
      if (k.toggle) Arcade.txt(ctx, '¡Ojo: vuelve atrás!', 46, g.top + 58, 10, '#ff8787', 'center', 700);
      // actores ordenados por altura
      const actors = s.en.map(e => ({ e, p: apos(s, e) })).concat([{ pl: true, p: apos(s, s.pl) }]).sort((a, b) => a.p.y - b.p.y);
      for (const a of actors) {
        if (a.pl) {
          if (s.inv > 0 && Math.floor(g.t * 10) % 2) continue;
          const mv = s.pl.j ? s.pl.j.mv : 'DR';
          Arcade.emoji(ctx, '🐹', a.p.x, a.p.y - cw * 0.3, cw * 0.62, { flip: mv === 'DR' || mv === 'UR' });
        } else {
          const e = a.e;
          if (e.drop > 0) { ctx.globalAlpha = 1 - e.drop; }
          const em = e.green ? '🟢' : e.coily ? (e.snake ? '🐍' : '🟣') : '🔴';
          Arcade.emoji(ctx, em, a.p.x, a.p.y - cw * 0.25 - Math.max(0, e.drop) * 80, cw * (e.snake ? 0.6 : 0.42));
          ctx.globalAlpha = 1;
        }
      }
      if (s.freeze) Arcade.txt(ctx, '❄️ ' + s.freeze.toFixed(1), W / 2, g.top + 18, 16, '#99e9f2', 'center', 900);
    },
  });
})();
