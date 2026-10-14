// Ratonera|#1a1325
(function () {
  const { ri, pick, shuffle, dist } = Arcade;
  const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
  const DC = ['#ffd43b', '#ff6b6b', '#4dabf7'];

  function geo(g) {
    const s = g.s, Wa = g.W - 20, Ha = g.bot - g.top - 120;
    s.cs = Math.min(Wa / s.C, Ha / s.R);
    s.ox = (g.W - s.cs * s.C) / 2; s.oy = g.top + 30 + (Ha - s.cs * s.R) / 2;
    s.by = s.oy + s.cs * s.R + 46;
  }
  function gen(g) {
    const s = g.s, C = s.C, R = s.R;
    s.E = []; s.S = [];
    for (let c = 0; c < C; c++) { s.E.push(new Array(R).fill(true)); s.S.push(new Array(R).fill(true)); }
    const seen = new Set(['0,0']), st = [[0, 0]];
    while (st.length) {
      const [c, r] = st[st.length - 1];
      const opts = shuffle(Object.entries(D)).filter(([, [dx, dy]]) => { const nc = c + dx, nr = r + dy; return nc >= 0 && nc < C && nr >= 0 && nr < R && !seen.has(nc + ',' + nr); });
      if (!opts.length) { st.pop(); continue; }
      const [d, [dx, dy]] = opts[0];
      open(s, c, r, d); seen.add((c + dx) + ',' + (r + dy)); st.push([c + dx, r + dy]);
    }
    for (let c = 0; c < C; c++) for (let r = 0; r < R; r++) {
      if (c < C - 1 && s.E[c][r] && Math.random() < 0.4) s.E[c][r] = false;
      if (r < R - 1 && s.S[c][r] && Math.random() < 0.4) s.S[c][r] = false;
    }
    // puertas de colores sobre pasos abiertos
    s.doors = {}; s.dOpen = [Math.random() < 0.5, Math.random() < 0.5, Math.random() < 0.5];
    const edges = [];
    for (let c = 0; c < C; c++) for (let r = 0; r < R; r++) { if (c < C - 1 && !s.E[c][r]) edges.push('E' + c + ',' + r); if (r < R - 1 && !s.S[c][r]) edges.push('S' + c + ',' + r); }
    shuffle(edges);
    const n = Math.round(C * R / 5);
    for (let i = 0; i < n && i < edges.length; i++) s.doors[edges[i]] = i % 3;
  }
  function open(s, c, r, d) { if (d === 'right') s.E[c][r] = false; else if (d === 'left') s.E[c - 1][r] = false; else if (d === 'down') s.S[c][r] = false; else s.S[c][r - 1] = false; }
  const ekey = (c, r, d) => d === 'right' ? 'E' + c + ',' + r : d === 'left' ? 'E' + (c - 1) + ',' + r : d === 'down' ? 'S' + c + ',' + r : 'S' + c + ',' + (r - 1);
  function pass(s, c, r, d) {
    const nc = c + D[d][0], nr = r + D[d][1];
    if (nc < 0 || nc >= s.C || nr < 0 || nr >= s.R) return false;
    if (d === 'right' && s.E[c][r]) return false; if (d === 'left' && s.E[c - 1][r]) return false;
    if (d === 'down' && s.S[c][r]) return false; if (d === 'up' && s.S[c][r - 1]) return false;
    const k = ekey(c, r, d); if (k in s.doors && !s.dOpen[s.doors[k]]) return false;
    return true;
  }
  const pos = (s, m) => ({ x: s.ox + (m.c + 0.5 + (m.moving ? D[m.dir][0] * m.p : 0)) * s.cs, y: s.oy + (m.r + 0.5 + (m.moving ? D[m.dir][1] * m.p : 0)) * s.cs });
  function arrive(g, m) { m.c += D[m.dir][0]; m.r += D[m.dir][1]; m.p = 0; }
  function placeActors(g) {
    const s = g.s;
    s.pl = { c: Math.floor(s.C / 2), r: s.R - 1, dir: 'up', p: 0, moving: false, q: null };
    s.cats = [];
    const n = Math.min(5, 2 + Math.floor(g.lv / 2));
    for (let i = 0; i < n; i++) s.cats.push({ c: i % 2 ? s.C - 1 : 0, r: Math.floor(i / 2) % s.R, dir: 'down', p: 0, moving: false, sp: 2.4 + g.lv * 0.12 + i * 0.08, dead: 0 });
  }

  Arcade.game({
    /*THEME*/ tag: "Puertas de colores contra gatos", deco: ["🧀", "👻", "🦴", "🐶", "🧀", "🚪"], font: "comic", bg: ["#2a1f3a", "#1a1325"], music: {"mode": "mixo", "bpm": 132, "wave": "square", "style": "arcade", "root": 60}, voice: {"wave": "square", "mul": 1.2, "echo": 0.15}, ambient: {"e": ["🧀"], "n": 5, "vy": 16, "sway": 10, "spin": 1, "alpha": 0.08},
    /*EN*/ en: {"title": "Mousetrap", "tag": "Coloured doors versus ghosts", "help": "<b>Swipe</b> to move the hero and eat all the cheese. The <b>coloured doors</b> all open and close at once with the <b>buttons</b> below: use them to block the ghosts 👻. Bones 🦴 are stored: press 🦴 to become a <b>dog</b> for a few seconds and eat the ghosts.", "tvHelp": "D-pad to move · OK opens or closes the doors of the nearest colour · bones 🦴 are used automatically when a ghost gets close.", "dict": {"abierta": "open", "cerrada": "closed", "🐶 ¡Perro!": "🐶 Dog!"}},
    /*TV*/ tvHelp: "Cruceta para moverte · OK abre o cierra las puertas del color más cercano · los huesos 🦴 se usan solos cuando un gato se acerca.",
    id: 'ratonera', title: 'Ratonera', emoji: '😀', color: '#ffd43b', origin: 'Mouse Trap (Exidy, 1981)',
    help: '<b>Desliza</b> para mover al héroe y cómete todo el queso. Las <b>puertas de colores</b> se abren y cierran todas a la vez con los <b>botones</b> de abajo: úsalas para cortar el paso a los fantasmas 👻. Los huesos 🦴 se guardan: pulsa 🦴 para convertirte en <b>perro</b> unos segundos y comerte a los fantasmas.',
    lives: 3, levels: 0, cap: 16,
    setup(g) {
      g.s = { inv: 1.5, bones: 0, dog: 0 };
      const s = g.s;
      if (g.W < g.H) { s.C = 9; s.R = 11; } else { s.C = 15; s.R = 7; }
      gen(g); geo(g); placeActors(g);
      s.cheese = new Set(); s.boneSet = new Set();
      const cells = []; for (let c = 0; c < s.C; c++) for (let r = 0; r < s.R; r++) cells.push(c + ',' + r);
      shuffle(cells);
      for (let i = 0; i < 3; i++) s.boneSet.add(cells[i]);
      for (const k of cells) if (!s.boneSet.has(k)) s.cheese.add(k);
      s.cheese.delete(s.pl.c + ',' + s.pl.r);
    },
    layout(g) { if (g.s.E) geo(g); },
    down(g, p) {
      const s = g.s;
      if (Math.abs(p.y - s.by) < 30) {
        const bw = Math.min(70, (g.W - 40) / 4), x0 = g.W / 2 - bw * 2;
        const i = Math.floor((p.x - x0) / bw);
        if (i >= 0 && i < 3) { s.dOpen[i] = !s.dOpen[i]; Arcade.tone(s.dOpen[i] ? 600 : 300, 0.06, 'square', 0.08); return; }
        if (i === 3 && s.bones > 0 && s.dog <= 0) { s.bones--; s.dog = 6; Arcade.sfx.up(); return; }
      }
    },
    swipe(g, d) {
      const m = g.s.pl;
      if (m.moving && d === OPP[m.dir]) { m.c += D[m.dir][0]; m.r += D[m.dir][1]; m.dir = d; m.p = 1 - m.p; return; }
      m.q = d;
    },
    key(g, k, d) {
      if (!d) return; const m = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[k];
      if (m) this.swipe(g, m); else if ('123'.includes(k)) { g.s.dOpen[+k - 1] = !g.s.dOpen[+k - 1]; } else if (k === ' ' && Arcade.tv) { /*TVKEY*/
        const s = g.s, pp = pos(s, s.pl); let best = null, bd = 1e9;
        for (const key in s.doors) { const [c, r] = key.slice(1).split(',').map(Number), x = s.ox + (c + (key[0] === 'E' ? 1 : 0.5)) * s.cs, y = s.oy + (r + (key[0] === 'S' ? 1 : 0.5)) * s.cs, d2 = (x - pp.x) ** 2 + (y - pp.y) ** 2; if (d2 < bd) { bd = d2; best = s.doors[key]; } }
        if (best != null) { s.dOpen[best] = !s.dOpen[best]; Arcade.tone(s.dOpen[best] ? 600 : 300, 0.06, 'square', 0.08); }
      }
      else if (k === ' ' && g.s.bones > 0 && g.s.dog <= 0) { g.s.bones--; g.s.dog = 6; }
    },
    update(g, dt) {
      const s = g.s, m = s.pl;
      s.inv = Math.max(0, s.inv - dt); s.dog = Math.max(0, s.dog - dt);
      if (Arcade.tv && s.bones > 0 && s.dog <= 0 && s.cats.some(c => !(c.dead > 0) && Math.abs(c.c - m.c) + Math.abs(c.r - m.r) <= 2)) { s.bones--; s.dog = 6; Arcade.sfx.up(); g.float('🐶 ¡Perro!', pos(s, m).x, pos(s, m).y - 20, '#e599f7', 20); } /*TVKEY*/
      if (!m.moving) {
        if (m.q && pass(s, m.c, m.r, m.q)) { m.dir = m.q; m.q = null; m.moving = true; }
        else if (pass(s, m.c, m.r, m.dir) && m.wasMoving) m.moving = true;
      }
      if (m.moving) {
        m.p += (s.dog > 0 ? 5 : 4.4) * dt;
        if (m.p >= 1) {
          arrive(g, m); m.moving = false; m.wasMoving = true;
          const k = m.c + ',' + m.r;
          if (s.cheese.has(k)) { s.cheese.delete(k); g.addScore(10); if (s.cheese.size % 4 === 0) Arcade.sfx.tick(); }
          if (s.boneSet.has(k)) { s.boneSet.delete(k); s.bones++; g.float('+🦴', pos(s, m).x, pos(s, m).y - 16, '#fff', 20); Arcade.sfx.coin(); }
          if (!s.cheese.size) { g.addScore(800 * g.lv, g.W / 2, g.H / 2); g.win(); return; }
          if (m.q && pass(s, m.c, m.r, m.q)) { m.dir = m.q; m.q = null; m.moving = true; }
          else if (pass(s, m.c, m.r, m.dir)) m.moving = true;
          else m.wasMoving = false;
        }
      }
      const pp = pos(s, m);
      for (const c of s.cats) {
        if (c.dead > 0) { c.dead -= dt; if (c.dead <= 0) { c.c = 0; c.r = 0; c.moving = false; } continue; }
        if (!c.moving) {
          let opts = Object.keys(D).filter(d => pass(s, c.c, c.r, d) && d !== OPP[c.dir]);
          if (!opts.length) opts = Object.keys(D).filter(d => pass(s, c.c, c.r, d));
          if (opts.length) {
            const toward = (d) => dist(c.c + D[d][0], c.r + D[d][1], m.c, m.r);
            if (Math.random() < 0.55) opts.sort((a, b) => s.dog > 0 ? toward(b) - toward(a) : toward(a) - toward(b)); else shuffle(opts);
            c.dir = opts[0]; c.moving = true;
          }
        } else {
          c.p += c.sp * (s.dog > 0 ? 0.6 : 1) * dt;
          if (c.p >= 1) { arrive(g, c); c.moving = false; }
          else if (!pass(s, c.c, c.r, c.dir) && c.p < 0.5) { c.p = 0; c.moving = false; c.dir = OPP[c.dir]; }
        }
        const cp = pos(s, c);
        if (Math.hypot(cp.x - pp.x, cp.y - pp.y) < s.cs * 0.6) {
          if (s.dog > 0) { c.dead = 5; c.p = 0; c.moving = false; g.addScore(400, cp.x, cp.y - 16); Arcade.sfx.pop(); g.burst(cp.x, cp.y, { n: 10, emoji: '💥', size: 14, speed: 140 }); }
          else if (s.inv <= 0) { g.burst(pp.x, pp.y, { n: 16, color: ['#fff', '#ffd43b'], speed: 200 }); if (g.die()) { placeActors(g); s.inv = 2; } return; }
        }
      }
    },
    draw(g, ctx) {
      const s = g.s, W = g.W, H = g.H;
      ctx.fillStyle = '#1a1325'; ctx.fillRect(0, 0, W, H);
      if (!s.E) return;
      const cs = s.cs, ox = s.ox, oy = s.oy;
      ctx.fillStyle = '#251b36'; ctx.fillRect(ox, oy, cs * s.C, cs * s.R);
      for (const k of s.cheese) { const [c, r] = k.split(',').map(Number); ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.moveTo(ox + (c + 0.38) * cs, oy + (r + 0.6) * cs); ctx.lineTo(ox + (c + 0.62) * cs, oy + (r + 0.6) * cs); ctx.lineTo(ox + (c + 0.62) * cs, oy + (r + 0.42) * cs); ctx.fill(); }
      for (const k of s.boneSet) { const [c, r] = k.split(',').map(Number); Arcade.emoji(ctx, '🦴', ox + (c + 0.5) * cs, oy + (r + 0.5) * cs, cs * 0.55); }
      ctx.strokeStyle = '#9775fa'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(3, cs * 0.1);
      ctx.beginPath(); ctx.rect(ox, oy, cs * s.C, cs * s.R);
      for (let c = 0; c < s.C; c++) for (let r = 0; r < s.R; r++) {
        if (c < s.C - 1 && s.E[c][r]) { ctx.moveTo(ox + (c + 1) * cs, oy + r * cs); ctx.lineTo(ox + (c + 1) * cs, oy + (r + 1) * cs); }
        if (r < s.R - 1 && s.S[c][r]) { ctx.moveTo(ox + c * cs, oy + (r + 1) * cs); ctx.lineTo(ox + (c + 1) * cs, oy + (r + 1) * cs); }
      }
      ctx.stroke();
      for (const k in s.doors) {
        const col = s.doors[k], op = s.dOpen[col], [c, r] = k.slice(1).split(',').map(Number);
        ctx.strokeStyle = DC[col]; ctx.lineWidth = op ? 2 : Math.max(5, cs * 0.18); ctx.globalAlpha = op ? 0.35 : 1; ctx.setLineDash(op ? [3, 4] : []);
        ctx.beginPath();
        if (k[0] === 'E') { ctx.moveTo(ox + (c + 1) * cs, oy + r * cs + 3); ctx.lineTo(ox + (c + 1) * cs, oy + (r + 1) * cs - 3); }
        else { ctx.moveTo(ox + c * cs + 3, oy + (r + 1) * cs); ctx.lineTo(ox + (c + 1) * cs - 3, oy + (r + 1) * cs); }
        ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
      for (const c of s.cats) { if (c.dead > 0) continue; const p = pos(s, c); Arcade.emojiTo(ctx, s.dog > 0 ? '🫥' : '👻', p.x, p.y, cs * 0.72, D[c.dir] ? D[c.dir][0] : 0, D[c.dir] ? D[c.dir][1] : 1); }
      const p = pos(s, s.pl);
      if (!(s.inv > 0 && Math.floor(g.t * 10) % 2)) Arcade.emojiTo(ctx, s.dog > 0 ? '🐶' : g.face(), p.x, p.y, cs * 0.72, D[s.pl.dir] ? D[s.pl.dir][0] : 0, D[s.pl.dir] ? D[s.pl.dir][1] : 1);
      // botones
      const bw = Math.min(70, (W - 40) / 4), x0 = W / 2 - bw * 2;
      for (let i = 0; i < 4; i++) {
        const x = x0 + i * bw + 4, w = bw - 8;
        if (i < 3) {
          ctx.fillStyle = s.dOpen[i] ? 'rgba(255,255,255,.08)' : DC[i]; Arcade.rr(ctx, x, s.by - 24, w, 48, 14); ctx.fill();
          ctx.strokeStyle = DC[i]; ctx.lineWidth = 3; ctx.stroke();
          Arcade.txt(ctx, s.dOpen[i] ? 'abierta' : 'cerrada', x + w / 2, s.by, 11, s.dOpen[i] ? DC[i] : '#1b1530', 'center', 900);
        } else {
          ctx.fillStyle = s.dog > 0 ? '#e599f7' : 'rgba(255,255,255,.1)'; Arcade.rr(ctx, x, s.by - 24, w, 48, 14); ctx.fill();
          Arcade.txt(ctx, '🦴 ' + s.bones, x + w / 2, s.by, 16, '#fff', 'center', 900);
        }
      }
      Arcade.txt(ctx, '🧀 ' + s.cheese.size + (s.dog > 0 ? '   🐶 ' + s.dog.toFixed(1) : ''), W / 2, oy - 16, 15, '#fff3bf', 'center', 800);
    },
  });
})();
