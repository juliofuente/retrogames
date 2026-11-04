// Renzoku|#2a1a0a
// @rejilla
(function () {
  const RJ = Arcade.rejilla, U = RJ.U, C = RJ.C, A = Arcade, T = Arcade.T;
  const V = {
    kind: 'num', kanji: '連',
    size: (lv) => ({ n: lv <= 4 ? 4 : lv <= 10 ? 5 : lv <= 16 ? 6 : 7 }),
    N: (P) => P.n,
    cand(P, v, i) {
      const n = P.n, y = (i / n) | 0, x = i % n; let m = 0;
      for (let k = 0; k < n; k++) { m |= 1 << v[y * n + k]; m |= 1 << v[k * n + x]; }
      let a = U.full(n) & ~m;
      for (const j of U.n4(n, n, i)) { if (!v[j]) continue; const nb = ((1 << (v[j] - 1)) | (1 << (v[j] + 1))) & U.full(n); a &= P.bar[U.key(i, j)] ? nb : ~nb; }
      return a;
    },
    groups(P) { const n = P.n, g = []; for (let k = 0; k < n; k++) { g.push(Array.from({ length: n }, (_, j) => k * n + j)); g.push(Array.from({ length: n }, (_, j) => j * n + k)); } return g; },
    gen(r, c) {
      const n = c.n, sol = U.latin(r, n), P = { w: n, h: n, n, bar: {} };
      for (let i = 0; i < n * n; i++) for (const j of U.n4(n, n, i)) if (j > i && Math.abs(sol[i] - sol[j]) === 1) P.bar[U.key(i, j)] = 1;
      const unique = (f) => U.solve(n * n, f, (vv, i) => V.cand(P, vv, i), { budget: 6000 }).n === 1;
      P.fix = U.reduce(r, sol, unique); P.sol = { c: sol }; return P;
    },
    check(P, st) {
      const v = st.c, n = P.n; if (v.some((x) => !x)) return false;
      if (!V.groups(P).every((g) => new Set(g.map((i) => v[i])).size === n)) return false;
      for (let i = 0; i < n * n; i++) for (const j of U.n4(n, n, i)) if (j > i && (Math.abs(v[i] - v[j]) === 1) !== !!P.bar[U.key(i, j)]) return false;
      return true;
    },
    drawOver(ctx, P, st, L) {
      ctx.strokeStyle = C.seal; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(3, L.cs * 0.09);
      for (const k in P.bar) { const [a, b] = k.split('_').map(Number), hz = b === a + 1, x = L.ox + (a % P.w + (hz ? 1 : 0.5)) * L.cs, y = L.oy + (((a / P.w) | 0) + (hz ? 0.5 : 1)) * L.cs, q = L.cs * 0.2; ctx.beginPath(); if (hz) { ctx.moveTo(x, y - q); ctx.lineTo(x, y + q); } else { ctx.moveTo(x - q, y); ctx.lineTo(x + q, y); } ctx.stroke(); }
    },
    rules: (P) => {
      const k = Object.keys(P.bar)[0], cells = k ? k.split('_').map(Number) : [];
      let far = []; for (let i = 0; i < P.n * P.n && !far.length; i++) for (const j of U.n4(P.n, P.n, i)) if (j > i && !P.bar[U.key(i, j)]) { far = [i, j]; break; }
      return [
        { t: { es: 'Rellena con los números del 1 al ' + P.n + ', sin repetir en ninguna fila ni columna.', en: 'Fill in the numbers 1 to ' + P.n + ', without repeating in any row or column.' }, rows: [0], cols: [0] },
        { t: { es: 'Una raya roja entre dos casillas quiere decir que sus números son consecutivos (como 3 y 4).', en: 'A red bar between two cells means their numbers are consecutive (like 3 and 4).' }, cells },
        { t: { es: 'Y al revés: si no hay raya, NO pueden ser consecutivos. ¡Eso también da mucha pista!', en: 'And the other way round: with no bar, they can NOT be consecutive. That is a big clue too!' }, cells: far },
      ];
    },
    goal: { es: 'Rellena según las rayas', en: 'Fill it in following the bars' },
  };
  Arcade.game({
    ...RJ(V),
    /*THEME*/ tag: "Números seguidos marcados con una raya", deco: ["🏯", "🌸", "🎋", "🖌️", "🍵", "⛩️"], font: 'serif', bg: ["#5a3a1a", "#2a1a0a"],
    music: { mode: "insen", bpm: 70, wave: 'triangle', style: 'chill', root: 57 }, voice: { wave: 'sine', mul: 1.1, echo: 0.4 },
    /*EN*/ en: { title: "Renzoku", tag: "Consecutive numbers marked with a bar", help: "Fill in the numbers 1 to N without repeating in any <b>row</b> or <b>column</b>. A <b>bar</b> between two cells means their numbers are <b>consecutive</b> (3 and 4); with no bar, they are <b>not</b>. <b>Tap a cell</b> and then a <b>number</b>." },
    /*TV*/ tvHelp: "Cruceta hasta una casilla · OK para jugar en ella.",
    id: "renzoku", title: "Renzoku", emoji: "🔗", color: "#ffa94d", origin: "Renzoku / Consecutive (Japón)",
    help: "Rellena con los números del 1 al N sin repetir en ninguna <b>fila</b> ni <b>columna</b>. Una <b>raya</b> entre dos casillas dice que sus números son <b>consecutivos</b> (3 y 4); si no hay raya, <b>no</b> lo son. <b>Toca una casilla</b> y luego un <b>número</b>.",
    lives: 0, levels: 0, cap: 20,
  });
})();
