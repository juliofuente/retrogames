// Brisca|#3d1f0b
// @cartas
(function () {
  const { rand, clamp, shuffle } = Arcade;
  const T = Arcade.T, B = Arcade.baraja;
  const PTS = { 1: 11, 3: 10, 12: 4, 11: 3, 10: 2 }, pts = (c) => PTS[c.r] || 0;
  const ORDER = [1, 3, 12, 11, 10, 7, 6, 5, 4, 2], str = (c) => 10 - ORDER.indexOf(c.r);   // fuerza: as 10 … dos 1
  // ¿gana la carta b (segunda) a la a (primera)?
  const beats = (b, a, tr) => (b.s === a.s ? str(b) > str(a) : b.s === tr);

  function choose(s, w, noise) {
    const H = s.hand[w], tr = s.trump.s, lead = s.trick.length ? s.trick[0].c : null, rnd = () => Math.random() < noise;
    const cost = (c) => pts(c) * 2 + (c.s === tr ? 6 + str(c) : 0) + str(c) * 0.3;
    const cheapest = () => H.map((c, i) => i).sort((a, b) => cost(H[a]) - cost(H[b]))[0];
    if (!lead) return rnd() ? (Math.random() * H.length) | 0 : cheapest();
    const at = pts(lead), win = H.map((c, i) => i).filter((i) => beats(H[i], lead, tr)).sort((a, b) => cost(H[a]) - cost(H[b]));
    if (win.length && !rnd()) {
      const w0 = win[0], c = H[w0], gain = at + pts(c);
      if (c.s !== tr || gain >= 10 || (pts(c) === 0 && at >= 2) || s.deck.length === 0) return w0;
    }
    return cheapest();
  }

  function deal(g) {
    const s = g.s, order = [s.leader, 1 - s.leader];
    for (const w of order) if (s.hand[w].length < 3) { const c = s.deck.length ? s.deck.pop() : s.trumpLeft ? (s.trumpLeft = false, s.trump) : null; if (c) s.hand[w].push(c); }
  }
  function play(g, w, i) {
    const s = g.s, c = s.hand[w][i]; if (!c || s.turn !== w || s.trick.length >= 2) return;
    const [hx, hy] = handPos(g, w, i); s.hand[w].splice(i, 1); s.trick.push({ w, c, x0: hx, y0: hy, t: 0 }); s.sel = null;
    Arcade.tone(w ? 330 : 520, 0.07, 'triangle', 0.07);
    if (s.trick.length === 1) { s.turn = 1 - w; s.cpuT = rand(0.6, 1); } else { s.turn = -1; s.resolveT = 1.1; }
  }
  function resolve(g) {
    const s = g.s, [a, b] = s.trick, win = beats(b.c, a.c, s.trump.s) ? b.w : a.w, got = pts(a.c) + pts(b.c);
    s.pts[win] += got; s.won[win].push(a.c, b.c); s.leader = win; s.turn = win; s.last = { w: win, t: 0, got };
    const [px, py] = pilePos(g, win); s.trick.forEach((q, k) => s.flies.push({ c: q.c, x0: trickPos(g, k)[0], y0: trickPos(g, k)[1], x1: px - s.cw / 2, y1: py - s.ch / 2, t: 0 }));
    s.trick = [];
    if (win === 0) { if (got) { g.addScore(got * 10 * Math.max(1, Math.ceil(g.lv / 3)), px, py - 30); Arcade.sfx.coin(); } else Arcade.tone(600, 0.05, 'sine', 0.05); }
    else Arcade.tone(240, 0.08, 'triangle', 0.06);
    if (got) g.float((win ? '🤖 +' : '+') + got, g.W / 2, s.trickY - 10, win ? '#ffa8a8' : '#ffe066', 22);
    deal(g); s.cpuT = 0.9;
    if (!s.hand[0].length && !s.hand[1].length) finish(g);
  }
  function finish(g) {
    const s = g.s, [a, b] = s.pts; s.done = true;
    setTimeout(() => {
      if (g.state !== 'play') return;
      if (a > b) { Arcade.sfx.win(); g.confetti(90); g.addScore(300 * g.lv + (a - 60) * 20, g.W / 2, g.H / 2); setTimeout(() => { if (g.state === 'play') g.win(a >= 90 ? 3 : a >= 75 ? 2 : 1); }, 1000); }
      else if (a === b) { g.message(T('Empate a 60: otra vez', '60–60 draw: again'), 1.5); setTimeout(() => { if (g.state === 'play') Arcade.current.def.setup(g); }, 1800); }
      else { Arcade.sfx.lose(); g.message(T('Gana la máquina ', 'The machine wins ') + b + '–' + a, 1.5); setTimeout(() => { if (g.state === 'play' && g.die()) Arcade.current.def.setup(g); }, 1900); }
    }, 900);
  }

  /* ---------- geometría ---------- */
  function geo(g) {
    const s = g.s, W = g.W, top = g.top + 34, bot = g.bot - (g.demoOn ? 46 : 0);
    s.cw = Math.min(80, (W - 120) / 3); s.ch = s.cw * 1.5; s.sw = s.cw * 0.72; s.sh = s.sw * 1.5;
    s.hy = [bot - s.ch - 12, top + 4]; s.trickY = (s.hy[1] + s.sh + s.hy[0]) / 2;
  }
  function handPos(g, w, i) { const s = g.s, n = Math.max(1, s.hand[w].length), cw = w ? s.sw : s.cw, sp = cw + 12; return [g.W / 2 + (i - (n - 1) / 2) * sp - cw / 2, s.hy[w]]; }
  function trickPos(g, k) { const s = g.s; return [g.W / 2 - s.cw / 2 + (k ? 1 : -1) * (s.cw * 0.42), s.trickY - s.ch / 2 + (k ? 10 : -10)]; }
  function pilePos(g, w) { const s = g.s; return [g.W - 28, w ? s.hy[1] + s.sh / 2 + 40 : s.hy[0] + s.ch / 2]; }
  const inC = (x, y, w, h, p) => p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;

  Arcade.game({
    /*THEME*/ home: 'indexmesa.html', tag: 'Bazas, triunfos y 120 puntos', deco: ['🪙', '🏆', '🗡️', '🪵', '🤴', '🃏'], font: 'serif', bg: ['#6b3a1a', '#3d1f0b'],
    music: { mode: 'dorian', bpm: 88, wave: 'triangle', style: 'chill', root: 57 }, voice: { wave: 'sine', mul: 1.1, echo: 0.35 },
    /*EN*/ en: { title: 'Brisca', tag: 'Tricks, trumps and 120 points', help: 'A Spanish card game against the machine with the 40-card deck. The card turned up under the deck sets the trump suit. Each of you plays one card per trick: tap one of yours to play it. If both are the same suit, the higher one wins. A trump beats any card of another suit. Otherwise the first card played wins. From high to low: Ace, Three, King, Knight, Jack, 7, 6, 5, 4 and 2. Points: Ace 11, Three 10, King 4, Knight 3 and Jack 2. The winner of a trick draws first and leads the next one. There are 120 points in total: get more than 60 to win.', tvHelp: 'D-pad to a card · OK plays it.', dict: { 'Tu turno': 'Your turn', 'Juega la máquina…': 'Machine is playing…', 'Triunfo': 'Trump', 'Tú': 'You', 'Máquina': 'Machine' } },
    /*TV*/ tvHelp: 'Cruceta hasta una carta · OK la juega.',
    tv: { mode: 'tap', targets: (g) => { const s = g.s; if (!s.hand || s.turn !== 0 || s.done) return []; return s.hand[0].map((c, i) => { const [x, y] = handPos(g, 0, i); return { x, y, w: s.cw, h: s.ch }; }); } },
    id: 'brisca', title: 'Brisca', emoji: '🤴', color: '#ffa94d', origin: 'Brisca (juego tradicional español)', pad: false,
    help: 'Juego de baraja española contra la máquina, con 40 cartas. La carta que queda boca arriba bajo el mazo marca el palo de triunfo. Cada uno juega una carta por baza: toca una tuya para jugarla. Si las dos son del mismo palo, gana la más alta. Un triunfo gana a cualquier carta de otro palo. Si no, gana la primera que se jugó. De mayor a menor: as, tres, rey, caballo, sota, 7, 6, 5, 4 y 2. Puntos: as 11, tres 10, rey 4, caballo 3 y sota 2. Quien gana la baza roba primero y sale en la siguiente. Hay 120 puntos en total: consigue más de 60 para ganar.',
    lives: 3, levels: 0, cap: 20,
    /*SC*/ demo(g) {
      const s = g.s; if (!s.hand || s.done || s.turn !== 0 || s.flies.length) return { wait: 0.4 };
      const say = (es, en) => (s.said = (s.said || 0) + 1) < 9 ? T(es, en) : null;
      const i = choose(s, 0, 0), c = s.hand[0][i], [x, y] = handPos(g, 0, i), lead = s.trick.length ? s.trick[0].c : null;
      const why = !lead ? T('Sales tú: juega una carta que valga poco', 'You lead: play a low card') : beats(c, lead, s.trump.s) ? (c.s === s.trump.s && lead.s !== s.trump.s ? T('Un triunfo gana la baza', 'A trump wins the trick') : T('Esta carta gana la baza', 'This card wins the trick')) : T('No merece la pena ganarla: suelta la más baja', 'Not worth winning: drop your lowest');
      return { tap: [x + s.cw / 2, y + s.ch / 2], after: 0.8, say: say(why, why) };
    },
    setup(g) {
      const deck = shuffle(B.deck('es')), trump = deck.pop();
      g.s = { deck, trump, trumpLeft: true, hand: [[], []], trick: [], pts: [0, 0], won: [[], []], leader: g.lv % 2 ? 0 : 1, turn: 0, flies: [], cpuT: 1, resolveT: 0, done: false, noise: clamp(0.45 - g.lv * 0.04, 0.03, 0.45), last: null };
      geo(g); for (let k = 0; k < 3; k++) deal(g); g.s.turn = g.s.leader;
    },
    layout(g) { if (g.s.hand) geo(g); },
    tap(g, p) {
      const s = g.s; if (!s.hand || s.done || s.turn !== 0 || s.flies.length) return;
      for (let i = s.hand[0].length - 1; i >= 0; i--) { const [x, y] = handPos(g, 0, i); if (inC(x, y, s.cw, s.ch, p)) { play(g, 0, i); return; } }
    },
    update(g, dt) {
      const s = g.s; if (!s.hand) return; geo(g);
      for (const q of s.trick) q.t = Math.min(1, q.t + dt / 0.3);
      for (const f of s.flies) f.t += dt / 0.4; s.flies = s.flies.filter((f) => f.t < 1);
      if (s.last) s.last.t += dt;
      if (s.done) return;
      if (s.turn === -1) { s.resolveT -= dt * (g.demoAuto ? 1.5 : 1); if (s.resolveT <= 0) resolve(g); return; }
      if (s.turn === 1 && !s.flies.length) { s.cpuT -= dt; if (s.cpuT <= 0 && s.hand[1].length) play(g, 1, choose(s, 1, s.noise)); }
    },
    draw(g, ctx) {
      const s = g.s, W = g.W, H = g.H;
      const bg = ctx.createRadialGradient(W / 2, H * 0.45, 30, W / 2, H / 2, H * 0.75); bg.addColorStop(0, '#9c5a2b'); bg.addColorStop(1, '#3d1f0b'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      if (!s.hand) return;
      Arcade.txt(ctx, T('Tú ', 'You ') + s.pts[0] + ' · ' + s.pts[1] + T(' Máquina', ' Machine'), 14, g.top + 14, 14, '#fff', 'left', 900);
      Arcade.txt(ctx, T('Triunfo: ', 'Trump: ') + B.ESN[s.trump.s] + ' ' + B.sym(s.trump), 14, g.top + 34, 12, '#ffe8cc', 'left', 800);
      // mazo con el triunfo debajo
      const dx = 14, dy = s.trickY - s.sh / 2;
      if (s.trumpLeft) B.draw(ctx, s.trump, dx + s.sw * 0.75, dy + (s.sh - s.sw) / 2 - 4, s.sw, s.sh, { rot: Math.PI / 2 });
      if (s.deck.length) { for (let k = Math.min(4, Math.ceil(s.deck.length / 8)); k >= 0; k--) B.draw(ctx, null, dx - k, dy - k * 1.5, s.sw, s.sh, { back: true }); Arcade.txt(ctx, String(s.deck.length), dx + s.sw / 2, dy + s.sh + 14, 12, '#fff', 'center', 900); }
      // mano rival
      s.hand[1].forEach((c, i) => { const [x, y] = handPos(g, 1, i); B.draw(ctx, null, x, y, s.sw, s.sh, { back: true }); });
      // bazas ganadas
      for (const w of [0, 1]) if (s.won[w].length) { const [px, py] = pilePos(g, w); B.draw(ctx, null, px - s.sw * 0.35, py - s.sh * 0.35, s.sw * 0.7, s.sh * 0.7, { back: true, backCol: w ? ['#c92a2a', '#7a1010'] : ['#1c7ed6', '#0b3d91'] }); Arcade.txt(ctx, s.won[w].length / 2 + ' ' + T('bazas', 'tricks'), px, py + s.sh * 0.35 + 12, 11, '#fff', 'center', 800); }
      // baza en la mesa
      s.trick.forEach((q, k) => { const [tx, ty] = trickPos(g, k), e = 1 - (1 - q.t) * (1 - q.t), x = q.x0 + (tx - q.x0) * e, y = q.y0 + (ty - q.y0) * e; B.draw(ctx, q.c, x, y, s.cw, s.ch, { flip: q.w === 1 ? Math.min(1, q.t * 1.3) : null }); });
      for (const f of s.flies) { const e = f.t * f.t, x = f.x0 + (f.x1 - f.x0) * e, y = f.y0 + (f.y1 - f.y0) * e; B.draw(ctx, f.c, x, y, s.cw, s.ch, { alpha: 1 - f.t * 0.6 }); }
      // mi mano
      const lead = s.trick.length === 1 && s.turn === 0 ? s.trick[0].c : null;
      s.hand[0].forEach((c, i) => { const [x, y] = handPos(g, 0, i), wins = lead && beats(c, lead, s.trump.s); B.draw(ctx, c, x, y - (wins ? 6 : 0), s.cw, s.ch, { glow: wins ? 'rgba(105,219,124,.9)' : c.s === s.trump.s ? 'rgba(255,212,59,.55)' : null, dim: s.turn !== 0 }); if (pts(c)) Arcade.txt(ctx, '+' + pts(c), x + s.cw - 8, y + s.ch - 9, 11, '#e8590c', 'right', 900); });
      const info = s.done ? '' : s.turn === 0 ? (lead ? T('Las verdes ganan la baza', 'Green cards win the trick') : 'Tu turno') : s.turn === 1 ? 'Juega la máquina…' : '';
      if (info) { ctx.fillStyle = 'rgba(0,0,0,.4)'; Arcade.rr(ctx, 10, s.hy[0] - 36, W - 20, 26, 10); ctx.fill(); Arcade.txt(ctx, info, W / 2, s.hy[0] - 23, 13, '#fff', 'center', 800); }
    },
  });
})();
