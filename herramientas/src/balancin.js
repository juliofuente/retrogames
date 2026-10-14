// Balancín|#3d0c2b
(function () {
  const { rand, clamp, dist, pick } = Arcade;
  const COLS = [['#ff5d8f', '#c9184a'], ['#ffd166', '#e09f3e'], ['#4cc9f0', '#3a86ff']];
  const PTS = [100, 50, 20];

  function geo(g) {
    const s = g.s;
    s.floor = g.bot - 26;
    s.L = clamp(g.W * 0.15, 46, 80);
    s.tilt = s.L * 0.5;
    s.rowY = [g.top + 34, g.top + 80, g.top + 126];
    s.G = clamp(g.H * 1.35, 700, 1400);
    s.sx = clamp(s.sx || g.W / 2, s.L + 8, g.W - s.L - 8);
  }
  function fillRow(g, i) {
    const s = g.s, n = Math.max(6, Math.floor(g.W / 40));
    s.rows[i] = { off: 0, v: (i % 2 ? -1 : 1) * (40 + i * 12 + g.level * 8), gap: g.W / n, b: Array(n).fill(true) };
  }
  function ends(s) {
    const yHi = s.floor - 18 - s.tilt, yLo = s.floor - 18;
    return { lx: s.sx - s.L, rx: s.sx + s.L, ly: s.up === 'L' ? yHi : yLo, ry: s.up === 'R' ? yHi : yLo };
  }
  function dropNew(g) {
    const s = g.s;
    s.fly = { x: rand(40, g.W - 40), y: g.top + 150, vx: rand(-40, 40), vy: 60, rot: 0 };
    s.wait = 0.9;
  }

  Arcade.game({
    id: 'balancin', title: 'Balancín', emoji: '🤡', color: '#ff8fab', origin: 'Circus (Exidy, 1977)',
    help: '<b>Arrastra</b> el dedo para mover el balancín. El payaso que cae debe aterrizar en el <b>extremo levantado</b>: así lanza al otro payaso hacia arriba a reventar globos 🎈. Arriba valen más. Si vacías una fila, se rellena más rápida. ¡No dejes que ninguno toque el suelo!',
    lives: 5, levels: null, lifeIcon: '🤡',
    theme: { font: 'Luckiest Guy', ambient: 'confetti', music: { tempo: 150, scale: 'major', root: 294, wave: 'square', swing: 0.15 }, sfx: { wave: 'square', pitch: 1.15 } },
    setup(g) {
      g.s = { rows: [], up: 'L', sx: g.W / 2, vx: 0, tx: g.W / 2, wait: 1.2, cleared: 0 };
      geo(g);
      for (let i = 0; i < 3; i++) fillRow(g, i);
      g.s.fly = { x: g.W * 0.7, y: g.top + 170, vx: -20, vy: 0, rot: 0 };
    },
    layout(g) { if (g.s.rows) geo(g); },
    down(g, p) { g.s.tx = p.x; },
    move(g, p) { g.s.tx = p.x; },
    key(g, k, d) { const s = g.s; if (d && k === 'ArrowLeft') s.tx = s.sx - 120; if (d && k === 'ArrowRight') s.tx = s.sx + 120; },
    update(g, dt) {
      const s = g.s;
      const nx = clamp(s.sx + clamp(s.tx - s.sx, -1400 * dt, 1400 * dt), s.L + 8, g.W - s.L - 8);
      s.vx = (nx - s.sx) / Math.max(dt, 0.001); s.sx = nx;
      for (const r of s.rows) r.off = (r.off + r.v * dt) % g.W;
      if (s.wait > 0) { s.wait -= dt; return; }
      const f = s.fly;
      const py = f.y;
      f.vy += s.G * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vx * dt * 0.02;
      if (f.x < 16) { f.x = 16; f.vx = Math.abs(f.vx); } if (f.x > g.W - 16) { f.x = g.W - 16; f.vx = -Math.abs(f.vx); }
      if (f.y < g.top + 10) { f.y = g.top + 10; f.vy = Math.abs(f.vy) * 0.3; }
      // globos
      s.rows.forEach((r, i) => {
        const y = s.rowY[i];
        if (Math.abs(f.y - y) > 26) return;
        for (let k = 0; k < r.b.length; k++) {
          if (!r.b[k]) continue;
          const x = ((k * r.gap + r.off) % g.W + g.W) % g.W;
          if (Math.abs(f.x - x) < 22) {
            r.b[k] = false; g.addScore(PTS[i], x, y); Arcade.sfx.pop();
            g.burst(x, y, { n: 10, color: [COLS[i][0], '#fff'], speed: 170, size: 3 }); g.ring(x, y, { color: COLS[i][0], r: 30, t: 0.3, w: 3 });
            if (r.b.every(v => !v)) {
              g.addScore(300 * g.level, g.W / 2, y + 30, '#ff8fab'); Arcade.sfx.win();
              s.cleared++; g.level = 1 + Math.floor(s.cleared / 2); g.hud(); fillRow(g, i);
              g.flash('#ffd166', 0.25); g.message('¡Fila completa!', 1.1); g.burst(g.W / 2, y, { n: 20, emoji: ['🎈', '🎉', '⭐'], size: 18, speed: 260 });
            }
          }
        }
      });
      // aterrizaje
      const e = ends(s), upX = s.up === 'L' ? e.lx : e.rx, upY = s.up === 'L' ? e.ly : e.ry;
      if (f.vy > 0 && py < upY - 12 && f.y >= upY - 12) {
        if (Math.abs(f.x - upX) < s.L * 0.55) {
          s.up = s.up === 'L' ? 'R' : 'L';
          const ne = ends(s), lx = s.up === 'L' ? ne.lx : ne.rx, ly = s.up === 'L' ? ne.ly : ne.ry;
          const h = s.floor - s.rowY[0] + 20;
          const v = Math.sqrt(2 * s.G * h) * rand(0.88, 1.06);
          s.fly = { x: lx, y: ly - 22, vx: rand(-70, 70) + s.vx * 0.15, vy: -v, rot: 0 };
          Arcade.sfx.up(); Arcade.sfx.whoosh(); Arcade.buzz(20); g.addScore(5); g.burst(lx, ly, { n: 6, emoji: '💨', size: 14, speed: 90, grav: 0, life: 0.4 });
          return;
        }
      }
      if (f.y > s.floor - 10) {
        g.burst(f.x, s.floor - 10, { n: 14, emoji: '⭐', size: 14, speed: 160 });
        if (g.die()) dropNew(g);
      }
    },
    draw(g, ctx) {
      const s = g.s, W = g.W, H = g.H;
      // carpa
      const sw = Math.max(40, W / 10);
      for (let i = 0; i * sw < W + sw; i++) { ctx.fillStyle = i % 2 ? '#5a1035' : '#7a1a47'; ctx.fillRect(i * sw, 0, sw, H); }
      const vg = ctx.createRadialGradient(W / 2, H * 0.6, 40, W / 2, H * 0.6, Math.max(W, H) * 0.8);
      vg.addColorStop(0, 'rgba(255,220,150,.18)'); vg.addColorStop(1, 'rgba(10,0,20,.7)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      // focos que barren el escenario
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const [ox, ph, c] of [[0, 0, 'rgba(255,240,180,.07)'], [W, 2, 'rgba(255,180,220,.07)']]) {
        const tx = W / 2 + Math.sin(g.t * 0.7 + ph) * W * 0.4;
        ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(ox, g.top - 20); ctx.lineTo(tx - 70, H); ctx.lineTo(tx + 70, H); ctx.fill();
      }
      ctx.restore();
      // banderines
      const bt = g.top - 4;
      ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, bt); ctx.quadraticCurveTo(W / 2, bt + 18, W, bt); ctx.stroke();
      for (let i = 0; i < W / 26; i++) { const x = i * 26 + 13, y = bt + Math.sin(x / W * Math.PI) * 9; ctx.fillStyle = ['#ff6b6b', '#ffd43b', '#4dabf7', '#69db7c'][i % 4]; ctx.beginPath(); ctx.moveTo(x - 9, y); ctx.lineTo(x + 9, y); ctx.lineTo(x, y + 16); ctx.fill(); }
      Arcade.amb(g, ctx);
      if (!s.rows.length) return;
      // globos
      s.rows.forEach((r, i) => {
        const y = s.rowY[i];
        for (let k = 0; k < r.b.length; k++) {
          if (!r.b[k]) continue;
          const x = ((k * r.gap + r.off) % W + W) % W;
          ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.quadraticCurveTo(x + 4, y + 22, x, y + 30); ctx.stroke();
          const bg = ctx.createRadialGradient(x - 4, y - 6, 2, x, y, 16);
          bg.addColorStop(0, '#fff'); bg.addColorStop(0.25, COLS[i][0]); bg.addColorStop(1, COLS[i][1]);
          ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(x, y, 12, 15, 0, 0, 6.28); ctx.fill();
        }
      });
      // suelo
      ctx.fillStyle = '#2b0a1d'; ctx.fillRect(0, s.floor, W, H - s.floor);
      ctx.fillStyle = '#ffd166'; ctx.fillRect(0, s.floor, W, 3);
      // balancín
      const e = ends(s);
      ctx.fillStyle = '#adb5bd'; ctx.beginPath(); ctx.moveTo(s.sx, s.floor - 18 - s.tilt / 2); ctx.lineTo(s.sx - 16, s.floor); ctx.lineTo(s.sx + 16, s.floor); ctx.fill();
      ctx.lineCap = 'round'; ctx.strokeStyle = '#3d2314'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(e.lx, e.ly); ctx.lineTo(e.rx, e.ry); ctx.stroke();
      ctx.strokeStyle = '#a0522d'; ctx.lineWidth = 7; ctx.stroke();
      const dx = s.up === 'L' ? e.rx : e.lx, dy = s.up === 'L' ? e.ry : e.ly;
      Arcade.emoji(ctx, '🤡', dx, dy - 22, 38);
      const ux = s.up === 'L' ? e.lx : e.rx, uy = s.up === 'L' ? e.ly : e.ry;
      ctx.strokeStyle = 'rgba(255,209,102,' + (0.4 + Math.sin(g.t * 8) * 0.3) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ux, uy - 4, 14, 0, 6.28); ctx.stroke();
      // payaso volando
      const f = s.fly;
      if (s.wait > 0 && g.state === 'play') { ctx.globalAlpha = Math.floor(g.t * 8) % 2 ? 1 : 0.3; }
      Arcade.emoji(ctx, '🤡', f.x, f.y, 40, { rot: f.rot });
      ctx.globalAlpha = 1;
      if (f.vy > 0 && f.y < s.floor - 60) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(f.x, s.floor + 6, 14, 4, 0, 0, 6.28); ctx.fill(); }
    },
  });
})();
