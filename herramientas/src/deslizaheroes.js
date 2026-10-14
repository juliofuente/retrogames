// Deslizahéroes|#1f2b1a
(function () {
  const { ri, pick, clamp } = Arcade;
  const HER = ['🐣', '🧒', '🧑‍🌾', '🥷', '🧝', '🧙', '🦸', '🤴', '👑'];
  const HC = ['#fff3bf', '#ffe066', '#c0eb75', '#69db7c', '#38d9a9', '#4dabf7', '#9775fa', '#f783ac', '#ffd43b'];
  const MON = ['🐀', '🦇', '🐺', '🧟', '👹', '🐲'];

  function geo(g) { const s = g.s, N = s.N, a = Math.min(g.W - 28, g.bot - g.top - 150, 470); s.cs = a / N; s.ox = (g.W - a) / 2; s.oy = g.top + 100 + (g.bot - g.top - 150 - a) / 2; }
  function empty(s) { const e = []; for (let r = 0; r < s.N; r++) for (let c = 0; c < s.N; c++) if (!s.b[r][c]) e.push([r, c]); return e; }
  function addHero(s, lv) { const e = empty(s); if (!e.length) return; const [r, c] = pick(e); s.b[r][c] = { t: Math.random() < (lv > 6 ? 0.8 : 0.9) ? 0 : 1, pop: 0, nw: 1, px: c, py: r }; }
  function addMonster(g) {
    const s = g.s, e = empty(s); if (!e.length) return;
    const [r, c] = pick(e), L = g.lv;
    const tier = clamp(Math.floor(Math.random() * (1 + L / 5)), 0, MON.length - 1);
    const hp = Math.max(2, Math.round((1 + tier * 2 + L * 0.3) * (0.8 + Math.random() * 0.4)));
    s.b[r][c] = { m: true, tier, hp, max: hp, cd: clamp(11 - Math.floor(L / 5), 7, 11), pop: 0, nw: 1, px: c, py: r, hit: 0 };
    g.float('!', s.ox + (c + 0.5) * s.cs, s.oy + r * s.cs, '#ff6b6b', 26); Arcade.tone(140, 0.2, 'sawtooth', 0.06, -40);
  }
  const power = (t) => Math.pow(2, t);
  function canMove(s) {
    if (empty(s).length) return true;
    for (let r = 0; r < s.N; r++) for (let c = 0; c < s.N; c++) {
      const t = s.b[r][c]; if (!t) continue;
      for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) { const o = s.b[r + dr] && s.b[r + dr][c + dc]; if (!o) continue; if (!t.m && !o.m && o.t === t.t) return true; if (!t.m && o.m) return true; }
    }
    return false;
  }
  function slide(g, dir) {
    const s = g.s; if (s.done || s.busy) return;
    const D = { left: [0, -1], right: [0, 1], up: [-1, 0], down: [1, 0] }[dir], N = s.N;
    let moved = false, gained = 0, kills = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (s.b[r][c]) { const t = s.b[r][c]; t.px = c; t.py = r; t.merged = false; t.atk = 0; }
    const order = [...Array(N).keys()];
    const rs = D[0] > 0 ? order.slice().reverse() : order, cs = D[1] > 0 ? order.slice().reverse() : order;
    for (const r of rs) for (const c of cs) {
      const t = s.b[r][c]; if (!t || t.m) continue;
      let nr = r, nc = c;
      for (;;) {
        const tr = nr + D[0], tc = nc + D[1];
        if (tr < 0 || tr >= N || tc < 0 || tc >= N) break;
        const o = s.b[tr][tc];
        if (!o) { s.b[tr][tc] = t; s.b[nr][nc] = null; nr = tr; nc = tc; moved = true; continue; }
        if (o.m && o.hp > 0) {
          // ataque
          o.hp -= power(t.t); o.hit = 1; t.atk = 1; t.ad = D; moved = true;
          const x = s.ox + (tc + 0.5) * s.cs, y = s.oy + (tr + 0.5) * s.cs;
          g.float('-' + power(t.t), x, y - s.cs * 0.3, '#ff8787', 20);
          if (o.hp <= 0) {
            s.b[tr][tc] = null; kills++; gained += o.max * 10;
            g.burst(x, y, { n: 10, emoji: '💥', size: 18, speed: 180 }); g.burst(x, y, { n: 6, emoji: '🪙', size: 14, speed: 160, up: 80 });
          } else Arcade.sfx.hit();
          break;
        }
        if (!o.m && o.t === t.t && !o.merged && !t.merged && t.t < HER.length - 1) {
          o.t++; o.merged = true; o.pop = 1; o.px = t.px; o.py = t.py; s.b[nr][nc] = null; moved = true;
          gained += power(o.t) * 2;
          g.burst(s.ox + (tc + 0.5) * s.cs, s.oy + (tr + 0.5) * s.cs, { n: 8, color: HC[o.t], speed: 150, size: 3 });
        }
        break;
      }
    }
    if (!moved) { Arcade.sfx.bad(); return; }
    s.anim = 1; s.moves++; Arcade.sfx.move();
    if (gained) g.addScore(gained * g.lv);
    if (kills) { s.kills += kills; Arcade.sfx.boom(); g.shake(0.15, 5); if (kills > 1) g.message('¡Doble!', 0.7); }
    if (s.kills >= s.need) { s.done = true; setTimeout(() => { if (g.state === 'play') { g.addScore(150 * g.lv, g.W / 2, g.H / 2); g.win(); } }, 450); return; }
    // los monstruos cuentan hacia atrás
    let hurt = 0;
    for (const row of s.b) for (const t of row) if (t && t.m) { t.cd--; if (t.cd <= 0) { t.cd = clamp(11 - Math.floor(g.lv / 5), 7, 11); t.rage = 1; hurt++; } }
    addHero(s, g.lv);
    if (s.moves % s.every === 0 || !s.b.some((row) => row.some((t) => t && t.m))) addMonster(g);
    if (hurt) {
      g.message(Arcade.T('¡Te atacan!', 'They strike!'), 0.9);
      s.busy = true;
      setTimeout(() => { s.busy = false; let ok = true; for (let i = 0; i < hurt && ok; i++) ok = g.die(); }, 350);
      return;
    }
    if (!canMove(s)) {
      g.message(Arcade.T('Sin movimientos', 'No moves left'), 1.1); s.busy = true;
      setTimeout(() => { s.busy = false; if (g.state === 'play' && g.die()) { const hs = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (s.b[r][c] && !s.b[r][c].m) hs.push([r, c]); for (const [r, c] of hs.sort(() => Math.random() - 0.5).slice(0, Math.ceil(hs.length / 2))) s.b[r][c] = null; } }, 900);
    }
  }

  Arcade.game({
    /*THEME*/ home: 'indexpro.html', tag: 'Fusiona héroes y derrota monstruos', deco: ['🧒', '🥷', '🧙', '👹', '🐲', '⚔️'], font: 'fancy', bg: ['#3a5230', '#1f2b1a'],
    music: { mode: 'dorian', bpm: 112, wave: 'square', style: 'march', root: 57 }, voice: { wave: 'square', mul: 1, echo: 0.2 },
    ambient: { e: ['🍃'], n: 6, vy: 14, sway: 30, spin: 1, alpha: 0.14 },
    en: { title: 'Hero Slide', tag: 'Merge heroes, beat monsters', help: '<b>Swipe</b> to slide every hero. Two <b>equal</b> heroes that bump merge into a stronger one (🐣→🧒→🧑‍🌾→🥷→🧝→🧙→🦸→🤴→👑; each one hits twice as hard). Monsters don\'t move: slide a hero <b>into</b> one to hit it with its strength. Each monster shows how many moves are left before it <b>strikes</b> and takes a life. Defeat the monsters each level asks for. If the board fills with no moves, you lose a life.', tvHelp: 'D-pad to slide every hero.', dict: { 'Monstruos: ': 'Monsters: ', '¡Te atacan!': 'They strike!', 'Sin movimientos': 'No moves left', '¡Doble!': 'Double!' } },
    tvHelp: 'Cruceta para deslizar a todos los héroes.',
    id: 'deslizaheroes', title: 'Deslizahéroes', emoji: '🥷', color: '#69db7c', origin: 'Hero Slide (Tuesday Quest) / 2048',
    help: '<b>Desliza</b> para mover a todos los héroes. Dos héroes <b>iguales</b> que chocan se fusionan en uno más fuerte (🐣→🧒→🧑‍🌾→🥷→🧝→🧙→🦸→🤴→👑; cada uno pega el doble). Los monstruos no se mueven: desliza un héroe <b>contra</b> ellos para golpearlos con su fuerza. Cada monstruo muestra cuántos movimientos faltan para que <b>ataque</b> y te quite una vida. Derrota los monstruos que pide cada nivel. Si el tablero se llena sin movimientos, pierdes una vida.',
    lives: 3, levels: 0, cap: 20,
    setup(g) {
      g.s = { N: g.lv >= 8 ? 5 : 4, kills: 0, moves: 0, anim: 0, done: false, busy: false };
      const s = g.s; s.b = [...Array(s.N)].map(() => new Array(s.N).fill(null));
      s.need = 3 + Math.floor(g.lv * 0.5); s.every = clamp(8 - Math.floor(g.lv / 6), 5, 8);
      addHero(s, g.lv); addHero(s, g.lv); addHero(s, g.lv); geo(g); addMonster(g);
    },
    layout(g) { if (g.s.b) geo(g); },
    swipe(g, d) { slide(g, d); },
    key(g, k, d) { if (!d) return; const m = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[k]; if (m) slide(g, m); },
    update(g, dt) {
      const s = g.s; s.anim = Math.max(0, s.anim - dt * 8);
      for (const row of s.b) for (const t of row) if (t) { t.pop = Math.max(0, t.pop - dt * 5); t.nw = Math.max(0, (t.nw || 0) - dt * 5); t.hit = Math.max(0, (t.hit || 0) - dt * 4); t.atk = Math.max(0, (t.atk || 0) - dt * 4); t.rage = Math.max(0, (t.rage || 0) - dt * 2); }
    },
    draw(g, ctx) {
      const s = g.s, W = g.W, H = g.H;
      const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#4f6d3f'); bg.addColorStop(1, '#16200f');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      g.scenery(['🌲', '🏰', '🌳', '⛰️'], 10, { alpha: 0.12, size: [24, 40] });
      if (!s.b) return;
      const cs = s.cs, N = s.N, a = cs * N;
      ctx.fillStyle = '#5c4630'; Arcade.rr(ctx, s.ox - 10, s.oy - 10, a + 20, a + 20, 16); ctx.fill();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { ctx.fillStyle = (r + c) % 2 ? '#8d7355' : '#7f6649'; Arcade.rr(ctx, s.ox + c * cs + 4, s.oy + r * cs + 4, cs - 8, cs - 8, 10); ctx.fill(); }
      const k = 1 - s.anim;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const t = s.b[r][c]; if (!t) continue;
        let x = s.ox + ((t.px ?? c) + (c - (t.px ?? c)) * k + 0.5) * cs, y = s.oy + ((t.py ?? r) + (r - (t.py ?? r)) * k + 0.5) * cs;
        if (t.atk && t.ad) { const j = Math.sin(t.atk * Math.PI) * cs * 0.25; x += t.ad[1] * j; y += t.ad[0] * j; }
        const z = (cs - 8) * (1 + t.pop * 0.18) * (1 - (t.nw || 0) * 0.6);
        if (t.m) {
          const sh = t.hit ? (Math.random() - 0.5) * 8 : 0;
          ctx.fillStyle = t.rage ? '#ff6b6b' : '#5f3dc4'; Arcade.rr(ctx, x - z / 2 + sh, y - z / 2, z, z, 12); ctx.fill();
          Arcade.emoji(ctx, MON[t.tier], x + sh, y - z * 0.06, z * (0.56 + (t.rage || 0) * 0.2));
          ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x - z * 0.4, y + z * 0.3, z * 0.8, 6);
          ctx.fillStyle = '#ff6b6b'; ctx.fillRect(x - z * 0.4, y + z * 0.3, z * 0.8 * Math.max(0, t.hp) / t.max, 6);
          Arcade.txt(ctx, t.hp, x - z * 0.34, y - z * 0.34, z * 0.17, '#ffc9c9', 'left', 900, 'rgba(0,0,0,.6)');
          ctx.fillStyle = t.cd <= 2 ? '#fa5252' : '#343a40'; ctx.beginPath(); ctx.arc(x + z * 0.34, y - z * 0.34, z * 0.15, 0, 6.3); ctx.fill();
          Arcade.txt(ctx, t.cd, x + z * 0.34, y - z * 0.33, z * 0.17, '#fff', 'center', 900);
          continue;
        }
        ctx.fillStyle = HC[t.t]; Arcade.rr(ctx, x - z / 2, y - z / 2, z, z, 12); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.35)'; Arcade.rr(ctx, x - z / 2 + 4, y - z / 2 + 4, z - 8, z * 0.2, 8); ctx.fill();
        Arcade.emoji(ctx, HER[t.t], x, y - z * 0.04, z * 0.56);
        Arcade.txt(ctx, '⚔' + power(t.t), x + z * 0.4, y + z * 0.36, z * 0.15, 'rgba(0,0,0,.55)', 'right', 900);
      }
      Arcade.txt(ctx, 'Monstruos: ' + Math.min(s.kills, s.need) + ' / ' + s.need, W / 2, s.oy - 50, 17, '#ffe8cc', 'center', 900, 'rgba(0,0,0,.4)');
      const bw = Math.min(260, a); ctx.fillStyle = 'rgba(0,0,0,.3)'; Arcade.rr(ctx, W / 2 - bw / 2, s.oy - 32, bw, 8, 4); ctx.fill();
      ctx.fillStyle = '#69db7c'; Arcade.rr(ctx, W / 2 - bw / 2, s.oy - 32, bw * clamp(s.kills / s.need, 0, 1), 8, 4); ctx.fill();
    },
  });
})();
