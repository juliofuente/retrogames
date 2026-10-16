// Abalone|#14213d
(function () {
  const { rand, clamp, pick } = Arcade;
  const cfg = (L) => ({ need: L <= 3 ? 3 : L <= 8 ? 4 : 6, daisy: L >= 10 && L % 2 === 0, depth: L <= 5 ? 1 : 2, noise: clamp(0.5 - L * 0.025, 0.15, 0.5) });
  const DIR = [[1, -1, 0], [1, 0, -1], [0, 1, -1], [-1, 1, 0], [-1, 0, 1], [0, -1, 1]]; // d y d+3 son opuestas
  const CELLS = [], KEY = new Map();
  for (let z = -4; z <= 4; z++) for (let x = -4; x <= 4; x++) { const y = -x - z; if (Math.abs(y) > 4) continue; KEY.set(x + ',' + z, CELLS.length); CELLS.push([x, y, z]); }
  const NB = CELLS.map(([x, , z]) => DIR.map(([dx, , dz]) => KEY.get(x + dx + ',' + (z + dz)) ?? -1));
  const RING = CELLS.map(([x, y, z]) => Math.max(Math.abs(x), Math.abs(y), Math.abs(z)));
  const at = (x, z) => KEY.get(x + ',' + z);
  function start(daisy) {
    const b = new Array(CELLS.length).fill(0);
    if (!daisy) {
      CELLS.forEach(([x, , z], i) => { if (z === -4 || z === -3 || (z === -2 && x >= 0 && x <= 2)) b[i] = 2; if (z === 4 || z === 3 || (z === 2 && x >= -2 && x <= 0)) b[i] = 1; });
    } else {
      const flower = (cx, cz, who) => { const c = at(cx, cz); b[c] = who; for (const n of NB[c]) b[n] = who; };
      flower(-3, 3, 1); flower(3, -3, 1); flower(0, 3, 2); flower(0, -3, 2);
    }
    return b;
  }
  // grupos de 1 a 3 canicas propias en línea
  function groups(b, who) {
    const out = [];
    for (let i = 0; i < b.length; i++) {
      if (b[i] !== who) continue; out.push([i]);
      for (const d of [0, 1, 2]) { const j = NB[i][d]; if (j >= 0 && b[j] === who) { out.push([i, j]); const k = NB[j][d]; if (k >= 0 && b[k] === who) out.push([i, j, k]); } }
    }
    return out;
  }
  function axisOf(g) { if (g.length < 2) return -1; const d = NB[g[0]].indexOf(g[1]); return d % 3; }
  // devuelve {b, off, moved:[[from,to]], pushed:[[from,to|-1]]} o null
  function tryMove(b, g, d) {
    const who = b[g[0]], ax = axisOf(g);
    if (g.length === 1 || ax === d % 3) {
      // en línea: la cabeza es la canica más adelantada en esa dirección
      let head = g[0]; for (const c of g) { let k = c, ahead = false; for (let s = 0; s < 3; s++) { k = NB[k][d]; if (k < 0) break; if (g.includes(k)) { ahead = true; break; } } if (!ahead) head = c; }
      let nx = NB[head][d]; if (nx < 0 || b[nx] === who) return null;
      const nb = b.slice(), moved = [], pushed = []; let off = 0;
      if (b[nx] === 3 - who) {
        const opp = []; let c = nx; while (c >= 0 && b[c] === 3 - who) { opp.push(c); c = NB[c][d]; }
        if (opp.length >= g.length || (c >= 0 && b[c] === who)) return null;
        for (let k = opp.length - 1; k >= 0; k--) { const to = NB[opp[k]][d]; pushed.push([opp[k], to]); if (to < 0) off++; else nb[to] = 3 - who; nb[opp[k]] = 0; }
      }
      const order = g.slice().sort((p, q) => dist(q, head) - dist(p, head));
      for (const c of order.reverse()) { const to = NB[c][d]; moved.push([c, to]); }
      for (const c of g) nb[c] = 0; for (const [, to] of moved) nb[to] = who;
      return { b: nb, off, moved, pushed, inline: true, lead: NB[head][d] };
    }
    for (const c of g) { const t = NB[c][d]; if (t < 0 || b[t]) return null; }
    const nb = b.slice(), moved = g.map((c) => [c, NB[c][d]]); for (const c of g) nb[c] = 0; for (const [, t] of moved) nb[t] = who;
    return { b: nb, off: 0, moved, pushed: [], inline: false };
  }
  const dist = (a, c) => { const p = CELLS[a], q = CELLS[c]; return Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2])); };
  function allMoves(b, who) { const out = []; for (const g of groups(b, who)) for (let d = 0; d < 6; d++) { const r = tryMove(b, g, d); if (r) out.push({ g, d, r }); } return out; }
  function evalB(b, who, offMe, offOp) {
    let v = (offOp - offMe) * 120;
    for (let i = 0; i < b.length; i++) {
      const p = b[i]; if (!p) continue; const sg = p === who ? 1 : -1;
      let coh = 0; for (const n of NB[i]) if (n >= 0 && b[n] === p) coh++;
      v += sg * (-RING[i] * 3 + coh * 0.8 - (RING[i] === 4 ? 4 : 0));
    }
    return v;
  }
  function search(b, who, depth, off, need) {
    const ms = allMoves(b, who); let best = -1e9, bm = null;
    for (const m of ms) {
      const o2 = { ...off }; o2[3 - who] += m.r.off; let v;
      if (o2[3 - who] >= need) v = 1e5;
      else if (depth <= 1) v = evalB(m.r.b, who, o2[who], o2[3 - who]);
      else { let worst = 1e9; for (const m2 of allMoves(m.r.b, 3 - who)) { const o3 = { ...o2 }; o3[who] += m2.r.off; const w = o3[who] >= need ? -1e5 : evalB(m2.r.b, who, o3[who], o3[3 - who]); if (w < worst) worst = w; if (worst <= -1e5) break; } v = worst === 1e9 ? evalB(m.r.b, who, o2[who], o2[3 - who]) : worst; }
      v += Math.random() * 0.5; if (v > best) { best = v; bm = m; }
    }
    return bm;
  }
  function geo(g) { const s = g.s, Ha = g.bot - g.top - 100; s.cs = Math.min((g.W - 16) / 9.6, Ha / 8.6, 70); s.ox = g.W / 2; s.oy = g.top + 80 + Ha / 2; }
  const XY = (s, i) => { const [x, , z] = CELLS[i]; return [s.ox + (x + z / 2) * s.cs, s.oy + z * 0.866 * s.cs]; };
  const offXY = (s, i, d) => { const [x, y] = XY(s, i), [dx, , dz] = DIR[d]; return [x + (dx + dz / 2) * s.cs, y + dz * 0.866 * s.cs]; };
  function cellAt(s, x, y) { let bi = -1, bd = s.cs * 0.5; for (let i = 0; i < CELLS.length; i++) { const [cx, cy] = XY(s, i), d = Math.hypot(cx - x, cy - y); if (d < bd) { bd = d; bi = i; } } return bi; }
  function marble(ctx, x, y, r, who, a) {
    ctx.save(); ctx.globalAlpha = a ?? 1;
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(x + 1, y + r * 0.35, r * 0.95, r * 0.7, 0, 0, 6.3); ctx.fill();
    const c = who === 1 ? ['#ffffff', '#e9ecef', '#adb5bd'] : ['#868e96', '#343a40', '#0b0d10'];
    const gr = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r); gr.addColorStop(0, c[0]); gr.addColorStop(0.6, c[1]); gr.addColorStop(1, c[2]);
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.42, r * 0.22, r * 0.13, -0.6, 0, 6.3); ctx.fill();
    ctx.restore();
  }
  // marcas de destino para la selección actual
  function markers(s) {
    if (!s.sel.length) return [];
    const out = []; for (let d = 0; d < 6; d++) { const r = tryMove(s.b, s.sel, d); if (!r) continue; const lead = r.inline ? r.lead : NB[s.sel[0]][d]; out.push({ cell: lead, d, r }); }
    return out;
  }
  function lineBetween(s, a, c) { // a y c propias, en línea, a 1 o 2 pasos
    for (let d = 0; d < 6; d++) { const m = NB[a][d]; if (m === c) return [a, c]; if (m >= 0 && s.b[m] === 1 && NB[m][d] === c) return [a, m, c]; }
    return null;
  }
  function play(g, mv, who) {
    const s = g.s; s.anim = { mv, who, t: 0 }; s.sel = [];
    Arcade.tone(who === 1 ? 400 : 300, 0.06, 'triangle', 0.06); if (mv.r.pushed.length) Arcade.tone(180, 0.1, 'square', 0.05);
  }
  function animDone(g) {
    const s = g.s, a = s.anim; s.anim = null; s.b = a.mv.r.b; s.plies++;
    if (a.mv.r.off) { s.off[3 - a.who] += a.mv.r.off; const [from, , ] = a.mv.r.pushed.find((p) => p[1] < 0) || []; const [x, y] = from != null ? XY(s, from) : [g.W / 2, g.H / 2]; g.burst(x, y, { n: 18, color: a.who === 1 ? ['#343a40', '#868e96'] : ['#fff', '#dee2e6'], speed: 220 }); g.shake && g.shake(5); Arcade.sfx.pop(); if (a.who === 1) { g.addScore(150 * Math.max(1, Math.round(g.lv / 2)), x, y); g.float(Arcade.T('¡Fuera!', 'Out!'), x, y - 24, '#ffd43b', 22); } }
    else if (a.who === 1 && a.mv.r.pushed.length) g.addScore(20, ...XY(s, a.mv.r.moved[a.mv.r.moved.length - 1][1]));
    if (s.off[2] >= s.need) return finish(g, true);
    if (s.off[1] >= s.need) return finish(g, false);
    if (s.plies >= 160) { if (s.off[2] > s.off[1]) return finish(g, true); if (s.off[1] > s.off[2]) return finish(g, false); s.done = true; g.message(Arcade.T('Empate: otra vez', 'Draw: again'), 1.3); setTimeout(() => { if (g.state === 'play') Arcade.current.def.setup(g); }, 1500); return; }
    s.turn = 3 - a.who; if (s.turn === 2) s.think = rand(0.35, 0.7);
  }
  function finish(g, iWin) {
    const s = g.s; s.done = true;
    if (iWin) { g.confetti(90); g.addScore(500 * g.lv, g.W / 2, g.H / 2); const st = s.off[1] === 0 ? 3 : s.off[1] <= s.need / 2 ? 2 : 1; setTimeout(() => { if (g.state === 'play') g.win(st); }, 1400); }
    else { g.message(Arcade.T('La máquina te ha echado ' + s.need, 'The machine pushed out ' + s.need), 1.5); setTimeout(() => { if (g.state === 'play' && g.die()) Arcade.current.def.setup(g); }, 1900); }
  }
  function tapCell(g, i) {
    const s = g.s; if (s.done || s.turn !== 1 || s.anim) return;
    if (i < 0) { s.sel = []; return; }
    const mk = markers(s).find((m) => m.cell === i); if (mk) { play(g, { g: s.sel, d: mk.d, r: mk.r }, 1); return; }
    if (s.b[i] !== 1) { s.sel = []; return; }
    if (s.sel.includes(i)) { s.sel = []; return; }
    if (s.sel.length === 1) { const ln = lineBetween(s, s.sel[0], i); if (ln) { s.sel = ln; Arcade.tone(700, 0.04, 'square', 0.04); return; } }
    s.sel = [i]; Arcade.tone(600, 0.04, 'square', 0.04);
  }

  Arcade.game({
    /*THEME*/ home: 'indexpro.html', tag: 'Empuja las canicas rivales fuera del tablero', deco: ['⚪', '⚫', '💥', '🎯', '🏆', '🧠'], font: 'round', bg: ['#22345c', '#14213d'],
    music: { mode: 'dorian', bpm: 96, wave: 'triangle', style: 'arcade', root: 50 }, voice: { wave: 'sine', mul: 1, echo: 0.3 },
    /*EN*/ en: { title: 'Abalone', tag: 'Push your rival\'s marbles off the board', help: 'You are white. Each turn move <b>1, 2 or 3</b> of your marbles in a line one step. <b>Tap</b> a marble to choose it; tap another one of yours in the same line to choose the whole row; then tap one of the lit dots to move. Moving along their line, your marbles can <b>push</b> the machine\'s if you have more (3 against 2, 3 against 1 or 2 against 1) and there is room behind or the edge. <b>Push out</b> the marbles shown at the top to win (3, 4 or 6 depending on the level). Some levels start in the “daisy” position.', tvHelp: 'D-pad to a marble · OK · (another one to make a row) · then to a lit dot · OK.', dict: { 'Tu turno': 'Your turn', 'Pensando…': 'Thinking…', 'Echa ': 'Push out ', 'Fuera: ': 'Out: ', 'Toca otra en línea o un punto': 'Tap another in line or a dot' } },
    /*TV*/ tvHelp: 'Cruceta hasta una canica · OK · (otra para hacer fila) · luego a un punto iluminado · OK.',
    tv: { mode: 'tap', targets: (g) => { const s = g.s; if (!s.b || s.turn !== 1) return []; const set = new Set(); s.b.forEach((v, i) => { if (v === 1) set.add(i); }); for (const m of markers(s)) set.add(m.cell); return [...set].map((i) => { const [x, y] = XY(s, i); return { x: x - s.cs * 0.45, y: y - s.cs * 0.45, w: s.cs * 0.9, h: s.cs * 0.9 }; }); } },
    id: 'abalone', title: 'Abalone', emoji: '⚫', color: '#adb5bd', origin: 'Abalone (Michel Lalet & Laurent Lévi) (Lutanho)',
    help: 'Eres las blancas. En cada turno mueves <b>1, 2 o 3</b> canicas tuyas en línea un paso. <b>Toca</b> una canica para elegirla; toca otra tuya en la misma línea para elegir la fila entera; luego toca uno de los puntos iluminados para moverte. Si avanzan a lo largo de su línea, tus canicas pueden <b>empujar</b> a las de la máquina cuando sois más (3 contra 2, 3 contra 1 o 2 contra 1) y hay hueco detrás o el borde. <b>Echa fuera</b> las canicas que marca arriba para ganar (3, 4 o 6 según el nivel). Algunos niveles empiezan con la posición de las “margaritas”.',
    lives: 3, levels: 0, cap: 20,
    /*SC*/ demo(g) {
      const s = g.s; if (s.done || s.turn !== 1 || s.anim) return { wait: 0.3 };
      if (!s.botMv) { s.botMv = search(s.b, 1, 2, s.off, s.need); if (!s.botMv) return { wait: 0.3 }; s.sel = []; }
      const m = s.botMv, want = m.g;
      if (s.sel.length !== want.length || !want.every((c) => s.sel.includes(c))) {
        if (!s.sel.length || s.sel.length > 1 || s.sel[0] !== want[0]) { s.sel = []; return { tap: XY(s, want[0]), after: 0.25, say: s.plies ? null : Arcade.T('Empuja cuando seas más', 'Push when you outnumber them') }; }
        return { tap: XY(s, want[want.length - 1]), after: 0.25 };
      }
      const mk = markers(s).find((k) => k.d === m.d); s.botMv = null; if (!mk) return { wait: 0.2 };
      return { tap: XY(s, mk.cell), after: 0.4 };
    },
    setup(g) {
      const o = cfg(g.lv);
      g.s = { b: start(o.daisy), need: o.need, depth: o.depth, noise: o.noise, off: { 1: 0, 2: 0 }, turn: 1, sel: [], anim: null, done: false, think: 0, plies: 0, botMv: null, hv: -1 };
      geo(g); g.message('Echa ' + o.need, 1.2);
    },
    layout(g) { if (g.s.b) geo(g); },
    hover(g, x, y) { if (g.s.b) g.s.hv = cellAt(g.s, x, y); },
    tap(g, p) { tapCell(g, cellAt(g.s, p.x, p.y)); },
    update(g, dt) {
      const s = g.s; if (!s.b) return;
      if (s.anim) { s.anim.t += dt / 0.3; if (s.anim.t >= 1) animDone(g); return; }
      if (s.turn === 2 && !s.done) {
        s.think -= dt; if (s.think > 0) return;
        let m; if (Math.random() < s.noise) { m = pick(allMoves(s.b, 2)); const sm = search(s.b, 2, 1, s.off, s.need); if (sm && sm.r.off) m = sm; }
        else m = search(s.b, 2, s.depth, s.off, s.need);
        if (m) play(g, m, 2); else s.turn = 1;
      }
    },
    draw(g, ctx) {
      const s = g.s, W = g.W, H = g.H;
      const bg = ctx.createRadialGradient(W / 2, H / 2, 30, W / 2, H / 2, Math.max(W, H) * 0.75); bg.addColorStop(0, '#2c4377'); bg.addColorStop(1, '#0b1224'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      if (!s.b) return;
      const cs = s.cs, R = cs * 5.1;
      const hex = (rr, col) => { ctx.fillStyle = col; ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; ctx.lineTo(s.ox + Math.cos(a) * rr, s.oy + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); };
      ctx.save(); ctx.translate(3, 6); hex(R, 'rgba(0,0,0,.4)'); ctx.restore(); hex(R, '#8a5a2e'); hex(R * 0.93, '#a8733f');
      const mks = s.turn === 1 && !s.anim && !s.done ? markers(s) : [], mset = new Map(mks.map((m) => [m.cell, m]));
      for (let i = 0; i < CELLS.length; i++) { const [x, y] = XY(s, i); ctx.fillStyle = '#6b4220'; ctx.beginPath(); ctx.arc(x, y, cs * 0.42, 0, 6.3); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(x, y + 2, cs * 0.36, 0, 6.3); ctx.fill(); }
      const a = s.anim, moving = new Map(); if (a) { for (const [f, t] of a.mv.r.moved) moving.set(f, [t, a.who]); for (const [f, t] of a.mv.r.pushed) moving.set(f, [t, 3 - a.who, true]); }
      const r = cs * 0.44;
      for (let i = 0; i < CELLS.length; i++) {
        const v = s.b[i]; if (!v || moving.has(i)) continue; const [x, y] = XY(s, i), sel = s.sel.includes(i);
        marble(ctx, x, y - (sel ? 4 + Math.sin(g.rt * 8) * 2 : 0), r, v);
        if (sel) { ctx.strokeStyle = '#ffd43b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - 4, r + 2, 0, 6.3); ctx.stroke(); }
      }
      if (a) {
        const t = Math.min(1, a.t), e = t * t * (3 - 2 * t);
        for (const [f, [to, who, pushed]] of moving) { const [x0, y0] = XY(s, f); let x1, y1, al = 1; if (to < 0) { [x1, y1] = offXY(s, f, a.mv.d); al = 1 - t; } else [x1, y1] = XY(s, to); marble(ctx, x0 + (x1 - x0) * e, y0 + (y1 - y0) * e + (to < 0 ? t * t * cs : 0), r * (to < 0 ? 1 - t * 0.4 : 1), who, al); void pushed; }
      }
      for (const m of mks) { const [x, y] = XY(s, m.cell), push = s.b[m.cell] === 2; ctx.fillStyle = push ? 'rgba(255,107,107,' + (0.55 + 0.25 * Math.sin(g.rt * 7)) + ')' : 'rgba(105,219,124,' + (0.6 + 0.25 * Math.sin(g.rt * 7)) + ')'; ctx.beginPath(); ctx.arc(x, y, cs * (m.cell === s.hv ? 0.22 : 0.16), 0, 6.3); ctx.fill(); if (push) { ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r + 3, 0, 6.3); ctx.stroke(); } }
      // marcador: canicas echadas
      const msg = s.done ? '' : s.turn === 1 ? (s.sel.length === 1 ? 'Toca otra en línea o un punto' : 'Tu turno') : 'Pensando…';
      Arcade.txt(ctx, msg, W / 2, g.top + 22, 15, '#e7f5ff', 'center', 900);
      const sr = Math.min(9, (W - 60) / 30);
      for (let k = 0; k < s.need; k++) { marble(ctx, W / 2 - 16 - k * (sr * 2.3) - sr, g.top + 48, sr, 2, k < s.off[2] ? 1 : 0.18); marble(ctx, W / 2 + 16 + k * (sr * 2.3) + sr, g.top + 48, sr, 1, k < s.off[1] ? 1 : 0.18); }
      Arcade.txt(ctx, 'vs', W / 2, g.top + 48, 11, '#a5d8ff', 'center', 800);
    },
  });
})();
