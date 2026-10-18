/* Motor de solitarios de Arcade Perdido (Arcade.paciencia).
   Cada variante (herramientas/src/<id>.js con «// @cartas») describe sus montones y sus reglas; el motor pone el resto:
   tocar para mover solo, arrastrar, deshacer, pista, demo, final automático, cartas dibujadas y la cascada al ganar.

   Estado: st.p[i] = lista de cartas del montón i (n = carta boca arriba, n + 1000 = boca abajo); carta: baraja·52 + palo·13 + (número − 1).
   Montones (V.piles): { k: 'stock' | 'waste' | 'found' | 'tab' | 'cell' | 'res' | 'grid' | 'disc', ... }
   Reglas: V.found = { base, step, suit: 'suit'|'any', wrap, mode: 'build'|'updown'|'run' }   V.tab = { build: 'alt'|'suit'|'any'|'none'|'free',
     dir, wrap, move: 'one'|'seq'|'any'|'run', empty: 'any'|'K'|'none', from: ['waste'] }   V.stock = { to: 'waste'|'tab'|'found', n, redeals } */
(function () {
  const A = Arcade, T = A.T;
  const SUIT = ['♠', '♥', '♦', '♣'], RANK = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const DOWN = 1000;
  const card = (x) => x >= DOWN ? x - DOWN : x, isUp = (x) => x < DOWN;
  const S = (x) => ((card(x) % 52) / 13) | 0, R = (x) => card(x) % 13 + 1, RED = (x) => { const s = S(x); return s === 1 || s === 2; };
  const wrap13 = (r) => ((r - 1 + 13 * 4) % 13) + 1;
  A.cartas = { S, R, RED, SUIT, RANK, DOWN, card, isUp };

  A.paciencia = function (V) {
    // las reglas son los mismos objetos de la variante: su init(lv) puede cambiarlas según el nivel
    const F = V.found = Object.assign({ base: 1, step: 1, suit: 'suit', wrap: false, mode: 'build' }, V.found || {});
    const TB = V.tab = Object.assign({ build: 'alt', dir: -1, wrap: false, move: 'seq', empty: 'any', from: null }, V.tab || {});
    const ST = V.stock = Object.assign({ to: 'waste', n: 1, redeals: Infinity }, V.stock || {});

    /* ---------- reglas (sobre un estado st y la lista de montones D) ---------- */
    const kinds = (D, k) => D.reduce((o, d, i) => (d.k === k && o.push(i), o), []);
    const top = (st, i) => { const p = st.p[i]; return p.length ? p[p.length - 1] : null; };
    function freeGrid(st, D, i) { const d = D[i]; return !d.cov || d.cov.every((j) => !st.p[j].length); }
    function fitsTab(c, on) {
      if (TB.build === 'free') return true; if (TB.build === 'none') return false;
      let want = R(on) + TB.dir; if (TB.wrap) want = wrap13(want);
      if (R(c) !== want) return false;
      if (TB.build === 'alt') return RED(c) !== RED(on);
      if (TB.build === 'suit') return S(c) === S(on);
      return true;
    }
    const seqOK = (cs, suitRun) => cs.every((x, k) => isUp(x) && (k === 0 || (suitRun ? S(x) === S(cs[k - 1]) && R(x) === R(cs[k - 1]) - 1 : fitsTab(x, cs[k - 1]))));
    function fBase(st, D, i) { const b = st.fb != null ? st.fb : F.base; return Array.isArray(b) ? b[D[i].fi] : b; }
    function fStep(D, i) { return Array.isArray(F.step) ? F.step[D[i].fi] : F.step; }
    function fitsFound(st, D, i, cs) {
      const p = st.p[i];
      if (F.mode === 'run') return cs.length === 13 && R(cs[0]) === 13 && seqOK(cs, true) && !p.length;
      if (cs.length !== 1) return false; const c = cs[0];
      if (F.mode === 'updown') { if (!p.length) return true; const t = p[p.length - 1], d = Math.abs(R(c) - R(t)); return d === 1 || (F.wrap && d === 12); }
      if (!p.length) return R(c) === fBase(st, D, i) && (!D[i].suit || D[i].suit === S(c) + 1);
      if (p.length >= 13) return false;
      const t = p[p.length - 1]; if (F.suit === 'suit' && S(c) !== S(t)) return false;
      return R(c) === wrap13(R(t) + fStep(D, i));
    }
    // ¿se pueden coger las n cartas de arriba del montón i?
    function canTake(st, D, i, n) {
      const d = D[i], p = st.p[i]; if (n < 1 || n > p.length) return false;
      const cs = p.slice(p.length - n); if (!cs.every(isUp)) return false;
      switch (d.k) {
        case 'tab': if (n === 1) return true;
          if (TB.move === 'one') return !!V.supermove && seqOK(cs, false);
          if (TB.move === 'any') return true;
          if (TB.move === 'run') return seqOK(cs, true);
          return seqOK(cs, false);
        case 'waste': case 'res': case 'cell': return n === 1;
        case 'grid': return n === 1 && freeGrid(st, D, i);
        case 'found': return n === 1 && F.mode === 'build' && V.takeBack !== false;
        default: return false;
      }
    }
    function superLimit(st, D, to) {
      const cells = kinds(D, 'cell').filter((j) => !st.p[j].length).length;
      const empt = kinds(D, 'tab').filter((j) => j !== to && !st.p[j].length && TB.empty === 'any').length;
      return (cells + 1) * Math.pow(2, empt);
    }
    function canDrop(st, D, from, n, to) {
      if (from === to) return false; const d = D[to], p = st.p[from], cs = p.slice(p.length - n), q = st.p[to];
      if (V.canDrop) { const r = V.canDrop(st, D, from, n, to, cs); if (r != null) return r; }
      switch (d.k) {
        case 'found': return fitsFound(st, D, to, cs) && (F.mode !== 'run' || D[from].k === 'tab');
        case 'cell': return n === 1 && !q.length;
        case 'tab': {
          if (TB.from && TB.from.indexOf(D[from].k) < 0) return false;
          if (TB.move === 'one' && V.supermove && n > 1 && n > superLimit(st, D, to)) return false;
          if (!q.length) return TB.empty === 'any' || (TB.empty === 'K' && R(cs[0]) === 13) || (typeof TB.empty === 'function' && TB.empty(cs[0], st));
          const t = q[q.length - 1]; return isUp(t) && fitsTab(cs[0], t);
        }
        default: return false;
      }
    }
    function stockMove(st, D) {
      const sk = kinds(D, 'stock')[0]; if (sk == null) return null;
      if (V.onStock) return V.canStock && !V.canStock(st, D) ? null : { stock: 1 };
      if (st.p[sk].length) {
        if (ST.to === 'tab' && ST.needAll && kinds(D, 'tab').some((j) => !st.p[j].length)) return null;
        return { stock: 1 };
      }
      if (ST.to === 'waste') { const w = kinds(D, 'waste')[0]; if (st.p[w].length && (st.rd || 0) < ST.redeals) return { stock: 1, redeal: 1 }; }
      return null;
    }
    // todas las jugadas posibles
    function moves(st, D) {
      const out = [];
      if (V.pair) {
        const fr = D.map((_, i) => i).filter((i) => pairFree(st, D, i));
        for (const i of fr) { const c = top(st, i); if (V.single && V.single(c)) out.push({ single: i }); }
        for (let a = 0; a < fr.length; a++) for (let b = a + 1; b < fr.length; b++) if (V.pair(top(st, fr[a]), top(st, fr[b]), D[fr[a]], D[fr[b]], st)) out.push({ pair: [fr[a], fr[b]] });
      }
      D.forEach((d, i) => {
        const p = st.p[i]; if (!p.length || d.k === 'stock' || d.k === 'disc') return;
        const maxN = d.k === 'tab' ? p.length : 1;
        for (let n = 1; n <= maxN; n++) {
          if (!canTake(st, D, i, n)) { if (d.k === 'tab' && TB.move !== 'any') break; else continue; }
          D.forEach((d2, j) => { if (canDrop(st, D, i, n, j)) out.push({ f: i, n, t: j }); });
        }
      });
      const sm = stockMove(st, D); if (sm) out.push(sm);
      if (V.redeal && (st.rr || 0) < V.redeal.times) out.push({ rdl: 1 });
      return out;
    }
    function pairFree(st, D, i) { const d = D[i]; if (!st.p[i].length || !isUp(top(st, i))) return false; return d.k === 'grid' ? freeGrid(st, D, i) : d.k === 'waste' || d.k === 'tab'; }

    /* ---------- aplicar jugadas ---------- */
    const clone = (st) => Object.assign({}, st, { p: st.p.map((x) => x.slice()) });
    function settle(st, D) {   // efectos automáticos tras cada jugada: voltear, completar escaleras, rellenar
      let fx = 0;
      for (let k = 0; k < 80; k++) {
        let ch = false;
        D.forEach((d, i) => {
          const p = st.p[i];
          if ((d.k === 'tab' || d.k === 'res') && p.length && !isUp(p[p.length - 1]) && V.autoFlip !== false) { p[p.length - 1] -= DOWN; ch = true; fx++; }
          if (d.k === 'grid' && p.length && !isUp(p[0]) && freeGrid(st, D, i)) { p[0] -= DOWN; ch = true; fx++; }
          if (F.mode === 'run' && d.k === 'tab' && p.length >= 13) {
            const cs = p.slice(p.length - 13);
            if (R(cs[0]) === 13 && seqOK(cs, true)) { const f = kinds(D, 'found').find((j) => !st.p[j].length); if (f != null) { st.p[f] = p.splice(p.length - 13); ch = true; st.runs = (st.runs || 0) + 1; } }
          }
          if (d.k === 'tab' && !p.length && TB.autoFill) { const r = kinds(D, TB.autoFill)[0]; if (r != null && st.p[r].length) { p.push(st.p[r].pop()); if (!isUp(p[0])) p[0] -= DOWN; ch = true; } }
        });
        if (!ch && V.autoSafe !== false && F.mode === 'build' && F.base === 1 && F.step === 1) {   // a la base lo que ya no hace falta en la mesa
          const fs = kinds(D, 'found'), fh = [0, 0, 0, 0]; for (const j of fs) { const p = st.p[j]; if (p.length) fh[S(p[0])] = Math.max(fh[S(p[0])], (V.decks || 1) > 1 ? 0 : p.length); }
          const minAll = Math.min(...fh), safe = (c) => { const r = R(c); if (r <= 2) return true; if ((V.decks || 1) > 1) return false;
            if (TB.build === 'alt') return r <= Math.min(...[0, 1, 2, 3].filter((q) => (q === 1 || q === 2) !== RED(c)).map((q) => fh[q])) + 1;
            if (TB.build === 'any') return r <= minAll + 1; return true; };
          for (let i = 0; i < D.length && !ch; i++) {
            const d = D[i], p = st.p[i]; if (!p.length || ['tab', 'cell', 'waste', 'res', 'grid'].indexOf(d.k) < 0) continue;
            const c = p[p.length - 1]; if (!isUp(c) || (d.k === 'grid' && !freeGrid(st, D, i)) || !safe(c)) continue;
            const f = fs.find((j) => fitsFound(st, D, j, [c])); if (f != null) { st.p[f].push(p.pop()); ch = true; st.auto = (st.auto || 0) + 1; }
          }
        }
        if (!ch) break;
      }
      return fx;
    }
    function apply(st0, D, m) {
      const st = clone(st0);
      if (m.f != null) { const cs = st.p[m.f].splice(st.p[m.f].length - m.n); st.p[m.t].push(...cs); }
      else if (m.single != null) { const dc = kinds(D, 'disc')[0]; st.p[dc].push(st.p[m.single].pop()); }
      else if (m.pair) { const dc = kinds(D, 'disc')[0]; for (const i of m.pair) st.p[dc].push(st.p[i].pop()); }
      else if (m.stock) {
        if (V.onStock) V.onStock(st, D);
        else {
          const sk = kinds(D, 'stock')[0], s = st.p[sk];
          if (ST.to === 'waste') {
            const w = kinds(D, 'waste')[0];
            if (!s.length) { st.p[sk] = st.p[w].reverse().map((x) => x + DOWN); st.p[w] = []; st.rd = (st.rd || 0) + 1; }
            else for (let k = 0; k < ST.n && s.length; k++) st.p[w].push(card(s.pop()));
          } else if (ST.to === 'found') { const f = kinds(D, 'found')[0]; st.p[f].push(card(s.pop())); }
          else { const cols = ST.cols ? kinds(D, 'tab').slice(0, ST.cols) : kinds(D, 'tab'); for (const j of cols) if (s.length) st.p[j].push(card(s.pop())); }
        }
      } else if (m.rdl) V.redeal.run(st, D);
      settle(st, D);
      return st;
    }
    const key = (st) => st.p.map((p) => p.join(',')).join('|') + '#' + (st.rd || 0) + '.' + (st.rr || 0);
    const vkey = (st) => st.p.map((p) => p.join(',')).join('|');   // «ya he estado aquí» (dar vueltas al mazo no cuenta como avanzar)
    function won(st, D) {
      if (V.won) return V.won(st, D);
      const total = 52 * (V.decks || 1);
      return kinds(D, 'found').reduce((a, i) => a + st.p[i].length, 0) >= total;
    }
    // valor heurístico de una jugada (pista, demo y orden del solucionador)
    function score(st, D, m) {
      if (V.score) { const r = V.score(st, D, m, base); if (r != null) return r; }
      return base(st, D, m);
    }
    function base(st, D, m) {
      if (m.single != null || m.pair) return 90 + (m.pair && D[m.pair[0]].k === 'grid' && D[m.pair[1]].k === 'grid' ? 10 : 0);
      if (m.rdl) return -5;
      if (m.stock) return m.redeal ? -2 : 2;
      const df = D[m.f], dt = D[m.t], p = st.p[m.f], below = p.length > m.n ? p[p.length - m.n - 1] : null;
      let s = 0;
      if (dt.k === 'found') s += 100 - (df.k === 'tab' && below != null && isUp(below) ? 0 : 0);
      if (df.k === 'found') s -= 60;
      if (below != null && !isUp(below)) s += 55;
      if (df.k === 'grid') s += 40;
      if (df.k === 'waste' || df.k === 'res') s += 30;
      if (df.k === 'cell' && dt.k !== 'cell') s += 25;
      if (dt.k === 'cell') s -= 18;
      if (df.k === 'tab' && below == null) s += dt.k === 'found' ? 20 : -6;
      if (dt.k === 'tab' && !st.p[m.t].length) s -= below == null ? 1000 : 12;
      if (dt.k === 'tab' && st.p[m.t].length) s += 8;
      if (df.k === 'tab' && dt.k === 'tab' && below != null && isUp(below) && fitsTab(st.p[m.f][p.length - m.n], below) && D[m.f].k === 'tab') s -= 30;   // ya estaba bien colocada
      return s;
    }
    // heurística: cartas que faltan por subir + lo enterradas que están las siguientes que necesitan las bases
    function heur(st, D) {
      const fs = kinds(D, 'found'); let h = 0, inF = 0;
      if (V.won) { D.forEach((d, i) => { const p = st.p[i]; if (d.k === 'tab' || d.k === 'grid' || d.k === 'res' || d.k === 'cell') { h += p.length * 10; for (const x of p) if (!isUp(x)) h += 2; if (d.k === 'grid' && p.length && !freeGrid(st, D, i)) h += 3; } if (d.k === 'stock') h += p.length * 2; }); return h; }
      for (const j of fs) inF += st.p[j].length;
      h += (52 * (V.decks || 1) - inF) * 10;
      if (F.mode === 'run') { for (const i of kinds(D, 'tab')) { const p = st.p[i]; for (let k = 1; k < p.length; k++) { if (!isUp(p[k - 1])) h += 3; else if (!(S(p[k]) === S(p[k - 1]) && R(p[k]) === R(p[k - 1]) - 1)) h += 5; } } return h; }
      if (F.mode !== 'build') return h;
      const need = [];
      for (const j of fs) { const p = st.p[j]; if (p.length >= 13) continue; const t = p.length ? p[p.length - 1] : null; need.push({ r: t == null ? fBase(st, D, j) : wrap13(R(t) + fStep(D, j)), s: t != null && F.suit === 'suit' ? S(t) : -1 }); }
      for (const nd of need) {
        let best = 30;
        D.forEach((d, i) => {
          if (d.k === 'found') return; const p = st.p[i];
          for (let k = p.length - 1; k >= 0; k--) { const c = card(p[k]); if (R(c) === nd.r && (nd.s < 0 || S(c) === nd.s)) { const dep = d.k === 'stock' || d.k === 'waste' ? 4 + (p.length - 1 - k) * 0.2 : d.k === 'grid' && !freeGrid(st, D, i) ? 5 : p.length - 1 - k; if (dep < best) best = dep; } }
        });
        h += best * 4;
      }
      for (const i of kinds(D, 'cell')) if (st.p[i].length) h += 2;
      for (const i of kinds(D, 'tab')) { const p = st.p[i]; if (!p.length) h -= 3; for (let k = 1; k < p.length; k++) if (!isUp(p[k - 1])) h += 1; }
      return h;
    }
    function solve(st0, D, budget) {
      const tabs = kinds(D, 'tab'), cells = kinds(D, 'cell'), canon = V.canon !== false && kinds(D, 'stock').length === 0 && kinds(D, 'grid').length === 0;
      const ckey = (st) => !canon ? key(st) : st.p.map((p, i) => tabs.indexOf(i) >= 0 || cells.indexOf(i) >= 0 ? null : p.join(',')).join('|') + '#' + tabs.map((i) => st.p[i].join(',')).sort().join('|') + '#' + cells.map((i) => st.p[i].join(',')).sort().join('|') + (st.rr || 0) + '.' + (st.rd || 0);
      const heap = [], push = (n) => { heap.push(n); let k = heap.length - 1; while (k) { const q = (k - 1) >> 1; if (heap[q].f <= n.f) break; heap[k] = heap[q]; k = q; } heap[k] = n; };
      const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { let k = 0; for (;;) { let c = 2 * k + 1; if (c >= heap.length) break; if (c + 1 < heap.length && heap[c + 1].f < heap[c].f) c++; if (heap[c].f >= last.f) break; heap[k] = heap[c]; k = c; } heap[k] = last; } return top; };
      const seen = new Set([ckey(st0)]); let nodes = 0;
      push({ st: st0, g: 0, f: heur(st0, D), up: null, m: null });
      while (heap.length && nodes < budget) {
        const n = pop(); nodes++;
        if (won(n.st, D)) { const path = []; for (let x = n; x.up; x = x.up) path.unshift(x.m); return path; }
        for (const m of moves(n.st, D)) {
          if (m.f != null && D[m.t].k === 'tab' && !n.st.p[m.t].length && m.n === n.st.p[m.f].length) continue;
          if (m.f != null && D[m.f].k === 'cell' && D[m.t].k === 'cell') continue;
          const s2 = apply(n.st, D, m), k = ckey(s2); if (seen.has(k)) continue; seen.add(k);
          push({ st: s2, g: n.g + 1, f: heur(s2, D) + (n.g + 1) * 0.25, up: n, m });
        }
      }
      return null;
    }
    /* ---------- reparto ---------- */
    function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    function newDeal(g) {
      const lv = g.lv; if (V.init) V.init(lv); const D = V.piles(lv, g);
      D.forEach((d, i) => { d.i = i; });
      let fi = 0; D.forEach((d) => { if (d.k === 'found') d.fi = fi++; });
      const tries = V.solvable ? (V.solveTries || 4) : 1; let best = null;
      for (let t = 0; t < tries; t++) {
        const r = rng((Math.random() * 1e9) | 0), deck = [];
        for (let k = 0; k < 52 * (V.decks || 1); k++) deck.push(k);
        for (let k = deck.length - 1; k > 0; k--) { const j = (r() * (k + 1)) | 0; [deck[k], deck[j]] = [deck[j], deck[k]]; }
        const st = { p: D.map(() => []), rd: 0, rr: 0 };
        V.deal(st, D, deck, lv, g);
        settle(st, D);
        best = st;
        if (!V.solvable || solve(st, D, V.solveBudget || 2500)) break;
      }
      return { D, st: best };
    }

    /* ---------- geometría ---------- */
    const UI = 44;   // franja de arriba (estado y botones)
    function place(g) {
      const s = g.s; s.y0 = g.top + UI;
      V.place(g, s, s.D, s.y0);
      s.ch = s.cw * 1.4;
      const bs = Math.min(42, (g.W - 20) / 9);
      s.btns = [{ id: 'undo', e: '↩️', tip: T('Deshacer', 'Undo') }, { id: 'hint', e: '💡', tip: T('Pista', 'Hint') }];
      if (V.redeal) s.btns.unshift({ id: 'rdl', e: '🔀', tip: T('Barajar', 'Shuffle') });
      s.btns.forEach((b, k) => { b.w = bs; b.h = 34; b.x = g.W - 8 - (s.btns.length - k) * (bs + 6); b.y = g.top + 5; });
      s.cache = new Map();
    }
    // posiciones de las cartas de cada montón
    function layoutCards(g) {
      const s = g.s, st = s.st, D = s.D, out = [];
      D.forEach((d, i) => {
        const p = st.p[i], n = p.length; if (!n) return;
        const fan = d.fan || (d.k === 'tab' ? 'down' : d.k === 'waste' ? 'waste' : 'none');
        if (fan === 'down') {
          const maxH = (d.maxH != null ? d.maxH : g.bot - 6 - d.y) - s.ch;
          let need = 0; for (let k = 0; k < n - 1; k++) need += isUp(p[k]) ? 0.27 : 0.13;
          const kf = need * s.ch > maxH ? Math.max(0.05, maxH / (need * s.ch)) : 1;
          let y = d.y; p.forEach((x, k) => { out.push({ c: card(x), up: isUp(x), px: d.x, py: y, pile: i, k, top: k === n - 1 }); y += s.ch * (isUp(x) ? 0.27 : 0.13) * kf; });
        } else if (fan === 'right') {
          const maxW = (d.maxW != null ? d.maxW : g.W - 6 - d.x) - s.cw, step = Math.min(s.cw * (d.step || 0.3), n > 1 ? maxW / (n - 1) : 0);
          p.forEach((x, k) => out.push({ c: card(x), up: isUp(x), px: d.x + k * step, py: d.y, pile: i, k, top: k === n - 1 }));
        } else if (fan === 'waste') {
          const vis = d.vis || ST.n || 1;
          p.forEach((x, k) => { const o = Math.max(0, k - (n - vis)); out.push({ c: card(x), up: isUp(x), px: d.x + o * s.cw * 0.3, py: d.y, pile: i, k, top: k === n - 1 }); });
        } else {
          p.forEach((x, k) => { const z = Math.max(0, Math.min(3, k - (n - 4))); out.push({ c: card(x), up: isUp(x), px: d.x - z * 0.6, py: d.y - z * 0.6, pile: i, k, top: k === n - 1, stack: true }); });
        }
      });
      return out;
    }
    function pileRect(g, i, L) {
      const s = g.s, d = s.D[i]; let x1 = d.x, y1 = d.y, x2 = d.x + s.cw, y2 = d.y + s.ch;
      for (const o of L) if (o.pile === i) { x2 = Math.max(x2, o.px + s.cw); y2 = Math.max(y2, o.py + s.ch); }
      return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    }

    /* ---------- dibujo de cartas (con caché por tamaño) ---------- */
    const FACE = { 11: '💂', 12: '👸', 13: '🤴' };
    const PIPS = {   // posiciones de los palos en las cartas grandes (x, y en 0..1)
      2: [[.5, 0], [.5, 1]], 3: [[.5, 0], [.5, .5], [.5, 1]], 4: [[0, 0], [1, 0], [0, 1], [1, 1]], 5: [[0, 0], [1, 0], [.5, .5], [0, 1], [1, 1]],
      6: [[0, 0], [1, 0], [0, .5], [1, .5], [0, 1], [1, 1]], 7: [[0, 0], [1, 0], [.5, .25], [0, .5], [1, .5], [0, 1], [1, 1]],
      8: [[0, 0], [1, 0], [.5, .25], [0, .5], [1, .5], [.5, .75], [0, 1], [1, 1]], 9: [[0, 0], [1, 0], [0, 1 / 3], [1, 1 / 3], [.5, .5], [0, 2 / 3], [1, 2 / 3], [0, 1], [1, 1]],
      10: [[0, 0], [1, 0], [.5, 1 / 6], [0, 1 / 3], [1, 1 / 3], [0, 2 / 3], [1, 2 / 3], [.5, 5 / 6], [0, 1], [1, 1]],
    };
    const SF = 'Georgia,"Times New Roman",serif';
    const sym = (k) => SUIT[k] + '︎';
    function paintFace(c, w, h) {
      const dpr = A.dpr, cv = document.createElement('canvas'); cv.width = Math.ceil((w + 4) * dpr); cv.height = Math.ceil((h + 6) * dpr);
      const x = cv.getContext('2d'); x.scale(dpr, dpr); x.translate(1, 1);
      const r = w * 0.09, rk = R(c), su = S(c), col = RED(c) ? '#d6336c' : '#1f2340', col2 = RED(c) ? '#e8590c' : '#3b3f74';
      x.fillStyle = 'rgba(0,0,0,.28)'; A.rr(x, 0.5, 2.2, w, h, r); x.fill();
      const gr = x.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#f1ece2');
      x.fillStyle = gr; A.rr(x, 0, 0, w, h, r); x.fill(); x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 1; x.stroke();
      const fs = Math.max(9, w * 0.3), big = h > 92;
      const corner = () => { A.txt(x, RANK[rk], w * 0.07 + (rk === 10 ? -w * 0.02 : 0), fs * 0.62, fs, col, 'left', 900, null, SF); A.txt(x, sym(su), w * 0.07 + fs * 0.05, fs * 1.45, fs * 0.72, col, 'left', 900, null, SF); };
      corner();
      if (big) { x.save(); x.translate(w, h); x.rotate(Math.PI); corner(); x.restore(); }
      else A.txt(x, sym(su), w * 0.93, fs * 0.62, fs * 0.8, col, 'right', 900, null, SF);
      const cx = w / 2, cy = h * (big ? 0.5 : 0.63);
      if (rk >= 11) {   // figuras: marco de color con el personaje
        const fx = big ? w * 0.2 : w * 0.12, fy = big ? h * 0.17 : h * 0.36, fw = w - fx * 2, fh = big ? h * 0.66 : h * 0.58;
        const g2 = x.createLinearGradient(0, fy, 0, fy + fh); g2.addColorStop(0, RED(c) ? '#ffe3ec' : '#e5e8ff'); g2.addColorStop(1, RED(c) ? '#ffc9d6' : '#c5cbff');
        x.fillStyle = g2; A.rr(x, fx, fy, fw, fh, w * 0.06); x.fill(); x.strokeStyle = col2; x.lineWidth = Math.max(1, w * 0.025); x.stroke();
        A.emoji(x, FACE[rk], cx, fy + fh * 0.52, Math.min(fw, fh) * 0.78);
      } else if (rk === 1) {
        x.fillStyle = RED(c) ? 'rgba(214,51,108,.08)' : 'rgba(31,35,64,.07)'; x.beginPath(); x.arc(cx, cy, w * 0.3, 0, 7); x.fill();
        A.txt(x, sym(su), cx, cy + w * 0.02, w * (big ? 0.5 : 0.46), col, 'center', 900, null, SF);
      } else if (big && w >= 70) {
        const px = w * 0.27, py = h * 0.2, pw = w - px * 2, ph = h - py * 2, sz = w * 0.2;
        for (const [a, b] of PIPS[rk]) { x.save(); x.translate(px + a * pw, py + b * ph); if (b > 0.5) x.rotate(Math.PI); A.txt(x, sym(su), 0, 0, sz, col, 'center', 900, null, SF); x.restore(); }
      } else A.txt(x, sym(su), cx, cy, w * 0.5, col, 'center', 900, null, SF);
      return cv;
    }
    function paintBack(w, h, c1, c2, em) {
      const dpr = A.dpr, cv = document.createElement('canvas'); cv.width = Math.ceil((w + 4) * dpr); cv.height = Math.ceil((h + 6) * dpr);
      const x = cv.getContext('2d'); x.scale(dpr, dpr); x.translate(1, 1); const r = w * 0.09;
      x.fillStyle = 'rgba(0,0,0,.28)'; A.rr(x, 0.5, 2.2, w, h, r); x.fill();
      x.fillStyle = '#fff'; A.rr(x, 0, 0, w, h, r); x.fill();
      const m = Math.max(2, w * 0.06); A.rr(x, m, m, w - m * 2, h - m * 2, r * 0.7);
      const gr = x.createLinearGradient(0, 0, w, h); gr.addColorStop(0, c1); gr.addColorStop(1, c2); x.fillStyle = gr; x.fill();
      x.save(); x.clip(); x.strokeStyle = 'rgba(255,255,255,.16)'; x.lineWidth = 1;
      const st = Math.max(5, w * 0.14); for (let k = -h; k < w + h; k += st) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + h, h); x.stroke(); x.beginPath(); x.moveTo(k + h, 0); x.lineTo(k, h); x.stroke(); }
      x.restore();
      x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.arc(w / 2, h / 2, w * 0.24, 0, 7); x.fill();
      A.emoji(x, em, w / 2, h / 2, w * 0.3);
      return cv;
    }
    function drawCard(g, ctx, c, up, x, y, o) {
      const s = g.s, k = (up ? card(c) % 52 : 'B') + '@' + Math.round(s.cw * 10);
      let cv = s.cache.get(k);
      if (!cv) { cv = up ? paintFace(card(c), s.cw, s.ch) : paintBack(s.cw, s.ch, V.back ? V.back[0] : '#5f3dc4', V.back ? V.back[1] : '#3b1f8f', V.backEmoji || '🃏'); s.cache.set(k, cv); }
      ctx.save();
      if (o && o.flip != null && o.flip < 1) { ctx.translate(x + s.cw / 2, 0); ctx.scale(Math.max(0.04, Math.abs(o.flip * 2 - 1)), 1); ctx.translate(-(x + s.cw / 2), 0); }
      if (o && o.alpha != null) ctx.globalAlpha = o.alpha;
      ctx.drawImage(cv, x - 1, y - 1, cv.width / A.dpr, cv.height / A.dpr);
      if (o && o.glow) { ctx.strokeStyle = o.glow; ctx.lineWidth = 3; ctx.shadowColor = o.glow; ctx.shadowBlur = 12; A.rr(ctx, x, y, s.cw, s.ch, s.cw * 0.09); ctx.stroke(); }
      if (o && o.dim) { ctx.fillStyle = 'rgba(20,10,40,.35)'; A.rr(ctx, x, y, s.cw, s.ch, s.cw * 0.09); ctx.fill(); }
      ctx.restore();
    }
    function table(g, ctx) {
      const s = g.s, W = g.W, H = g.H, k = W + 'x' + H;
      if (!s.felt || s.felt.k !== k) {
        const cv = document.createElement('canvas'), dpr = A.dpr; cv.width = W * dpr; cv.height = H * dpr; const x = cv.getContext('2d'); x.scale(dpr, dpr);
        const [c1, c2] = V.felt || ['#1b8a4c', '#0a3d24'];
        const gr = x.createRadialGradient(W / 2, H * 0.42, 20, W / 2, H / 2, Math.max(W, H) * 0.85); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
        x.fillStyle = gr; x.fillRect(0, 0, W, H);
        const r = rng(7); for (let n = 0; n < W * H / 30; n++) { x.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.05)'; x.fillRect(r() * W, r() * H, 1.4, 1.4); }
        const vg = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.35)');
        x.fillStyle = vg; x.fillRect(0, 0, W, H);
        s.felt = { k, cv };
      }
      ctx.drawImage(s.felt.cv, 0, 0, W, H);
    }
    function slot(g, ctx, d, glow) {
      const s = g.s, x = d.x, y = d.y, w = s.cw, h = s.ch;
      ctx.save(); ctx.strokeStyle = glow || 'rgba(255,255,255,.28)'; ctx.lineWidth = glow ? 3 : 1.5; if (!glow) ctx.setLineDash([5, 4]);
      ctx.fillStyle = 'rgba(0,0,0,.12)'; A.rr(ctx, x, y, w, h, w * 0.09); ctx.fill(); ctx.stroke(); ctx.restore();
      let lab = d.label;
      if (lab == null) {
        if (d.k === 'found') lab = F.mode === 'run' ? 'K→A' : d.suit ? sym(d.suit - 1) : F.mode === 'updown' ? '±1' : RANK[fBase(s.st, s.D, d.i)] || '';
        else if (d.k === 'stock') lab = stockMove(s.st, s.D) ? '↻' : '✕';
        else if (d.k === 'cell') lab = '◇';
        else if (d.k === 'tab') lab = TB.empty === 'K' ? 'K' : TB.empty === 'none' ? '' : '';
      }
      if (lab) A.txt(ctx, lab, x + w / 2, y + h / 2, Math.min(w * 0.38, 26), 'rgba(255,255,255,.32)', 'center', 900, null, SF);
      if (d.k === 'found' && Array.isArray(F.step)) A.txt(ctx, '+' + fStep(s.D, d.i), x + w / 2, y + h + 9, 11, 'rgba(255,255,255,.7)', 'center', 800);
    }

    /* ---------- jugar ---------- */
    function snap(s) { return JSON.stringify(s.st); }
    function commit(g, m, fx) {
      const s = g.s, before = s.st, after = apply(before, s.D, m);
      s.hist.push(snap(s)); if (s.hist.length > 400) s.hist.shift();
      const same = (a, b) => a && b && JSON.stringify(a) === JSON.stringify(b);
      if (s.plan && s.plan.length && s.planKey === key(before) && same(m, s.plan[0])) { s.plan.shift(); s.planKey = key(after); } else s.plan = null;
      const prog = m.stock || m.pair || m.single != null || m.rdl || (m.f != null && D2k(s, m.t) === 'found') || after.p.reduce((a, p) => a + p.filter(isUp).length, 0) > before.p.reduce((a, p) => a + p.filter(isUp).length, 0);
      s.idle = prog ? 0 : (s.idle || 0) + 1;
      s.st = after; s.moves++; s.seen.add(vkey(after)); s.hintT = 0; s.sel = null;
      // sonido y puntos
      const toF = m.f != null && s.D[m.t].k === 'found', flips = after.p.reduce((a, p, i) => a + p.filter(isUp).length - before.p[i].filter(isUp).length, 0) - (m.stock ? 0 : 0);
      if (m.pair || m.single != null) { g.addScore(20 * Math.max(1, g.lv)); A.tone(620, 0.07, 'triangle', 0.08); A.tone(830, 0.08, 'triangle', 0.06, 0, 0.06); }
      else if (toF) { const n = after.p[m.t].length; g.addScore(15 * Math.max(1, g.lv)); A.tone(420 + Math.min(n, 13) * 38, 0.09, 'triangle', 0.09); }
      else if (m.stock) { A.tone(m.redeal ? 260 : 380, 0.05, 'square', 0.035); if (m.redeal) A.sfx.whoosh(); }
      else if (m.rdl) A.sfx.whoosh();
      else A.tone(470, 0.05, 'triangle', 0.06);
      if (flips > 0 && !m.stock) { g.addScore(5 * Math.max(1, g.lv)); A.tone(760, 0.05, 'sine', 0.05, 0, 0.05); }
      if ((after.runs || 0) > (before.runs || 0)) { g.addScore(150 * Math.max(1, g.lv)); A.sfx.combo(3); g.burst && g.burst(g.W / 2, g.H * 0.3, '#ffd43b', 24); }
      if (fx) fx();
      check(g);
    }
    function check(g) {
      const s = g.s; if (s.done) return;
      if (won(s.st, s.D)) {
        s.done = true; g.addScore(500 * Math.max(1, g.lv), g.W / 2, g.H / 2); g.confetti(80); startCascade(g);
        setTimeout(() => { if (g.state === 'play') g.win(s.undos === 0 && !s.hints ? 3 : s.undos + s.hints <= 5 ? 2 : 1); }, 2600);
        return;
      }
      s.stuck = !moves(s.st, s.D).length;
      if (s.stuck) g.message(T('No quedan jugadas', 'No moves left'), 2.6, T('↩️ deshaz o empieza otra vez', '↩️ undo or start again'));
    }
    function bestMoveFor(g, pile, n) {
      const s = g.s; let best = null, bs = -1e9;
      for (const m of moves(s.st, s.D)) {
        if (m.f !== pile || m.n !== n) continue;
        let sc = score(s.st, s.D, m) + (s.D[m.t].k === 'found' ? 500 : 0);
        if (s.seen.has(vkey(apply(s.st, s.D, m)))) sc -= 300;
        if (sc > bs) { bs = sc; best = m; }
      }
      return best;
    }
    function hint(g) {
      const s = g.s, cur = key(s.st);
      if (V.solvable || V.planHint) {
        if (!s.plan || s.planKey !== cur) { s.plan = solve(s.st, s.D, V.demoBudget || 2500) || []; s.planKey = cur; }
        if (s.plan.length) return s.plan[0];
      }
      let best = null, bs = -1e9;
      for (const m of moves(s.st, s.D)) {
        let sc = score(s.st, s.D, m); const k2 = vkey(apply(s.st, s.D, m));
        if ((s.idle || 0) > 25 && sc < 40 && !m.stock) continue;   // dando vueltas sin avanzar: solo jugadas que avanzan
        if (s.seen.has(k2)) sc -= m.stock && !m.redeal ? 120 : 400;
        if (sc > bs) { bs = sc; best = m; }
      }
      return bs > -350 ? best : null;
    }
    const D2k = (s, i) => s.D[i].k;
    function doUndo(g) { const s = g.s, h = s.hist.pop(); if (!h || s.done) return; s.st = JSON.parse(h); s.undos++; s.sel = null; s.stuck = false; A.sfx.whoosh(); }
    function tapPile(g, i, k) {
      const s = g.s, D = s.D, d = D[i], p = s.st.p[i];
      if (d.k === 'stock') { const m = stockMove(s.st, D); if (m) return commit(g, m); return A.sfx.bad(); }
      if (V.pair && pairFree(s.st, D, i) && k === p.length - 1) {
        const c = p[p.length - 1];
        if (V.single && V.single(c)) return commit(g, { single: i });
        if (s.sel == null || s.sel === i) { s.sel = s.sel === i ? null : i; A.tone(560, 0.04, 'sine', 0.05); return; }
        if (V.pair(top(s.st, s.sel), c, D[s.sel], d, s.st)) return commit(g, { pair: [s.sel, i] });
        s.sel = i; A.sfx.bad(); return;
      }
      if (!p.length) return;
      const n = p.length - k;
      if (!canTake(s.st, D, i, n)) { s.wob = { pile: i, t: 0.35 }; return A.sfx.bad(); }
      const m = bestMoveFor(g, i, n);
      if (m) commit(g, m); else { s.wob = { pile: i, k, t: 0.35 }; A.sfx.bad(); }
    }
    function hit(g, x, y) {
      const s = g.s, L = layoutCards(g);
      for (let k = L.length - 1; k >= 0; k--) { const o = L[k]; if (x >= o.px && x <= o.px + s.cw && y >= o.py && y <= o.py + s.ch) return { pile: o.pile, k: o.k, o }; }
      for (const d of s.D) if (x >= d.x && x <= d.x + s.cw && y >= d.y && y <= d.y + s.ch) return { pile: d.i, k: -1 };
      return null;
    }
    function dropTarget(g, x, y, L) {
      const s = g.s; let best = null, bd = 1e9;
      s.D.forEach((d, i) => {
        const r = pileRect(g, i, L), cx = Math.max(r.x, Math.min(x, r.x + r.w)), cy = Math.max(r.y, Math.min(y, r.y + r.h)), dist = Math.hypot(x - cx, y - cy);
        if (dist < bd) { bd = dist; best = i; }
      });
      return bd < s.cw * 0.6 ? best : null;
    }

    /* ---------- cascada de cartas al ganar (como el solitario de siempre) ---------- */
    function startCascade(g) {
      const s = g.s, fs = s.D.map((d, i) => i).filter((i) => s.D[i].k === 'found' || s.D[i].k === 'disc');
      s.casc = { list: [], t: 0, src: fs, n: 0, trail: null };
    }
    function updCascade(g, dt) {
      const s = g.s, c = s.casc; if (!c) return;
      c.t -= dt;
      if (c.t <= 0 && c.n < 52) {
        c.t = 0.09; const i = c.src[c.n % c.src.length], p = s.st.p[i];
        const cardId = p.length ? card(p[p.length - 1 - ((c.n / c.src.length) | 0) % p.length]) : (c.n % 52);
        const d = s.D[i]; c.list.push({ c: cardId, x: d.x, y: d.y, vx: (Math.random() < 0.5 ? -1 : 1) * (90 + Math.random() * 160), vy: -Math.random() * 260 }); c.n++;
      }
      for (const o of c.list) { o.vy += 900 * dt; o.x += o.vx * dt; o.y += o.vy * dt; if (o.y + s.ch > g.bot) { o.y = g.bot - s.ch; o.vy *= -0.72; } }
      c.list = c.list.filter((o) => o.x > -s.cw - 10 && o.x < g.W + 10);
    }
    function drawCascade(g, ctx) {
      const s = g.s, c = s.casc; if (!c) return;
      if (!c.trail || c.trail.width !== Math.round(g.W * A.dpr)) { c.trail = document.createElement('canvas'); c.trail.width = Math.round(g.W * A.dpr); c.trail.height = Math.round(g.H * A.dpr); c.tx = c.trail.getContext('2d'); c.tx.scale(A.dpr, A.dpr); }
      for (const o of c.list) drawCard(g, c.tx, o.c, true, o.x, o.y);
      ctx.drawImage(c.trail, 0, 0, g.W, g.H);
    }

    /* ---------- demo ---------- */
    function center(g, i, k) {
      const s = g.s, L = layoutCards(g), o = L.find((q) => q.pile === i && q.k === k);
      if (o) return [o.px + s.cw / 2, o.py + Math.min(s.ch / 2, (o.top ? s.ch / 2 : s.ch * 0.12))];
      const d = s.D[i]; return [d.x + s.cw / 2, d.y + s.ch / 2];
    }
    function dropPoint(g, i) {
      const s = g.s, L = layoutCards(g).filter((q) => q.pile === i), last = L[L.length - 1];
      if (!last) return [s.D[i].x + s.cw / 2, s.D[i].y + s.ch / 2];
      return [last.px + s.cw / 2, last.py + s.ch * 0.6];
    }

    return {
      lives: 0, levels: 0, cap: 20,
      setup(g) {
        const { D, st } = newDeal(g);
        g.s = { D, st, hist: [], undos: 0, hints: 0, moves: 0, seen: new Set([vkey(st)]), sel: null, done: false, objs: {}, drag: null, stuck: false, pend: 0 };
        place(g);
        // al empezar: las cartas salen del mazo una a una
        layoutCards(g).forEach((o, n) => { const ob = g.s.objs[o.c] = {}; ob.__gl = { x: g.W / 2 - g.s.cw / 2, y: g.bot + 20 + n * 2, a: 1, f: A.fno }; });
        A.sfx.whoosh();
      },
      layout(g) { if (g.s && g.s.D) { place(g); g.s.felt = null; } },
      down(g, p) {
        const s = g.s; if (!s.D || s.done) return;
        for (const b of s.btns) if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) { s.btnDown = b.id; return; }
        const h = hit(g, p.x, p.y); s.press = h; if (!h || h.k < 0) return;
        const n = s.st.p[h.pile].length - h.k;
        if (canTake(s.st, s.D, h.pile, n)) { const o = h.o; s.drag = { pile: h.pile, k: h.k, n, dx: p.x - o.px, dy: p.y - o.py, x: p.x, y: p.y, moved: false }; }
      },
      move(g, p) { const d = g.s.drag; if (!d) return; d.x = p.x; d.y = p.y; if (Math.hypot(p.x - p.sx, p.y - p.sy) > 10) d.moved = true; },
      up(g, p) {
        const s = g.s; if (!s.D) return; const d = s.drag; s.drag = null;
        if (s.btnDown) {
          const id = s.btnDown; s.btnDown = null;
          if (id === 'undo') return doUndo(g);
          if (id === 'rdl') { if (V.redeal && (s.st.rr || 0) < V.redeal.times) commit(g, { rdl: 1 }); else A.sfx.bad(); return; }
          if (id === 'hint') { const m = hint(g); s.hints++; if (m) { s.hl = { m, t: 2.2 }; A.tone(880, 0.06, 'sine', 0.06); } else g.message(T('No veo jugadas', 'No moves found'), 1.6); return; }
          return;
        }
        if (s.done) return;
        if (d && d.moved) {
          const L = layoutCards(g), t = dropTarget(g, d.x - d.dx + s.cw / 2, d.y - d.dy + s.ch * 0.35, L);
          if (t != null && V.pair && d.n === 1 && pairFree(s.st, s.D, t) && V.pair(top(s.st, d.pile), top(s.st, t), s.D[d.pile], s.D[t], s.st)) return commit(g, { pair: [d.pile, t] });
          if (t != null && canDrop(s.st, s.D, d.pile, d.n, t)) return commit(g, { f: d.pile, n: d.n, t });
          if (t != null && t !== d.pile) A.sfx.bad();
          return;
        }
        const h = s.press; s.press = null;
        if (h) tapPile(g, h.pile, h.k < 0 ? s.st.p[h.pile].length - 1 : h.k);
      },
      key(g, k, dn) { if (!dn) return; if (k === 'z' || k === 'Backspace') doUndo(g); if (k === 'h') { const m = hint(g); if (m) g.s.hl = { m, t: 2.2 }; } },
      update(g, dt) {
        const s = g.s; if (!s.D) return;
        if (s.wob) { s.wob.t -= dt; if (s.wob.t <= 0) s.wob = null; }
        if (s.hl) { s.hl.t -= dt; if (s.hl.t <= 0) s.hl = null; }
        updCascade(g, dt);
        // final automático: todo a la vista y sin mazo → las cartas suben solas
        if (!s.done && F.mode === 'build' && V.autoFinish !== false && !s.drag) {
          const all = s.st.p.every((p, i) => s.D[i].k === 'found' || s.D[i].k === 'disc' || p.every(isUp)), noStock = kinds(s.D, 'stock').every((i) => !s.st.p[i].length) && kinds(s.D, 'waste').every((i) => !s.st.p[i].length);
          if (all && noStock) {
            s.autoT = (s.autoT || 0) - dt;
            if (s.autoT <= 0) { s.autoT = 0.08; const m = moves(s.st, s.D).find((q) => q.f != null && s.D[q.t].k === 'found' && s.D[q.f].k !== 'found'); if (m) commit(g, m); }
          }
        }
      },
      draw(g, ctx) {
        const s = g.s; table(g, ctx); if (!s.D) return;
        const L = layoutCards(g), d = s.drag && s.drag.moved ? s.drag : null;
        const dragging = new Set(); if (d) L.forEach((o) => { if (o.pile === d.pile && o.k >= d.k) dragging.add(o.c); });
        let okT = new Set(); if (d) s.D.forEach((_, i) => { if (canDrop(s.st, s.D, d.pile, d.n, i)) okT.add(i); });
        const hl = s.hl ? s.hl.m : null, pulse = 0.55 + 0.45 * Math.sin(g.rt * 7);
        const hlSrc = hl && hl.f != null ? hl.f : null, hlDst = hl && hl.f != null ? hl.t : null, hlPair = hl ? (hl.pair || (hl.single != null ? [hl.single] : null)) : null;
        s.D.forEach((dd, i) => { if (dd.k === 'disc' && dd.hide) return; slot(g, ctx, dd, okT.has(i) ? '#8ce99a' : (i === hlDst || (hl && hl.stock && dd.k === 'stock')) ? `rgba(255,212,59,${pulse})` : null); });
        const lastOf = {}; for (const o of L) lastOf[o.pile] = o.k;
        for (const o of L) {
          if (dragging.has(o.c)) continue;
          if (o.stack && o.k < lastOf[o.pile] - 2) continue;
          const ob = s.objs[o.c] || (s.objs[o.c] = {}); let [x, y] = A.glide(ob, o.px, o.py, 16);
          if (s.wob && s.wob.pile === o.pile && (s.wob.k == null || o.k >= s.wob.k)) x += Math.sin(s.wob.t * 45) * 3;
          if (ob.wasUp === false && o.up) ob.flip = 0; ob.wasUp = o.up; let flip = null; if (ob.flip != null) { ob.flip += A.fdt * 4; flip = ob.flip; if (ob.flip >= 1) ob.flip = null; }
          const free = s.D[o.pile].k === 'grid' ? freeGrid(s.st, s.D, o.pile) : true;
          let glow = null;
          if (s.sel === o.pile && o.top) glow = '#4dabf7';
          else if (hlSrc === o.pile && o.k >= s.st.p[o.pile].length - hl.n) glow = `rgba(255,212,59,${pulse})`;
          else if (hlPair && hlPair.indexOf(o.pile) >= 0 && o.top) glow = `rgba(255,212,59,${pulse})`;
          if (s.done && s.D[o.pile].k === 'found') y += Math.sin(g.rt * 4 + o.c) * 3;
          drawCard(g, ctx, o.c, flip != null && flip < 0.5 ? false : o.up, x, y, { flip, glow, dim: !free && o.up && V.dimBlocked !== false });
        }
        if (d) { const base = L.find((q) => q.pile === d.pile && q.k === d.k); L.forEach((o) => { if (!dragging.has(o.c)) return; const ob = s.objs[o.c] || (s.objs[o.c] = {}), x = d.x - d.dx + (o.px - base.px), y = d.y - d.dy + (o.py - base.py); ob.__gl = { x, y, a: 1, f: A.fno }; drawCard(g, ctx, o.c, true, x, y); }); }
        drawCascade(g, ctx);
        // franja de arriba
        const txt = V.status ? V.status(s.st, s.D, g) : '';
        A.txt(ctx, txt, 10, g.top + 22, Math.min(14, g.W / 30), '#fff', 'left', 800, 'rgba(0,0,0,.35)');
        for (const b of s.btns) {
          const on = b.id === 'rdl' ? (s.st.rr || 0) < V.redeal.times : true;
          ctx.fillStyle = s.btnDown === b.id ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.28)'; A.rr(ctx, b.x, b.y, b.w, b.h, 11); ctx.fill();
          ctx.globalAlpha = on ? 1 : 0.35; A.emoji(ctx, b.e, b.x + b.w / 2, b.y + b.h / 2, 19); ctx.globalAlpha = 1;
          if (b.id === 'rdl') A.txt(ctx, String(V.redeal.times - (s.st.rr || 0)), b.x + b.w - 5, b.y + b.h - 6, 11, '#ffd43b', 'center', 900, 'rgba(0,0,0,.6)');
        }
      },
      demo(g) {
        const s = g.s; if (!s.D || s.done) return { wait: 0.5 };
        const m = hint(g); if (!m) return { wait: 1 };
        const say = s.moves === 0 && V.demoSay ? V.demoSay : null;
        if (m.stock) { const i = kinds(s.D, 'stock')[0]; return { tap: center(g, i, s.st.p[i].length - 1), after: 0.35, say }; }
        if (m.rdl) { const b = s.btns.find((q) => q.id === 'rdl'); return { tap: [b.x + b.w / 2, b.y + b.h / 2], after: 0.5, say }; }
        if (m.single != null) return { tap: center(g, m.single, s.st.p[m.single].length - 1), after: 0.3, say };
        if (m.pair) { const [a, b] = m.pair; return [{ tap: center(g, a, s.st.p[a].length - 1), after: 0.25, say }, { tap: center(g, b, s.st.p[b].length - 1), after: 0.35 }]; }
        const k = s.st.p[m.f].length - m.n;
        return { drag: [center(g, m.f, k), dropPoint(g, m.t)], dur: 0.42, after: 0.18, say };
      },
      tv: { mode: 'tap', targets: (g) => {
        const s = g.s; if (!s.D) return []; const o = [];
        for (const c of layoutCards(g)) { const n = s.st.p[c.pile].length - c.k; if (c.up && canTake(s.st, s.D, c.pile, n)) o.push({ x: c.px, y: c.py, w: s.cw, h: c.top ? s.ch : s.ch * 0.27 }); }
        for (const i of kinds(s.D, 'stock')) o.push({ x: s.D[i].x, y: s.D[i].y, w: s.cw, h: s.ch });
        for (const b of s.btns) o.push({ x: b.x, y: b.y, w: b.w, h: b.h, instant: true });
        return o;
      } },
      _test: { moves, apply, solve, won, key, kinds, hint, commit, layoutCards, canTake, canDrop },
    };
  };

  // ayudas para repartir y colocar
  A.paciencia.cols = (g, n, opts = {}) => {   // ancho de carta para n columnas
    const pad = opts.pad ?? 6, gap = opts.gap ?? Math.max(3, g.W * 0.008), maxW = opts.max ?? 96;
    const byW = (g.W - pad * 2 - gap * (n - 1)) / n, byH = (g.bot - g.top - 50 - ((opts.rows || 3) - 1) * 8) / (opts.rows || 3) / 1.4;
    const cw = Math.min(byW, maxW, byH), x0 = (g.W - (cw * n + gap * (n - 1))) / 2;
    return { cw, gap, x: (i) => x0 + i * (cw + gap) };
  };
})();
(function () {
  const P = Arcade.paciencia;
  // lista de montones: P.mk([['cell', 4], ['found', 4], ['tab', 8]]) → [{ k, n }, …]
  P.mk = (spec) => { const out = []; for (const [k, n, extra] of spec) for (let i = 0; i < n; i++) out.push(Object.assign({ k, n: i }, typeof extra === 'function' ? extra(i) : extra || {})); return out; };
  P.of = (D, k) => D.filter((d) => d.k === k).map((d) => d.i);
  P.down = (c) => c + Arcade.cartas.DOWN;
})();
