// Pirámide de cartas|#4a2a03
// @cartas
(function () {
  const P = Arcade.paciencia;
  const V = {
      stock: { to: 'waste', n: 1, redeals: 2 }, autoSafe: false, autoFinish: false, planHint: true, demoBudget: 3000, solvable: true, solveTries: 10, solveBudget: 4000,
      pair: (a, b) => Arcade.cartas.R(a) + Arcade.cartas.R(b) === 13, single: (c) => Arcade.cartas.R(c) === 13,
      piles: () => { const L = []; for (let r = 0; r < 7; r++) for (let c = 0; c <= r; c++) L.push({ k: 'grid', r, c }); L.forEach((d, i) => { if (d.r < 6) d.cov = [i + d.r + 1, i + d.r + 2]; }); return L.concat(P.mk([['stock', 1], ['waste', 1], ['disc', 1]])); },
      init(lv) { this.stock.redeals = lv < 6 ? 2 : lv < 14 ? 1 : 0; },
      deal(st, D, deck) { let k = 0; D.forEach((d, i) => { if (d.k === 'grid') st.p[i].push(deck[k++]); }); while (k < 52) st.p[P.of(D, 'stock')[0]].push(P.down(deck[k++])); },
      won: (st, D) => D.every((d, i) => d.k !== 'grid' || !st.p[i].length),
      place(g, s, D, y0) { const avail = g.bot - y0 - 12; const cw = Math.min((g.W - 16) / 7.3, avail / (1.4 * (1 + 6 * 0.52 + 1.25)), 90); s.cw = cw; const ch = cw * 1.4, gap = cw * 0.05; D.forEach((d) => { if (d.k === 'grid') { d.x = g.W / 2 - ((d.r + 1) * cw + d.r * gap) / 2 + d.c * (cw + gap); d.y = y0 + d.r * ch * 0.52; } const yb = y0 + 6 * ch * 0.52 + ch * 1.25; if (d.k === 'stock') { d.x = g.W / 2 - cw * 1.8; d.y = yb; } if (d.k === 'waste') { d.x = g.W / 2 - cw * 0.5; d.y = yb; } if (d.k === 'disc') { d.x = g.W / 2 + cw * 0.8; d.y = yb; d.label = '13'; } }); },
      status: (st, D) => Arcade.T('Quedan en la pirámide: ', 'Left in the pyramid: ') + D.filter((d, i) => d.k === 'grid' && st.p[i].length).length,
      demoSay: Arcade.T('Parejas que suman 13', 'Pairs that add up to 13'),      felt: ["#c27c0e","#4a2a03"], back: ["#d9480f","#7a2304"], backEmoji: '🔺',
  };
  Arcade.game({
    ...P(V),
    /*THEME*/ home: 'indexsolitarios.html', tag: 'Parejas que suman 13', deco: ["🃏","🔺","♠️","♥️","♦️","♣️"], font: 'serif', bg: ["#c27c0e","#4a2a03"],
    music: { mode: 'major', bpm: 79, wave: 'sine', style: 'chill', root: 61 }, voice: { wave: 'sine', mul: 1.2, echo: 0.4 },
    /*EN*/ en: { title: 'Pyramid', tag: 'Pairs that add up to 13', help: 'Take the <b>pyramid</b> apart by removing <b>pairs that add up to 13</b>: A is 1, J 11, Q 12 and K 13 (a K goes by itself). <b>Tap</b> a card and then its partner, or drag one onto the other. Only <b>free</b> cards, with nothing on top, can be used. The top card of the waste also counts for pairs. Tap the stock to draw another card; you can turn it over twice in the first levels, once later and never from level 14. <b>Tap</b> a card and it goes to the best place, or <b>drag</b> it. 💡 gives a hint and ↩️ undoes.', tvHelp: 'D-pad to a card · OK moves it.', dict: { 'Quedan en la pirámide: ': 'Left in the pyramid: ', 'Toca una carta y va sola a su sitio': 'Tap a card and it goes to its place' } },
    /*TV*/ tvHelp: 'Cruceta hasta una carta · OK la mueve.',
    id: 'piramidecartas', title: 'Pirámide de cartas', emoji: '🔺', color: '#ffa94d', origin: 'Pyramid',
    help: 'Desmonta la <b>pirámide</b> quitando <b>parejas que sumen 13</b>: A vale 1, J 11, Q 12 y K 13 (la K se va sola). <b>Toca</b> una carta y luego su pareja, o arrastra una sobre la otra. Solo se pueden usar las cartas <b>libres</b>, las que no tienen ninguna encima. La carta de arriba del descarte también vale para formar pareja. Toca el mazo para sacar otra carta; puedes darle la vuelta dos veces en los primeros niveles, una después y ninguna desde el 14. <b>Toca</b> una carta y va sola a su mejor sitio, o <b>arrástrala</b>. 💡 te da una pista y ↩️ deshace.',
    lives: 0, levels: 0, cap: 20,
  });
})();
