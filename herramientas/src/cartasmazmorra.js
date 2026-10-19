// Mazmorra de cartas|#1a1225
(function () {
  const { rand, clamp, pick, shuffle } = Arcade;
  const T = Arcade.T;
  // t: 'a' ataque · 's' habilidad · 'p' poder
  const CARDS = {
    golpe: { e: '⚔️', n: T('Golpe', 'Strike'), c: 1, t: 'a', dmg: 6 },
    defensa: { e: '🛡️', n: T('Defensa', 'Defend'), c: 1, t: 's', blk: 5 },
    embestida: { e: '🔨', n: T('Mazazo', 'Bash'), c: 2, t: 'a', dmg: 11 },
    punal: { e: '🗡️', n: T('Puñal', 'Dagger'), c: 0, t: 'a', dmg: 3 },
    torbellino: { e: '🌀', n: T('Torbellino', 'Whirl'), c: 1, t: 'a', dmg: 4, hits: 2 },
    veneno: { e: '🧪', n: T('Veneno', 'Poison'), c: 1, t: 's', poison: 5 },
    muralla: { e: '🧱', n: T('Muralla', 'Wall'), c: 2, t: 's', blk: 12 },
    furia: { e: '💪', n: T('Furia', 'Rage'), c: 1, t: 'p', str: 2 },
    pergamino: { e: '📜', n: T('Pergamino', 'Scroll'), c: 1, t: 's', draw: 2 },
    venda: { e: '🩹', n: T('Venda', 'Bandage'), c: 1, t: 's', heal: 5 },
    chispa: { e: '✨', n: T('Chispa', 'Spark'), c: 0, t: 's', energy: 1, draw: 1 },
    hacha: { e: '🪓', n: T('Hacha', 'Axe'), c: 1, t: 'a', dmg: 5, blk: 4 },
    meteoro: { e: '☄️', n: T('Meteoro', 'Meteor'), c: 3, t: 'a', dmg: 22 },
    espinas: { e: '🌵', n: T('Espinas', 'Thorns'), c: 1, t: 'p', thorns: 3 },
  };
  const REWARD = ['embestida', 'punal', 'torbellino', 'veneno', 'muralla', 'furia', 'pergamino', 'venda', 'chispa', 'hacha', 'meteoro', 'espinas'];
  function desc(c, str) {
    const out = [];
    if (c.dmg) out.push((c.hits ? (c.dmg + str) + '×' + c.hits : c.dmg + str) + T(' daño', ' dmg'));
    if (c.blk) out.push('+' + c.blk + ' 🛡️'); if (c.poison) out.push(c.poison + ' ' + T('veneno', 'poison')); if (c.str) out.push('+' + c.str + T(' fuerza', ' strength'));
    if (c.draw) out.push(T('roba ', 'draw ') + c.draw); if (c.heal) out.push(T('cura ', 'heal ') + c.heal); if (c.energy) out.push('+' + c.energy + '⚡'); if (c.thorns) out.push(c.thorns + T(' espinas', ' thorns'));
    return out.join(' · ');
  }
  const FOES = [
    { e: '🐀', n: T('Rata gigante', 'Giant rat'), hp: 22, ai: [{ atk: 5 }, { atk: 3, x: 2 }, { blk: 5 }] },
    { e: '🕷️', n: T('Araña', 'Spider'), hp: 26, ai: [{ atk: 4 }, { atk: 7 }, { blk: 6 }] },
    { e: '🐍', n: T('Serpiente', 'Snake'), hp: 30, ai: [{ atk: 8 }, { blk: 6 }, { atk: 4, x: 2 }] },
    { e: '💀', n: T('Esqueleto', 'Skeleton'), hp: 34, ai: [{ blk: 8 }, { atk: 9 }, { atk: 5, x: 2 }] },
    { e: '🦇', n: T('Murciélagos', 'Bats'), hp: 24, ai: [{ atk: 2, x: 4 }, { atk: 6 }, { blk: 4 }] },
  ];
  const BOSSES = [
    { e: '👹', n: T('Ogro', 'Ogre'), hp: 60, ai: [{ atk: 12 }, { str: 3 }, { blk: 10 }, { atk: 6, x: 2 }], boss: 1 },
    { e: '🐉', n: T('Dragón', 'Dragon'), hp: 72, ai: [{ atk: 14 }, { atk: 5, x: 3 }, { blk: 12 }, { str: 3 }], boss: 1 },
    { e: '🧙‍♂️', n: T('Hechicero', 'Sorcerer'), hp: 64, ai: [{ str: 2 }, { atk: 8, x: 2 }, { blk: 14 }, { atk: 13 }], boss: 1 },
  ];
  const START = ['golpe', 'golpe', 'golpe', 'golpe', 'golpe', 'defensa', 'defensa', 'defensa', 'defensa', 'embestida'];
  let UID = 0; const mk = (id) => ({ id, ...CARDS[id], uid: ++UID });

  /* ---------- combate ---------- */
  function newFight(g) {
    const s = g.s, L = g.lv, base = s.stage === 2 ? (L < 4 ? BOSSES[0] : pick(BOSSES)) : pick(FOES), k = 1 + Math.min(L - 1, 30) * 0.035 + s.stage * 0.08;
    s.foe = { ...base, max: Math.round(base.hp * k), hp: Math.round(base.hp * k), blk: 0, str: Math.min(3, Math.floor(L / 8)), poison: 0, step: 0, hit: 0 };
    s.draw = shuffle(s.deck.map((c) => ({ ...c }))); s.disc = []; s.hand = []; s.blk = 0; s.str = 0; s.thorns = 0; s.reward = null; s.phase = 'player';
    startTurn(g); g.message(s.stage === 2 ? T('¡Jefe! ', 'Boss! ') + base.n : base.n, 1.1);
  }
  function drawN(g, n) { const s = g.s; for (let k = 0; k < n; k++) { if (!s.draw.length) { if (!s.disc.length) return; s.draw = shuffle(s.disc); s.disc = []; } if (s.hand.length < 10) s.hand.push(s.draw.pop()); } }
  function startTurn(g) { const s = g.s; s.energy = 3; s.blk = 0; s.phase = 'player'; drawN(g, 5); s.turnN = (s.turnN || 0) + 1; }
  const intent = (s) => s.foe.ai[s.foe.step % s.foe.ai.length];
  const atkOf = (s, i) => (i.atk ? (i.atk + s.foe.str) * (i.x || 1) : 0);
  function hurtFoe(g, n) {
    const s = g.s, f = s.foe, b = Math.min(f.blk, n); f.blk -= b; n -= b; f.hp -= n; f.hit = 0.35;
    g.float(n ? '-' + n : '🛡️', s.foeX, s.foeY - 30 + rand(-10, 10), n ? '#ff6b6b' : '#74c0fc', 26); if (n) { g.burst(s.foeX, s.foeY, { n: 8, color: ['#ff6b6b', '#ffd43b'], speed: 140 }); g.shake(0.12, 4); }
  }
  function playCard(g, i) {
    const s = g.s, c = s.hand[i]; if (!c || s.phase !== 'player' || c.c > s.energy) return false;
    s.energy -= c.c; s.hand.splice(i, 1); s.sel = null;
    if (c.dmg) { for (let k = 0; k < (c.hits || 1); k++) hurtFoe(g, c.dmg + s.str); Arcade.sfx.hit(); }
    if (c.blk) { s.blk += c.blk; Arcade.tone(420, 0.08, 'triangle', 0.06); g.float('+' + c.blk + '🛡️', s.meX, s.meY - 30, '#74c0fc', 20); }
    if (c.poison) { s.foe.poison += c.poison; g.float('🧪' + c.poison, s.foeX, s.foeY - 40, '#69db7c', 22); }
    if (c.str) { s.str += c.str; Arcade.sfx.up(); g.float('💪+' + c.str, s.meX, s.meY - 30, '#ffd43b', 20); }
    if (c.thorns) { s.thorns += c.thorns; Arcade.sfx.up(); }
    if (c.heal) { const v = Math.min(c.heal, s.max - s.hp); s.hp += v; g.float('+' + v, s.meX, s.meY - 30, '#69db7c', 22); }
    if (c.energy) s.energy += c.energy; if (c.draw) drawN(g, c.draw);
    if (c.t !== 'p') s.disc.push(c);
    s.played++; if (s.foe.hp <= 0) winFight(g); return true;
  }
  function endTurn(g) {
    const s = g.s; if (s.phase !== 'player') return; s.disc.push(...s.hand); s.hand = []; s.sel = null; s.phase = 'foe'; s.foeT = 0.7; Arcade.tone(300, 0.08, 'sine', 0.06);
  }
  function foeAct(g) {
    const s = g.s, f = s.foe;
    if (f.poison > 0) { f.hp -= f.poison; g.float('🧪-' + f.poison, s.foeX, s.foeY - 40, '#69db7c', 22); f.poison--; if (f.hp <= 0) return winFight(g); }
    f.blk = 0; const it = intent(s);
    if (it.atk) { for (let k = 0; k < (it.x || 1); k++) { let n = it.atk + f.str; const b = Math.min(s.blk, n); s.blk -= b; n -= b; s.hp -= n; g.float(n ? '-' + n : '🛡️', s.meX + rand(-10, 10), s.meY - 30, n ? '#ff6b6b' : '#74c0fc', 24); if (s.thorns) hurtFoe(g, s.thorns); }
      Arcade.sfx.hit(); g.shake(0.2, 6); s.lunge = 0.35; if (f.hp <= 0) return winFight(g); }
    if (it.blk) { f.blk += it.blk; Arcade.tone(260, 0.1, 'triangle', 0.06); }
    if (it.str) { f.str += it.str; Arcade.sfx.bad(); g.float('💪+' + it.str, s.foeX, s.foeY - 40, '#ff922b', 22); }
    f.step++;
    if (s.hp <= 0) { s.hp = 0; s.phase = 'dead'; Arcade.sfx.lose(); g.message(T('Has caído en la mazmorra', 'You fell in the dungeon'), 1.5); setTimeout(() => { if (g.state === 'play' && g.die()) Arcade.current.def.setup(g); }, 1900); return; }
    startTurn(g);
  }
  function winFight(g) {
    const s = g.s; s.phase = 'won'; s.foe.hp = 0; Arcade.sfx.win(); g.confetti(s.stage === 2 ? 90 : 35); g.addScore((s.stage + 1) * 100 * g.lv + s.hp * 5, s.foeX, s.foeY);
    s.disc.push(...s.hand); s.hand = [];
    setTimeout(() => {
      if (g.state !== 'play') return;
      if (s.stage === 2) { const p = s.hp / s.max; g.win(p >= 0.6 ? 3 : p >= 0.3 ? 2 : 1); return; }
      const opts = shuffle(REWARD.slice()).slice(0, 3).map(mk); s.reward = opts; s.phase = 'reward';
    }, 1100);
  }
  function takeReward(g, k) {
    const s = g.s; if (k >= 0) { s.deck.push(s.reward[k]); Arcade.sfx.coin(); } s.hp = Math.min(s.max, s.hp + 12);
    s.stage++; s.turnN = 0; newFight(g);
  }

  /* ---------- IA de la demo ---------- */
  function think(g) {
    const s = g.s, H = s.hand, e = s.energy, f = s.foe, it = intent(s), inc = atkOf(s, it);
    const ok = H.map((c, i) => i).filter((i) => H[i].c <= e); if (!ok.length) return -1;
    const dmg = (c) => (c.dmg ? (c.dmg + s.str) * (c.hits || 1) : 0);
    // ¿letal?
    let left = e, tot = 0; for (const i of ok.slice().sort((a, b) => dmg(H[b]) / (H[b].c || 0.5) - dmg(H[a]) / (H[a].c || 0.5))) if (H[i].c <= left && dmg(H[i])) { left -= H[i].c; tot += dmg(H[i]); }
    if (tot >= f.hp + f.blk) return ok.filter((i) => dmg(H[i])).sort((a, b) => dmg(H[b]) - dmg(H[a]))[0];
    const free = ok.find((i) => H[i].energy || (H[i].draw && H[i].c === 0)); if (free != null) return free;
    const pw = ok.find((i) => H[i].t === 'p' && s.turnN <= 3); if (pw != null) return pw;
    const pois = ok.find((i) => H[i].poison && f.hp > 15); if (pois != null) return pois;
    const drw = ok.find((i) => H[i].draw); if (drw != null && e >= 2) return drw;
    if (inc > s.blk) { const b = ok.filter((i) => H[i].blk).sort((a, b) => H[b].blk / (H[b].c || 0.5) - H[a].blk / (H[a].c || 0.5))[0]; if (b != null) return b; }
    const heal = ok.find((i) => H[i].heal && s.hp < s.max - 6); if (heal != null) return heal;
    const a = ok.filter((i) => dmg(H[i])).sort((x, y) => dmg(H[y]) / (H[y].c || 0.5) - dmg(H[x]) / (H[x].c || 0.5))[0]; if (a != null) return a;
    return ok.find((i) => H[i].blk) != null ? ok.find((i) => H[i].blk) : -1;
  }

  /* ---------- geometría ---------- */
  function geo(g) {
    const s = g.s, W = g.W, top = g.top + 30, bot = g.bot - (g.demoOn ? 46 : 0);
    s.cw = Math.min(76, (W - 20) / 5.2); s.ch = s.cw * 1.42; s.handY = bot - s.ch - 8;
    s.foeX = W * 0.66; s.foeY = top + (s.handY - top) * 0.36; s.meX = W * 0.22; s.meY = top + (s.handY - top) * 0.62;
    s.endB = { x: W - 120, y: s.handY - 60, w: 110, h: 42 };
  }
  function handRect(g, i) { const s = g.s, n = s.hand.length, sp = Math.min(s.cw + 4, (g.W - 16 - s.cw) / Math.max(1, n - 1)), x0 = g.W / 2 - ((n - 1) * sp + s.cw) / 2; return { x: x0 + i * sp, y: s.handY - (s.sel === i ? 16 : 0), w: s.cw, h: s.ch }; }
  function rewardRect(g, k) { const s = g.s, w = Math.min(104, (g.W - 40) / 3), h = w * 1.42; return { x: g.W / 2 + (k - 1) * (w + 10) - w / 2, y: g.H * 0.4 - h / 2, w, h }; }
  const skipB = (g) => ({ x: g.W / 2 - 70, y: g.H * 0.4 + 130, w: 140, h: 40 });
  const inR = (b, p) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;

  function card(ctx, r, c, o = {}) {
    const col = c.t === 'a' ? ['#ffc9c9', '#c92a2a'] : c.t === 's' ? ['#d0ebff', '#1971c2'] : ['#fff3bf', '#e67700'];
    ctx.save(); if (o.dim) ctx.globalAlpha = 0.5;
    ctx.fillStyle = 'rgba(0,0,0,.4)'; Arcade.rr(ctx, r.x + 2, r.y + 3, r.w, r.h, 10); ctx.fill();
    const gr = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h); gr.addColorStop(0, col[0]); gr.addColorStop(1, col[1]); ctx.fillStyle = gr; Arcade.rr(ctx, r.x, r.y, r.w, r.h, 10); ctx.fill();
    ctx.strokeStyle = o.sel ? '#ffd43b' : o.glow ? '#69db7c' : 'rgba(0,0,0,.5)'; ctx.lineWidth = o.sel || o.glow ? 3 : 1.5; ctx.stroke();
    Arcade.emoji(ctx, c.e, r.x + r.w / 2, r.y + r.h * 0.34, r.w * 0.4);
    Arcade.txt(ctx, c.n, r.x + r.w / 2, r.y + r.h * 0.6, Math.max(9, r.w * 0.14), '#111', 'center', 900);
    const d = desc(c, o.str || 0).split(' · ');
    d.slice(0, 2).forEach((ln, k) => Arcade.txt(ctx, ln, r.x + r.w / 2, r.y + r.h * 0.75 + k * Math.max(10, r.w * 0.14), Math.max(8, r.w * 0.12), '#fff', 'center', 800, 'rgba(0,0,0,.5)'));
    ctx.fillStyle = '#1c1c3a'; ctx.beginPath(); ctx.arc(r.x + 10, r.y + 10, 11, 0, 6.3); ctx.fill(); ctx.strokeStyle = '#ffd43b'; ctx.lineWidth = 1.5; ctx.stroke();
    Arcade.txt(ctx, String(c.c), r.x + 10, r.y + 11, 13, '#ffd43b', 'center', 900);
    ctx.restore();
  }
  function bar(ctx, x, y, w, v, max, blk) {
    ctx.fillStyle = 'rgba(0,0,0,.5)'; Arcade.rr(ctx, x, y, w, 12, 6); ctx.fill();
    ctx.fillStyle = '#e03131'; Arcade.rr(ctx, x, y, w * clamp(v / max, 0, 1), 12, 6); ctx.fill();
    Arcade.txt(ctx, Math.max(0, v) + '/' + max, x + w / 2, y + 7, 10, '#fff', 'center', 900);
    if (blk) { ctx.fillStyle = '#1c7ed6'; ctx.beginPath(); ctx.arc(x - 4, y + 6, 11, 0, 6.3); ctx.fill(); Arcade.txt(ctx, String(blk), x - 4, y + 7, 11, '#fff', 'center', 900); }
  }

  Arcade.game({
    /*THEME*/ home: 'indexpro.html', tag: 'Baja la mazmorra a golpe de carta', deco: ['🗡️', '🛡️', '🧪', '🐉', '💀', '🃏'], font: 'round', bg: ['#2d1b4e', '#1a1225'],
    music: { mode: 'minor', bpm: 100, wave: 'triangle', style: 'epic', root: 50 }, voice: { wave: 'triangle', mul: 1, echo: 0.35 },
    /*EN*/ en: { title: 'Card Dungeon', tag: 'Fight down the dungeon card by card', help: 'Each level has three fights: two monsters and a boss. Each turn you get 3 ⚡ energy and draw 5 cards. Tap a card to play it; its cost is in the yellow circle. Red cards attack, blue ones defend or help, and gold ones last the whole fight. 🛡️ Block stops damage this turn. Above the monster you can see what it will do: ⚔️ attack, 🛡️ defend or 💪 get stronger. When you\'re done, press End turn. After each win, pick a new card for your deck. If you beat the boss, you pass the level.', tvHelp: 'D-pad to a card · OK plays it.', dict: { 'Fin turno': 'End turn', 'Elige una carta para tu mazo': 'Pick a card for your deck', 'Saltar': 'Skip', 'Combate ': 'Fight ', 'Mazo': 'Deck', 'Descartes': 'Discard' } },
    /*TV*/ tvHelp: 'Cruceta hasta una carta · OK la juega.',
    tv: { mode: 'tap', targets: (g) => { const s = g.s; if (!s.foe) return []; if (s.phase === 'reward') return [0, 1, 2].map((k) => rewardRect(g, k)).concat([skipB(g)]); if (s.phase !== 'player') return []; return s.hand.map((c, i) => handRect(g, i)).concat([s.endB]); } },
    id: 'cartasmazmorra', title: 'Mazmorra de cartas', emoji: '🗡️', color: '#b197fc', origin: 'Slay the Spire (MegaCrit, 2019)', pad: false,
    help: 'Cada nivel tiene tres combates: dos monstruos y un jefe. Cada turno tienes 3 ⚡ de energía y robas 5 cartas. Toca una carta para jugarla; su coste está en el círculo amarillo. Las rojas atacan, las azules defienden o ayudan y las doradas duran todo el combate. El 🛡️ escudo para el daño de este turno. Encima del monstruo ves lo que va a hacer: ⚔️ atacar, 🛡️ defenderse o 💪 hacerse más fuerte. Cuando acabes, pulsa Fin turno. Tras cada victoria eliges una carta nueva para tu mazo. Si vences al jefe, pasas el nivel.',
    lives: 3, levels: 0, cap: 20,
    /*SC*/ demo(g) {
      const s = g.s; if (!s.foe) return { wait: 0.4 };
      const say = (es, en) => (s.said = (s.said || 0) + 1) < 10 ? T(es, en) : null;
      if (s.phase === 'reward') { const k = s.reward.map((c, k) => k).sort((a, b) => (s.reward[b].dmg || 0) + (s.reward[b].blk || 0) + (s.reward[b].str || 0) * 4 - ((s.reward[a].dmg || 0) + (s.reward[a].blk || 0) + (s.reward[a].str || 0) * 4))[0], r = rewardRect(g, k); return { tap: [r.x + r.w / 2, r.y + r.h / 2], after: 0.8, say: say('Elige una carta nueva para tu mazo', 'Pick a new card for your deck') }; }
      if (s.phase !== 'player') return { wait: 0.4 };
      const i = think(g);
      if (i < 0) return { tap: [s.endB.x + s.endB.w / 2, s.endB.y + s.endB.h / 2], after: 0.8, say: say('Sin energía: fin de turno', 'Out of energy: end turn') };
      const c = s.hand[i], r = handRect(g, i), inc = atkOf(s, intent(s));
      const why = c.blk && !c.dmg && inc > s.blk ? T('Te va a atacar con ', 'It will hit you for ') + inc + T(': cúbrete', ': block') : c.dmg ? T('¡Ataca!', 'Attack!') : c.t === 'p' ? T('Las doradas duran todo el combate', 'Gold cards last the whole fight') : T('Una ayuda', 'Some help');
      const nx = i + 1 < s.hand.length ? handRect(g, i + 1).x : r.x + r.w; return { tap: [(r.x + nx) / 2, r.y + r.h / 2], after: 0.65, say: say(why, why) };
    },
    setup(g) {
      g.s = { deck: START.map(mk), hp: 40 + Math.min(g.lv, 30), max: 40 + Math.min(g.lv, 30), stage: 0, played: 0, sel: null, foeT: 0, lunge: 0 };
      geo(g); newFight(g);
    },
    layout(g) { if (g.s.foe) geo(g); },
    tap(g, p) {
      const s = g.s; if (!s.foe) return;
      if (s.phase === 'reward') { for (let k = 0; k < 3; k++) if (inR(rewardRect(g, k), p)) return takeReward(g, k); if (inR(skipB(g), p)) takeReward(g, -1); return; }
      if (s.phase !== 'player') return;
      if (inR(s.endB, p)) return endTurn(g);
      for (let i = s.hand.length - 1; i >= 0; i--) if (inR(handRect(g, i), p)) { const c = s.hand[i]; if (c.c > s.energy) { s.why = T('Te falta energía ⚡', 'Not enough energy ⚡'); s.whyT = 1.2; Arcade.sfx.bad(); return; } playCard(g, i); return; }
    },
    update(g, dt) {
      const s = g.s; if (!s.foe) return; geo(g); if (s.whyT > 0) s.whyT -= dt; if (s.foe.hit > 0) s.foe.hit -= dt; if (s.lunge > 0) s.lunge -= dt;
      if (s.phase === 'foe') { s.foeT -= dt * (g.demoAuto ? 1.5 : 1); if (s.foeT <= 0) foeAct(g); }
    },
    draw(g, ctx) {
      const s = g.s, W = g.W, H = g.H;
      const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#2d1b4e'); bg.addColorStop(1, '#120c1a'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(0,0,0,.25)'; for (let k = 0; k < 8; k++) ctx.fillRect(0, H * 0.55 + k * 14, W, 1);
      if (!s.foe) return;
      Arcade.txt(ctx, T('Combate ', 'Fight ') + (s.stage + 1) + '/3' + (s.stage === 2 ? ' 👑' : ''), 14, g.top + 14, 14, '#e5dbff', 'left', 900);
      Arcade.txt(ctx, '📚 ' + s.draw.length + '  ♻️ ' + s.disc.length, 14, g.top + 34, 12, '#b197fc', 'left', 800);
      // monstruo
      const f = s.foe, fx = s.foeX - (s.lunge > 0 ? Math.sin(s.lunge / 0.35 * Math.PI) * 60 : 0), fy = s.foeY, sz = f.boss ? 96 : 76;
      if (f.hp > 0 || s.phase !== 'won') {
        ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(s.foeX, fy + sz * 0.5, sz * 0.5, 10, 0, 0, 6.3); ctx.fill();
        if (f.hit > 0) { ctx.save(); ctx.globalAlpha = 0.7; } Arcade.emoji(ctx, f.e, fx, fy + Math.sin(g.rt * 2) * 3, sz); if (f.hit > 0) ctx.restore();
      }
      bar(ctx, s.foeX - 55, fy + sz * 0.5 + 14, 110, f.hp, f.max, f.blk);
      Arcade.txt(ctx, f.n + (f.str ? '  💪' + f.str : '') + (f.poison ? '  🧪' + f.poison : ''), s.foeX, fy + sz * 0.5 + 40, 12, '#fff', 'center', 800);
      if (s.phase === 'player' || s.phase === 'foe') { const it = intent(s), lab = it.atk ? '⚔️ ' + (it.atk + f.str) + (it.x ? '×' + it.x : '') : it.blk ? '🛡️ ' + it.blk : '💪 +' + it.str;
        ctx.fillStyle = it.atk ? 'rgba(224,49,49,.85)' : 'rgba(28,126,214,.85)'; Arcade.rr(ctx, s.foeX - 40, fy - sz * 0.5 - 40, 80, 28, 14); ctx.fill(); Arcade.txt(ctx, lab, s.foeX, fy - sz * 0.5 - 25, 15, '#fff', 'center', 900); }
      // héroe
      Arcade.emoji(ctx, '🧝', s.meX, s.meY, 64); bar(ctx, s.meX - 45, s.meY + 42, 90, s.hp, s.max, s.blk);
      Arcade.txt(ctx, (s.str ? '💪' + s.str + ' ' : '') + (s.thorns ? '🌵' + s.thorns : ''), s.meX, s.meY + 68, 12, '#ffd43b', 'center', 800);
      // energía
      ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(34, s.handY - 40, 24, 0, 6.3); ctx.fill(); ctx.strokeStyle = '#e67700'; ctx.lineWidth = 3; ctx.stroke();
      Arcade.txt(ctx, s.energy + '/3', 34, s.handY - 39, 15, '#5c3d00', 'center', 900);
      // botón
      if (s.phase === 'player') { const b = s.endB, none = !s.hand.some((c) => c.c <= s.energy); ctx.fillStyle = none ? '#f59f00' : '#7048e8'; Arcade.rr(ctx, b.x, b.y, b.w, b.h, 12); ctx.fill(); if (none) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.4 + 0.4 * Math.sin(g.rt * 6)) + ')'; ctx.lineWidth = 3; ctx.stroke(); } Arcade.txt(ctx, 'Fin turno', b.x + b.w / 2, b.y + b.h / 2 + 1, 15, '#fff', 'center', 900); }
      // mano
      s.hand.forEach((c, i) => card(ctx, handRect(g, i), c, { glow: s.phase === 'player' && c.c <= s.energy, dim: c.c > s.energy, str: s.str }));
      if (s.whyT > 0) Arcade.txt(ctx, s.why, W / 2, s.handY - 14, 13, '#ffa8a8', 'center', 900, 'rgba(0,0,0,.6)');
      // recompensa
      if (s.phase === 'reward') {
        ctx.fillStyle = 'rgba(10,5,20,.8)'; ctx.fillRect(0, 0, W, H);
        Arcade.txt(ctx, 'Elige una carta para tu mazo', W / 2, rewardRect(g, 0).y - 30, 18, '#fff', 'center', 900);
        s.reward.forEach((c, k) => card(ctx, rewardRect(g, k), c, { glow: true }));
        const b = skipB(g); ctx.fillStyle = 'rgba(255,255,255,.15)'; Arcade.rr(ctx, b.x, b.y, b.w, b.h, 12); ctx.fill(); Arcade.txt(ctx, 'Saltar', b.x + b.w / 2, b.y + b.h / 2, 14, '#fff', 'center', 800);
        Arcade.txt(ctx, T('Recuperas 12 ❤', 'You recover 12 ❤'), W / 2, b.y + b.h + 44, 12, '#69db7c', 'center', 800);
      }
    },
  });
})();
