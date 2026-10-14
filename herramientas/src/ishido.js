// Ishido|#1b2b22
(function () {
  const { shuffle, ri } = Arcade;
  const COLS = ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7', '#da77f2', '#ff922b'];
  const SYMS = ['★', '●', '▲', '◆', '♥', '♣'];
  const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function geo(g) {
    const s = g.s, Wa = g.W - 20, Ha = g.bot - g.top - 110;
    s.cs = Math.min(Wa / s.C, Ha / s.R);
    s.ox = (g.W - s.cs * s.C) / 2; s.oy = g.top + 90 + (Ha - s.cs * s.R) / 2;
  }
  function neigh(s, c, r) { const out = []; for (const [dx, dy] of D4) { const x = c + dx, y = r + dy; if (x >= 0 && x < s.C && y >= 0 && y < s.R && s.b[y][x]) out.push(s.b[y][x]); } return out; }
  function fits(tile, ns) {
    const n = ns.length;
    if (!n || n > 4) return false;
    const need = n === 1 ? null : n === 2 ? [[1, 1]] : n === 3 ? [[2, 1], [1, 2]] : [[2, 2]];
    for (let m = 0; m < 1 << n; m++) {
      let cc = 0, ss = 0, ok = true;
      for (let i = 0; i < n && ok; i++) {
        if (m >> i & 1) { cc++; if (ns[i].c !== tile.c) ok = false; } else { ss++; if (ns[i].s !== tile.s) ok = false; }
      }
      if (!ok) continue;
      if (!need || need.some(([a, b]) => a === cc && b === ss)) return true;
    }
    return false;
  }
  function valid(s, c, r, t) { return !s.b[r][c] && fits(t, neigh(s, c, r)); }
  function anyValid(s, t) { for (let r = 0; r < s.R; r++) for (let c = 0; c < s.C; c++) if (valid(s, c, r, t)) return true; return false; }

  Arcade.game({
    /*THEME*/ tag: "El camino de las piedras", deco: ["🀄", "★", "◆", "♥", "♣", "🌸"], font: "serif", bg: ["#22392b", "#16251c"], music: {"mode": "dorian", "bpm": 84, "wave": "sine", "style": "chill", "root": 57, "sparse": 0.45}, voice: {"wave": "sine", "mul": 1, "echo": 0.35}, ambient: {"e": ["🌸"], "n": 7, "vy": 14, "sway": 24, "spin": 1, "alpha": 0.16},
    /*EN*/ en: {"title": "Ishido", "tag": "The way of the stones", "help": "Place all 72 stones one by one by <b>tapping a cell</b>. Each stone has a colour and a symbol and must sit next to another: with <b>1 neighbour</b> it must match colour or symbol; with <b>2</b>, one by colour and one by symbol; with <b>3</b>, two by one and one by the other; with <b>4</b>, two and two. 4-way crosses score big! The game ends when the stone can't be placed.", "tvHelp": "D-pad to move the cursor · OK to place the stone.", "dict": {"Ahora": "Now", "Cruces de 4: ": "4-way: ", "No cabe la ficha": "The stone doesn't fit", "¡Bolsa vacía!": "Bag empty!", "¡Cruce de 4!": "4-way cross!"}},
    /*TV*/ tvHelp: "Cruceta para mover el cursor · OK colocar la ficha.", tv: { mode: 'tap', targets: (g) => { const s = g.s, o = []; for (let r = 0; r < s.R; r++) for (let c = 0; c < s.C; c++) o.push({ x: s.ox + c * s.cs, y: s.oy + r * s.cs, w: s.cs, h: s.cs, c, r }); return o; } },
    id: 'ishido', title: 'Ishido', emoji: '🀄', color: '#69db7c', origin: 'Ishido: The Way of Stones (1990)',
    help: 'Coloca las 72 fichas una a una <b>tocando una casilla</b>. Cada ficha tiene un color y un símbolo y debe ir junto a otra: con <b>1 vecina</b> tiene que coincidir en color o símbolo; con <b>2</b>, una en color y otra en símbolo; con <b>3</b>, dos en una cosa y una en la otra; con <b>4</b>, dos y dos. ¡Los cruces de 4 dan muchos puntos! Se acaba cuando no puedes colocar la ficha.',
    lives: 0, levels: null,
    setup(g) {
      g.s = { b: [], bag: [], placed: 0, four: 0, flash: null };
      const s = g.s;
      if (g.W < g.H) { s.C = 8; s.R = 12; } else { s.C = 12; s.R = 8; }
      for (let r = 0; r < s.R; r++) s.b.push(new Array(s.C).fill(null));
      for (let c = 0; c < 6; c++) for (let y = 0; y < 6; y++) { s.bag.push({ c, s: y }, { c, s: y }); }
      shuffle(s.bag);
      const cs = shuffle([0, 1, 2, 3, 4, 5]), ss = shuffle([0, 1, 2, 3, 4, 5]);
      const spots = [[0, 0], [s.C - 1, 0], [0, s.R - 1], [s.C - 1, s.R - 1], [Math.floor(s.C / 2) - 1, Math.floor(s.R / 2) - 1], [Math.floor(s.C / 2), Math.floor(s.R / 2)]];
      spots.forEach(([x, y], i) => {
        const t = { c: cs[i], s: ss[i] };
        s.b[y][x] = t;
        const k = s.bag.findIndex(o => o.c === t.c && o.s === t.s); s.bag.splice(k, 1);
      });
      s.cur = s.bag.pop();
      geo(g);
    },
    layout(g) { if (g.s.b) geo(g); },
    tap(g, p) {
      const s = g.s, c = Math.floor((p.x - s.ox) / s.cs), r = Math.floor((p.y - s.oy) / s.cs);
      if (c < 0 || c >= s.C || r < 0 || r >= s.R || !s.cur) return;
      if (!valid(s, c, r, s.cur)) { s.flash = { c, r, t: 0.3 }; Arcade.sfx.bad(); return; }
      const n = neigh(s, c, r).length;
      s.b[r][c] = Object.assign({ pop: 1 }, s.cur); s.placed++;
      const x = s.ox + (c + 0.5) * s.cs, y = s.oy + (r + 0.5) * s.cs;
      let pts = [0, 1, 2, 4, 8][n];
      if (n === 4) { s.four++; pts += 25 * Math.pow(2, s.four - 1); g.float('¡Cruce de 4!', x, y - 30, '#ffd43b', 22); Arcade.sfx.win(); g.burst(x, y, { n: 20, emoji: '✨', size: 14, speed: 200 }); }
      else Arcade.tone(400 + n * 120, 0.08, 'triangle', 0.09);
      g.addScore(pts * 10, x, y);
      g.level = 1 + Math.floor(s.placed / 12); g.hud();
      s.cur = s.bag.pop();
      if (!s.cur) { g.addScore(1000, g.W / 2, g.H / 2); g.message('¡Bolsa vacía!', 1.5); setTimeout(g.over, 1500); g.state = 'dying'; return; }
      if (!anyValid(s, s.cur)) { g.message('No cabe la ficha', 1.5); Arcade.sfx.lose(); g.state = 'dying'; setTimeout(g.over, 1500); }
    },
    update(g, dt) {
      const s = g.s;
      if (s.flash) { s.flash.t -= dt; if (s.flash.t <= 0) s.flash = null; }
      for (const row of s.b) for (const t of row) if (t && t.pop) t.pop = Math.max(0, t.pop - dt * 4);
    },
    draw(g, ctx) {
      const s = g.s, W = g.W, H = g.H;
      ctx.fillStyle = '#16251c'; ctx.fillRect(0, 0, W, H);
      g.scenery(['🎋','🪷','⛩️','🌸'], 6, { alpha: 0.18, size: [24, 36] }); /*SC*/
      if (!s.b.length) return;
      const cs = s.cs;
      const tile = (x, y, t, z) => {
        z = z || cs;
        ctx.fillStyle = 'rgba(0,0,0,.35)'; Arcade.rr(ctx, x - z / 2 + 2, y - z / 2 + 3, z - 4, z - 4, z * 0.18); ctx.fill();
        ctx.fillStyle = COLS[t.c]; Arcade.rr(ctx, x - z / 2 + 2, y - z / 2 + 2, z - 4, z - 4, z * 0.18); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.25)'; Arcade.rr(ctx, x - z / 2 + 4, y - z / 2 + 4, z - 8, z * 0.25, z * 0.1); ctx.fill();
        Arcade.txt(ctx, SYMS[t.s], x, y + 1, z * 0.55, 'rgba(255,255,255,.95)', 'center', 900, 'rgba(0,0,0,.25)');
      };
      for (let r = 0; r < s.R; r++) for (let c = 0; c < s.C; c++) {
        const x = s.ox + c * cs, y = s.oy + r * cs, border = r === 0 || c === 0 || r === s.R - 1 || c === s.C - 1;
        ctx.fillStyle = border ? '#2a4434' : (r + c) % 2 ? '#22392b' : '#264030'; ctx.fillRect(x, y, cs, cs);
        const t = s.b[r][c];
        if (t) tile(x + cs / 2, y + cs / 2, t, cs * (1 + (t.pop || 0) * 0.2));
        else if (s.cur && valid(s, c, r, s.cur)) { ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(x + cs / 2, y + cs / 2, cs * 0.1, 0, 6.28); ctx.fill(); }
      }
      if (s.flash) { ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 3; ctx.strokeRect(s.ox + s.flash.c * cs + 2, s.oy + s.flash.r * cs + 2, cs - 4, cs - 4); }
      // ficha actual
      const hy = s.oy - 46;
      if (s.cur) { tile(W / 2, hy, s.cur, 56); }
      Arcade.txt(ctx, 'Ahora', W / 2 - 60, hy, 13, '#b2f2bb', 'right', 700);
      Arcade.txt(ctx, 'Quedan ' + s.bag.length, W / 2 + 60, hy - 9, 13, '#b2f2bb', 'left', 700);
      Arcade.txt(ctx, 'Cruces de 4: ' + s.four, W / 2 + 60, hy + 11, 13, '#ffd43b', 'left', 700);
    },
  });
})();
