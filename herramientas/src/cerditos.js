// Cerditos|#1b4332
(function () {
  const { rand, clamp, dist, pick } = Arcade;
  const BAL = ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7', '#da77f2', '#ff922b'];

  function geo(g) {
    const s = g.s;
    s.ropeX = g.W - 40; s.ladX = g.W - 92; s.ground = g.bot - 24;
    s.yMin = g.top + 70; s.yMax = s.ground - 40;
    s.by = clamp(s.by || (s.yMin + s.yMax) / 2, s.yMin, s.yMax);
  }
  function spawn(g) {
    const s = g.s;
    s.wolves.push({ x: rand(30, s.ladX - 90), y: g.top + 40, vy: rand(34, 52) + g.level * 4, ph: rand(0, 6), st: 'float', col: pick(BAL) });
    s.spawned++;
  }

  Arcade.game({
    id: 'cerditos', title: 'Cerditos', emoji: '🐷', color: '#ff8fab', origin: 'Pooyan (Konami, 1982)',
    help: 'Mamá cerdita sube y baja en un ascensor. <b>Arrastra arriba o abajo</b> para moverla y <b>toca</b> para disparar flechas. Los lobos 🐺 bajan colgados de globos: <b>revienta el globo</b> para que caigan (darle al lobo no sirve). Si un lobo llega al suelo, trepa por la escalera y te muerde si pasas a su altura. Si llegan 4 a la escalera, pierdes una vida.',
    lives: 3, levels: 10, levelLabel: 'Oleada',
    setup(g) {
      g.s = { wolves: [], arrows: [], spawned: 0, spawnT: 1, cool: 0, inv: 1, by: 0 };
      const s = g.s; geo(g);
      s.total = 10 + g.level * 3;
    },
    layout(g) { if (g.s.wolves) geo(g); },
    down(g, p) { const s = g.s; if (s.dragId != null && g.pointers.has(s.dragId) && s.dragId !== p.id) return; s.dragId = p.id; s.ty = s.by; s.dragFrom = p.y; s.baseY = s.by; },
    move(g, p) { const s = g.s; if (p.id !== s.dragId) return; s.ty = clamp(s.baseY + (p.y - s.dragFrom), s.yMin, s.yMax); },
    tap(g) {
      const s = g.s; if (s.cool > 0 || s.arrows.length >= 3) return;
      s.cool = 0.28; s.arrows.push({ x: s.ropeX - 26, y: s.by - 4 }); Arcade.tone(700, 0.05, 'triangle', 0.07, -300);
    },
    key(g, k, d) { const s = g.s; if (k === 'ArrowUp') s.kd = d ? -1 : 0; else if (k === 'ArrowDown') s.kd = d ? 1 : 0; else if (k === ' ' && d) this.tap(g); },
    update(g, dt) {
      const s = g.s;
      s.cool -= dt; s.inv = Math.max(0, s.inv - dt);
      if (s.kd) s.ty = clamp(s.by + s.kd * 40, s.yMin, s.yMax);
      if (s.ty != null) s.by += clamp(s.ty - s.by, -420 * dt, 420 * dt);
      s.spawnT -= dt;
      if (s.spawned < s.total && s.spawnT <= 0) { s.spawnT = Math.max(0.55, 1.7 - g.level * 0.1) * rand(0.6, 1.3); spawn(g); }
      for (const a of s.arrows) {
        a.x -= 560 * dt;
        for (const w of s.wolves) {
          if (w.st === 'float' && dist(a.x, a.y, w.x, w.y - 30) < 17) { w.st = 'fall'; w.vy = 60; a.dead = true; g.addScore(50 * g.level, w.x, w.y - 40); Arcade.sfx.pop(); g.burst(w.x, w.y - 30, { n: 8, color: w.col, speed: 140, size: 3 }); break; }
          if (w.st === 'climb' && Math.abs(a.x - w.x) < 18 && Math.abs(a.y - w.y) < 20) { w.st = 'fall'; w.vy = 0; a.dead = true; g.addScore(150, w.x, w.y - 20); Arcade.sfx.pop(); break; }
          if (w.st === 'float' && dist(a.x, a.y, w.x, w.y) < 14) { a.dead = true; Arcade.tone(200, 0.04, 'square', 0.05); break; }
        }
        if (a.x < -10) a.dead = true;
      }
      s.arrows = s.arrows.filter(a => !a.dead);
      let climbers = 0;
      for (const w of s.wolves) {
        if (w.st === 'float') {
          w.ph += dt; w.y += w.vy * dt; w.x += Math.sin(w.ph * 1.5) * 18 * dt;
          if (w.y >= s.ground) { w.y = s.ground; w.st = 'walk'; }
        } else if (w.st === 'fall') {
          w.vy += 900 * dt; w.y += w.vy * dt; w.rot = (w.rot || 0) + dt * 8;
          if (w.y > s.ground + 30) { w.dead = true; g.burst(w.x, s.ground, { n: 6, emoji: '💫', size: 12, speed: 90 }); }
        } else if (w.st === 'walk') {
          w.x += 90 * dt;
          if (w.x >= s.ladX) { w.x = s.ladX; w.st = 'climb'; w.ty = rand(s.yMin + 10, s.yMax); Arcade.tone(160, 0.2, 'sawtooth', 0.06, 80); }
        } else if (w.st === 'climb') {
          climbers++;
          if (w.y > w.ty) w.y -= 50 * dt;
          if (s.inv <= 0 && Math.abs(w.y - s.by) < 26) {
            w.dead = true; g.burst(s.ropeX - 20, s.by, { n: 16, color: ['#ff8fab', '#fff'], speed: 200 });
            if (g.die()) { s.inv = 1.5; } return;
          }
        }
      }
      s.wolves = s.wolves.filter(w => !w.dead);
      if (climbers >= 4) {
        s.wolves = s.wolves.filter(w => w.st !== 'climb');
        g.message('¡Demasiados lobos!', 1.3); if (g.die()) s.inv = 1.5; return;
      }
      if (s.spawned >= s.total && !s.wolves.length) { g.addScore(500 * g.level, g.W / 2, g.H / 2); g.win(); }
    },
    draw(g, ctx) {
      const s = g.s, W = g.W, H = g.H;
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#74c0fc'); bg.addColorStop(1, '#d3f9d8');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      if (!s.wolves) return;
      // árbol / acantilado de los lobos
      ctx.fillStyle = '#2b8a3e'; ctx.beginPath(); ctx.ellipse(W * 0.3, g.top + 20, W * 0.42, 40, 0, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#5c940d'; ctx.fillRect(0, s.ground, W, H - s.ground);
      // acantilado y escalera
      ctx.fillStyle = '#8d6e63'; ctx.fillRect(s.ladX + 14, s.yMin - 40, W - s.ladX - 14, s.ground - s.yMin + 40);
      ctx.strokeStyle = '#6d4c41'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(s.ladX - 10, s.yMin - 10); ctx.lineTo(s.ladX - 10, s.ground); ctx.moveTo(s.ladX + 10, s.yMin - 10); ctx.lineTo(s.ladX + 10, s.ground);
      for (let y = s.yMin; y < s.ground; y += 18) { ctx.moveTo(s.ladX - 10, y); ctx.lineTo(s.ladX + 10, y); }
      ctx.stroke();
      // polea y cuerda
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.ropeX, s.yMin - 50); ctx.lineTo(s.ropeX, s.by - 22); ctx.stroke();
      ctx.fillStyle = '#495057'; ctx.beginPath(); ctx.arc(s.ropeX, s.yMin - 50, 8, 0, 6.28); ctx.fill();
      // cesta
      ctx.fillStyle = '#b08968'; Arcade.rr(ctx, s.ropeX - 26, s.by - 6, 52, 30, 6); ctx.fill();
      ctx.strokeStyle = '#7f5539'; ctx.lineWidth = 2; for (let x = -20; x <= 20; x += 10) { ctx.beginPath(); ctx.moveTo(s.ropeX + x, s.by - 6); ctx.lineTo(s.ropeX + x, s.by + 24); ctx.stroke(); }
      if (!(s.inv > 0 && Math.floor(g.t * 10) % 2)) Arcade.emoji(ctx, '🐷', s.ropeX, s.by - 18, 38);
      Arcade.emoji(ctx, '🏹', s.ropeX - 26, s.by - 6, 22, { flip: true });
      for (const a of s.arrows) { ctx.strokeStyle = '#343a40'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + 22, a.y); ctx.stroke(); ctx.fillStyle = '#343a40'; ctx.beginPath(); ctx.moveTo(a.x - 6, a.y); ctx.lineTo(a.x + 2, a.y - 4); ctx.lineTo(a.x + 2, a.y + 4); ctx.fill(); }
      for (const w of s.wolves) {
        if (w.st === 'float') {
          ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(w.x, w.y - 16); ctx.lineTo(w.x, w.y - 18); ctx.stroke();
          const bg2 = ctx.createRadialGradient(w.x - 5, w.y - 36, 2, w.x, w.y - 30, 16);
          bg2.addColorStop(0, '#fff'); bg2.addColorStop(0.3, w.col); bg2.addColorStop(1, w.col);
          ctx.fillStyle = bg2; ctx.beginPath(); ctx.ellipse(w.x, w.y - 30, 13, 16, 0, 0, 6.28); ctx.fill();
        }
        Arcade.emoji(ctx, '🐺', w.x, w.y, 30, { rot: w.rot || 0, flip: w.st === 'walk' || w.st === 'climb' });
      }
      const left = s.total - s.spawned + s.wolves.length;
      Arcade.txt(ctx, '🐺 ' + left, 16, g.top + 12, 15, '#1b4332', 'left', 900);
    },
  });
})();
