// Sudoku|#1d2338
// @rejilla
(function () {
  const RJ = Arcade.rejilla, U = RJ.U;
  const V = {
    kind: 'num', kanji: '数',
    size: (lv) => (lv <= 3 ? { n: 4, bh: 2, bw: 2 } : lv <= 7 ? { n: 6, bh: 2, bw: 3 } : { n: 9, bh: 3, bw: 3, f: Math.min(1, (lv - 8) / 12) }),
    N: (P) => P.n,
    cand(P, v, i) {
      const n = P.n, y = (i / n) | 0, x = i % n, by = y - (y % P.bh), bx = x - (x % P.bw); let m = 0;
      for (let k = 0; k < n; k++) { m |= 1 << v[y * n + k]; m |= 1 << v[k * n + x]; }
      for (let yy = by; yy < by + P.bh; yy++) for (let xx = bx; xx < bx + P.bw; xx++) m |= 1 << v[yy * n + xx];
      return U.full(n) & ~m;
    },
    groups(P) {
      const n = P.n, g = [];
      for (let k = 0; k < n; k++) { g.push(Array.from({ length: n }, (_, j) => k * n + j)); g.push(Array.from({ length: n }, (_, j) => j * n + k)); }
      for (let by = 0; by < n; by += P.bh) for (let bx = 0; bx < n; bx += P.bw) { const b = []; for (let y = by; y < by + P.bh; y++) for (let x = bx; x < bx + P.bw; x++) b.push(y * n + x); g.push(b); }
      return g;
    },
    gen(r, c, lv) {
      const n = c.n, P = { w: n, h: n, n, bh: c.bh, bw: c.bw };
      P.reg = Array.from({ length: n * n }, (_, i) => Math.floor(((i / n) | 0) / c.bh) * (n / c.bw) + Math.floor((i % n) / c.bw));
      const sol = U.fill(r, n * n, new Array(n * n).fill(0), (v, i) => V.cand(P, v, i));
      const unique = (f) => U.solve(n * n, f, (v, i) => V.cand(P, v, i), { budget: 4000 }).n === 1;
      const fix = U.reduce(r, sol, unique);
      // más fácil al principio: devuelve algunos números
      const f = c.f != null ? c.f : Math.min(1, lv / 7), extra = Math.round((1 - f) * n * n * (n === 9 ? 0.16 : 0.22));
      U.shuffle(r, Array.from({ length: n * n }, (_, i) => i).filter((i) => !fix[i])).slice(0, extra).forEach((i) => { fix[i] = sol[i]; });
      P.fix = fix; P.sol = { c: sol }; return P;
    },
    check(P, st) { const v = st.c; if (v.some((x) => !x)) return false; return V.groups(P).every((g) => new Set(g.map((i) => v[i])).size === g.length); },
    rules: (P) => [
      { t: { es: 'Rellena la cuadrícula con los números del 1 al ' + P.n + '.', en: 'Fill the grid with the numbers 1 to ' + P.n + '.' }, all: true },
      { t: { es: 'En cada fila no se puede repetir ningún número.', en: 'No number can repeat in a row.' }, rows: [0] },
      { t: { es: 'Tampoco en cada columna…', en: 'Nor in a column…' }, cols: [0] },
      { t: { es: '…ni en cada caja de ' + P.bh + '×' + P.bw + ' (las de borde grueso).', en: '…nor in each ' + P.bh + '×' + P.bw + ' box (the ones with a thick border).' }, cells: (P) => P.reg.map((k, i) => (k === 0 ? i : -1)).filter((i) => i >= 0) },
      { t: { es: 'Los números negros vienen dados. Solo hay una solución: se llega razonando, sin adivinar.', en: 'The black numbers are given. There is only one solution: you get there by reasoning, not guessing.' }, cells: (P) => P.fix.map((v, i) => (v ? i : -1)).filter((i) => i >= 0).slice(0, 6) },
    ],
    goal: { es: 'Completa el sudoku', en: 'Complete the sudoku' },
  };
  Arcade.game({
    ...RJ(V),
    /*THEME*/ tag: 'Del 1 al 9 sin repetir', deco: ['🔢', '🏯', '🌸', '🎋', '🖌️', '🍵'], font: 'serif', bg: ['#2d3561', '#151935'],
    music: { mode: 'insen', bpm: 70, wave: 'triangle', style: 'chill', root: 57 }, voice: { wave: 'sine', mul: 1.1, echo: 0.4 },
    /*EN*/ en: { title: 'Sudoku', tag: 'One to nine, no repeats', help: 'Fill the grid so that every <b>row</b>, <b>column</b> and <b>box</b> has each number exactly once. <b>Tap a cell</b> and then a <b>number</b>. Repeated numbers turn red. It starts with 4×4 and 6×6 grids and moves on to the classic 9×9. 💡 gives you a hint and ↩️ undoes.' },
    /*TV*/ tvHelp: 'Cruceta hasta una casilla · OK y luego OK en un número.',
    id: 'sudoku', title: 'Sudoku', emoji: '🔢', color: '#ffd43b', origin: 'Sudoku / Number Place (Nikoli, Japón)',
    help: 'Rellena la cuadrícula para que cada <b>fila</b>, <b>columna</b> y <b>caja</b> tenga cada número una sola vez. <b>Toca una casilla</b> y luego un <b>número</b>. Los repetidos salen en rojo. Empieza con 4×4 y 6×6 y llega al clásico 9×9. 💡 te da una pista y ↩️ deshace.',
    lives: 0, levels: 0, cap: 20,
  });
})();
