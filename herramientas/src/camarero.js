// Camarero|#3b1f0e
(function () {
  const { rand, ri, pick, clamp } = Arcade;
  const NL = 4;
  const CUST = ['🤠', '🧔', '👩', '👨‍🦰', '👴', '👩‍🦱', '🧑‍🎤', '🥸', '👨‍🚀', '🧛'];

  function geo(g) {
    const s = g.s, h = g.bot - g.top - 10;
    s.lh = h / NL; s.x0 = 44; s.x1 = g.W - 58; s.len = s.x1 - s.x0;
    s.ly = (i) => g.top + 6 + s.lh * (i + 0.62);
  }
  function startWave(g) {
    const s = g.s, w = g.level;
    s.total = 5 + w * 2; s.spawned = 0; s.spawnT = 1; s.spawnInt = Math.max(0.75, 2.4 - w * 0.17);
    s.walkV = s.len * (0.045 + w * 0.009);
  }
  function clearAll(s) { s.cust = []; s.mugs = []; }
  function lose(g, x, lane, emoji) {
    const s = g.s;
    g.burst(x, s.ly(lane), { n: 12, emoji: emoji || '💥', size: 16, speed: 160 });
    const lost = s.cust.length; s.spawned = Math.max(0, s.spawned - lost);
    clearAll(s); s.spawnT = 1.6;
    g.die();
  }

  Arcade.game({
    id: 'camarero', title: 'Camarero', emoji: '🍺', color: '#f9c74f', origin: 'Tapper (Bally Midway, 1983)',
    help: '<b>Toca una barra</b> para ir a ella y lanzar una jarra 🍺. Cada cliente que la recibe retrocede; si sale por la puerta, se va contento. Luego te devuelve la jarra vacía: tienes que estar en esa barra para recogerla. Pierdes una vida si una jarra se rompe o si un cliente llega hasta ti.',
    lives: 3, levels: null, levelLabel: 'Ronda',
    theme: { font: 'Sancreek', ambient: 'dust', music: { tempo: 128, scale: 'major', root: 220, wave: 'square', swing: 0.33, bass: 'triangle' }, sfx: { wave: 'triangle', pitch: 1 } },
    setup(g) {
      g.s = { lane: 0, cool: 0, cust: [], mugs: [], served: 0 };
      geo(g); startWave(g);
    },
    layout(g) { if (g.s.cust) geo(g); },
    down(g, p) {
      const s = g.s, lane = clamp(Math.floor((p.y - g.top - 6) / s.lh), 0, NL - 1);
      s.lane = lane;
      if (s.cool <= 0) { s.cool = 0.2; s.mugs.push({ lane, x: s.x1 - 14, full: true }); Arcade.tone(320, 0.06, 'triangle', 0.08, 200); }
    },
    key(g, k, d) {
      if (!d) return; const s = g.s;
      if (k === 'ArrowUp') s.lane = Math.max(0, s.lane - 1);
      else if (k === 'ArrowDown') s.lane = Math.min(NL - 1, s.lane + 1);
      else if (k === ' ' && s.cool <= 0) { s.cool = 0.2; s.mugs.push({ lane: s.lane, x: s.x1 - 14, full: true }); }
    },
    update(g, dt) {
      const s = g.s;
      s.cool -= dt;
      const beerV = s.len * 0.62, mugV = s.len * (0.22 + g.level * 0.012);
      // aparición
      if (s.spawned < s.total) {
        s.spawnT -= dt;
        if (s.spawnT <= 0) {
          s.spawnT = s.spawnInt * rand(0.7, 1.3); s.spawned++;
          s.cust.push({ lane: ri(0, NL - 1), x: s.x0 - 10, st: 'walk', ph: Math.random() * 2, e: pick(CUST), tx: 0, t: 0 });
        }
      }
      for (const c of s.cust) {
        c.ph += dt;
        if (c.st === 'walk') {
          if (c.ph % 1.4 < 0.8) c.x += s.walkV * dt * 1.75;
          if (c.x >= s.x1 - 18) { lose(g, c.x, c.lane, '😡'); return; }
        } else if (c.st === 'push') {
          c.x -= s.len * 0.7 * dt;
          if (c.x < s.x0 - 30) { c.gone = true; g.addScore(50, s.x0 + 10, s.ly(c.lane) - 20); s.served++; Arcade.sfx.coin(); g.burst(s.x0 + 10, s.ly(c.lane) - 26, { n: 4, emoji: ['💛', '😄'], size: 14, speed: 90, up: 80 }); }
          else if (c.x <= c.tx) { c.x = c.tx; c.st = 'drink'; c.t = 0.9; }
        } else if (c.st === 'drink') {
          c.t -= dt;
          if (c.t <= 0) { c.st = 'walk'; s.mugs.push({ lane: c.lane, x: c.x + 14, full: false }); }
        }
      }
      s.cust = s.cust.filter(c => !c.gone);
      for (const m of s.mugs) {
        if (m.full) {
          m.x -= beerV * dt;
          let tgt = null;
          for (const c of s.cust) if (c.lane === m.lane && c.st === 'walk' && c.x + 16 >= m.x && (!tgt || c.x > tgt.x)) tgt = c;
          if (tgt) { m.dead = true; tgt.st = 'push'; tgt.tx = tgt.x - s.len * 0.34; g.addScore(25); Arcade.sfx.pop(); g.burst(m.x, s.ly(m.lane) - 14, { n: 8, color: ['#fff', '#ffe8a3'], speed: 110, size: 3 }); continue; }
          if (m.x < s.x0 - 6) { lose(g, s.x0, m.lane, '💥'); return; }
        } else {
          m.x += mugV * dt;
          if (m.x >= s.x1 - 14) {
            if (s.lane === m.lane) { m.dead = true; g.addScore(15, s.x1, s.ly(m.lane) - 20); Arcade.tone(700, 0.05, 'square', 0.05); }
            else { lose(g, s.x1, m.lane, '💥'); return; }
          }
        }
      }
      s.mugs = s.mugs.filter(m => !m.dead);
      if (s.spawned >= s.total && !s.cust.length && !s.mugs.length) {
        g.addScore(200 * g.level, g.W / 2, g.H / 2); Arcade.sfx.win();
        g.level++; g.hud(); g.message('¡Ronda ' + g.level + '!', 1.4); startWave(g); s.spawnT = 1.8; g.flash('#f9c74f', 0.25); g.burst(g.W / 2, g.H / 2, { n: 20, emoji: ['🍺', '🎉', '⭐'], size: 18, speed: 240 });
      }
    },
    draw(g, ctx) {
      const s = g.s, W = g.W, H = g.H;
      ctx.fillStyle = '#4a2511'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,.035)';
      for (let x = 0; x < W; x += 26) ctx.fillRect(x, 0, 12, H);
      if (!s.cust) return;
      for (let i = 0; i < NL; i++) {
        const y = s.ly(i) - s.lh * 0.6;
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, y + 14, W, 4);
        for (let x = 60, k = 0; x < W - 70; x += 36, k++) Arcade.emoji(ctx, ['🍾', '🍷', '🥃', '🍶', '🧉'][(k + i) % 5], x, y + 2, 18, { alpha: 0.3 });
        Arcade.glow(ctx, W * 0.5, s.ly(i) - s.lh * 0.45, s.lh * 0.7, 'rgba(255,200,120,.35)', 0.5 + Math.sin(g.t * 3 + i) * 0.05);
      }
      Arcade.amb(g, ctx);
      for (let i = 0; i < NL; i++) {
        const y = s.ly(i), sel = s.lane === i;
        Arcade.emoji(ctx, '🚪', 20, y - 14, 34);
        ctx.fillStyle = 'rgba(0,0,0,.35)'; Arcade.rr(ctx, s.x0 - 4, y + 2, s.len + 8, 18, 6); ctx.fill();
        const wg = ctx.createLinearGradient(0, y - 6, 0, y + 14);
        wg.addColorStop(0, sel ? '#e9a15b' : '#c47a3d'); wg.addColorStop(1, '#7a4419');
        ctx.fillStyle = wg; Arcade.rr(ctx, s.x0 - 4, y - 6, s.len + 8, 16, 6); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(s.x0, y - 5, s.len, 2);
        Arcade.emoji(ctx, '🛢️', W - 18, y - 6, 26);
      }
      for (const c of s.cust) {
        const y = s.ly(c.lane) - 26, bob = c.st === 'walk' && c.ph % 1.4 < 0.8 ? Math.abs(Math.sin(c.ph * 12)) * 3 : 0;
        Arcade.emoji(ctx, c.e, c.x, y - bob, 34);
        if (c.st === 'drink') Arcade.emoji(ctx, '🍺', c.x + 14, y + 4, 18, { rot: -0.6 });
        if (c.st === 'push') Arcade.emoji(ctx, '😋', c.x + 16, y - 18, 14);
      }
      for (const m of s.mugs) {
        const y = s.ly(m.lane) - 12;
        if (m.full) Arcade.emoji(ctx, '🍺', m.x, y, 24);
        else {
          ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2;
          Arcade.rr(ctx, m.x - 7, y - 10, 13, 18, 3); ctx.stroke();
          ctx.beginPath(); ctx.arc(m.x + 8, y - 1, 4, -1.2, 1.2); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(m.x - 6, y + 2, 11, 5);
        }
      }
      Arcade.emoji(ctx, '🤵', s.x1 + 22, s.ly(s.lane) - 24, 40);
      Arcade.txt(ctx, '🧍 ' + Math.max(0, s.total - s.spawned + s.cust.length), W / 2, g.top + 8, 13, '#ffe8c2', 'center', 800, 'rgba(0,0,0,.4)');
    },
  });
})();
