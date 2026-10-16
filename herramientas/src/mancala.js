// Mancala|#3b1f0e
(function () {
  const { rand, clamp, pick } = Arcade;
  const ME = 6, CPU = 13, GEM = ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7', '#da77f2', '#ff922b', '#f8f9fa'];
  // nivel → [semillas por hoyo, profundidad, ruido]
  const cfg = (L) => [L <= 3 ? 3 : 4, clamp(1 + Math.floor(L / 3), 1, 5), clamp(0.5 - L * 0.05, 0.06, 0.5)];
  const mine = (i, who) => (who === 1 ? i >= 0 && i <= 5 : i >= 7 && i <= 12);
  // reparte las semillas del hoyo i; devuelve { b, again } (b es un tablero nuevo)
  function play(b0, i, who) {
    const b = b0.slice(); let n = b[i], k = i; b[i] = 0;
    while (n) { k = (k + 1) % 14; if (k === (who === 1 ? CPU : ME)) continue; b[k]++; n--; }
    let again = k === (who === 1 ? ME : CPU);
    if (!again && mine(k, who) && b[k] === 1 && b[12 - k] > 0) { b[who === 1 ? ME : CPU] += b[12 - k] + 1; b[k] = 0; b[12 - k] = 0; }
    finish(b);
    return { b, again, last: k };
  }
  function finish(b) {
    const a = b.slice(0, 6).reduce((x, y) => x + y, 0), c = b.slice(7, 13).reduce((x, y) => x + y, 0);
    if (a && c) return false;
    for (let i = 0; i < 6; i++) { b[ME] += b[i]; b[i] = 0; } for (let i = 7; i < 13; i++) { b[CPU] += b[i]; b[i] = 0; }
    return true;
  }
  const over = (b) => b.slice(0, 6).every((x) => !x) && b.slice(7, 13).every((x) => !x);
  const legal = (b, who) => (who === 1 ? [0, 1, 2, 3, 4, 5] : [7, 8, 9, 10, 11, 12]).filter((i) => b[i] > 0);
  function search(b, who, depth, a, bt) {
    if (!depth || over(b)) return [(b[CPU] - b[ME]) * (who === 2 ? 1 : -1), -1];
    let best = -1e9, mv = -1;
    for (const i of legal(b, who)) {
      const r = play(b, i, who);
      const v = r.again && !over(r.b) ? search(r.b, who, depth - 1, a, bt)[0] : -search(r.b, 3 - who, depth - 1, -bt, -a)[0];
      if (v > best) { best = v; mv = i; } if (v > a) a = v; if (a >= bt) break;
    }
    return [best, mv];
  }
  function geo(g) {
    const s = g.s, Ha = g.bot - g.top - 70; s.vert = g.W < g.H * 0.9;
    // 8 columnas × 2 filas (en vertical, girado: 2 columnas × 8 filas)
    if (s.vert) { s.cs = Math.min((g.W - 30) / 2.4, Ha / 8, 110); s.ox = (g.W - s.cs * 2) / 2; s.oy = g.top + 56 + (Ha - s.cs * 8) / 2; }
    else { s.cs = Math.min((g.W - 30) / 8, Ha / 2.6, 110); s.ox = (g.W - s.cs * 8) / 2; s.oy = g.top + 56 + (Ha - s.cs * 2) / 2; }
  }
  // centro de cada hoyo en pantalla
  function pos(s, i) {
    let col, row;
    if (i <= 5) { col = i + 1; row = 1; } else if (i === ME) { col = 7; row = 0.5; } else if (i <= 12) { col = 6 - (i - 7); row = 0; } else { col = 0; row = 0.5; }
    if (s.vert) return [s.ox + (row + 0.5) * s.cs, s.oy + (col + 0.5) * s.cs];
    return [s.ox + (col + 0.5) * s.cs, s.oy + (row + 0.5) * s.cs];
  }
  function startMove(g, i, who) {
    const s = g.s; s.hand = { i, k: i, n: s.b[i], who, t: 0.25 }; s.b[i] = 0; s.lastPit = i;
    Arcade.tone(300, 0.06, 'triangle', 0.06);
  }
  function stepHand(g) {
    const s = g.s, h = s.hand;
    if (h.n > 0) {
      h.k = (h.k + 1) % 14; if (h.k === (h.who === 1 ? CPU : ME)) h.k = (h.k + 1) % 14;
      s.b[h.k]++; h.n--; s.pop[h.k] = 1; Arcade.tone(520 + (h.k % 7) * 60, 0.05, 'sine', 0.07); h.t = 0.16; return;
    }
    // fin del reparto: captura y turno extra
    s.hand = null; const k = h.k, who = h.who, store = who === 1 ? ME : CPU;
    let again = k === store;
    if (again) { g.float(Arcade.T('¡Otra vez!', 'Again!'), ...pos(s, k), '#ffd43b', 18); Arcade.sfx.up(); }
    else if (mine(k, who) && s.b[k] === 1 && s.b[12 - k] > 0) {
      const got = s.b[12 - k] + 1; s.b[store] += got; s.b[k] = 0; s.b[12 - k] = 0; s.pop[store] = 1;
      const [x, y] = pos(s, 12 - k); g.burst(x, y, { n: 14, color: GEM, speed: 160 }); Arcade.sfx.coin();
      if (who === 1) g.addScore(got * 20 * Math.max(1, Math.round(g.lv / 2)), x, y); else g.message(Arcade.T('¡Te captura ' + got + '!', 'It captures ' + got + '!'), 0.9);
    }
    if (finish(s.b) || over(s.b)) return end(g);
    if (who === 1 && !again) { s.turn = 2; s.think = rand(0.5, 0.9); }
    else if (who === 2 && !again) s.turn = 1;
    else if (who === 2) s.think = rand(0.4, 0.7);
  }
  function end(g) {
    const s = g.s; s.done = true; const me = s.b[ME], cpu = s.b[CPU];
    if (me > cpu) { g.addScore((me - cpu) * 40 * g.lv, g.W / 2, g.H / 2); g.confetti(70); setTimeout(() => { if (g.state === 'play') g.win(me - cpu >= 10 ? 3 : me - cpu >= 4 ? 2 : 1); }, 1200); }
    else if (me < cpu) { g.message(Arcade.T('Gana la máquina', 'The machine wins'), 1.4, me + ' – ' + cpu); setTimeout(() => { if (g.state === 'play' && g.die()) Arcade.current.def.setup(g); }, 1700); }
    else { g.message(Arcade.T('Empate: otra vez', 'Draw: again'), 1.3); setTimeout(() => { if (g.state === 'play') Arcade.current.def.setup(g); }, 1500); }
  }
  const pitAt = (s, x, y) => { for (let i = 0; i < 14; i++) { const [px, py] = pos(s, i); if (Math.hypot(px - x, py - y) < s.cs * 0.48) return i; } return -1; };
  // posición fija de cada semilla dentro de su hoyo (para que no salten al redibujar)
  const seedXY = (s, i, k) => {
    const [x, y] = pos(s, i), big = i === ME || i === CPU, ang = k * 2.399, f = Math.min(1, Math.sqrt(k + 0.5) / (big ? 6.5 : 4));
    const ax = big ? (s.vert ? 0.68 : 0.3) : 0.28, ay = big ? (s.vert ? 0.3 : 0.68) : 0.28;
    return [x + Math.cos(ang) * f * ax * s.cs, y + Math.sin(ang) * f * ay * s.cs];
  };

  Arcade.game({
    /*THEME*/ home: 'indexpro.html', tag: 'Siembra, captura y llena tu granero', deco: ['🌰', '🪵', '💎', '🌾', '🏺', '🧠'], font: 'serif', bg: ['#5c3a1a', '#3b1f0e'],
    music: { mode: 'dorian', bpm: 90, wave: 'triangle', style: 'chill', root: 55 }, voice: { wave: 'sine', mul: 1.1, echo: 0.35 },
    /*EN*/ en: { title: 'Mancala', tag: 'Sow, capture and fill your store', help: 'Your 6 pits are the ones nearest you; your <b>store</b> is the big one to your right (in portrait, at the bottom). <b>Tap</b> one of your pits: you pick up all its seeds and sow them one by one, anticlockwise, in the following pits (yours, your store and the machine\'s, never in its store). If the last seed lands in <b>your store</b>, you play again. If it lands in an <b>empty pit of yours</b> with seeds opposite, you <b>capture</b> them all. When one side runs out of seeds, the game ends: whoever has more seeds in their store wins.', tvHelp: 'D-pad to one of your pits · OK to sow.', dict: { 'Tu turno': 'Your turn', 'Pensando…': 'Thinking…', 'Tú': 'You', 'Máquina': 'Machine' } },
    /*TV*/ tvHelp: 'Cruceta hasta uno de tus hoyos · OK para sembrar.',
    tv: { mode: 'tap', targets: (g) => { const s = g.s; if (!s.b) return []; return legal(s.b, 1).map((i) => { const [x, y] = pos(s, i); return { x: x - s.cs / 2, y: y - s.cs / 2, w: s.cs, h: s.cs }; }); } },
    id: 'mancala', title: 'Mancala', emoji: '🌰', color: '#e8a33d', origin: 'Mancala / Kalah (Lutanho)',
    help: 'Tus 6 hoyos son los de tu lado; tu <b>granero</b> es el grande de tu derecha (en vertical, el de abajo). <b>Toca</b> uno de tus hoyos: coges todas sus semillas y las vas sembrando de una en una, en sentido contrario a las agujas del reloj, en los hoyos siguientes (los tuyos, tu granero y los de la máquina, nunca en su granero). Si la última cae en <b>tu granero</b>, vuelves a jugar. Si cae en un <b>hoyo tuyo vacío</b> y enfrente hay semillas, las <b>capturas</b> todas. Cuando un lado se queda sin semillas se acaba: gana quien tenga más en su granero.',
    lives: 3, levels: 0, cap: 20,
    /*SC*/ demo(g) {
      const s = g.s; if (s.done || s.turn !== 1 || s.hand) return { wait: 0.3 };
      const [, i] = search(s.b, 1, 4, -1e9, 1e9); const mv = i >= 0 ? i : legal(s.b, 1)[0]; if (mv == null) return { wait: 0.3 };
      const [x, y] = pos(s, mv);
      return { tap: [x, y], after: 0.4, say: s.moves ? null : Arcade.T('Siembra: si acabas en tu granero, repites', 'Sow: end in your store to play again') };
    },
    setup(g) {
      const [seeds, depth, noise] = cfg(g.lv), b = new Array(14).fill(seeds); b[ME] = b[CPU] = 0;
      g.s = { b, pop: new Array(14).fill(0), turn: g.level % 2 === 0 ? 2 : 1, think: 0.9, depth, noise, done: false, hand: null, moves: 0 };
      geo(g);
    },
    layout(g) { if (g.s.b) geo(g); },
    tap(g, p) {
      const s = g.s; if (s.done || s.turn !== 1 || s.hand) return;
      const i = pitAt(s, p.x, p.y); if (i < 0 || !mine(i, 1)) return; if (!s.b[i]) { Arcade.sfx.bad(); return; }
      s.moves++; startMove(g, i, 1);
    },
    update(g, dt) {
      const s = g.s; if (!s.b) return;
      for (let i = 0; i < 14; i++) s.pop[i] = Math.max(0, s.pop[i] - dt * 3);
      if (s.hand) { s.hand.t -= dt; if (s.hand.t <= 0) stepHand(g); return; }
      if (s.turn === 2 && !s.done) {
        s.think -= dt; if (s.think > 0) return;
        const ms = legal(s.b, 2); if (!ms.length) { finish(s.b); return end(g); }
        let mv = Math.random() < s.noise ? pick(ms) : search(s.b, 2, s.depth, -1e9, 1e9)[1]; if (mv < 0) mv = ms[0];
        startMove(g, mv, 2);
      }
    },
    draw(g, ctx) {
      const s = g.s, W = g.W, H = g.H;
      ctx.fillStyle = '#2b1608'; ctx.fillRect(0, 0, W, H);
      if (!s.b) return;
      const cs = s.cs, bw = s.vert ? cs * 2 : cs * 8, bh = s.vert ? cs * 8 : cs * 2;
      const wd = ctx.createLinearGradient(s.ox, s.oy, s.ox + bw, s.oy + bh); wd.addColorStop(0, '#a0612b'); wd.addColorStop(0.5, '#c27c3a'); wd.addColorStop(1, '#7a4419');
      ctx.fillStyle = 'rgba(0,0,0,.4)'; Arcade.rr(ctx, s.ox - 8, s.oy - 4, bw + 16, bh + 16, cs * 0.5); ctx.fill();
      ctx.fillStyle = wd; Arcade.rr(ctx, s.ox - 10, s.oy - 10, bw + 20, bh + 20, cs * 0.5); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 2; for (let k = 0; k < 8; k++) { ctx.beginPath(); if (s.vert) { ctx.moveTo(s.ox - 6 + k * bw / 7, s.oy - 6); ctx.lineTo(s.ox - 6 + k * bw / 7 + 6, s.oy + bh + 6); } else { ctx.moveTo(s.ox - 6, s.oy - 6 + k * bh / 7); ctx.lineTo(s.ox + bw + 6, s.oy - 6 + k * bh / 7 + 4); } ctx.stroke(); }
      const can = s.turn === 1 && !s.done && !s.hand ? legal(s.b, 1) : [];
      for (let i = 0; i < 14; i++) {
        const [x, y] = pos(s, i), big = i === ME || i === CPU, rw = big ? (s.vert ? cs * 0.85 : cs * 0.42) : cs * 0.4, rh = big ? (s.vert ? cs * 0.42 : cs * 0.85) : cs * 0.4;
        ctx.fillStyle = 'rgba(40,20,5,.55)'; ctx.beginPath(); ctx.ellipse(x, y, rw, rh, 0, 0, 6.3); ctx.fill();
        ctx.strokeStyle = can.includes(i) ? 'rgba(255,212,59,' + (0.5 + 0.3 * Math.sin(g.rt * 5)) + ')' : 'rgba(0,0,0,.3)'; ctx.lineWidth = can.includes(i) ? 3 : 2; ctx.beginPath(); ctx.ellipse(x, y, rw, rh, 0, 0, 6.3); ctx.stroke();
        if (s.hand && s.lastPit === i) { ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.ellipse(x, y, rw, rh, 0, 0, 6.3); ctx.fill(); }
        const n = Math.min(s.b[i], 40), pz = 1 + s.pop[i] * 0.15;
        for (let k = 0; k < n; k++) { const [sx, sy] = seedXY(s, i, k), c = GEM[(i * 3 + k) % GEM.length], rr = cs * 0.075 * pz; ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(sx + 1, sy + 2, rr, 0, 6.3); ctx.fill(); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(sx, sy, rr, 0, 6.3); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(sx - rr * 0.3, sy - rr * 0.35, rr * 0.35, 0, 6.3); ctx.fill(); }
        const lx = s.vert ? (i <= 6 ? x + rw + 14 : x - rw - 14) : x, ly = s.vert ? y : (i <= 6 ? y + rh + 12 : y - rh - 12);
        if (big) Arcade.txt(ctx, String(s.b[i]), x, y, cs * 0.34, '#fff', 'center', 900, 'rgba(0,0,0,.6)');
        else Arcade.txt(ctx, String(s.b[i]), lx, ly, 13, i <= 5 ? '#ffe8cc' : '#e9c7a0', 'center', 900);
      }
      if (s.hand) { const [x, y] = pos(s, s.hand.k); Arcade.emoji(ctx, '✋', x + cs * 0.2, y - cs * 0.25, cs * 0.45); }
      const [mx, my] = pos(s, ME), [cx, cy] = pos(s, CPU);
      Arcade.txt(ctx, 'Tú', mx, s.vert ? my + cs * 0.62 : my - cs * 1.05, 13, '#ffd43b', 'center', 900);
      Arcade.txt(ctx, 'Máquina', cx, s.vert ? cy - cs * 0.62 : cy - cs * 1.05, 13, '#e9c7a0', 'center', 900);
      Arcade.txt(ctx, s.done ? '' : s.turn === 1 ? 'Tu turno' : 'Pensando…', W / 2, g.top + 26, 16, '#ffe8cc', 'center', 900);
    },
  });
})();
