// Ranas|#123524
(function () {
  const { clamp } = Arcade;
  // tableros: lista de casillas [x, y]; 1 = rana (va a la derecha/abajo), 2 = tortuga (izquierda/arriba), 0 = vacía
  function line(n) { const cells = [], st = []; for (let i = 0; i < 2 * n + 1; i++) { cells.push([i, 0]); st.push(i < n ? 1 : i > n ? 2 : 0); } return { cells, st, name: [n + ' + ' + n, n + ' + ' + n] }; }
  function squares(k) { // dos cuadrados k×k que comparten una esquina (Fore and Aft)
    const cells = [], st = [];
    for (let y = 0; y < 2 * k - 1; y++) for (let x = 0; x < 2 * k - 1; x++) { const a = x < k && y < k, b = x >= k - 1 && y >= k - 1; if (!a && !b) continue; cells.push([x, y]); st.push(x === k - 1 && y === k - 1 ? 0 : a ? 1 : 2); }
    return { cells, st, name: ['Cuadrados ' + k + '×' + k, 'Squares ' + k + '×' + k] };
  }
  const ORDER = [() => line(1), () => line(2), () => line(3), () => line(4), () => line(5), () => squares(3), () => line(6), () => line(7), () => line(8)];
  function moves(b, st) {
    const out = [];
    st.forEach((v, i) => {
      if (!v) return; const [x, y] = b.cells[i], dirs = v === 1 ? [[1, 0], [0, 1]] : [[-1, 0], [0, -1]];
      for (const [dx, dy] of dirs) {
        const a = b.at(x + dx, y + dy); if (a < 0) continue;
        if (st[a] === 0) out.push({ i, to: a, jump: false });
        else { const c = b.at(x + 2 * dx, y + 2 * dy); if (c >= 0 && st[c] === 0) out.push({ i, to: c, jump: true }); }
      }
    });
    return out;
  }
  function mk(def) { const m = new Map(def.cells.map(([x, y], i) => [x + ',' + y, i])); return { ...def, at: (x, y) => (m.has(x + ',' + y) ? m.get(x + ',' + y) : -1) }; }
  const goalOf = (st) => st.map((v) => (v === 1 ? 2 : v === 2 ? 1 : 0)).join('');
  function bfs(b, st0) {
    const goal = goalOf(b.st), prev = new Map([[st0.join(''), null]]), q = [st0]; let h = 0;
    while (h < q.length) {
      const st = q[h++], k = st.join('');
      if (k === goal) { const path = []; let c = k; while (prev.get(c)) { const p = prev.get(c); path.unshift(p.m); c = p.from; } return path; }
      for (const m of moves(b, st)) { const ns = st.slice(); ns[m.to] = ns[m.i]; ns[m.i] = 0; const nk = ns.join(''); if (prev.has(nk)) continue; prev.set(nk, { from: k, m }); q.push(ns); }
    }
    return null;
  }
  function geo(g) {
    const s = g.s, xs = s.b.cells.map((c) => c[0]), ys = s.b.cells.map((c) => c[1]), w = Math.max(...xs) + 1, h = Math.max(...ys) + 1, Ha = g.bot - g.top - 110;
    s.cs = Math.min((g.W - 20) / w, Ha / h, 90); s.ox = (g.W - s.cs * w) / 2; s.oy = g.top + 90 + (Ha - s.cs * h) / 2;
    s.btn = [{ k: 'undo', x: g.W / 2 - 110, y: g.top + 40, w: 100, h: 34, instant: true }, { k: 'reset', x: g.W / 2 + 10, y: g.top + 40, w: 100, h: 34, instant: true }];
  }
  const XY = (s, i) => [s.ox + (s.b.cells[i][0] + 0.5) * s.cs, s.oy + (s.b.cells[i][1] + 0.5) * s.cs];
  function doMove(g, m) {
    const s = g.s; s.hist.push(s.st.slice()); s.anim = { m, t: 0, v: s.st[m.i] }; s.st[m.to] = s.st[m.i]; s.st[m.i] = 0; s.moves++; s.sel = null;
    Arcade.tone(m.jump ? 660 : 440, 0.07, 'triangle', 0.07, m.jump ? 300 : 0);
  }
  function landed(g) {
    const s = g.s; s.anim = null;
    if (s.st.join('') === goalOf(s.b.st)) {
      s.done = true; g.confetti(70); g.addScore(Math.max(50, (s.par * 2 - s.moves) * 15) * Math.max(1, Math.round(g.lv / 2)), g.W / 2, g.H / 2);
      setTimeout(() => { if (g.state === 'play') g.win(s.moves <= s.par && !s.undos ? 3 : s.moves <= s.par + 6 ? 2 : 1); }, 1000);
    } else if (!moves(s.b, s.st).length) g.message(Arcade.T('¡Atascadas!', 'Stuck!'), 1.4, Arcade.T('Deshaz o empieza otra vez', 'Undo or start again'));
  }
  function tapCell(g, i) {
    const s = g.s; if (s.done || s.anim || i < 0) return;
    const ms = moves(s.b, s.st);
    if (s.st[i]) { const mine = ms.filter((m) => m.i === i); if (mine.length === 1) return doMove(g, mine[0]); if (mine.length > 1) { s.sel = i; Arcade.tone(600, 0.04, 'square', 0.04); return; } Arcade.sfx.bad(); s.wob = { i, t: 0.4 }; return; }
    if (s.sel != null) { const m = ms.find((m) => m.i === s.sel && m.to === i); if (m) return doMove(g, m); }
    Arcade.sfx.bad();
  }
  function undo(g) { const s = g.s, h = s.hist.pop(); if (!h || s.done || s.anim) return; s.st = h; s.undos++; s.sel = null; Arcade.sfx.whoosh(); }
  function reset(g) { const s = g.s; if (s.done || s.anim || !s.hist.length) return; s.st = s.b.st.slice(); s.hist = []; s.undos++; s.sel = null; Arcade.sfx.whoosh(); }

  Arcade.game({
    /*THEME*/ home: 'indexpro.html', tag: 'Que cada una cruce al otro lado', deco: ['🐸', '🐢', '🌸', '💧', '🌿', '🏆'], font: 'comic', bg: ['#1e5b3a', '#123524'],
    music: { mode: 'major', bpm: 96, wave: 'triangle', style: 'chill', root: 62 }, voice: { wave: 'triangle', mul: 1.2, echo: 0.3 },
    /*EN*/ en: { title: 'Frogs', tag: 'Get everyone across', help: 'The frogs 🐸 and the turtles 🐢 want to <b>swap sides</b>. The frogs only go <b>right</b> (or down) and the turtles only go <b>left</b> (or up), never backwards. Each one can step onto the <b>empty</b> square next to it or <b>jump over</b> one animal into the empty square behind. <b>Tap</b> an animal to move it (if it has two options, then tap where). Later on come the two-square boards. "Best" shows the fewest moves.', tvHelp: 'D-pad to an animal · OK to move it.', dict: { '↩️ Deshacer': '↩️ Undo', '🔄 Reiniciar': '🔄 Restart', 'Movimientos: ': 'Moves: ', 'Mínimo: ': 'Best: ' } },
    /*TV*/ tvHelp: 'Cruceta hasta un animal · OK para moverlo.',
    tv: { mode: 'tap', targets: (g) => { const s = g.s; if (!s.b) return []; return s.b.cells.map((_, i) => { const [x, y] = XY(s, i); return { x: x - s.cs / 2, y: y - s.cs / 2, w: s.cs, h: s.cs }; }).concat(s.btn); } },
    id: 'ranas', title: 'Ranas', emoji: '🐸', color: '#69db7c', origin: 'Frogs / Fore and Aft (Lutanho)',
    help: 'Las ranas 🐸 y las tortugas 🐢 quieren <b>cambiarse de lado</b>. Las ranas solo van hacia la <b>derecha</b> (o hacia abajo) y las tortugas hacia la <b>izquierda</b> (o hacia arriba), nunca hacia atrás. Cada una puede pasar a la casilla <b>vacía</b> de al lado o <b>saltar por encima</b> de un animal a la vacía de detrás. <b>Toca</b> un animal para moverlo (si tiene dos opciones, toca luego dónde). Más adelante llegan los tableros de dos cuadrados. «Mínimo» te dice los movimientos justos.',
    lives: 0, levels: 0, cap: 9,
    quiz: { levels: 9, from: 4, count: 6, goal: (g) => ({ es: 'Cambia de lado ranas 🐸 y tortugas 🐢 en ' + g.s.par + ' saltos', en: 'Swap the frogs 🐸 and turtles 🐢 in ' + g.s.par + ' moves' }), par: (g) => g.s.par, moves: (g) => g.s.moves },
    /*SC*/ demo(g) {
      const s = g.s; if (s.done || s.anim) return { wait: 0.25 };
      if (!s.plan || s.planAt !== s.st.join('')) { s.plan = bfs(s.b, s.st) || []; }
      const m = s.plan[0]; if (!m) return { tap: [s.btn[1].x + 50, s.btn[1].y + 17], after: 0.4 };
      const opts = moves(s.b, s.st).filter((x) => x.i === m.i);
      if (opts.length > 1 && s.sel !== m.i) return { tap: XY(s, m.i), after: 0.2 };
      s.plan.shift(); const ns = s.st.slice(); ns[m.to] = ns[m.i]; ns[m.i] = 0; s.planAt = ns.join('');
      return { tap: opts.length > 1 ? XY(s, m.to) : XY(s, m.i), after: 0.35, say: s.moves ? null : Arcade.T('Avanza o salta, nunca hacia atrás', 'Step or jump, never backwards') };
    },
    setup(g) {
      const def = ORDER[clamp(g.lv, 1, ORDER.length) - 1](), b = mk(def);
      const path = bfs(b, b.st);
      g.s = { b, st: b.st.slice(), par: path.length, plan: path.slice(), planAt: b.st.join(''), moves: 0, undos: 0, hist: [], sel: null, anim: null, done: false };
      geo(g);
    },
    layout(g) { if (g.s.b) geo(g); },
    tap(g, p) {
      const s = g.s; for (const b of s.btn) if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b.k === 'undo' ? undo(g) : reset(g);
      const x = Math.floor((p.x - s.ox) / s.cs), y = Math.floor((p.y - s.oy) / s.cs); tapCell(g, s.b.at(x, y));
    },
    key(g, k, d) { if (d && (k === 'z' || k === 'Backspace')) undo(g); else if (d && k === 'r') reset(g); },
    update(g, dt) { const s = g.s; if (!s.b) return; if (s.anim) { s.anim.t += dt / (s.anim.m.jump ? 0.4 : 0.25); if (s.anim.t >= 1) landed(g); } if (s.wob) { s.wob.t -= dt; if (s.wob.t <= 0) s.wob = null; } },
    draw(g, ctx) {
      const s = g.s, W = g.W, H = g.H;
      const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1e5b3a'); bg.addColorStop(1, '#0b2618');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      if (!s.b) return;
      g.scenery(['🌿', '🪷', '💧'], 10, { alpha: 0.15, bob: 2 });
      const cs = s.cs, ms = s.done || s.anim ? [] : moves(s.b, s.st), can = new Set(ms.map((m) => m.i)), dest = new Set(ms.filter((m) => m.i === s.sel).map((m) => m.to));
      s.b.cells.forEach((_, i) => {
        const [x, y] = XY(s, i);
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 4, cs * 0.44, cs * 0.36, 0, 0, 6.3); ctx.fill();
        const gr = ctx.createRadialGradient(x - cs * 0.15, y - cs * 0.12, cs * 0.05, x, y, cs * 0.45); gr.addColorStop(0, '#8ce99a'); gr.addColorStop(1, '#2f9e44');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(x, y, cs * 0.44, cs * 0.36, 0, 0, 6.3); ctx.fill();   // nenúfar
        ctx.strokeStyle = '#1b4332'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + cs * 0.3, y - cs * 0.22); ctx.stroke();
        if (dest.has(i)) { ctx.strokeStyle = '#ffd43b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, cs * 0.46, cs * 0.38, 0, 0, 6.3); ctx.stroke(); }
      });
      s.st.forEach((v, i) => {
        if (!v || (s.anim && s.anim.m.to === i)) return; const [x, y] = XY(s, i);
        const sel = s.sel === i, bob = can.has(i) ? Math.abs(Math.sin(g.rt * 4 + i)) * cs * 0.04 : 0, wob = s.wob && s.wob.i === i ? Math.sin(s.wob.t * 40) * 4 : 0;
        Arcade.emojiTo(ctx, v === 1 ? '🐸' : '🐢', x + wob, y - bob - (sel ? cs * 0.1 : 0), cs * 0.7, v === 1 ? 1 : -1, 0, { mode: 'flip', alpha: can.has(i) || s.done ? 1 : 0.75 });
      });
      if (s.anim) { const a = s.anim, [x0, y0] = XY(s, a.m.i), [x1, y1] = XY(s, a.m.to), t = Math.min(1, a.t), hgt = (a.m.jump ? 0.7 : 0.25) * cs; Arcade.emojiTo(ctx, a.v === 1 ? '🐸' : '🐢', x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * hgt, cs * 0.7, x1 - x0 || (a.v === 1 ? 1 : -1), 0, { mode: 'flip' }); }
      for (const b of s.btn) { ctx.fillStyle = 'rgba(255,255,255,.12)'; Arcade.rr(ctx, b.x, b.y, b.w, b.h, 10); ctx.fill(); Arcade.txt(ctx, b.k === 'undo' ? '↩️ Deshacer' : '🔄 Reiniciar', b.x + b.w / 2, b.y + b.h / 2, 13, '#fff', 'center', 800); }
      Arcade.txt(ctx, 'Movimientos: ' + s.moves + '  ·  Mínimo: ' + s.par, W / 2, g.top + 18, 15, '#d3f9d8', 'center', 900);
    },
  });
})();
