// Parejas|#1a1b3a
(function () {
  const { ri, pick, shuffle } = Arcade;
  const C = 8, R = 9;
  const TY = ['', '💎', '🍀', '🔥', '⭐', '🌙'];
  const TC = ['', '#74c0fc', '#69db7c', '#ff8787', '#ffd43b', '#b197fc'];

  function fallPass(a) {
    let moved = false;
    for (let r = R - 2; r >= 0; r--) for (let c = 0; c < C; c++) {
      const i = r * C + c, j = i + C;
      if (a[i] > 0 && a[j] === 0) { a[j] = a[i]; a[i] = 0; moved = true; }
    }
    return moved;
  }
  function matches(a) {
    const m = [];
    for (let i = 0; i < a.length; i++) {
      if (a[i] <= 0) continue;
      const c = i % C;
      if ((c > 0 && a[i - 1] === a[i]) || (c < C - 1 && a[i + 1] === a[i]) || a[i - C] === a[i] || a[i + C] === a[i]) m.push(i);
    }
    return m;
  }
  function settle(a) { for (;;) { while (fallPass(a)); const m = matches(a); if (!m.length) return; for (const i of m) a[i] = 0; } }
  function dead(a) { const cnt = {}; for (const v of a) if (v > 0) cnt[v] = (cnt[v] || 0) + 1; return Object.values(cnt).some(n => n === 1); }
  function empty(a) { return !a.some(v => v > 0); }
  function solve(start, maxStates) {
    const key = (a) => a.join(',');
    const seen = new Set([key(start)]);
    let frontier = [start], depth = 0;
    while (frontier.length && seen.size < maxStates) {
      depth++;
      const next = [];
      for (const a of frontier) {
        for (let i = 0; i < a.length; i++) {
          if (a[i] <= 0) continue;
          for (const d of [-1, 1]) {
            const c = i % C; if ((d < 0 && c === 0) || (d > 0 && c === C - 1) || a[i + d] !== 0) continue;
            const b = a.slice(); b[i + d] = b[i]; b[i] = 0; settle(b);
            if (empty(b)) return depth;
            if (dead(b)) continue;
            const k = key(b); if (seen.has(k)) continue;
            seen.add(k); next.push(b);
          }
        }
      }
      frontier = next;
    }
    return -1;
  }
  function genLevel(lv) {
    const t0 = performance.now(), want = Math.min(1 + Math.floor(lv / 2), 7);
    let best = null;
    for (let at = 0; at < 300 && performance.now() - t0 < 1400; at++) {
      const a = new Array(C * R).fill(0);
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (r === 0 || r === R - 1 || c === 0 || c === C - 1) a[r * C + c] = -1;
      const plats = 1 + Math.floor(lv / 4) + ri(0, 1);
      for (let k = 0; k < plats; k++) { const r = ri(3, R - 3), c = ri(1, C - 3), L = ri(1, 3); for (let x = c; x < Math.min(C - 1, c + L); x++) a[r * C + x] = -1; }
      const nt = Math.min(5, 2 + Math.floor((lv - 1) / 3));
      const blocks = [];
      for (let t = 1; t <= nt; t++) { const n = lv >= 5 && Math.random() < 0.3 ? 3 : 2; for (let k = 0; k < n; k++) blocks.push(t); }
      shuffle(blocks);
      let ok = true;
      for (const t of blocks) {
        const cols = []; for (let c = 1; c < C - 1; c++) if (a[C + c] === 0) cols.push(c);
        if (!cols.length) { ok = false; break; }
        const c = pick(cols); let r = 1; while (a[(r + 1) * C + c] === 0) r++;
        a[r * C + c] = t;
      }
      if (!ok || matches(a).length) continue;
      const m = solve(a, 25000);
      if (m < 0) continue;
      if (!best || Math.abs(m - want) < Math.abs(best.m - want)) best = { a, m };
      if (m >= want) break;
    }
    if (best) return best;
    const a = new Array(C * R).fill(0);
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (r === 0 || r === R - 1 || c === 0 || c === C - 1) a[r * C + c] = -1;
    a[(R - 2) * C + 2] = 1; a[(R - 2) * C + 5] = 1;
    return { a, m: 2 };
  }
  function geo(g) {
    const s = g.s, Wa = g.W - 24, Ha = g.bot - g.top - 120;
    s.cs = Math.min(Wa / C, Ha / R);
    s.ox = (g.W - s.cs * C) / 2; s.oy = g.top + 40 + (Ha - s.cs * R) / 2;
    s.btnY = s.oy + s.cs * R + 40;
  }
  function doMove(g, i, d) {
    const s = g.s, a = s.a, c = i % C;
    if (s.phase || a[i] <= 0 || (d < 0 && c === 0) || (d > 0 && c === C - 1) || a[i + d] !== 0) { Arcade.sfx.bad(); return; }
    s.hist.push(a.slice()); s.chain = 0;
    a[i + d] = a[i]; a[i] = 0; s.sel = i + d; s.moves++;
    s.phase = 'fall'; s.t = 0; Arcade.sfx.move();
  }
  const cellOf = (s, x, y) => { const c = Math.floor((x - s.ox) / s.cs), r = Math.floor((y - s.oy) / s.cs); return c >= 0 && c < C && r >= 0 && r < R ? r * C + c : -1; };

  Arcade.game({
    id: 'parejas', title: 'Parejas', emoji: '🧩', color: '#74c0fc', origin: 'Puzznic (Taito, 1989)',
    help: 'Cada nivel es un puzle. <b>Desliza</b> un bloque a la izquierda o la derecha (o tócalo y toca el hueco de al lado). Los bloques caen por gravedad y, cuando dos o más <b>iguales se tocan</b>, desaparecen. Limpia el tablero entero. Si te queda un bloque solo de un tipo, estás atascado: <b>deshaz</b> ↩️ o <b>reinicia</b> 🔄.',
    lives: 0, levels: Infinity,
    theme: { font: 'Comfortaa', ambient: 'sparkles', music: { tempo: 100, scale: 'penta', root: 262, wave: 'triangle', lead: 'sine', nodrums: true }, sfx: { wave: 'triangle', pitch: 1.1 } },
    setup(g) {
      const lv = genLevel(g.level);
      g.s = { a: lv.a.slice(), start: lv.a.slice(), par: lv.m, moves: 0, hist: [], sel: -1, phase: null, t: 0, flash: null };
      geo(g);
    },
    layout(g) { if (g.s.a) geo(g); },
    tap(g, p) {
      const s = g.s;
      if (p.y > s.btnY - 24 && p.y < s.btnY + 24) {
        if (p.x < g.W / 2) { if (s.hist.length && !s.phase) { s.a = s.hist.pop(); s.moves++; s.sel = -1; Arcade.sfx.tick(); } }
        else if (!s.phase) { s.a = s.start.slice(); s.hist = []; s.moves = 0; s.sel = -1; Arcade.sfx.tick(); }
        return;
      }
      const i = cellOf(s, p.x, p.y); if (i < 0) return;
      if (s.a[i] > 0) { s.sel = i; Arcade.sfx.tick(); return; }
      if (s.sel >= 0 && s.a[i] === 0 && Math.floor(i / C) === Math.floor(s.sel / C) && Math.abs(i - s.sel) === 1) doMove(g, s.sel, i - s.sel);
    },
    swipe(g, dir, p) {
      const s = g.s, i = cellOf(s, p.sx, p.sy);
      if (i < 0 || s.a[i] <= 0) return;
      if (dir === 'left') doMove(g, i, -1); else if (dir === 'right') doMove(g, i, 1);
    },
    key(g, k, d) {
      if (!d) return; const s = g.s;
      if (k === 'ArrowLeft' && s.sel >= 0) doMove(g, s.sel, -1); else if (k === 'ArrowRight' && s.sel >= 0) doMove(g, s.sel, 1);
      else if (k === 'z' && s.hist.length && !s.phase) { s.a = s.hist.pop(); s.moves++; }
    },
    update(g, dt) {
      const s = g.s;
      if (!s.phase) return;
      s.t += dt;
      if (s.phase === 'fall' && s.t > 0.055) {
        s.t = 0;
        const before = s.a.slice();
        if (!fallPass(s.a)) {
          const m = matches(s.a);
          if (m.length) { s.phase = 'flash'; s.flash = m; Arcade.sfx.coin(); }
          else {
            s.phase = null; s.sel = -1;
            if (empty(s.a)) { const bonus = Math.max(0, s.par * 2 - s.moves) * 60; g.addScore(500 + bonus + g.level * 50, g.W / 2, g.H / 2); g.win(); }
            else if (dead(s.a)) { g.message('Atascado', 1.6, 'Deshaz ↩️ o reinicia 🔄'); Arcade.sfx.bad(); }
          }
        } else if (s.sel >= 0 && before[s.sel] > 0 && s.a[s.sel] === 0) s.sel += C;
      } else if (s.phase === 'flash' && s.t > 0.35) {
        s.chain = (s.chain || 0) + 1; Arcade.sfx.combo(s.chain * 2);
        for (const i of s.flash) { const x = s.ox + (i % C + 0.5) * s.cs, y = s.oy + (Math.floor(i / C) + 0.5) * s.cs; g.burst(x, y, { n: 10, color: [TC[s.a[i]], '#fff'], speed: 170, size: 3 }); g.burst(x, y, { n: 2, emoji: TY[s.a[i]], size: 18, speed: 120, up: 80 }); g.ring(x, y, { color: TC[s.a[i]], r: s.cs, w: 4 }); s.a[i] = 0; }
        g.addScore(20 * s.flash.length);
        s.flash = null; s.phase = 'fall'; s.t = 0; s.sel = -1;
      }
    },
    draw(g, ctx) {
      const s = g.s, W = g.W, H = g.H;
      Arcade.bg(ctx, W, H, '#3b2f63', '#22244a', '#0c0d20');
      ctx.fillStyle = 'rgba(255,255,255,.035)'; for (let x = 0; x < W; x += 70) ctx.fillRect(x + 20, 0, 22, H);
      Arcade.decor(ctx, g.t, [{ e: '🏺', x: 22, y: H - 34, s: 34, a: 0.5 }, { e: '🏺', x: W - 22, y: H - 34, s: 34, a: 0.5 }, { e: '💎', x: W - 24, y: g.top + 22, s: 22, a: 0.5, bob: 4 }, { e: '🕯️', x: 22, y: g.top + 24, s: 22, a: 0.6 }]);
      Arcade.amb(g, ctx);
      if (!s.a) return;
      const cs = s.cs;
      for (let i = 0; i < s.a.length; i++) {
        const c = i % C, r = Math.floor(i / C), x = s.ox + c * cs, y = s.oy + r * cs, v = s.a[i];
        if (v === -1) {
          ctx.fillStyle = '#495057'; ctx.fillRect(x, y, cs + 0.5, cs + 0.5);
          ctx.fillStyle = '#5c636a'; ctx.fillRect(x + 2, y + 2, cs - 4, cs * 0.4);
          ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
          continue;
        }
        ctx.fillStyle = (r + c) % 2 ? '#1f2147' : '#23254f'; ctx.fillRect(x, y, cs + 0.5, cs + 0.5);
        if (v > 0) {
          const fl = s.flash && s.flash.includes(i) && Math.floor(s.t * 20) % 2;
          ctx.fillStyle = fl ? '#fff' : TC[v]; Arcade.rr(ctx, x + 3, y + 3, cs - 6, cs - 6, cs * 0.18); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.35)'; Arcade.rr(ctx, x + 6, y + 5, cs - 12, cs * 0.22, cs * 0.1); ctx.fill();
          Arcade.emoji(ctx, TY[v], x + cs / 2, y + cs / 2 + 1, cs * 0.55);
          if (i === s.sel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; Arcade.rr(ctx, x + 2, y + 2, cs - 4, cs - 4, cs * 0.2); ctx.stroke(); Arcade.txt(ctx, '◀   ▶', x + cs / 2, y - 8, 12, '#fff', 'center', 900); }
        }
      }
      Arcade.txt(ctx, 'Movimientos: ' + s.moves + '   ·   Mejor solución: ' + s.par, W / 2, s.oy - 20, 14, '#d0ebff', 'center', 800);
      [['↩️ Deshacer', W * 0.27], ['🔄 Reiniciar', W * 0.73]].forEach(([t, x]) => {
        ctx.fillStyle = 'rgba(255,255,255,.1)'; Arcade.rr(ctx, x - 70, s.btnY - 20, 140, 40, 14); ctx.fill();
        Arcade.txt(ctx, t, x, s.btnY, 15, '#fff', 'center', 800);
      });
    },
  });
})();
