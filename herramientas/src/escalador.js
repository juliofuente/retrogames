// Escalador|#3a86c8
(function () {
  const { rand, ri, pick, clamp } = Arcade;
  const NC = 5;
  const RES = ['😠', '😤', '👵', '🧔', '😾'];

  function geo(g) {
    const s = g.s;
    s.bw = Math.min(g.W - 70, 440); s.cw = s.bw / NC; s.rh = s.cw * 0.95;
    s.bx0 = (g.W - s.bw) / 2; s.baseY = g.bot - Math.max(150, g.H * 0.26);
  }
  const winKey = (c, r) => c + ',' + r;
  function winState(s, c, r) { return s.win.get(winKey(c, r)); }
  function isClosed(s, c, r) { const w = winState(s, c, r); return w && w.st === 'closed'; }
  const rowY = (s, row) => s.baseY - (row - s.cam) * s.rh;

  function fall(g, why) {
    const s = g.s;
    const x = s.bx0 + (s.cx + 0.5) * s.cw, y = rowY(s, s.y);
    g.burst(x, y, { n: 14, emoji: why === 'pot' ? '💥' : '💫', size: 18, speed: 200 });
    s.pots = []; s.inv = 2; s.last = null;
    s.y = Math.max(0, Math.floor(s.y) - 2);
    g.die();
  }

  Arcade.game({
    id: 'escalador', title: 'Escalador', emoji: '🧗', color: '#ff6b6b', origin: 'Crazy Climber (Nichibutsu, 1980)',
    help: 'Trepa tocando <b>alternando</b> la mitad izquierda y la derecha de la pantalla, como si fueran tus dos manos. Repetir la misma mano no sirve. <b>Desliza</b> a izquierda o derecha para cambiar de columna. Si una ventana se cierra <b>mientras tienes una mano levantada</b>, te caes. Esquiva las macetas 🪴 y llega a la azotea 🚁.',
    lives: 3, levels: Infinity,
    theme: { font: 'Bangers', ambient: 'birds', light: true, music: { tempo: 132, scale: 'major', root: 262, wave: 'square' }, sfx: { wave: 'square', pitch: 1.05 } },
    setup(g) {
      g.s = { y: 0, c: 2, cx: 2, last: null, cam: 0, win: new Map(), pots: [], winT: 1.5, potT: 3, inv: 0, done: 0, wig: 0 };
      const s = g.s; s.TR = 22 + Math.min(g.level, 10) * 8;
      geo(g);
    },
    layout(g) { if (g.s.win) geo(g); },
    tap(g, p) {
      const s = g.s; if (s.done || s.c !== s.cx) return;
      const h = p.x < g.W / 2 ? 'L' : 'R';
      if (h === s.last) { s.wig = 0.15; Arcade.sfx.bad(); return; }
      const frac = s.y % 1 !== 0;
      if (!frac && isClosed(s, s.c, s.y + 1)) { s.wig = 0.2; Arcade.sfx.bad(); return; }
      s.last = h; s.y += 0.5; Arcade.sfx.tick(); g.addScore(5);
      if (s.y >= s.TR) { s.done = 0.01; Arcade.sfx.win(); }
    },
    swipe(g, dir) {
      const s = g.s; if (s.done) return;
      if (dir !== 'left' && dir !== 'right') return;
      if (s.y % 1 !== 0) { s.wig = 0.2; Arcade.sfx.bad(); return; }
      const nc = s.c + (dir === 'left' ? -1 : 1);
      if (nc < 0 || nc >= NC || isClosed(s, nc, s.y)) { Arcade.sfx.bad(); return; }
      s.c = nc; Arcade.sfx.move();
    },
    key(g, k, d) {
      if (!d) return;
      if (k === 'ArrowLeft') this.swipe(g, 'left'); else if (k === 'ArrowRight') this.swipe(g, 'right');
      else if (k === 'z' || k === 'a') this.tap(g, { x: 0 }); else if (k === 'x' || k === 'd') this.tap(g, { x: g.W });
    },
    update(g, dt) {
      const s = g.s;
      s.inv = Math.max(0, s.inv - dt); s.wig = Math.max(0, s.wig - dt);
      if (s.cx !== s.c) { const d = s.c - s.cx; s.cx += Math.sign(d) * Math.min(Math.abs(d), dt * 7); }
      s.cam += (s.y - s.cam) * Math.min(1, dt * 6);
      if (s.done) {
        s.done += dt;
        if (s.done > 1.6) { g.addScore(1000 * g.level, g.W / 2, g.H / 2); g.burst(g.W / 2, g.top + 60, { n: 30, emoji: ['🎉', '🎊', '⭐'], size: 20, speed: 260 }); g.win(); }
        return;
      }
      // ventanas
      for (const [k, w] of s.win) {
        w.t -= dt;
        if (w.t <= 0) {
          if (w.st === 'warn') {
            w.st = 'closed'; w.t = Math.max(0.9, rand(2.2, 4.2) - Math.min(g.level, 15) * 0.1);
            const [c, r] = k.split(',').map(Number);
            if (c === s.c && r === Math.floor(s.y) + 1 && s.y % 1 !== 0 && s.inv <= 0) { fall(g, 'win'); return; }
            if (Math.abs(c - s.cx) < 0.5 && Math.abs(r - (s.y + 1)) < 2) Arcade.tone(220, 0.08, 'square', 0.06);
          } else s.win.delete(k);
        }
      }
      s.winT -= dt;
      if (s.winT <= 0) {
        s.winT = Math.max(0.3, 1.1 - g.level * 0.09) * rand(0.6, 1.3);
        const c = Math.random() < 0.55 ? s.c : ri(0, NC - 1), r = Math.floor(s.y) + ri(1, 6);
        if (r < s.TR && !s.win.has(winKey(c, r))) s.win.set(winKey(c, r), { st: 'warn', t: Math.max(0.55, 1.1 - g.level * 0.05), res: pick(RES) });
      }
      // macetas
      s.potT -= dt;
      if (s.potT <= 0 && g.level >= 1) {
        s.potT = Math.max(1.1, 3.4 - g.level * 0.25) * rand(0.7, 1.3);
        s.pots.push({ c: Math.random() < 0.6 ? s.c : ri(0, NC - 1), warn: 0.9, ry: s.cam + (s.baseY - g.top) / s.rh + 1 });
      }
      for (const p of s.pots) {
        if (p.warn > 0) { p.warn -= dt; continue; }
        p.ry -= dt * (8 + Math.min(g.level, 15) * 0.6);
        if (s.inv <= 0 && Math.abs(p.c - s.cx) < 0.5 && Math.abs(p.ry - (s.y + 0.6)) < 0.55) { fall(g, 'pot'); return; }
      }
      s.pots = s.pots.filter(p => p.ry > s.cam - 4);
    },
    draw(g, ctx) {
      const s = g.s, W = g.W, H = g.H;
      const k = s.TR ? clamp(s.cam / s.TR, 0, 1) : 0;
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, `hsl(${215 - k * 20},65%,${48 - k * 22}%)`); bg.addColorStop(1, `hsl(${200 - k * 30},70%,${70 - k * 25}%)`);
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      if (!s.win) return;
      for (let i = 0; i < 5; i++) { // nubes
        const x = ((i * 173 + g.t * (8 + i * 3)) % (W + 120)) - 60, y = ((i * 131 - s.cam * 8) % H + H) % H;
        Arcade.emoji(ctx, '☁️', x, y, 46 + i * 6, { alpha: 0.7 });
      }
      const sk = s.cam * s.rh * 0.25;
      for (let i = 0; i < 16; i++) {
        const bw2 = 34 + (i * 37) % 36, bh2 = 110 + (i * 53) % 190, x = i * W / 13 - 24, y = g.bot - bh2 + sk;
        if (y > H) continue;
        ctx.fillStyle = `rgba(${40 - k * 20},${55 - k * 30},${95 - k * 40},.55)`; ctx.fillRect(x, y, bw2, H - y + 4);
        ctx.fillStyle = k > 0.5 ? 'rgba(255,224,102,.55)' : 'rgba(255,255,255,.18)';
        for (let wy = y + 10; wy < Math.min(H, y + bh2); wy += 16) for (let wx = x + 6; wx < x + bw2 - 6; wx += 12) if ((wx * 7 + wy * 3) % 5 < 2) ctx.fillRect(wx, wy, 5, 7);
      }
      Arcade.amb(g, ctx);
      const cw = s.cw, rh = s.rh;
      const r0 = Math.max(0, Math.floor(s.cam - (g.bot - s.baseY) / rh) - 1), r1 = Math.min(s.TR, Math.ceil(s.cam + (s.baseY - g.top) / rh) + 1);
      // fachada
      const yTop = rowY(s, s.TR), yBot = rowY(s, -1);
      ctx.fillStyle = ['#b07d62', '#8d99ae', '#6d597a', '#a26769', '#5f7470'][(g.level - 1) % 5]; ctx.fillRect(s.bx0 - 10, Math.max(-10, yTop), s.bw + 20, Math.min(H + 20, yBot) - Math.max(-10, yTop));
      ctx.fillStyle = 'rgba(0,0,0,.08)'; for (let c = 0; c <= NC; c++) ctx.fillRect(s.bx0 + c * cw - 3, Math.max(0, yTop), 6, H);
      for (let r = r0; r < r1; r++) {
        const y = rowY(s, r);
        ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(s.bx0 - 10, y - rh * 0.06, s.bw + 20, rh * 0.06);
        for (let c = 0; c < NC; c++) {
          const x = s.bx0 + c * cw, wx = x + cw * 0.14, ww = cw * 0.72, wy = y - rh * 0.88, wh = rh * 0.74;
          const w = winState(s, c, r);
          ctx.fillStyle = '#5c3d2e'; Arcade.rr(ctx, wx - 3, wy - 3, ww + 6, wh + 6, 6); ctx.fill();
          const gl = ctx.createLinearGradient(wx, wy, wx + ww, wy + wh);
          gl.addColorStop(0, '#a9d6e5'); gl.addColorStop(1, '#468faf');
          ctx.fillStyle = gl; Arcade.rr(ctx, wx, wy, ww, wh, 4); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(wx + ww * 0.15, wy + wh); ctx.lineTo(wx + ww * 0.45, wy); ctx.lineTo(wx + ww * 0.6, wy); ctx.lineTo(wx + ww * 0.3, wy + wh); ctx.fill();
          if (w) {
            if (w.st === 'warn') {
              Arcade.emoji(ctx, w.res, wx + ww / 2, wy + wh * 0.5, cw * 0.42);
              const sh = (1 - w.t / 1.1) * 0.5;
              ctx.fillStyle = '#6c757d'; ctx.fillRect(wx, wy, ww, wh * sh);
            } else {
              ctx.fillStyle = '#6c757d'; Arcade.rr(ctx, wx, wy, ww, wh, 4); ctx.fill();
              ctx.strokeStyle = '#495057'; ctx.lineWidth = 2;
              for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(wx, wy + wh * i / 5); ctx.lineTo(wx + ww, wy + wh * i / 5); ctx.stroke(); }
            }
          }
        }
      }
      if (yTop > -40) {
        ctx.fillStyle = '#6d4c41'; ctx.fillRect(s.bx0 - 18, yTop - 14, s.bw + 36, 16);
        Arcade.txt(ctx, '🏁 AZOTEA', W / 2, yTop - 40, 16, '#fff', 'center', 900, 'rgba(0,0,0,.4)');
        if (s.done) Arcade.emoji(ctx, '🚁', W / 2 + Math.sin(g.t * 3) * 20, yTop - 90 + Math.max(0, 1 - s.done) * -120, 64);
      }
      // macetas
      for (const p of s.pots) {
        const x = s.bx0 + (p.c + 0.5) * cw;
        if (p.warn > 0) { if (Math.floor(g.t * 8) % 2) Arcade.emoji(ctx, '⚠️', x, g.top + 24, 30); }
        else Arcade.emoji(ctx, '🪴', x, rowY(s, p.ry), cw * 0.5, { rot: g.t * 6 });
      }
      // escalador
      const wig = s.wig > 0 ? Math.sin(g.t * 60) * 4 : 0;
      const px = s.bx0 + (s.cx + 0.5) * cw + wig, py = rowY(s, s.y) - rh * 0.35;
      if (!(s.inv > 0 && Math.floor(g.t * 10) % 2)) Arcade.emoji(ctx, '🧗', px, py, cw * 0.78, { flip: s.last === 'R', rot: (s.y % 1 ? 0.12 : -0.05) });
      // manos
      const next = s.last === 'L' ? 'R' : s.last === 'R' ? 'L' : null;
      const hy = g.bot - 54;
      [['L', W * 0.17, '🤚'], ['R', W * 0.83, '✋']].forEach(([h, x, e]) => {
        const on = !next || next === h;
        ctx.fillStyle = on ? 'rgba(255,255,255,.28)' : 'rgba(0,0,0,.18)';
        ctx.beginPath(); ctx.arc(x, hy, 36 + (on ? Math.sin(g.t * 8) * 3 : 0), 0, 6.28); ctx.fill();
        Arcade.emoji(ctx, e, x, hy, 40, { alpha: on ? 1 : 0.35 });
      });
      // progreso
      const bx = g.W - 14, by0 = g.top + 10, bh = g.bot - g.top - 120;
      ctx.fillStyle = 'rgba(0,0,0,.25)'; Arcade.rr(ctx, bx - 4, by0, 8, bh, 4); ctx.fill();
      ctx.fillStyle = '#ffd166'; const pr = clamp(s.y / s.TR, 0, 1); Arcade.rr(ctx, bx - 4, by0 + bh * (1 - pr), 8, bh * pr, 4); ctx.fill();
    },
  });
})();
