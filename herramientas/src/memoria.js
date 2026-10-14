// Memoria|#0e2a3a
(function () {
  const { shuffle, clamp } = Arcade;
  const SETS = [
    ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦'],
    ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🌽'],
    ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥊', '⛳', '🎯', '🛹', '🎳', '🏒', '🥏', '🪀'],
    ['🚗', '🚕', '🚙', '🚌', '🚑', '🚒', '🚓', '🚜', '🏍️', '🚲', '✈️', '🚀', '🚁', '⛵', '🚂', '🛸', '🚤', '🛴'],
    ['🌞', '🌙', '⭐', '☁️', '⛈️', '🌈', '❄️', '🔥', '💧', '🌊', '🌋', '🌵', '🌲', '🌸', '🍄', '🍁', '🌻', '🌍'],
  ];
  const BACK = ['🃏', '🎴', '❓', '🔮', '💠'];

  function size(lv) { const t = [[3, 4], [4, 4], [4, 5], [4, 6], [5, 6], [6, 6]]; return t[Math.min(t.length - 1, Math.floor((lv - 1) / 2))]; }
  function geo(g) {
    const s = g.s, land = g.W > g.H; const [a, b] = size(g.level); s.C = land ? b : a; s.R = land ? a : b;
    const Wa = g.W - 20, Ha = g.bot - g.top - 70; s.cs = Math.min(Wa / s.C, Ha / s.R, 120);
    s.ox = (g.W - s.cs * s.C) / 2; s.oy = g.top + 50 + (Ha - s.cs * s.R) / 2;
  }
  function flip(g, i) {
    const s = g.s, c = s.cards[i];
    if (!c || c.up || c.done || s.busy) return;
    c.up = true; c.anim = 1; Arcade.tone(500 + s.open.length * 100, 0.06, 'triangle', 0.07);
    s.open.push(i);
    if (s.open.length === 2) {
      s.moves++;
      const [a, b] = s.open.map((k) => s.cards[k]);
      if (a.e === b.e) {
        a.done = b.done = true; s.open = []; s.combo++; s.pairs++;
        g.addScore(20 * s.combo * g.lv, cx(s, i), cy(s, i));
        Arcade.sfx.coin(); g.ring(cx(s, i), cy(s, i), '#69db7c', s.cs * 0.7);
        if (s.combo > 1) g.float('x' + s.combo, cx(s, i), cy(s, i) - 30, '#ffd43b', 22);
        if (s.pairs === s.cards.length / 2) setTimeout(() => { if (g.state === 'play') { const ex = s.moves - s.pairs; g.addScore(Math.max(0, 200 - ex * 10) * g.lv, g.W / 2, g.H / 2); g.win(ex <= s.pairs * 0.5 ? 3 : ex <= s.pairs ? 2 : 1); } }, 600);
      } else {
        s.combo = 0; s.busy = 0.8; Arcade.sfx.bad();
      }
    }
  }
  const cx = (s, i) => s.ox + (i % s.C + 0.5) * s.cs, cy = (s, i) => s.oy + (Math.floor(i / s.C) + 0.5) * s.cs;

  Arcade.game({
    /*THEME*/ home: 'indexpro.html', tag: 'Encuentra las parejas', deco: ['🃏', '🐶', '🍎', '⚽', '🚀', '🌈'], font: 'round', bg: ['#16445e', '#0e2a3a'],
    music: { mode: 'lydian', bpm: 100, wave: 'triangle', style: 'chill', root: 64 }, voice: { wave: 'sine', mul: 1.2, echo: 0.3 },
    ambient: { e: ['✨'], n: 8, vy: 0, sway: 0, twinkle: 1, alpha: 0.25, size: [6, 12] },
    en: { title: 'Memory', tag: 'Find the pairs', help: '<b>Tap</b> two cards to turn them over. If they match, they stay up; if not, they flip back: remember where they were! Find every pair with as few moves as possible. Each level has more cards and a new set of drawings. Great to play taking turns.', tvHelp: 'D-pad to move the cursor · OK to turn a card over.', dict: { 'Parejas: ': 'Pairs: ', '   ·   Jugadas: ': '   ·   Moves: ' } },
    tvHelp: 'Cruceta para mover el cursor · OK para dar la vuelta a una carta.',
    tv: { mode: 'tap', targets: (g) => { const s = g.s, o = []; if (!s.cards) return o; s.cards.forEach((c, i) => o.push({ x: s.ox + (i % s.C) * s.cs, y: s.oy + Math.floor(i / s.C) * s.cs, w: s.cs, h: s.cs })); return o; } },
    id: 'memoria', title: 'Memoria', emoji: '🃏', color: '#3bc9db', origin: 'Concentration',
    help: '<b>Toca</b> dos cartas para darles la vuelta. Si son iguales se quedan; si no, se vuelven a tapar: ¡recuerda dónde estaban! Encuentra todas las parejas con los menos movimientos posibles. En cada nivel hay más cartas y un juego de dibujos nuevo. Ideal para jugar por turnos.',
    lives: 0, levels: 0, cap: 30,
    setup(g) {
      g.s = { open: [], busy: 0, moves: 0, pairs: 0, combo: 0 };
      const s = g.s; geo(g);
      const set = SETS[(g.level - 1) % SETS.length], n = (s.C * s.R) / 2;
      s.back = BACK[(g.level - 1) % BACK.length];
      s.cards = shuffle(shuffle(set.slice()).slice(0, n).flatMap((e) => [e, e])).map((e) => ({ e, up: false, done: false, anim: 0 }));
      s.peek = 1.2;
      s.cards.forEach((c) => (c.up = true));
    },
    layout(g) { if (g.s.cards) geo(g); },
    tap(g, p) { const s = g.s; if (s.peek > 0) return; const c = Math.floor((p.x - s.ox) / s.cs), r = Math.floor((p.y - s.oy) / s.cs); if (c >= 0 && c < s.C && r >= 0 && r < s.R) flip(g, r * s.C + c); },
    update(g, dt) {
      const s = g.s;
      if (s.peek > 0) { s.peek -= dt; if (s.peek <= 0) { s.cards.forEach((c) => { c.up = false; c.anim = 1; }); Arcade.sfx.whoosh(); } }
      for (const c of s.cards) c.anim = Math.max(0, c.anim - dt * 5);
      if (s.busy) { s.busy -= dt; if (s.busy <= 0) { s.busy = 0; for (const i of s.open) { s.cards[i].up = false; s.cards[i].anim = 1; } s.open = []; } }
    },
    draw(g, ctx) {
      const s = g.s, W = g.W, H = g.H;
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#1d5a7a'); bg.addColorStop(1, '#0b1f2b');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      if (!s.cards) return;
      const cs = s.cs;
      s.cards.forEach((c, i) => {
        const x = cx(s, i), y = cy(s, i), w = cs - 8;
        const sx = Math.abs(Math.cos(c.anim * Math.PI / 2 * 2)) || 0.05, showFront = c.anim > 0.5 ? !c.up : c.up;
        ctx.save(); ctx.translate(x, y); ctx.scale(Math.max(0.05, sx), 1);
        if (showFront) {
          ctx.fillStyle = c.done ? '#d3f9d8' : '#fff'; Arcade.rr(ctx, -w / 2, -w / 2, w, w, w * 0.14); ctx.fill();
          if (c.done) { ctx.strokeStyle = '#51cf66'; ctx.lineWidth = 3; ctx.stroke(); }
        } else {
          const gr = ctx.createLinearGradient(-w / 2, -w / 2, w / 2, w / 2); gr.addColorStop(0, '#3bc9db'); gr.addColorStop(1, '#1971c2');
          ctx.fillStyle = gr; Arcade.rr(ctx, -w / 2, -w / 2, w, w, w * 0.14); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; Arcade.rr(ctx, -w / 2 + 5, -w / 2 + 5, w - 10, w - 10, w * 0.1); ctx.stroke();
        }
        ctx.restore();
        Arcade.emoji(ctx, showFront ? c.e : s.back, x, y, w * (showFront ? 0.62 : 0.4), { sx: Math.max(0.05, sx), alpha: showFront ? 1 : 0.6 });
      });
      Arcade.txt(ctx, 'Parejas: ' + s.pairs + '/' + s.cards.length / 2 + '   ·   Jugadas: ' + s.moves, W / 2, s.oy - 24, 15, '#c5f6fa', 'center', 800);
    },
  });
})();
