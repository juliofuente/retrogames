/* Puzles de lógica en rejilla · colección «Juegos orientales» (Sudoku, Kakuro, Nurikabe, Slitherlink, Hashi…)
   ───────────────────────────────────────────────────────────────────────────────────────────────────────────
   Arcade.rejilla(V) devuelve el objeto del juego: Arcade.game({ ...Arcade.rejilla(V), id, title, … }).
   El motor pone el tablero (papel, tinta, sellos), los controles, deshacer, pistas, el tutorial, la demo, la
   comprobación y los vídeos (?rec=1&tut=1 «cómo se juega» y ?rec=1&quiz=N reto con solución, vía def.quiz).
   La variante V dice solo lo suyo:
     kind     'num' (números con teclado) · 'cell' (tocar cambia el estado: sombra, punto, estrella…) ·
              'link' (caminos entre casillas vecinas) · 'edge' (líneas entre los puntos de la rejilla) ·
              'rect' (rectángulos o cuadrados arrastrando) · 'bridge' (puentes entre islas) · 'move' (mover fichas)
     size(lv)               parámetros del tamaño según la dificultad (lv 1…cap)
     gen(r, cfg, lv)        → P { w, h, …pistas, sol: { c, L, E, R, M } } (r = Math.random; P.fix = números dados)
     check(P, st)           → true si el estado cumple todas las reglas (se acepta cualquier solución válida)
     N(P) / pad(P)          (num) valores posibles · cand(P, vals, i) → máscara de bits de valores posibles
     states                 (cell) estados que recorre un toque: [{ v, k: 'shade'|'dot'|'x'|'emoji'|'text'|'water'|'ship', … }]
     marks                  estados que cuentan como «vacío» al comprobar (puntos, cruces)
     groups(P)              listas de casillas donde no se puede repetir número (los repetidos salen en rojo)
     reg                    P.reg = región de cada casilla (bordes gruesos); regColors: true = cada región de un color
     cellBg(P, i, st)       color de fondo de una casilla (null = papel) · blocked(P, i) casilla negra/sin jugar
     drawClue(ctx, P, i, x, y, cs, st, g)  pistas dentro de la casilla · drawOver(ctx, P, st, L, g) pistas fuera / encima
     margin(P)              { l, t, r, b } en casillas para las pistas de fuera
     rules(P)               pasos del tutorial: [{ t: { es, en } | texto, cells: [i…], edges, rows, cols }]
     explain(P, act, st)    frase para la jugada de ejemplo (vídeo y demo)
     kanji                  carácter del sello (p. ej. '数') */
