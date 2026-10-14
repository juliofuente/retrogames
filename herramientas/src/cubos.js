// Cubos|#0d2b3e
(function () {
  const { rand, clamp } = Arcade;

  function geo(g) {
    const s = g.s;
    s.wallY = g.top + 64; s.groundY = g.bot - 20;
    s.bw = clamp(g.W * 0.2, 64, 104);
    s.px = clamp(s.px || g.W / 2, s.bw / 2, g.W - s.bw / 2);
    s.bomberX = clamp(s.bomberX || g.W / 2, 30, g.W - 30);
  }
  function bucketY(s, i) { return s.groundY - 26 - i * 34; }
  function startWave(g) {
    const s = g.s, w = s.wave;
    s.toDrop = 10 + w * 5; s.dropInt = Math.max(0.16, 0.85 - w * 0.08); s.fallV = 150 + w * 38; s.bomberV = 90 + w * 30;
    s.dropT = 1; s.phase = 'play'; g.level = w; g.hud();
  }

  Arcade.game({
    id: 'cubos', title: 'Cubos', emoji: '🪣', color: '#48cae4', origin: 'Kaboom! (Activision, 1981)',
    help: '<b>Arrastra</b> el dedo para mover tus cubos de agua 🪣 y atrapa <b>todas</b> las bombas 💣 que tira el gamberro. Cada oleada es más rápida. Si se te escapa una, explotan todas las que caen y <b>pierdes un cubo</b>. Cada 1000 puntos recuperas uno.',
    lives: 3, levels: null, lifeIcon: '🪣', levelLabel: 'Oleada',
    theme: { font: 'Black Ops One', ambient: 'stars', music: { tempo: 144, scale: 'minor', root: 220, wave: 'square' }, sfx: { wave: 'square', pitch: 1 } },
    setup(g) {
      g.s = { bombs: [], wave: 1, bomberTX: g.W / 2, phase: 'play', nextLife: 1000, boomQ: [], boomT: 0 };
      geo(g); startWave(g);
    },
    layout(g) { if (g.s.bombs) geo(g); },
    down(g, p) { g.s.tx = p.x; },
    move(g, p) { g.s.tx = p.x; },
    key(g, k, d) { const s = g.s; if (k === 'ArrowLeft') s.kd = d ? -1 : 0; if (k === 'ArrowRight') s.kd = d ? 1 : 0; },
    update(g, dt) {
      const s = g.s;
      if (s.kd) s.tx = s.px + s.kd * 60;
      if (s.tx != null) s.px = clamp(s.px + (s.tx - s.px) * Math.min(1, dt * 22), s.bw / 2, g.W - s.bw / 2);
      if (s.phase === 'boom') {
        s.boomT -= dt;
        if (s.boomT <= 0) {
          if (s.bombs.length) {
            const b = s.bombs.shift(); g.burst(b.x, b.y, { n: 12, color: ['#ff6b35', '#ffd166', '#333'], speed: 200 }); Arcade.sfx.boom(); g.shake(0.15, 6); s.boomT = 0.09;
          } else {
            s.wave = Math.max(1, s.wave - 1);
            if (g.die()) { s.phase = 'pause'; s.pauseT = 1.4; g.message('Oleada ' + s.wave, 1.3); }
            else s.phase = 'dead';
          }
        }
        return;
      }
      if (s.phase === 'dead') return;
      if (s.phase === 'pause') { s.pauseT -= dt; if (s.pauseT <= 0) startWave(g); return; }
      // gamberro
      if (Math.abs(s.bomberTX - s.bomberX) < 6 || Math.random() < dt * 0.8) s.bomberTX = rand(30, g.W - 30);
      const d = s.bomberTX - s.bomberX;
      s.bomberX += Math.sign(d) * Math.min(Math.abs(d), s.bomberV * dt);
      if (s.toDrop > 0) {
        s.dropT -= dt;
        if (s.dropT <= 0) { s.dropT = s.dropInt; s.toDrop--; s.bombs.push({ x: s.bomberX, y: s.wallY, sp: 0 }); Arcade.tone(900, 0.03, 'square', 0.03); }
      }
      const n = g.lives;
      for (const b of s.bombs) {
        const py = b.y; b.y += s.fallV * dt; b.sp += dt;
        for (let i = 0; i < n; i++) {
          const yb = bucketY(s, i) - 8;
          if (py < yb && b.y >= yb && Math.abs(b.x - s.px) < s.bw / 2 + 4) {
            b.caught = true; g.addScore(s.wave); Arcade.tone(500 + i * 80, 0.05, 'triangle', 0.08);
            g.burst(b.x, yb, { n: 5, emoji: '💦', size: 14, speed: 110, life: 0.5 }); g.ring(b.x, yb, { color: '#74c0fc', r: 28, t: 0.3, w: 3 });
            if (g.score >= s.nextLife) { s.nextLife += 1000; if (g.lives < 3) { g.lives++; g.hud(); g.float('+🪣', s.px, bucketY(s, 0) - 50, '#48cae4', 26); Arcade.sfx.up(); } }
            break;
          }
        }
      }
      s.bombs = s.bombs.filter(b => !b.caught);
      if (s.bombs.some(b => b.y > s.groundY - 4)) {
        s.phase = 'boom'; s.boomT = 0.25; s.toDrop = 0; Arcade.buzz(200);
        s.bombs.sort((a, b) => b.y - a.y);
        return;
      }
      if (s.toDrop === 0 && !s.bombs.length) {
        g.addScore(100 * s.wave, g.W / 2, g.H / 2); s.wave++; s.phase = 'pause'; s.pauseT = 1.6;
        g.message('¡Oleada superada!', 1.4, 'Siguiente: ' + s.wave); Arcade.sfx.win(); g.flash('#74c0fc', 0.25); g.burst(g.W / 2, g.H / 2, { n: 24, emoji: ['💧', '✨'], size: 18, speed: 260 });
      }
    },
    draw(g, ctx) {
      const s = g.s, W = g.W, H = g.H;
      Arcade.bg(ctx, W, H, '#0b1d3a', '#173a5e', '#1b5f78');
      Arcade.amb(g, ctx);
      Arcade.glow(ctx, W * 0.82, H * 0.2, 70, 'rgba(255,250,220,.5)', 0.6); Arcade.emoji(ctx, '🌕', W * 0.82, H * 0.2, 44);
      for (let i = 0; i < 12; i++) { const bw2 = 40 + (i * 29) % 40, bh2 = 90 + (i * 61) % 150, x = i * W / 10 - 20, y = H - 20 - bh2; ctx.fillStyle = '#0a1a2e'; ctx.fillRect(x, y, bw2, bh2 + 20); ctx.fillStyle = 'rgba(255,214,102,.5)'; for (let wy = y + 8; wy < H - 30; wy += 14) for (let wx = x + 5; wx < x + bw2 - 5; wx += 10) if ((wx * 13 + wy * 7) % 9 < 3) ctx.fillRect(wx, wy, 4, 6); }
      if (!s.bombs) return;
      // muro
      ctx.fillStyle = '#7f4f24'; ctx.fillRect(0, s.wallY - 10, W, 22);
      ctx.strokeStyle = '#582f0e'; ctx.lineWidth = 2;
      for (let x = 0; x < W; x += 30) { ctx.strokeRect(x, s.wallY - 10, 30, 11); ctx.strokeRect(x + 15, s.wallY + 1, 30, 11); }
      Arcade.emoji(ctx, s.phase === 'boom' || s.phase === 'pause' ? '😏' : '😈', s.bomberX, s.wallY - 34, 50, { rot: Math.sin(g.t * 10) * 0.08 });
      // bombas
      for (const b of s.bombs) {
        Arcade.emoji(ctx, '💣', b.x, b.y, 34, { rot: Math.sin(b.sp * 8) * 0.2 });
        Arcade.glow(ctx, b.x + 10, b.y - 15, 10 + Math.sin(b.sp * 40) * 3, 'rgba(255,200,80,.9)', 0.9);
      }
      // suelo
      ctx.fillStyle = '#0a1f2c'; ctx.fillRect(0, s.groundY, W, H - s.groundY);
      // cubos
      for (let i = 0; i < g.lives; i++) {
        const y = bucketY(s, i);
        ctx.fillStyle = 'rgba(72,202,228,.25)'; Arcade.rr(ctx, s.px - s.bw / 2, y - 12, s.bw, 24, 10); ctx.fill();
        Arcade.emoji(ctx, '🪣', s.px - s.bw * 0.25, y, 30); Arcade.emoji(ctx, '🪣', s.px + s.bw * 0.25, y, 30);
        ctx.fillStyle = '#90e0ef'; ctx.fillRect(s.px - s.bw / 2 + 6, y - 9, s.bw - 12, 3);
      }
      Arcade.txt(ctx, '💣 ' + (s.toDrop + s.bombs.length), W - 14, s.wallY + 30, 14, '#caf0f8', 'right', 800, 'rgba(0,0,0,.4)');
    },
  });
})();
