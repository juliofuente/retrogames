// Yajilin|#1f1006
// @rejilla
(function () {
  const RJ = Arcade.rejilla, U = RJ.U, C = RJ.C, A = Arcade, T = Arcade.T;
  const V = {
    kind: 'link', kanji: '矢', linkW: 0.16, cellTap: true, cellStates: true, marks: [2],
    explain: (P, a) => (a.wrong || a.l == null ? null : { es: 'El bucle sigue por aquí: tiene que pasar por todas las casillas blancas.', en: 'The loop continues here: it must pass through every white cell.' }),
    cellTapOk: (P, i) => !P.cl[i],
    blocked: (P, i) => !!P.cl[i],
    states: [{ v: 1, name: { es: 'negra', en: 'black' }, k: 'shade', why: { es: 'Esta casilla va negra: lo pide la flecha y el bucle no puede pasar por aquí.', en: 'This cell is black: the arrow asks for it and the loop cannot pass here.' } }, { v: 2, name: { es: 'punto', en: 'dot' }, k: 'dot' }],
    size: (lv) => ({ n: lv <= 3 ? 6 : lv <= 9 ? 7 : lv <= 15 ? 8 : 9 }),
    D: [[0, -1, '↑'], [1, 0, '→'], [0, 1, '↓'], [-1, 0, '←']],
    count(P, c, i, d) { const [dx, dy] = V.D[d]; let x = i % P.w + dx, y = ((i / P.w) | 0) + dy, k = 0; while (x >= 0 && y >= 0 && x < P.w && y < P.h) { if (c[y * P.w + x] === 1) k++; x += dx; y += dy; } return k; },
    gen(r, c) {
      const n = c.n, N = n * n;
      for (let t = 0; t < 80; t++) {
        const lp = U.loop(r, n - 1, n - 1, 0.6), on = new Set(lp.pts), L = {};
        for (let q = 0; q < lp.pts.length; q++) L[U.key(lp.pts[q], lp.pts[(q + 1) % lp.pts.length])] = 1;
        const sh = new Array(N).fill(0), rest = U.shuffle(r, Array.from({ length: N }, (_, i) => i).filter((i) => !on.has(i)));
        for (const i of rest) if (r() < 0.8 && !U.n4(n, n, i).some((j) => sh[j])) sh[i] = 1;
        const cl = {}; for (const i of rest) if (!sh[i]) { const ds = U.shuffle(r, [0, 1, 2, 3]).map((d) => [d, V.count({ w: n, h: n }, sh, i, d)]); const best = ds.find((q) => q[1] > 0) || ds[0]; cl[i] = best; }
        const ncl = Object.keys(cl).length; if (ncl < 2 || ncl > N * 0.18) continue;
        return { w: n, h: n, cl, sol: { c: sh, L } };
      }
      throw new Error('yajilin');
    },
    canLink: (P, st, a, b) => !P.cl[a] && !P.cl[b] && st.c[a] !== 1 && st.c[b] !== 1 && U.deg(st.L, a) < 2 && U.deg(st.L, b) < 2,
    check(P, st) {
      const N = P.w * P.h;
      for (let i = 0; i < N; i++) {
        const d = U.deg(st.L, i);
        if (P.cl[i]) { if (d || V.count(P, st.c, i, P.cl[i][0]) !== P.cl[i][1]) return false; }
        else if (st.c[i] === 1) { if (d || U.n4(P.w, P.h, i).some((j) => st.c[j] === 1)) return false; }
        else if (d !== 2) return false;
      }
      return U.oneLoop(st.L);
    },
    errors(P, st) { const b = new Set(); for (let i = 0; i < P.w * P.h; i++) if (st.c[i] === 1 && U.n4(P.w, P.h, i).some((j) => st.c[j] === 1)) b.add(i); return b; },
    cellBg: (P, i) => (P.cl[i] ? '#e9e2d4' : null),
    drawClue(ctx, P, i, x, y, cs, st) {
      const q = P.cl[i]; if (!q) return; const ok = V.count(P, st.c, i, q[0]) === q[1];
      A.txt(ctx, q[1] + V.D[q[0]][2], x + cs / 2, y + cs / 2 + 1, cs * 0.44, ok ? '#2b8a3e' : C.ink, 'center', 900, null, RJ.NUMF);
    },
    rules: (P) => {
      const k = +Object.keys(P.cl)[0], q = P.cl[k], cells = [k]; const [dx, dy] = V.D[q[0]]; let x = k % P.w + dx, y = ((k / P.w) | 0) + dy; while (x >= 0 && y >= 0 && x < P.w && y < P.h) { cells.push(y * P.w + x); x += dx; y += dy; }
      return [
        { t: { es: 'Pinta algunas casillas de negro y dibuja un bucle cerrado que pase por todas las demás casillas blancas.', en: 'Paint some cells black and draw a closed loop through every other white cell.' }, all: true },
        { t: { es: 'Las flechas dicen cuántas casillas negras hay en esa dirección: aquí, ' + q[1] + '.', en: 'Arrows say how many black cells there are in that direction: here, ' + q[1] + '.' }, cells },
        { t: { es: 'Dos casillas negras no pueden tocarse por un lado, y el bucle no pasa por las flechas.', en: 'Two black cells cannot touch side by side, and the loop does not pass through arrows.' }, all: true },
      ];
    },
    ctrl: { es: 'Toca una casilla para pintarla de negro (otra vez: punto; otra vez: nada). Arrastra de casilla en casilla para dibujar el bucle. ↩️ deshace y 💡 te da una pista.', en: 'Tap a cell to paint it black (again: dot; again: nothing). Drag from cell to cell to draw the loop. ↩️ undoes and 💡 gives you a hint.' },
    goal: { es: 'Cierra el bucle', en: 'Close the loop' },
  };
  Arcade.game({
    ...RJ(V),
    /*THEME*/ tag: "Flechas, casillas negras y un bucle", deco: ["🏯", "🌸", "🎋", "🖌️", "🍵", "⛩️"], font: 'serif', bg: ["#4a2a10", "#1f1006"],
    music: { mode: "insen", bpm: 70, wave: 'triangle', style: 'chill', root: 57 }, voice: { wave: 'sine', mul: 1.1, echo: 0.4 },
    /*EN*/ en: { title: "Yajilin", tag: "Arrows, black cells and a loop", help: "Paint cells <b>black</b> and draw a <b>loop</b> through <b>all</b> the other white cells. Each <b>arrow</b> says how many black cells lie that way. Black cells <b>never touch</b> side by side. Tap to paint and drag to draw the loop." },
    /*TV*/ tvHelp: "Cruceta hasta una casilla · OK para jugar en ella.",
    id: "yajilin", title: "Yajilin", emoji: "↗️", color: "#ffa94d", origin: "Yajilin (Nikoli, Japón)",
    help: "Pinta casillas de <b>negro</b> y dibuja un <b>bucle</b> que pase por <b>todas</b> las demás casillas blancas. Cada <b>flecha</b> dice cuántas negras hay en esa dirección. Las negras <b>no se tocan</b> por un lado. Toca para pintar y arrastra para dibujar el bucle.",
    lives: 0, levels: 0, cap: 20,
  });
})();