(function () {
  const A = Arcade, T = A.T, TAU = Math.PI * 2;
  const NUMF = '"Avenir Next","Segoe UI","Helvetica Neue",Roboto,Arial,sans-serif';
  const KANJIF = '"Noto Serif CJK JP","Yu Mincho","Hiragino Mincho ProN","MS Mincho","Noto Serif CJK SC",serif';
  const C = { paper: '#fbf6ea', paper2: '#efe3c8', ink: '#2b2233', grid: 'rgba(70,52,34,.30)', thick: '#3a2f2a', user: '#2f5aa8', err: '#e03131', shade: '#2e2a3a', seal: '#c92a2a', hl: '#ffd43b' };
  const PASTEL = ['#f8dde3', '#dfeccf', '#d9e5f5', '#f6e8c8', '#e8dcf2', '#d3eeea', '#fbdfc8', '#e4e4dc', '#f2d6ec', '#d8ecdc', '#f0e2d0', '#dde0f5'];

  /* ═══════════ utilidades para las variantes (Arcade.rejilla.U) ═══════════ */
  const U = {};
  U.ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));
  U.pick = (r, a) => a[Math.floor(r() * a.length)];
  U.shuffle = (r, a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  U.n4 = (w, h, i) => { const x = i % w, y = (i / w) | 0, o = []; if (x > 0) o.push(i - 1); if (x < w - 1) o.push(i + 1); if (y > 0) o.push(i - w); if (y < h - 1) o.push(i + w); return o; };
  U.n8 = (w, h, i) => { const x = i % w, y = (i / w) | 0, o = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h) o.push(Y * w + X); } return o; };
  U.bits = (m) => { let n = 0; while (m) { m &= m - 1; n++; } return n; };
  U.key = (a, b) => (a < b ? a + '_' + b : b + '_' + a);
  // ¿están conectadas todas las casillas que cumplen pred? (true si no hay ninguna)
  U.connected = (w, h, pred) => {
    let start = -1, tot = 0; for (let i = 0; i < w * h; i++) if (pred(i)) { tot++; if (start < 0) start = i; }
    if (tot === 0) return true;
    const seen = new Uint8Array(w * h), st = [start]; seen[start] = 1; let n = 0;
    while (st.length) { const i = st.pop(); n++; for (const j of U.n4(w, h, i)) if (!seen[j] && pred(j)) { seen[j] = 1; st.push(j); } }
    return n === tot;
  };
  // grupos conectados de casillas que cumplen pred → [[i…]…]
  U.comps = (w, h, pred) => {
    const id = new Int32Array(w * h).fill(-1), out = [];
    for (let s = 0; s < w * h; s++) { if (id[s] >= 0 || !pred(s)) continue; const c = [], st = [s]; id[s] = out.length; while (st.length) { const i = st.pop(); c.push(i); for (const j of U.n4(w, h, i)) if (id[j] < 0 && pred(j)) { id[j] = out.length; st.push(j); } } out.push(c); }
    return out;
  };
  // ¿hay algún bloque 2×2 donde todo cumple pred?
  U.has2x2 = (w, h, pred) => { for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) { const i = y * w + x; if (pred(i) && pred(i + 1) && pred(i + w) && pred(i + w + 1)) return true; } return false; };
  // cuadrado latino al azar (vuelta atrás con orden aleatorio)
  U.latin = (r, n) => {
    const g = new Array(n * n).fill(0), row = new Array(n).fill(0), col = new Array(n).fill(0);
    const rec = (i) => {
      if (i === n * n) return true; const y = (i / n) | 0, x = i % n;
      for (const v of U.shuffle(r, Array.from({ length: n }, (_, k) => k + 1))) { const m = 1 << v; if (row[y] & m || col[x] & m) continue; g[i] = v; row[y] |= m; col[x] |= m; if (rec(i + 1)) return true; row[y] ^= m; col[x] ^= m; }
      g[i] = 0; return false;
    };
    rec(0); return g;
  };
  // partición en regiones (poliominós) de tamaño entre a y b → reg[i] = número de región
  U.regions = (r, w, h, a, b, opts = {}) => {
    for (let tries = 0; tries < 200; tries++) {
      const reg = new Int32Array(w * h).fill(-1); let nr = 0; const sizes = [];
      const order = U.shuffle(r, Array.from({ length: w * h }, (_, i) => i));
      for (const s of order) {
        if (reg[s] >= 0) continue; const target = U.ri(r, a, b), cells = [s]; reg[s] = nr;
        while (cells.length < target) {
          const fr = []; for (const c of cells) for (const j of U.n4(w, h, c)) if (reg[j] < 0) fr.push(j);
          if (!fr.length) break; const j = U.pick(r, fr); reg[j] = nr; cells.push(j);
        }
        sizes.push(cells.length); nr++;
      }
      // las que se quedan cortas se pegan a una vecina si cabe
      let ok = true;
      for (let k = 0; k < nr; k++) {
        if (sizes[k] >= a || sizes[k] === 0) continue;
        const cells = []; for (let i = 0; i < w * h; i++) if (reg[i] === k) cells.push(i);
        const nbr = new Set(); for (const c of cells) for (const j of U.n4(w, h, c)) if (reg[j] !== k) nbr.add(reg[j]);
        const t = U.shuffle(r, [...nbr]).find((q) => sizes[q] + sizes[k] <= b);
        if (t == null) { if (!opts.loose) ok = false; continue; }
        for (const c of cells) reg[c] = t; sizes[t] += sizes[k]; sizes[k] = 0;
      }
      if (!ok) continue;
      // renumerar 0…n-1
      const map = new Map(); for (let i = 0; i < w * h; i++) { if (!map.has(reg[i])) map.set(reg[i], map.size); reg[i] = map.get(reg[i]); }
      return Array.from(reg);
    }
    return Array.from({ length: w * h }, (_, i) => i);
  };
  // bucle cerrado al azar: borde de un poliominó sin agujeros sobre W×H cuadrados.
  // → { sq: dentro/fuera de cada cuadrado, pts: vértices en orden (índice y·(W+1)+x), E: { 'h…'|'v…': 1 } }
  U.loop = (r, W, H, frac = 0.55) => {
    const VW = W + 1, sq = new Int8Array(W * H), inn = (x, y) => x >= 0 && y >= 0 && x < W && y < H && sq[y * W + x] === 1;
    const edges = () => { const E = []; for (let y = 0; y <= H; y++) for (let x = 0; x < W; x++) if (inn(x, y) !== inn(x, y - 1)) E.push(['h' + (y * W + x), y * VW + x, y * VW + x + 1]); for (let y = 0; y < H; y++) for (let x = 0; x <= W; x++) if (inn(x, y) !== inn(x - 1, y)) E.push(['v' + (y * VW + x), y * VW + x, (y + 1) * VW + x]); return E; };
    const trace = () => {
      const E = edges(), adj = {}; for (const [, a, b] of E) { (adj[a] = adj[a] || []).push(b); (adj[b] = adj[b] || []).push(a); }
      for (const k in adj) if (adj[k].length !== 2) return null;
      const s0 = E[0][1], pts = [s0]; let prev = -1, cur = s0;
      for (;;) { const nx = adj[cur][0] !== prev ? adj[cur][0] : adj[cur][1]; if (nx === s0) break; pts.push(nx); prev = cur; cur = nx; if (pts.length > E.length) return null; }
      return pts.length === E.length ? { pts, E } : null;
    };
    const s = U.ri(r, 0, W * H - 1); sq[s] = 1; let cnt = 1, fails = 0;
    while (cnt < W * H * frac && fails < W * H * 4) {
      const fr = []; for (let i = 0; i < W * H; i++) if (!sq[i] && U.n4(W, H, i).some((j) => sq[j])) fr.push(i);
      if (!fr.length) break; const i = U.pick(r, fr); sq[i] = 1;
      if (trace()) cnt++; else { sq[i] = 0; fails++; }
    }
    const t = trace(), E = {}; for (const [k] of t.E) E[k] = 1;
    return { sq: Array.from(sq), pts: t.pts, E };
  };
  // ¿forman los enlaces L (claves 'a_b') un único bucle por todas las casillas con enlaces? (grado 2 en todas)
  U.oneLoop = (L, n) => {
    const adj = {}; let m = 0; for (const k in L) { if (!L[k]) continue; m++; const [a, b] = k.split('_').map(Number); (adj[a] = adj[a] || []).push(b); (adj[b] = adj[b] || []).push(a); }
    const ks = Object.keys(adj); if (!ks.length) return false; for (const k of ks) if (adj[k].length !== 2) return false;
    const seen = new Set([+ks[0]]), q = [+ks[0]]; while (q.length) { const i = q.pop(); for (const j of adj[i]) if (!seen.has(j)) { seen.add(j); q.push(j); } }
    return seen.size === ks.length && m === ks.length;
  };
  U.deg = (L, i) => { let d = 0; for (const k in L) if (L[k]) { const [a, b] = k.split('_'); if (+a === i || +b === i) d++; } return d; };
  U.regCells = (reg) => { const o = []; reg.forEach((k, i) => { (o[k] = o[k] || []).push(i); }); return o; };
  // partición en rectángulos (cortes al azar) de área ≤ maxA
  U.rects = (r, w, h, maxA, minA = 1, maxSide = 99) => {
    const out = [];
    const cut = (x, y, rw, rh) => {
      const a = rw * rh;
      if ((a <= maxA && rw <= maxSide && rh <= maxSide && (a <= minA + 1 || r() < 0.45)) || (rw === 1 && rh === 1)) { out.push({ x, y, w: rw, h: rh }); return; }
      const vert = rw > rh ? true : rh > rw ? false : r() < 0.5;
      if (vert && rw > 1) { const k = U.ri(r, 1, rw - 1); cut(x, y, k, rh); cut(x + k, y, rw - k, rh); }
      else if (rh > 1) { const k = U.ri(r, 1, rh - 1); cut(x, y, rw, k); cut(x, y + k, rw, rh - k); }
      else { const k = U.ri(r, 1, rw - 1); cut(x, y, k, rh); cut(x + k, y, rw - k, rh); }
    };
    cut(0, 0, w, h); return out;
  };
  /* resolvedor genérico para los de números: vals[i] = 0 vacío; cand(vals, i) → máscara de bits (bit v = valor v posible).
     Cuenta soluciones hasta limit (con un tope de nodos: si se pasa, devuelve limit = «no sé si es única»). */
  U.solve = (n, vals, cand, opts = {}) => {
    const limit = opts.limit || 2, budget = opts.budget || 30000, v = vals.slice(); let cnt = 0, nodes = 0, sol = null;
    const rec = () => {
      if (cnt >= limit) return; if (++nodes > budget) { cnt = limit; return; }
      let best = -1, bm = 0, bc = 99;
      for (let i = 0; i < n; i++) { if (v[i]) continue; const m = cand(v, i); const c = U.bits(m); if (c === 0) return; if (c < bc) { bc = c; best = i; bm = m; if (c === 1) break; } }
      if (best < 0) { if (opts.final && !opts.final(v)) return; cnt++; if (!sol) sol = v.slice(); return; }
      for (let k = 1; k < 32; k++) if (bm & (1 << k)) { v[best] = k; rec(); v[best] = 0; if (cnt >= limit) return; }
    };
    rec(); return { n: cnt, sol, nodes };
  };
  // rellena al azar (misma idea que solve, con los valores en orden aleatorio) → valores o null
  U.fill = (r, n, vals, cand, opts = {}) => {
    const v = vals.slice(), budget = opts.budget || 50000; let nodes = 0;
    const rec = () => {
      if (++nodes > budget) return false;
      let best = -1, bm = 0, bc = 99;
      for (let i = 0; i < n; i++) { if (v[i]) continue; const m = cand(v, i); const c = U.bits(m); if (c === 0) return false; if (c < bc) { bc = c; best = i; bm = m; if (c === 1) break; } }
      if (best < 0) return opts.final ? opts.final(v) : true;
      const ks = []; for (let k = 1; k < 32; k++) if (bm & (1 << k)) ks.push(k);
      for (const k of U.shuffle(r, ks)) { v[best] = k; if (rec()) return true; v[best] = 0; if (nodes > budget) return false; }
      return false;
    };
    return rec() ? v : null;
  };
  // máscara de los valores 1…n
  U.full = (n) => ((1 << (n + 1)) - 2);
  // quita números dados mientras la solución siga siendo única
  U.reduce = (r, sol, unique, opts = {}) => {
    const fix = sol.slice(), order = U.shuffle(r, Array.from({ length: sol.length }, (_, i) => i).filter((i) => sol[i]));
    const keep = opts.keep || 0; let given = order.length;
    for (const i of order) { if (given <= keep) break; const v = fix[i]; fix[i] = 0; if (unique(fix)) given--; else fix[i] = v; }
    return fix;
  };

  /* ═══════════ el motor ═══════════ */
  A.rejilla = function (V) {
    const kind = V.kind;
    const QS = typeof location !== 'undefined' ? location.search : '';
    const SHOTM = /[?&]shot=1/.test(QS), RECQ = /[?&]rec=1/.test(QS) && /[?&]quiz=/.test(QS);
    const clone = (st) => ({ c: st.c.slice(), L: Object.assign({}, st.L), E: Object.assign({}, st.E), R: st.R.map((q) => Object.assign({}, q)), M: Object.assign({}, st.M) });
    const empty = (P) => ({ c: P.fix ? P.fix.slice() : new Array(P.w * P.h).fill(0), L: {}, E: {}, R: [], M: {} });
    const isMark = (v) => (V.marks || []).indexOf(v) >= 0;
    const nv = (v) => (isMark(v) ? 0 : v || 0);

    /* --- jugadas: { c: i, v } · { l: 'a_b', v } · { e: id, v } · { r: rect, v: 1|0 } · { m: id, to } --- */
    function apply(st, a) {
      if (a.c != null) st.c[a.c] = a.v;
      else if (a.l != null) { if (a.v) st.L[a.l] = a.v; else delete st.L[a.l]; }
      else if (a.e != null) { if (a.v) st.E[a.e] = a.v; else delete st.E[a.e]; }
      else if (a.r) { const q = a.r; st.R = st.R.filter((o) => o.x + o.w <= q.x || q.x + q.w <= o.x || o.y + o.h <= q.y || q.y + q.h <= o.y); if (a.v) st.R.push(Object.assign({}, q)); }
      else if (a.m != null) { if (a.to == null) delete st.M[a.m]; else st.M[a.m] = a.to; }
    }
    // lo que falta para llegar a la solución (o lo que sobra), en un orden con sentido
    function solActs(P, st) {
      const S = P.sol, out = [];
      if (kind === 'num' || kind === 'cell' || (S.c && S.c.some((v) => v))) {
        for (let i = 0; i < P.w * P.h; i++) { if (P.fix && P.fix[i]) continue; const a = nv(st.c[i]), b = nv(S.c[i]); if (a !== b) out.push({ c: i, v: b, wrong: a !== 0 }); }
      }
      if (S.L) { for (const k in st.L) if ((S.L[k] || 0) !== st.L[k]) out.push({ l: k, v: S.L[k] || 0, wrong: true }); for (const k in S.L) if (st.L[k] !== S.L[k]) out.push({ l: k, v: S.L[k] }); }
      if (S.E) { for (const k in st.E) if (st.E[k] === 1 && S.E[k] !== 1) out.push({ e: k, v: 0, wrong: true }); for (const k in S.E) if (S.E[k] === 1 && st.E[k] !== 1) out.push({ e: k, v: 1 }); }
      if (S.R) { const same = (a, b) => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h; for (const q of st.R) if (!S.R.some((o) => same(o, q))) out.push({ r: q, v: 0, wrong: true }); for (const q of S.R) if (!st.R.some((o) => same(o, q))) out.push({ r: q, v: 1 }); }
      if (S.M) { for (const k in st.M) if (S.M[k] !== st.M[k]) out.push({ m: k, to: S.M[k], wrong: true }); for (const k in S.M) if (st.M[k] == null) out.push({ m: k, to: S.M[k] }); }
      const wrong = out.filter((a) => a.wrong), right = out.filter((a) => !a.wrong);
      return wrong.concat(V.order ? V.order(P, right, st) : orderActs(P, right, st));
    }
    // orden por defecto: en los de números, primero las casillas con menos posibilidades (parece razonado); si no, por filas
    function orderActs(P, acts, st) {
      if (kind === 'num' && V.cand) {
        const v = st.c.map((x) => x || 0), out = [], left = acts.slice();
        while (left.length) {
          let bi = 0, bc = 99; left.forEach((a, k) => { const c = U.bits(V.cand(P, v, a.c) & ~1) || 99; if (c < bc) { bc = c; bi = k; } });
          const a = left.splice(bi, 1)[0]; a.only = bc === 1; v[a.c] = a.v; out.push(a);
        }
        return out;
      }
      const pos = (a) => { if (a.c != null) return a.c; if (a.l) return +a.l.split('_')[0]; if (a.r) return a.r.y * P.w + a.r.x; if (a.e) return +a.e.slice(1); if (a.m != null) return +a.m; return 0; };
      return acts.sort((a, b) => pos(a) - pos(b));
    }
    const nActs = (P) => solActs(P, empty(P)).length;

    /* --- números repetidos (en rojo) --- */
    function conflicts(P, st) {
      const bad = new Set(); if (!V.groups) return bad;
      for (const grp of V.groups(P)) { const seen = {}; for (const i of grp) { const v = nv(st.c[i]); if (!v) continue; if (seen[v] != null) { bad.add(i); bad.add(seen[v]); } else seen[v] = i; } }
      return bad;
    }

    /* --- geometría --- */
    function place(g) {
      const s = g.s, P = s.P; if (!P) return;
      const M = Object.assign({ l: 0, t: 0, r: 0, b: 0 }, V.margin ? V.margin(P) : {});
      const W = g.W, top = g.top + 46, pad = kind === 'num' ? padRows(g, P) : { h: 0 };
      const bot = g.bot - 16 - (pad.h ? pad.h + 4 : 0);
      const cols = P.w + M.l + M.r, rows = P.h + M.t + M.b;
      const cs = Math.max(14, Math.floor(Math.min((W - 48) / cols, (bot - top) / rows, 76)));
      const bw = cs * cols, bh = cs * rows;
      s.cs = cs; s.ox = Math.round((W - bw) / 2 + M.l * cs); s.oy = Math.round(top + Math.max(0, (bot - top - bh) / 2) + M.t * cs); s.M = M;
      s.btns = [{ id: 'tut', e: '📖' }, { id: 'undo', e: '↩️' }, { id: 'hint', e: '💡' }].map((b, k) => Object.assign(b, { x: W - 10 - (3 - k) * 46, y: g.top + 4, w: 40, h: 36 }));
      if (kind === 'num') { s.pad = pad.keys; pad.keys.forEach((k, n) => { const row = (n / pad.per) | 0, col = n % pad.per, inRow = Math.min(pad.per, pad.keys.length - row * pad.per); k.w = pad.bw; k.h = pad.bh; k.x = W / 2 - (inRow * (pad.bw + 6) - 6) / 2 + col * (pad.bw + 6); k.y = g.bot - pad.h + row * (pad.bh + 6); }); }
      s.paper = null;
    }
    function padRows(g, P) {
      const vals = V.pad ? V.pad(P, g.s.st) : Array.from({ length: V.N(P) }, (_, k) => k + 1);
      const keys = vals.map((v) => ({ v, t: String(v) })).concat([{ v: 0, t: '⌫' }]);
      const per = Math.min(keys.length, keys.length > 12 ? Math.min(10, Math.ceil(keys.length / Math.ceil(keys.length / 10))) : keys.length);
      const bw = Math.min(54, Math.floor((g.W - 20 - (per - 1) * 6) / per)), bh = Math.min(50, Math.max(34, bw * 0.95)), rowsN = Math.ceil(keys.length / per);
      return { keys, per, bw, bh, h: rowsN * (bh + 6) + 4 };
    }
    const cellXY = (s, i) => [s.ox + (i % s.P.w) * s.cs, s.oy + ((i / s.P.w) | 0) * s.cs];
    function cellAt(s, x, y) { const cx = Math.floor((x - s.ox) / s.cs), cy = Math.floor((y - s.oy) / s.cs); return cx >= 0 && cy >= 0 && cx < s.P.w && cy < s.P.h ? cy * s.P.w + cx : -1; }
    // aristas de la rejilla de puntos: h(x,y) une (x,y)-(x+1,y); v(x,y) une (x,y)-(x,y+1)
    const eid = { h: (P, x, y) => 'h' + (y * P.w + x), v: (P, x, y) => 'v' + (y * (P.w + 1) + x) };
    function edgeEnds(P, k) { const n = +k.slice(1); if (k[0] === 'h') { const x = n % P.w, y = (n / P.w) | 0; return [x, y, x + 1, y]; } const x = n % (P.w + 1), y = (n / (P.w + 1)) | 0; return [x, y, x, y + 1]; }
    function edgeAt(s, px, py) {
      const P = s.P, fx = (px - s.ox) / s.cs, fy = (py - s.oy) / s.cs, x = Math.floor(fx), y = Math.floor(fy), dx = fx - x, dy = fy - y;
      const cand = [];
      if (y >= 0 && y <= P.h && x >= 0 && x < P.w) cand.push([Math.abs(dy), eid.h(P, x, y)]);
      if (y + 1 >= 0 && y + 1 <= P.h && x >= 0 && x < P.w) cand.push([Math.abs(1 - dy), eid.h(P, x, y + 1)]);
      if (x >= 0 && x <= P.w && y >= 0 && y < P.h) cand.push([Math.abs(dx), eid.v(P, x, y)]);
      if (x + 1 >= 0 && x + 1 <= P.w && y >= 0 && y < P.h) cand.push([Math.abs(1 - dx), eid.v(P, x + 1, y)]);
      cand.sort((a, b) => a[0] - b[0]); return cand.length && cand[0][0] < 0.42 ? cand[0][1] : null;
    }

    /* --- partida --- */
    function newPuzzle(g, lv) {
      const cfg = V.size(lv, g); let P = null;
      for (let k = 0; k < 40 && !P; k++) { try { P = V.gen(Math.random, cfg, lv); } catch (e) { P = null; if (k > 38) throw e; } }
      P.cfg = cfg; return P;
    }
    function start(g, P) {
      const s = g.s = { P, st: null, hist: [], hints: 0, sel: -1, acts: 0, done: false, t0: g.rt, el: 0, drag: null, hl: null, stamp: null, tut: null, pulse: {} };
      s.st = empty(P); if (V.init) V.init(P, s.st);
      s.total = nActs(P);
      place(g);
    }
    function commit(g, a, quiet) {
      const s = g.s; if (s.done) return;
      s.hist.push(clone(s.st)); if (s.hist.length > 400) s.hist.shift();
      apply(s.st, a); s.acts++; s.hl = null;
      if (a.c != null) s.pulse[a.c] = 1;
      if (V.dynPad) place(g);
      if (!quiet) { if (a.v || a.to != null) A.tone(a.c != null ? 520 + (a.v || 0) * 30 : 600, 0.05, 'triangle', 0.05); else A.tone(300, 0.05, 'triangle', 0.04); }
      checkWin(g);
    }
    function checkWin(g) {
      const s = g.s; if (s.done) return;
      let ok = false; try { ok = V.check(s.P, s.st); } catch (e) { ok = false; }
      if (!ok) return;
      s.done = true; s.stamp = { t: 0 }; s.sel = -1;
      A.sfx.coin(); setTimeout(() => A.sfx.win(), 250);
      const [cx, cy] = [s.ox + s.P.w * s.cs / 2, s.oy + s.P.h * s.cs / 2];
      g.burst(cx, cy, { n: 26, emoji: '🌸', size: 16, speed: 260, grav: 60, life: 1.6 });
      const pts = Math.max(50, Math.round(s.total * 10 * (1 + g.lv / 10)) - s.hints * 25);
      g.addScore(pts, cx, cy - s.cs);
      const stars = s.hints === 0 ? 3 : s.hints <= 2 ? 2 : 1;
      setTimeout(() => { if (g.state === 'play' && g.s === s) g.win(stars); }, g.demoOn ? 1200 : 1700);
    }
    function undo(g) { const s = g.s; if (!s.hist.length || s.done) { A.sfx.bad(); return; } s.st = s.hist.pop(); A.tone(330, 0.05, 'triangle', 0.05); if (V.dynPad) place(g); }
    function hint(g) {
      const s = g.s; if (s.done) return null; const a = solActs(s.P, s.st)[0]; if (!a) return null;
      s.hints++; s.hl = { a, t: 2.6 }; A.tone(880, 0.06, 'sine', 0.06); return a;
    }

    /* --- dibujo --- */
    let bgCache = null;
    function background(g, ctx) {
      const key = g.W + 'x' + g.H;
      if (!bgCache || bgCache.key !== key) {
        const c = document.createElement('canvas'), d = A.dpr || 1; c.width = Math.ceil(g.W * d); c.height = Math.ceil(g.H * d); const x = c.getContext('2d'); x.scale(d, d);
        const bg = g.def.bg || ['#2b2f4a', '#141629'];
        const gr = x.createLinearGradient(0, 0, 0, g.H); gr.addColorStop(0, bg[0]); gr.addColorStop(1, bg[1]); x.fillStyle = gr; x.fillRect(0, 0, g.W, g.H);
        // olas seigaiha muy suaves
        const R = 26; x.globalAlpha = 0.07; x.strokeStyle = '#fff'; x.lineWidth = 1.2;
        for (let row = -1, yy = 0; yy < g.H + R; row++, yy = row * R * 0.5) for (let xx = (row % 2 ? R : 0) - R; xx < g.W + R; xx += R * 2) for (let k = 1; k <= 3; k++) { x.beginPath(); x.arc(xx, yy + R, R * k / 3, Math.PI, 0); x.stroke(); }
        x.globalAlpha = 1; bgCache = { key, c };
      }
      ctx.drawImage(bgCache.c, 0, 0, g.W, g.H);
      // pétalos que caen despacio
      ctx.save(); ctx.globalAlpha = 0.5;
      for (let k = 0; k < 9; k++) { const t = g.rt * (0.025 + (k % 3) * 0.01) + k * 0.137, y = ((t % 1) * 1.2 - 0.1) * g.H, xx = ((k * 0.311 + Math.sin(g.rt * 0.4 + k) * 0.04) % 1) * g.W; petal(ctx, xx, y, 5 + (k % 3) * 2, g.rt * (0.6 + k * 0.1) + k); }
      ctx.restore();
    }
    function petal(ctx, x, y, r, a) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = '#ffc9d6'; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.55, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#ffa8bf'; ctx.beginPath(); ctx.ellipse(r * 0.3, 0, r * 0.35, r * 0.2, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    function paper(g, ctx, x, y, w, h) {
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 8;
      const gr = ctx.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, C.paper); gr.addColorStop(1, C.paper2); ctx.fillStyle = gr; A.rr(ctx, x, y, w, h, 12); ctx.fill(); ctx.restore();
      // fibras del papel
      const s = g.s, key = w + 'x' + h;
      if (!s.paper || s.paper.key !== key) {
        const c = document.createElement('canvas'), d = A.dpr || 1; c.width = Math.ceil(w * d); c.height = Math.ceil(h * d); const q = c.getContext('2d'); q.scale(d, d);
        let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
        q.strokeStyle = 'rgba(120,90,50,.09)'; q.lineWidth = 0.8;
        for (let k = 0; k < (w * h) / 450; k++) { const px = rnd() * w, py = rnd() * h, a = rnd() * TAU, l = 4 + rnd() * 10; q.beginPath(); q.moveTo(px, py); q.quadraticCurveTo(px + Math.cos(a) * l * 0.5 + 2, py + Math.sin(a) * l * 0.5, px + Math.cos(a) * l, py + Math.sin(a) * l); q.stroke(); }
        s.paper = { key, c };
      }
      ctx.save(); A.rr(ctx, x, y, w, h, 12); ctx.clip(); ctx.drawImage(s.paper.c, x, y, w, h); ctx.restore();
    }
    function seal(ctx, x, y, r, ch, a = 1, rot = -0.12) {
      ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(rot);
      ctx.fillStyle = C.seal; A.rr(ctx, -r, -r, r * 2, r * 2, r * 0.28); ctx.fill();
      ctx.strokeStyle = 'rgba(255,240,230,.85)'; ctx.lineWidth = Math.max(1.5, r * 0.08); A.rr(ctx, -r * 0.8, -r * 0.8, r * 1.6, r * 1.6, r * 0.2); ctx.stroke();
      ctx.fillStyle = '#fff4ec'; ctx.font = '900 ' + Math.round(r * 1.25) + 'px ' + KANJIF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ch, 0, r * 0.06);
      ctx.restore();
    }
    U.seal = seal;
    // dibujo de los estados de casilla
    function drawState(ctx, sd, x, y, cs, i, s) {
      if (!sd) return;
      const k = sd.k, m = cs * 0.08;
      if (k === 'shade') { const gr = ctx.createLinearGradient(x, y, x + cs, y + cs); gr.addColorStop(0, sd.c || '#3b3548'); gr.addColorStop(1, sd.c2 || '#1f1a2b'); ctx.fillStyle = gr; A.rr(ctx, x + m * 0.6, y + m * 0.6, cs - m * 1.2, cs - m * 1.2, cs * 0.12); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.08)'; A.rr(ctx, x + m, y + m, cs - m * 2, cs * 0.28, cs * 0.1); ctx.fill(); }
      else if (k === 'dot') { ctx.fillStyle = sd.c || 'rgba(60,50,40,.55)'; ctx.beginPath(); ctx.arc(x + cs / 2, y + cs / 2, Math.max(2, cs * 0.09), 0, TAU); ctx.fill(); }
      else if (k === 'x') { ctx.strokeStyle = sd.c || 'rgba(60,50,40,.5)'; ctx.lineWidth = Math.max(1.5, cs * 0.06); ctx.lineCap = 'round'; const q = cs * 0.3; ctx.beginPath(); ctx.moveTo(x + q, y + q); ctx.lineTo(x + cs - q, y + cs - q); ctx.moveTo(x + cs - q, y + q); ctx.lineTo(x + q, y + cs - q); ctx.stroke(); }
      else if (k === 'emoji') A.emoji(ctx, sd.e, x + cs / 2, y + cs / 2, cs * (sd.size || 0.72));
      else if (k === 'text') A.txt(ctx, sd.t, x + cs / 2, y + cs / 2 + 1, cs * 0.6, sd.c || C.user, 'center', 800, null, NUMF);
      else if (k === 'water') { const gr = ctx.createLinearGradient(x, y, x, y + cs); gr.addColorStop(0, '#74c0fc'); gr.addColorStop(1, '#1c7ed6'); ctx.fillStyle = gr; ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2); ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + cs * 0.2, y + cs * 0.3); ctx.quadraticCurveTo(x + cs * 0.35, y + cs * 0.2, x + cs * 0.5, y + cs * 0.3); ctx.stroke(); }
      else if (k === 'ship') { if (sd.draw) sd.draw(ctx, x, y, cs, i, s); }
      else if (k === 'custom' && sd.draw) sd.draw(ctx, x, y, cs, i, s);
    }
    const stateOf = (v) => (V.states || []).find((q) => q.v === v);
    function drawBoard(g, ctx, opt = {}) {
      const s = g.s, P = s.P, st = s.st, cs = s.cs, ox = s.ox, oy = s.oy, w = P.w, h = P.h, M = s.M;
      paper(g, ctx, ox - M.l * cs - 10, oy - M.t * cs - 10, (w + M.l + M.r) * cs + 20, (h + M.t + M.b) * cs + 20);
      const bad = kind === 'num' ? conflicts(P, st) : new Set(), extraBad = V.errors ? V.errors(P, st) : null;
      // fondos de casilla (regiones de colores, casillas bloqueadas…)
      for (let i = 0; i < w * h; i++) {
        const [x, y] = cellXY(s, i); let bg = V.cellBg ? V.cellBg(P, i, st) : null;
        if (!bg && V.regColors && P.reg) bg = PASTEL[(P.regColor ? P.regColor[P.reg[i]] : P.reg[i]) % PASTEL.length];
        if (bg) { ctx.fillStyle = bg; ctx.fillRect(x, y, cs, cs); }
      }
      // casilla elegida y su fila/columna
      if (s.sel >= 0 && !s.done && kind === 'num') { const sx = s.sel % w, sy = (s.sel / w) | 0; ctx.fillStyle = 'rgba(47,90,168,.08)'; ctx.fillRect(ox, oy + sy * cs, w * cs, cs); ctx.fillRect(ox + sx * cs, oy, cs, h * cs); const [x, y] = cellXY(s, s.sel); ctx.fillStyle = 'rgba(255,212,59,.45)'; ctx.fillRect(x, y, cs, cs); }
      if (kind !== 'num' && s.sel >= 0 && !s.done) { const [x, y] = cellXY(s, s.sel); ctx.fillStyle = 'rgba(255,212,59,.4)'; ctx.fillRect(x, y, cs, cs); }
      // estados de casilla
      if (kind === 'cell' || V.cellStates) for (let i = 0; i < w * h; i++) { const v = st.c[i]; if (!v) continue; const [x, y] = cellXY(s, i); drawState(ctx, stateOf(v), x, y, cs, i, s); }
      // rejilla
      if (!V.noGrid) {
        ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.beginPath();
        for (let x = 1; x < w; x++) { ctx.moveTo(ox + x * cs + 0.5, oy); ctx.lineTo(ox + x * cs + 0.5, oy + h * cs); }
        for (let y = 1; y < h; y++) { ctx.moveTo(ox, oy + y * cs + 0.5); ctx.lineTo(ox + w * cs, oy + y * cs + 0.5); }
        ctx.stroke();
      }
      // bordes de región
      if (P.reg && !V.noRegBorders) {
        ctx.strokeStyle = C.thick; ctx.lineWidth = Math.max(2, cs * 0.075); ctx.lineCap = 'round'; ctx.beginPath();
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (x < w - 1 && P.reg[i] !== P.reg[i + 1]) { ctx.moveTo(ox + (x + 1) * cs, oy + y * cs); ctx.lineTo(ox + (x + 1) * cs, oy + (y + 1) * cs); } if (y < h - 1 && P.reg[i] !== P.reg[i + w]) { ctx.moveTo(ox + x * cs, oy + (y + 1) * cs); ctx.lineTo(ox + (x + 1) * cs, oy + (y + 1) * cs); } }
        ctx.stroke();
      }
      if (!V.noFrame) { ctx.strokeStyle = C.thick; ctx.lineWidth = Math.max(2.5, cs * 0.08); A.rr(ctx, ox, oy, w * cs, h * cs, 3); ctx.stroke(); }
      // rectángulos
      if (kind === 'rect') st.R.forEach((q, n) => { ctx.save(); ctx.fillStyle = PASTEL[(q.x * 7 + q.y * 13 + q.w * 3) % PASTEL.length]; ctx.globalAlpha = 0.85; const ins = cs * 0.08; A.rr(ctx, ox + q.x * cs + ins, oy + q.y * cs + ins, q.w * cs - ins * 2, q.h * cs - ins * 2, cs * 0.18); ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = C.thick; ctx.lineWidth = Math.max(2, cs * 0.06); ctx.stroke(); ctx.restore(); });
      // pistas dentro de las casillas
      for (let i = 0; i < w * h; i++) {
        const [x, y] = cellXY(s, i);
        if (V.drawClue) V.drawClue(ctx, P, i, x, y, cs, st, g);
        if (kind === 'num') {
          const v = st.c[i]; if (!v) continue; const given = P.fix && P.fix[i];
          const pk = s.pulse[i] || 0, sc = 1 + pk * 0.25;
          const col = !given && (bad.has(i) || (extraBad && extraBad.has(i))) ? C.err : given ? C.ink : C.user;
          const fz = cs * (V.numSize || (String(v).length > 1 ? 0.48 : 0.6)) * sc, ny = y + cs * (V.numY || 0.53);
          A.txt(ctx, String(v), x + cs / 2, ny, fz, col, 'center', given ? 900 : 700, null, NUMF);
        }
      }
      // caminos, líneas, puentes
      if (kind === 'link' || V.links) drawLinks(g, ctx);
      if (kind === 'edge') drawEdges(g, ctx);
      if (V.drawOver) V.drawOver(ctx, P, st, { ox, oy, cs, w, h }, g);
      // pista resaltada
      if (s.hl) drawHL(g, ctx, s.hl.a);
      // sello del juego
      if (V.kanji && !opt.noSeal) seal(ctx, ox - M.l * cs - 4, oy - M.t * cs - 4, Math.max(11, Math.min(18, cs * 0.32)), V.kanji, 0.95);
    }
    function drawLinks(g, ctx) {
      const s = g.s, P = s.P, cs = s.cs;
      for (const k in s.st.L) {
        const n = s.st.L[k]; if (!n) continue; const [a, b] = k.split('_').map(Number);
        const [x1, y1] = cellXY(s, a), [x2, y2] = cellXY(s, b);
        const col = V.linkColor ? V.linkColor(P, s.st, a, b) : C.ink;
        ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = V.linkW ? V.linkW * cs : cs * 0.22;
        if (V.drawLink) { V.drawLink(ctx, P, s.st, a, b, n, x1 + cs / 2, y1 + cs / 2, x2 + cs / 2, y2 + cs / 2, cs); continue; }
        ctx.beginPath(); ctx.moveTo(x1 + cs / 2, y1 + cs / 2); ctx.lineTo(x2 + cs / 2, y2 + cs / 2); ctx.stroke();
      }
    }
    function drawEdges(g, ctx) {
      const s = g.s, P = s.P, cs = s.cs;
      for (const k in s.st.E) {
        const v = s.st.E[k], [x1, y1, x2, y2] = edgeEnds(P, k), X1 = s.ox + x1 * cs, Y1 = s.oy + y1 * cs, X2 = s.ox + x2 * cs, Y2 = s.oy + y2 * cs;
        if (v === 1) { ctx.strokeStyle = s.done ? '#2b8a3e' : C.ink; ctx.lineWidth = Math.max(3, cs * 0.12); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(X1, Y1); ctx.lineTo(X2, Y2); ctx.stroke(); }
        else if (v === 2) { const mx = (X1 + X2) / 2, my = (Y1 + Y2) / 2, q = cs * 0.09; ctx.strokeStyle = 'rgba(200,50,50,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx - q, my - q); ctx.lineTo(mx + q, my + q); ctx.moveTo(mx + q, my - q); ctx.lineTo(mx - q, my + q); ctx.stroke(); }
      }
      // puntos
      ctx.fillStyle = C.ink;
      for (let y = 0; y <= P.h; y++) for (let x = 0; x <= P.w; x++) { ctx.beginPath(); ctx.arc(s.ox + x * cs, s.oy + y * cs, Math.max(2, cs * 0.06), 0, TAU); ctx.fill(); }
    }
    function actRect(s, a) {   // rectángulo de pantalla de una jugada (para resaltarla)
      const P = s.P, cs = s.cs;
      if (a.c != null) { const [x, y] = cellXY(s, a.c); return { x, y, w: cs, h: cs }; }
      if (a.l != null) { const [p, q] = a.l.split('_').map(Number), [x1, y1] = cellXY(s, p), [x2, y2] = cellXY(s, q); return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x1 - x2) + cs, h: Math.abs(y1 - y2) + cs }; }
      if (a.e != null) { const [x1, y1, x2, y2] = edgeEnds(P, a.e); return { x: s.ox + Math.min(x1, x2) * cs - cs * 0.15, y: s.oy + Math.min(y1, y2) * cs - cs * 0.15, w: Math.abs(x2 - x1) * cs + cs * 0.3, h: Math.abs(y2 - y1) * cs + cs * 0.3 }; }
      if (a.r) return { x: s.ox + a.r.x * cs, y: s.oy + a.r.y * cs, w: a.r.w * cs, h: a.r.h * cs };
      if (a.m != null) { const from = +a.m, to = a.to; const [x1, y1] = cellXY(s, from), [x2, y2] = cellXY(s, to); return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x1 - x2) + cs, h: Math.abs(y1 - y2) + cs }; }
      return { x: s.ox, y: s.oy, w: cs, h: cs };
    }
    function drawHL(g, ctx, a) {
      const s = g.s, r = actRect(s, a), p = 0.55 + 0.45 * Math.sin(g.rt * 7);
      ctx.save(); ctx.strokeStyle = `rgba(255,190,0,${p})`; ctx.lineWidth = 4; A.rr(ctx, r.x - 2, r.y - 2, r.w + 4, r.h + 4, 8); ctx.stroke();
      if (a.c != null && kind === 'num' && a.v) { ctx.globalAlpha = 0.35 + 0.3 * p; A.txt(ctx, String(a.v), r.x + r.w / 2, r.y + r.h * 0.53, s.cs * 0.55, '#e8590c', 'center', 800, null, NUMF); }
      ctx.restore();
    }
    function drawTop(g, ctx) {
      const s = g.s, P = s.P;
      const tm = Math.floor(s.el), txt = P.w + '×' + P.h + '  ·  ⏱ ' + Math.floor(tm / 60) + ':' + String(tm % 60).padStart(2, '0') + (s.hints ? '  ·  💡' + s.hints : '');
      A.txt(ctx, txt, 12, g.top + 22, Math.min(15, g.W / 28), '#fff', 'left', 800, 'rgba(0,0,0,.35)');
      for (const b of s.btns) { ctx.fillStyle = s.btnDown === b.id ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.28)'; A.rr(ctx, b.x, b.y, b.w, b.h, 11); ctx.fill(); A.emoji(ctx, b.e, b.x + b.w / 2, b.y + b.h / 2, 19); }
      if (kind === 'num' && s.pad) for (const k of s.pad) {
        const on = s.sel >= 0 && s.st.c[s.sel] === k.v && k.v;
        ctx.fillStyle = on ? C.hl : k.down ? '#fff3bf' : 'rgba(251,246,234,.95)'; A.rr(ctx, k.x, k.y, k.w, k.h, 10); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1; ctx.stroke();
        A.txt(ctx, k.t, k.x + k.w / 2, k.y + k.h / 2 + 1, Math.min(k.h * 0.52, k.w * (k.t.length > 2 ? 0.34 : k.t.length > 1 ? 0.44 : 0.56)), k.v ? C.ink : '#c92a2a', 'center', 800, null, NUMF);
      }
    }
    function drawStamp(g, ctx) {
      const s = g.s; if (!s.stamp) return; s.stamp.t += A.fdt;
      const t = s.stamp.t, k = Math.min(1, t / 0.35), sc = 2.4 - 1.4 * (1 - Math.pow(1 - k, 3));
      const cx = s.ox + s.P.w * s.cs / 2, cy = s.oy + s.P.h * s.cs / 2, r = Math.min(s.P.w, s.P.h) * s.cs * 0.26;
      ctx.save(); ctx.globalAlpha = Math.min(1, t * 4) * 0.92; ctx.translate(cx, cy); ctx.scale(sc, sc); seal(ctx, 0, 0, r, '完', 1, -0.2); ctx.restore();
    }

    /* --- tutorial (📖) --- */
    const TX = (t) => (t && typeof t === 'object' ? T(t.es, t.en) : t);
    function controlsText() {
      if (kind === 'num') return T('Toca una casilla y luego un número de abajo (⌫ borra). ↩️ deshace y 💡 te da una pista. Los números repetidos salen en rojo.', 'Tap a cell and then a number below (⌫ erases). ↩️ undoes and 💡 gives you a hint. Repeated numbers turn red.');
      if (kind === 'cell') { const n = (V.states || []).map((q) => q.name ? TX(q.name) : '').filter(Boolean); return T('Toca una casilla para cambiarla' + (n.length ? ' (' + n.join(' → ') + ' → vacía)' : '') + '. Arrastra para pintar varias seguidas. ↩️ deshace y 💡 te da una pista.', 'Tap a cell to change it' + (n.length ? ' (' + n.join(' → ') + ' → empty)' : '') + '. Drag to paint several in a row. ↩️ undoes and 💡 gives you a hint.'); }
      if (kind === 'link') return V.ctrl ? TX(V.ctrl) : T('Arrastra el dedo de una casilla a otra para dibujar el camino; pasa otra vez por encima para borrarlo. También vale tocar una casilla y luego su vecina. ↩️ deshace y 💡 te da una pista.', 'Drag from cell to cell to draw the path; go over it again to erase it. You can also tap a cell and then its neighbour. ↩️ undoes and 💡 gives you a hint.');
      if (kind === 'edge') return T('Toca entre dos puntos para poner una línea; otra vez, una ✕ (ahí no va); otra vez, nada. También puedes arrastrar por los bordes. ↩️ deshace y 💡 te da una pista.', 'Tap between two dots to draw a line; again for an ✕ (no line there); again to clear. You can also drag along the edges. ↩️ undoes and 💡 gives you a hint.');
      if (kind === 'rect') return T('Arrastra de una esquina a la otra para dibujar ' + (V.square ? 'un cuadrado' : 'un rectángulo') + '; tócalo para quitarlo. ↩️ deshace y 💡 te da una pista.', 'Drag from one corner to the other to draw a ' + (V.square ? 'square' : 'rectangle') + '; tap it to remove it. ↩️ undoes and 💡 gives you a hint.');
      if (kind === 'bridge') return T('Arrastra de una isla a otra para tender un puente; repite para hacerlo doble y otra vez para quitarlo. También vale tocar una isla y luego la otra. ↩️ deshace y 💡 te da una pista.', 'Drag from one island to another to build a bridge; repeat to make it double and again to remove it. You can also tap one island and then the other. ↩️ undoes and 💡 gives you a hint.');
      if (kind === 'move') return T('Arrastra una ficha en línea recta hasta donde quieras dejarla; tócala para devolverla a su sitio. ↩️ deshace y 💡 te da una pista.', 'Drag a piece in a straight line to where you want it; tap it to send it back. ↩️ undoes and 💡 gives you a hint.');
      return '';
    }
    function tutSteps(g) {
      const s = g.s, P = s.P, out = [];
      for (const r of V.rules ? V.rules(P) : []) out.push({ t: TX(r.t), cells: r.cells ? (typeof r.cells === 'function' ? r.cells(P) : r.cells) : null, rows: r.rows, cols: r.cols, edges: r.edges, all: r.all });
      out.push({ t: controlsText(), btns: ['undo', 'hint'] });
      return out;
    }
    function tutRects(g, step) {
      const s = g.s, P = s.P, cs = s.cs, out = [];
      if (step.all) out.push({ x: s.ox - 4, y: s.oy - 4, w: P.w * cs + 8, h: P.h * cs + 8 });
      if (step.cells) { const set = new Set(step.cells); for (const i of set) { const [x, y] = cellXY(s, i); out.push({ x: x + 1, y: y + 1, w: cs - 2, h: cs - 2 }); } }
      if (step.rows) for (const y of step.rows) out.push({ x: s.ox - 3, y: s.oy + y * cs - 1, w: P.w * cs + 6, h: cs + 2 });
      if (step.cols) for (const x of step.cols) out.push({ x: s.ox + x * cs - 1, y: s.oy - 3, w: cs + 2, h: P.h * cs + 6 });
      if (step.edges) for (const e of step.edges) out.push(actRect(s, { e }));
      for (const id of step.btns || []) { const b = s.btns.find((q) => q.id === id); if (b) out.push({ x: b.x - 3, y: b.y - 3, w: b.w + 6, h: b.h + 6 }); }
      if (step.act) out.push(actRect(s, step.act));
      return out;
    }
    function wrapText(ctx, text, maxW, size, font) { ctx.font = '700 ' + size + 'px ' + (font || A.FONT); const words = String(text).split(' '), lines = []; let cur = ''; for (const w of words) { const t2 = cur ? cur + ' ' + w : w; if (ctx.measureText(t2).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t2; } if (cur) lines.push(cur); return lines; }
    function tutBox(g) {
      const s = g.s, tu = s.tut, step = tu.steps[tu.i], rs = tutRects(g, step);
      const W = g.W, bw = Math.min(W - 24, 460), size = W < 420 ? 14 : 16, ctx = document.createElement('canvas').getContext('2d');
      const lines = wrapText(ctx, step.t, bw - 32, size), pad = 22, bh = pad + lines.length * size * 1.35 + 52;
      const top = rs.length ? Math.min(...rs.map((r) => r.y)) : g.H / 2, bot = rs.length ? Math.max(...rs.map((r) => r.y + r.h)) : g.H / 2;
      const y = bot + 12 + bh < g.bot ? bot + 12 : top - 12 - bh > g.top ? top - 12 - bh : g.bot - bh - 8, x = (W - bw) / 2;
      return { x, y, w: bw, h: bh, lines, size, rs, pad, next: { x: x + bw - 132, y: y + bh - 44, w: 120, h: 34 }, skip: { x: x + 12, y: y + bh - 44, w: 100, h: 34 } };
    }
    function dim(g, ctx, rs, k) {
      ctx.save(); ctx.globalAlpha = 0.6 * k; ctx.fillStyle = '#0b0820'; ctx.beginPath(); ctx.rect(0, 0, g.W, g.H);
      for (const r of rs) { const q = Math.min(10, r.w / 2, r.h / 2); ctx.moveTo(r.x + q, r.y); ctx.arcTo(r.x + r.w, r.y, r.x + r.w, r.y + r.h, q); ctx.arcTo(r.x + r.w, r.y + r.h, r.x, r.y + r.h, q); ctx.arcTo(r.x, r.y + r.h, r.x, r.y, q); ctx.arcTo(r.x, r.y, r.x + r.w, r.y, q); ctx.closePath(); }
      ctx.fill('evenodd'); ctx.restore();
      const p = 0.6 + 0.4 * Math.sin(g.rt * 5);
      for (const r of rs) { ctx.save(); ctx.globalAlpha = k; ctx.strokeStyle = `rgba(255,212,59,${p})`; ctx.lineWidth = 3; A.rr(ctx, r.x, r.y, r.w, r.h, 8); ctx.stroke(); ctx.restore(); }
    }
    function drawTut(g, ctx) {
      const s = g.s, tu = s.tut; if (!tu) return; tu.t += A.fdt;
      const b = tutBox(g), k = Math.min(1, tu.t * 4);
      dim(g, ctx, b.rs, k);
      ctx.save(); ctx.globalAlpha = k; ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 18; ctx.fillStyle = '#fffdf5'; A.rr(ctx, b.x, b.y, b.w, b.h, 16); ctx.fill(); ctx.restore();
      ctx.globalAlpha = k;
      A.txt(ctx, (tu.i + 1) + ' / ' + tu.steps.length, b.x + b.w - 16, b.y + 14, 12, '#868e96', 'right', 800);
      b.lines.forEach((ln, n) => A.txt(ctx, ln, b.x + 16, b.y + b.pad + n * b.size * 1.35 + b.size * 0.4, b.size, '#212529', 'left', 700));
      const last = tu.i === tu.steps.length - 1;
      ctx.fillStyle = C.hl; A.rr(ctx, b.next.x, b.next.y, b.next.w, b.next.h, 17); ctx.fill();
      A.txt(ctx, last ? T('¡A jugar!', "Let's play!") : T('Siguiente ▶', 'Next ▶'), b.next.x + b.next.w / 2, b.next.y + b.next.h / 2, 15, '#2a2100', 'center', 900);
      if (!last) A.txt(ctx, T('Saltar', 'Skip'), b.skip.x + b.skip.w / 2, b.skip.y + b.skip.h / 2, 14, '#868e96', 'center', 800);
      ctx.globalAlpha = 1;
    }
    function tutStart(g) { const s = g.s; s.tut = { steps: tutSteps(g), i: 0, t: 0 }; s.drag = null; A.tone(660, 0.06, 'sine', 0.05); }
    function tutNext(g, skip) { const s = g.s, tu = s.tut; if (!tu) return; tu.i++; tu.t = 0; if (skip || tu.i >= tu.steps.length) { s.tut = null; try { A.set('tut_' + g.def.id, 1); } catch (e) {} return; } A.tone(560 + tu.i * 30, 0.05, 'sine', 0.04); }
    function tutTap(g, p) { const b = tutBox(g), inR = (r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; if (inR(b.skip) && g.s.tut.i < g.s.tut.steps.length - 1) return tutNext(g, true); tutNext(g); }

    /* --- explicación de una jugada (vídeo y demo) --- */
    function explain(P, a, st) {
      const t = V.explain ? V.explain(P, a, st) : null; if (t) return TX(t);
      if (a.wrong) return T('Esto no encaja con las reglas: lo quitamos.', 'This does not fit the rules: we remove it.');
      if (a.c != null && kind === 'num') return a.only ? T('Aquí solo cabe el ' + a.v + ': cualquier otro número rompe una regla.', 'Only ' + a.v + ' fits here: any other number breaks a rule.') : T('Probamos con el ' + a.v + ' en esta casilla: encaja con todas las pistas.', 'We try ' + a.v + ' in this cell: it fits every clue.');
      if (a.c != null) { const sd = stateOf(a.v); return sd && sd.why ? TX(sd.why) : T('Esta casilla cambia según las reglas.', 'This cell changes according to the rules.'); }
      if (a.l != null) return T('El camino sigue por aquí.', 'The path goes this way.');
      if (a.e != null) return T('La línea pasa por este borde.', 'The line runs along this edge.');
      if (a.r) return T('Este número cabe justo en este ' + (V.square ? 'cuadrado' : 'rectángulo') + '.', 'This number fits exactly in this ' + (V.square ? 'square' : 'rectangle') + '.');
      return T('Siguiente paso.', 'Next step.');
    }

    /* --- entrada --- */
    function inBtn(s, p) { return s.btns.find((b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h); }
    function inKey(s, p) { return (s.pad || []).find((k) => p.x >= k.x && p.x <= k.x + k.w && p.y >= k.y && p.y <= k.y + k.h); }
    function cycle(v) { const list = [0].concat((V.states || []).map((q) => q.v)); return list[(list.indexOf(v || 0) + 1) % list.length]; }
    const fixedCell = (P, i) => (P.fix && P.fix[i]) || (V.blocked && V.blocked(P, i)) || (P.fixc && P.fixc[i]);
    function setNum(g, v) { const s = g.s; if (s.sel < 0 || fixedCell(s.P, s.sel)) return; const cur = s.st.c[s.sel] || 0; const nvv = cur === v ? 0 : v; if (nvv === cur) return; commit(g, { c: s.sel, v: nvv }); }
    function toggleLink(g, a, b) {
      const s = g.s, P = s.P; if (a === b || U.n4(P.w, P.h, a).indexOf(b) < 0) return;
      const k = U.key(a, b), cur = s.st.L[k] || 0;
      if (V.canLink && !cur && !V.canLink(P, s.st, a, b)) { A.sfx.bad(); return false; }
      commit(g, { l: k, v: cur ? 0 : 1 }); return true;
    }
    // islas (bridge): puente entre dos islas en línea recta y sin nada en medio
    function bridgeBetween(P, a, b) {
      const w = P.w, ax = a % w, ay = (a / w) | 0, bx = b % w, by = (b / w) | 0; if (ax !== bx && ay !== by) return null;
      const step = ax === bx ? (by > ay ? w : -w) : (bx > ax ? 1 : -1); const cells = [];
      for (let i = a + step; i !== b; i += step) { if (P.isl[i]) return null; cells.push(i); }
      return cells.length ? cells : null;
    }
    function bridgeCrosses(P, st, a, b) {
      const cells = bridgeBetween(P, a, b); if (!cells) return true; const set = new Set(cells), horiz = Math.abs(b - a) < P.w;
      for (const k in st.L) { if (!st.L[k] || k === U.key(a, b)) continue; const [p, q] = k.split('_').map(Number); const hz = Math.abs(q - p) < P.w; if (hz === horiz) continue; const cs2 = bridgeBetween(P, p, q) || []; if (cs2.some((i) => set.has(i))) return true; }
      return false;
    }
    function nearestIsland(s, x, y) { const P = s.P; let best = -1, bd = 1e9; for (let i = 0; i < P.w * P.h; i++) { if (!P.isl[i]) continue; const [cx, cy] = cellXY(s, i), d = Math.hypot(cx + s.cs / 2 - x, cy + s.cs / 2 - y); if (d < bd) { bd = d; best = i; } } return bd < s.cs * 0.75 ? best : -1; }
    function cycleBridge(g, a, b) {
      const s = g.s, P = s.P; if (a === b || !bridgeBetween(P, a, b)) { A.sfx.bad(); return; }
      const k = U.key(a, b), cur = s.st.L[k] || 0, nx = (cur + 1) % 3;
      if (nx && bridgeCrosses(P, s.st, a, b)) { A.sfx.bad(); return; }
      commit(g, { l: k, v: nx });
    }
    function rectFrom(s, a, b) { const P = s.P, x1 = a % P.w, y1 = (a / P.w) | 0, x2 = b % P.w, y2 = (b / P.w) | 0; let x = Math.min(x1, x2), y = Math.min(y1, y2), w = Math.abs(x2 - x1) + 1, h = Math.abs(y2 - y1) + 1; if (V.square) { const n = Math.max(w, h); w = h = n; if (x2 < x1) x = x1 - n + 1; if (y2 < y1) y = y1 - n + 1; x = Math.max(0, Math.min(P.w - n, x)); y = Math.max(0, Math.min(P.h - n, y)); } return { x, y, w, h }; }
    function rectAt(st, P, i) { const x = i % P.w, y = (i / P.w) | 0; return st.R.find((q) => x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h); }
    // move: casilla final al arrastrar una ficha en línea recta
    function moveTarget(s, id, i) { const P = s.P, a = +id, w = P.w; if (i < 0 || i === a) return null; const ax = a % w, ay = (a / w) | 0, bx = i % w, by = (i / w) | 0; if (ax !== bx && ay !== by) return null; return V.canMove ? (V.canMove(P, s.st, a, i) ? i : null) : i; }

    /* --- demo: la siguiente jugada como toques o arrastres --- */
    function actGesture(g, a) {
      const s = g.s, P = s.P, cs = s.cs, ctr = (i) => { const [x, y] = cellXY(s, i); return [x + cs / 2, y + cs / 2]; };
      if (a.c != null) {
        if (kind === 'num') { const k = s.pad.find((q) => q.v === a.v); const out = [{ tap: ctr(a.c), after: 0.15 }]; if (k) out.push({ tap: [k.x + k.w / 2, k.y + k.h / 2], after: 0.3 }); return out; }
        const n = [0].concat((V.states || []).map((q) => q.v)), cur = n.indexOf(s.st.c[a.c] || 0), tgt = n.indexOf(a.v || 0); const taps = (tgt - cur + n.length) % n.length;
        const out = []; for (let k = 0; k < taps; k++) out.push({ tap: ctr(a.c), after: 0.12 }); return out;
      }
      if (a.l != null) { const [p, q] = a.l.split('_').map(Number); if (kind === 'bridge') { const cur = s.st.L[a.l] || 0, taps = ((a.v || 0) - cur + 3) % 3; const out = []; for (let k = 0; k < taps; k++) out.push({ drag: [ctr(p), ctr(q)], dur: 0.35, after: 0.1 }); return out; } return [{ drag: [ctr(p), ctr(q)], dur: 0.25, after: 0.05 }]; }
      if (a.e != null) { const [x1, y1, x2, y2] = edgeEnds(P, a.e), cur = s.st.E[a.e] || 0, tgt = a.v || 0, taps = (tgt - cur + 3) % 3, pt = [s.ox + (x1 + x2) / 2 * cs, s.oy + (y1 + y2) / 2 * cs]; const out = []; for (let k = 0; k < taps; k++) out.push({ tap: pt, after: 0.1 }); return out; }
      if (a.r) { if (!a.v) return [{ tap: ctr(a.r.y * P.w + a.r.x), after: 0.2 }]; return [{ drag: [ctr(a.r.y * P.w + a.r.x), ctr((a.r.y + a.r.h - 1) * P.w + a.r.x + a.r.w - 1)], dur: 0.45, after: 0.15 }]; }
      if (a.m != null) { if (a.to == null || (s.st.M[a.m] != null && a.wrong)) return [{ tap: ctr(s.st.M[a.m] != null ? s.st.M[a.m] : +a.m), after: 0.2 }]; return [{ drag: [ctr(+a.m), ctr(a.to)], dur: 0.45, after: 0.15 }]; }
      return [{ wait: 0.3 }];
    }
    // en el vídeo y en la demo rápida las jugadas se aplican directamente (sin depender del dedo)
    function doAct(g, a, quiet) {
      const s = g.s;
      if (a.l != null && kind === 'bridge') { s.hist.push(clone(s.st)); apply(s.st, { l: a.l, v: a.v }); s.acts++; if (!quiet) A.tone(600, 0.05, 'triangle', 0.05); return checkWin(g); }
      commit(g, a.c != null || a.l != null || a.e != null ? Object.assign({}, a.c != null ? { c: a.c, v: a.v } : a.l != null ? { l: a.l, v: a.v } : { e: a.e, v: a.v }) : a.r ? { r: a.r, v: a.v } : { m: a.m, to: a.to }, quiet);
    }

    const def = {
      lives: 0, levels: 0, cap: V.cap || 20, demoTime: 300,
      recCount: 500,
      setup(g) {
        start(g, newPuzzle(g, g.lv));
        if (!g.demoOn && !SHOTM && !RECQ && !A.get('tut_' + g.def.id, 0)) g.s.tutPend = 0.6;
        A.sfx.whoosh();
      },
      layout(g) { if (g.s && g.s.P) place(g); },
      down(g, p) {
        const s = g.s; if (!s.P || s.done || s.tut) return;
        const b = inBtn(s, p); if (b) { s.btnDown = b.id; return; }
        const k = inKey(s, p); if (k) { k.down = true; s.keyDown = k; return; }
        const i = cellAt(s, p.x, p.y);
        if (kind === 'cell' && i >= 0 && !fixedCell(s.P, i)) { const v = cycle(s.st.c[i]); s.drag = { paint: v, seen: new Set([i]), moved: false, i }; commit(g, { c: i, v }); }
        else if (kind === 'link' && i >= 0) s.drag = { last: i, start: i, moved: false };
        else if (kind === 'edge') { const e = edgeAt(s, p.x, p.y); if (e) { const v = ((s.st.E[e] || 0) + 1) % 3; s.drag = { paint: v === 2 ? 0 : v, seen: new Set([e]), moved: false }; commit(g, { e, v }); } }
        else if (kind === 'rect' && i >= 0) s.drag = { a: i, b: i, moved: false };
        else if (kind === 'bridge') { const isl = nearestIsland(s, p.x, p.y); if (isl >= 0) s.drag = { isl, moved: false }; }
        else if (kind === 'move' && i >= 0) { const id = Object.keys(s.P.pieces || {}).find((q) => (s.st.M[q] != null ? s.st.M[q] : +q) === i); if (id != null) s.drag = { id, to: null, moved: false }; }
      },
      move(g, p) {
        const s = g.s, d = s.drag; if (!d || s.done) return;
        if (Math.hypot(p.x - p.sx, p.y - p.sy) > 8) d.moved = true;
        const i = cellAt(s, p.x, p.y);
        if (kind === 'cell' && i >= 0 && !d.seen.has(i) && !fixedCell(s.P, i)) { d.seen.add(i); if ((s.st.c[i] || 0) !== d.paint) commit(g, { c: i, v: d.paint }, true); }
        else if (kind === 'link' && i >= 0 && i !== d.last) { if (U.n4(s.P.w, s.P.h, d.last).indexOf(i) >= 0) toggleLink(g, d.last, i); d.last = i; }
        else if (kind === 'edge') { const e = edgeAt(s, p.x, p.y); if (e && !d.seen.has(e)) { d.seen.add(e); if ((s.st.E[e] || 0) !== d.paint) commit(g, { e, v: d.paint }, true); } }
        else if (kind === 'rect' && i >= 0) d.b = i;
        else if (kind === 'bridge') d.x = p.x, d.y = p.y;
        else if (kind === 'move') { d.x = p.x; d.y = p.y; d.to = moveTarget(s, d.id, i); }
      },
      up(g, p) {
        const s = g.s; if (!s.P) return;
        if (s.tut) return tutTap(g, p);
        if (s.btnDown) { const id = s.btnDown; s.btnDown = null; if (id === 'undo') return undo(g); if (id === 'tut') return tutStart(g); if (id === 'hint') { if (!hint(g)) g.message(T('¡Ya está!', 'All done!'), 1.2); } return; }
        if (s.keyDown) { const k = s.keyDown; k.down = false; s.keyDown = null; if (inKey(s, p) === k) setNum(g, k.v); return; }
        if (s.done) return;
        const d = s.drag; s.drag = null; const i = cellAt(s, p.x, p.y);
        if (kind === 'num') { if (i >= 0) { s.sel = fixedCell(s.P, i) ? -1 : i; A.tone(700, 0.03, 'sine', 0.03); } return; }
        if (kind === 'link') {
          if (d && !d.moved && i >= 0) {
            if (V.cellTap && !(V.cellTapOk && !V.cellTapOk(s.P, i))) { if (s.sel >= 0 && s.sel !== i && U.n4(s.P.w, s.P.h, s.sel).indexOf(i) >= 0) { toggleLink(g, s.sel, i); s.sel = -1; return; } if (!fixedCell(s.P, i) && !Object.keys(s.st.L).some((k) => s.st.L[k] && k.split('_').map(Number).indexOf(i) >= 0)) { commit(g, { c: i, v: cycle(s.st.c[i]) }); s.sel = -1; return; } }
            if (s.sel >= 0 && s.sel !== i && U.n4(s.P.w, s.P.h, s.sel).indexOf(i) >= 0) { toggleLink(g, s.sel, i); s.sel = -1; } else s.sel = s.sel === i ? -1 : i;
          }
          return;
        }
        if (kind === 'rect' && d) {
          if (!d.moved || d.a === d.b) { const q = rectAt(s.st, s.P, d.a); if (q) { commit(g, { r: q, v: 0 }); return; } if (s.sel >= 0) { commit(g, { r: rectFrom(s, s.sel, d.a), v: 1 }); s.sel = -1; } else s.sel = d.a; return; }
          commit(g, { r: rectFrom(s, d.a, d.b), v: 1 }); s.sel = -1; return;
        }
        if (kind === 'bridge' && d) {
          const isl = nearestIsland(s, p.x, p.y);
          if (d.moved && isl >= 0 && isl !== d.isl) { cycleBridge(g, d.isl, isl); s.sel = -1; return; }
          if (!d.moved) { if (s.sel >= 0 && s.sel !== d.isl) { cycleBridge(g, s.sel, d.isl); s.sel = -1; } else s.sel = s.sel === d.isl ? -1 : d.isl; }
          return;
        }
        if (kind === 'move' && d) {
          if (!d.moved) { if (s.st.M[d.id] != null) commit(g, { m: d.id, to: null }); return; }
          if (d.to != null) commit(g, { m: d.id, to: d.to }); else A.sfx.bad();
        }
      },
      key(g, k, dn) {
        if (!dn) return; const s = g.s; if (!s.P) return;
        if (s.tut) { if (k === 'Escape' || k === 'Backspace') tutNext(g, true); else if (k === 'Enter' || k === ' ' || k === 'ArrowRight') tutNext(g); return; }
        if (k === 'z' || (k === 'Backspace' && kind !== 'num')) return undo(g);
        if (k === 'h') return hint(g);
        if (kind === 'num') {
          const dir = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -s.P.w, ArrowDown: s.P.w }[k];
          if (dir) { if (s.sel < 0) s.sel = 0; else s.sel = Math.max(0, Math.min(s.P.w * s.P.h - 1, s.sel + dir)); return; }
          if (/^[0-9]$/.test(k)) setNum(g, +k); if (k === 'Backspace' || k === 'Delete') setNum(g, 0);
        }
      },
      update(g, dt) {
        const s = g.s; if (!s.P) return;
        if (!s.done && !s.tut) s.el += dt;
        if (s.hl) { s.hl.t -= dt; if (s.hl.t <= 0) s.hl = null; }
        for (const i in s.pulse) { s.pulse[i] -= dt * 4; if (s.pulse[i] <= 0) delete s.pulse[i]; }
        if (s.tutPend != null && g.state === 'play') { s.tutPend -= dt; if (s.tutPend <= 0) { s.tutPend = null; if (!g.demoOn) tutStart(g); } }
      },
      draw(g, ctx) {
        background(g, ctx); const s = g.s; if (!s.P) return;
        drawBoard(g, ctx);
        // arrastres en curso
        const d = s.drag, cs = s.cs;
        if (d && kind === 'rect' && d.moved) { const q = rectFrom(s, d.a, d.b); ctx.save(); ctx.strokeStyle = '#e8590c'; ctx.setLineDash([6, 4]); ctx.lineWidth = 3; A.rr(ctx, s.ox + q.x * cs + 3, s.oy + q.y * cs + 3, q.w * cs - 6, q.h * cs - 6, 8); ctx.stroke(); ctx.restore(); A.txt(ctx, String(q.w * q.h), s.ox + (q.x + q.w / 2) * cs, s.oy + (q.y + q.h / 2) * cs, cs * 0.5, 'rgba(232,89,12,.7)', 'center', 900); }
        if (d && kind === 'bridge' && d.moved && d.x != null) { const [x, y] = cellXY(s, d.isl); ctx.save(); ctx.strokeStyle = 'rgba(232,89,12,.7)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + cs / 2, y + cs / 2); ctx.lineTo(d.x, d.y); ctx.stroke(); ctx.restore(); }
        if (d && kind === 'move' && d.moved && d.to != null) { const [x, y] = cellXY(s, d.to); ctx.save(); ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 3; ctx.setLineDash([5, 4]); A.rr(ctx, x + 3, y + 3, cs - 6, cs - 6, cs / 2); ctx.stroke(); ctx.restore(); }
        if ((kind === 'bridge' || kind === 'link' || kind === 'rect') && s.sel >= 0 && !s.done) { const [x, y] = cellXY(s, s.sel); ctx.save(); ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 3; A.rr(ctx, x + 2, y + 2, cs - 4, cs - 4, 8); ctx.stroke(); ctx.restore(); }
        drawTop(g, ctx);
        drawStamp(g, ctx);
        if (s.tut) drawTut(g, ctx);
      },
      demo(g) {
        const s = g.s; if (!s.P || s.done) return { wait: 0.5 };
        const a = solActs(s.P, s.st)[0]; if (!a) return { wait: 0.5 };
        if (SHOTM && s.acts >= s.total * 0.6) return { wait: 1 };   // captura: a medio resolver queda más bonito
        const fast = RECQ || SHOTM || g.recFast;
        if (fast) { const n = Math.max(1, Math.ceil(s.total / 40)); for (let k = 0; k < n; k++) { const b = solActs(s.P, s.st)[0]; if (!b) break; doAct(g, b, k > 0); } return { wait: RECQ ? 0.22 : 0.15 }; }
        const steps = actGesture(g, a); if (steps.length && s.acts === 0) steps[0].say = explain(s.P, a, s.st);
        return steps.length ? steps : { wait: 0.3 };
      },
      quiz: {
        goal: (g) => ({ es: V.goal ? TX(V.goal) : 'Resuélvelo', en: V.goalEn || (V.goal && V.goal.en) || 'Solve it' }),
        par: (g) => g.s.total || 0,
        moves: (g) => (g.s && g.s.acts) || 0,
      },
      tv: { mode: 'tap', targets: (g) => {
        const s = g.s; if (!s.P) return []; const o = [];
        if (s.tut) { const b = tutBox(g); return [{ x: b.next.x, y: b.next.y, w: b.next.w, h: b.next.h, instant: true }]; }
        for (let i = 0; i < s.P.w * s.P.h; i++) { const [x, y] = cellXY(s, i); o.push({ x, y, w: s.cs, h: s.cs }); }
        for (const k of s.pad || []) o.push({ x: k.x, y: k.y, w: k.w, h: k.h, instant: true });
        for (const b of s.btns) o.push({ x: b.x, y: b.y, w: b.w, h: b.h, instant: true });
        return o;
      } },
      /* ---------- vídeo «cómo se juega» (Game2Video --tutoriales): ?rec=1&tut=1 ----------
         Cartela de entrada, las reglas con su parte del tablero resaltada, unas jugadas de ejemplo explicadas, el final
         rápido hasta el sello de «resuelto» y la cartela final. moves=6 · read=1 · url · hook · cta · extra · outro · intro */
      recScene(g, Q) {
        if (!Q.has('tut')) return null;
        const D0 = this, num = (k, dd) => (Q.has(k) && Q.get(k) !== '' && isFinite(+Q.get(k)) ? +Q.get(k) : dd);
        const NM = Math.max(0, Math.min(30, Math.round(num('moves', 5)))), READ = Math.max(0.4, num('read', 1));
        const host = Q.get('site') || location.host, id = g.def.id, title = g.def.title, emo = g.def.emoji || '🏯';
        const url = Q.get('url') || host + '/' + id;
        const hook = Q.get('hook') || T('Aprende a jugar en un minuto', 'Learn to play in one minute');
        const cta = Q.get('cta') || T('Juega gratis en el navegador', 'Play free in your browser');
        const extra = Q.has('extra') ? Q.get('extra') : T('Puzles de lógica de Japón y de todo el mundo', 'Logic puzzles from Japan and around the world');
        const accent = g.def.color || C.hl, bg = g.def.bg || ['#2b2f4a', '#141629'];
        let seed = 12345 + (num('seed', 1) | 0) * 7919; const mr = Math.random; Math.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
        g.demoOn = true; g.level = 1;
        const P = newPuzzle(g, V.tutLv || Math.max(2, Math.round((g.def.cap || 20) * 0.15))); start(g, P);
        Math.random = mr;
        const s = g.s; s.tutPend = null; g.score = 0;
        const readT = (txt, lo, hi) => Math.max(lo, Math.min(hi, (1.4 + String(txt).split(/\s+/).length * 0.3) * READ));
        const steps = tutSteps(g);
        const TI = Math.max(1.5, num('intro', 3.2)), OUT = Math.max(2.5, num('outro', 5.5));
        let t = TI; const tl = [];
        steps.forEach((st, i) => { const dd = readT(st.t, 3.4, 11); tl.push({ kind: 'step', i, st, t0: t, t1: t + dd }); t += dd; });
        const MR = 2.8 * READ, MA = 0.9, MP = 0.5;
        const all = solActs(P, s.st), nm = Math.min(NM, all.length);
        for (let j = 0; j < nm; j++) { tl.push({ kind: 'move', j, t0: t, t1: t + MR + MA + MP }); t += MR + MA + MP; }
        const rest = all.length - nm, FIN = rest > 0 ? Math.min(6, 1.5 + rest * 0.12) : 0;
        if (rest > 0) { tl.push({ kind: 'fast', t0: t, t1: t + FIN }); t += FIN; }
        tl.push({ kind: 'stamp', t0: t, t1: t + 2.2 }); t += 2.2;
        const TO = t, DUR = t + OUT;
        const cues = [{ t: 0.05, s: 'whoosh' }, { t: 0.35, s: 'pop' }, { t: TO + 0.1, s: 'whoosh' }, { t: TO + 0.6, s: 'ding' }];
        tl.forEach((p) => { if (p.kind === 'step') cues.push({ t: p.t0 + 0.05, s: 'pop' }); else if (p.kind === 'move') cues.push({ t: p.t0 + 0.05, s: 'tick' }, { t: p.t0 + MR + MA * 0.6, s: 'pop' }); else if (p.kind === 'fast') { for (let k = 0; k < FIN / 0.25; k++) cues.push({ t: p.t0 + k * 0.25, s: k % 2 ? 'hat' : 'tick' }); } else cues.push({ t: p.t0 + 0.1, s: 'boom' }, { t: p.t0 + 0.5, s: 'ding' }); });
        const FS = Math.round(Math.max(17, Math.min(30, Math.min(g.W, g.H) * 0.05)));
        const ease = (k) => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3), backE = (k) => { k = Math.max(0, Math.min(1, k)); const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
        const TF = A.TFONT || A.FONT;
        const mv = [];
        const moveOf = (j) => { if (mv[j] !== undefined) return mv[j]; const a = solActs(P, s.st)[0]; mv[j] = a ? { a, text: explain(P, a, s.st), rs: [actRect(s, a)], done: false } : null; return mv[j]; };
        function box(ctx, text, rs, tt, label) {
          const bw = Math.min(g.W - 28, 640), lines = wrapText(ctx, text, bw - 40, FS), lh = FS * 1.34, lab = label ? FS * 0.75 + 12 : 0, bh = 30 + lab + lines.length * lh;
          const top = rs.length ? Math.min(...rs.map((r) => r.y)) : g.H / 2, bot = rs.length ? Math.max(...rs.map((r) => r.y + r.h)) : g.H / 2;
          const brd = s.oy + s.P.h * s.cs + s.M.b * s.cs + 14;
          const y = Math.max(bot, brd) + 14 + bh < g.H - 24 ? Math.max(bot, brd) + 14 : top - 18 - bh > 70 ? top - 18 - bh : g.H - bh - 28, x = (g.W - bw) / 2;
          const k = backE(tt / 0.35);
          ctx.save(); ctx.translate(g.W / 2, y + bh / 2); ctx.scale(k, k); ctx.translate(-g.W / 2, -(y + bh / 2));
          ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 22; ctx.fillStyle = '#fffdf5'; A.rr(ctx, x, y, bw, bh, 18); ctx.fill(); ctx.shadowBlur = 0;
          ctx.fillStyle = C.seal; A.rr(ctx, x, y, 8, bh, 4); ctx.fill();
          if (label) A.txt(ctx, label, x + 22, y + 14 + FS * 0.37, FS * 0.62, '#c92a2a', 'left', 900);
          let shown = Math.floor(tt / 0.07) + 1;
          lines.forEach((ln, n) => { const ws = ln.split(' '), part = ws.slice(0, Math.max(0, shown)).join(' '); shown -= ws.length; if (part) A.txt(ctx, part, x + 22, y + 15 + lab + n * lh + FS * 0.55, FS, '#212529', 'left', 700); });
          ctx.restore(); return { y, h: bh };
        }
        function header(ctx, text, sub) {
          ctx.save(); ctx.font = '900 ' + Math.round(FS * 0.72) + 'px ' + A.FONT;
          const w = Math.min(g.W - 20, ctx.measureText(text).width + FS * 1.6), h = FS * 1.35, y = 10;
          ctx.fillStyle = 'rgba(0,0,0,.62)'; A.rr(ctx, g.W / 2 - w / 2, y, w, h, h / 2); ctx.fill(); ctx.restore();
          A.txt(ctx, text, g.W / 2, y + h / 2 + 1, FS * 0.72, '#fff', 'center', 900);
          if (sub != null) { ctx.fillStyle = 'rgba(255,255,255,.2)'; A.rr(ctx, g.W / 2 - w / 2 + 14, y + h + 6, w - 28, 6, 3); ctx.fill(); ctx.fillStyle = accent; A.rr(ctx, g.W / 2 - w / 2 + 14, y + h + 6, (w - 28) * Math.min(1, sub), 6, 3); ctx.fill(); }
        }
        function footer(ctx) {
          const txt = emo + ' ' + title + '  ·  ' + url.replace(/^https?:\/\//, ''), fz = Math.round(FS * 0.7);
          ctx.save(); ctx.font = '900 ' + fz + 'px ' + A.FONT; const w = Math.min(g.W - 24, ctx.measureText(txt).width + fz * 2), h = fz * 2.1, y = g.H - h - 18;
          ctx.globalAlpha = 0.92; ctx.fillStyle = 'rgba(0,0,0,.55)'; A.rr(ctx, g.W / 2 - w / 2, y, w, h, h / 2); ctx.fill(); ctx.restore();
          A.txt(ctx, txt, g.W / 2, y + h / 2 + 1, Math.min(fz, (g.W - 50) / Math.max(1, txt.length) * 1.8), '#fff', 'center', 900);
        }
        function finger(ctx, x, y, press) { A.emoji(ctx, '👆', x + 6, y + 22, 44 * (1 - press * 0.12), { rot: -0.15 }); if (press > 0) { ctx.save(); ctx.globalAlpha = press * 0.7; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 12 + (1 - press) * 26, 0, TAU); ctx.stroke(); ctx.restore(); } }
        function card(ctx, k, a, b) {
          const m = Math.min(g.W, g.H), cy = g.H * (b != null ? 0.3 : 0.36), e = backE((b != null ? b : a) / 0.5), at = (t0) => k * Math.min(1, Math.max(0, ((b != null ? b : a) - t0) * 3));
          ctx.save(); ctx.globalAlpha = k;
          const gr = ctx.createLinearGradient(0, 0, 0, g.H); gr.addColorStop(0, bg[0]); gr.addColorStop(1, bg[1]); ctx.fillStyle = gr; ctx.fillRect(0, 0, g.W, g.H);
          for (let i = 0; i < 16; i++) { const xx = ((i * 0.37 + g.rt * 0.02) % 1) * g.W, yy = ((i * 0.61 + g.rt * 0.05 * (i % 3 + 1)) % 1.2) * g.H - 40; petal(ctx, xx, yy, 7 + (i % 3) * 3, g.rt + i); }
          ctx.restore();
          ctx.save(); ctx.globalAlpha = k; ctx.translate(g.W / 2, cy + Math.sin(g.rt * 3) * m * 0.012); ctx.scale(e, e); if (V.kanji) seal(ctx, 0, 0, m * 0.15, V.kanji, 1, -0.1 + Math.sin(g.rt * 1.7) * 0.04); else A.emoji(ctx, emo, 0, 0, m * 0.26); ctx.restore();
          ctx.save(); ctx.globalAlpha = k; A.txt(ctx, title, g.W / 2, cy + m * 0.25, Math.min(m * 0.11, (g.W * 0.9) / Math.max(5, title.length) * 1.75), '#fff', 'center', 900, 'rgba(0,0,0,.5)', TF); ctx.restore();
          if (b == null) {
            const k2 = backE((a - 0.35) / 0.4), lb = '📖 ' + T('CÓMO SE JUEGA', 'HOW TO PLAY');
            ctx.save(); ctx.globalAlpha = k; ctx.translate(g.W / 2, cy + m * 0.38); ctx.scale(k2, k2);
            ctx.font = '900 ' + Math.round(m * 0.05) + 'px ' + A.FONT; const w = ctx.measureText(lb).width + m * 0.08;
            ctx.fillStyle = accent; A.rr(ctx, -w / 2, -m * 0.045, w, m * 0.09, m * 0.045); ctx.fill(); A.txt(ctx, lb, 0, 2, m * 0.05, '#1b1b2f', 'center', 900);
            ctx.restore();
            ctx.save(); ctx.globalAlpha = at(0.8); A.txt(ctx, hook, g.W / 2, cy + m * 0.5, m * 0.042, 'rgba(255,255,255,.92)', 'center', 800); ctx.restore();
          } else {
            ctx.save(); ctx.globalAlpha = k; A.txt(ctx, T('¡Ahora te toca a ti!', "Now it's your turn!"), g.W / 2, cy + m * 0.37, m * 0.055, '#ffe066', 'center', 900, 'rgba(0,0,0,.4)'); ctx.restore();
            ctx.save(); ctx.globalAlpha = at(0.6); A.txt(ctx, cta, g.W / 2, cy + m * 0.48, m * 0.045, '#fff', 'center', 800); ctx.restore();
            const e3 = backE((b - 0.9) / 0.4), bob = 1 + 0.035 * Math.sin(g.rt * 6);
            ctx.save(); ctx.globalAlpha = k; ctx.translate(g.W / 2, cy + m * 0.6); ctx.scale(e3 * bob, e3 * bob);
            ctx.font = '900 ' + Math.round(m * 0.052) + 'px ' + A.FONT; const uw = Math.min(g.W * 0.94, ctx.measureText(url).width + m * 0.12), sz = Math.min(m * 0.052, (g.W * 0.94 - m * 0.12) / Math.max(1, url.length) * 1.75);
            ctx.fillStyle = accent; A.rr(ctx, -uw / 2, -m * 0.06, uw, m * 0.12, m * 0.06); ctx.fill(); A.txt(ctx, url, 0, 2, sz, '#1b1b2f', 'center', 900);
            ctx.restore();
            if (extra) { ctx.save(); ctx.globalAlpha = at(1.5); A.txt(ctx, extra, g.W / 2, cy + m * 0.74, m * 0.04, 'rgba(255,255,255,.85)', 'center', 800); ctx.restore(); }
          }
        }
        let fastDone = 0;
        return {
          kind: 'tutorial', dur: DUR, cues,
          info: { kind: 'tutorial', firstMove: +(tl.find((p) => p.kind === 'move') || { t0: TO }).t0.toFixed(2), outro: +TO.toFixed(2), id, title, url: /^https?:/.test(url) ? url : 'https://' + url, steps: steps.length, moves: nm, tag: g.def.tag || '', emoji: emo },
          frame(t, dt, ctx) {
            A.fdt = dt; A.fno++; g.rt = t; g.t = t;
            const ph = tl.find((p) => t >= p.t0 && t < p.t1);
            let rs = [], text = null, tt = 0, label = null, head = null, prog = null; s.hl = null;
            if (ph && ph.kind === 'step') { rs = tutRects(g, ph.st); text = ph.st.t; tt = t - ph.t0; head = '📖 ' + T('Cómo se juega', 'How to play') + ' · ' + (ph.i + 1) + '/' + steps.length; prog = (ph.i + (t - ph.t0) / (ph.t1 - ph.t0)) / steps.length; }
            else if (ph && ph.kind === 'move') {
              const Mv = moveOf(ph.j), lt = t - ph.t0; head = '▶ ' + T('Jugada de ejemplo', 'Example move') + ' ' + (ph.j + 1) + '/' + nm; prog = (ph.j + lt / (ph.t1 - ph.t0)) / nm;
              if (Mv) { text = Mv.text; tt = lt; label = T('PASO', 'STEP') + ' ' + (ph.j + 1); rs = Mv.rs; if (!Mv.done) s.hl = { a: Mv.a, t: 9 }; if (lt >= MR + MA * 0.6 && !Mv.done) { Mv.done = true; s.hl = null; doAct(g, Mv.a, true); } }
            } else if (ph && ph.kind === 'fast') {
              head = '⏩ ' + T('Y así hasta el final', 'And so on to the end'); const want = Math.ceil((t - ph.t0) / (ph.t1 - ph.t0) * (rest + 1));
              while (fastDone < want) { const a = solActs(P, s.st)[0]; if (!a) break; doAct(g, a, true); fastDone++; }
            } else if (ph && ph.kind === 'stamp') { if (!s.done) { let n = 0; while (!s.done && n++ < 500) { const a = solActs(P, s.st)[0]; if (!a) break; doAct(g, a, true); } } head = '🈴 ' + T('¡Resuelto!', 'Solved!'); }
            D0.update(g, dt);
            ctx.save(); D0.draw(g, ctx); ctx.restore();
            if (text && t < TO) {
              dim(g, ctx, rs, Math.min(1, tt * 4));
              if (ph.kind === 'move' && mv[ph.j]) { const Mv = mv[ph.j], lt = t - ph.t0, r = Mv.rs[0]; if (lt >= MR - 0.4 && lt < MR + MA) finger(ctx, r.x + r.w / 2, r.y + r.h / 2, Math.max(0, 1 - Math.abs(lt - MR - MA * 0.6) * 3)); }
              const bx = box(ctx, text, rs, tt, label);
              if (bx.y + bx.h < g.H - FS * 3.2) footer(ctx);
            } else if (t < TO && t >= TI) footer(ctx);
            if (head && t < TO) header(ctx, head, prog);
            if (t < TI + 0.5) card(ctx, t < TI ? 1 : 1 - (t - TI) / 0.5, t, null);
            if (t >= TO) card(ctx, Math.min(1, (t - TO) / 0.45), null, t - TO);
          },
        };
      },
      _test: { solActs, apply, empty, explain, tutSteps, newPuzzle, U, V },
    };
    return def;
  };
  A.rejilla.U = U;
  A.rejilla.C = C;
  A.rejilla.NUMF = NUMF;
  A.rejilla.KANJIF = KANJIF;
  A.rejilla.PASTEL = PASTEL;
})();
