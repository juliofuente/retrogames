// Canfield|#1f0914
// @cartas
(function () {
  const P = Arcade.paciencia;
  const V = {
      found: { suit: 'suit', wrap: true }, stock: { to: 'waste', n: 1 },
      tab: { build: 'alt', move: 'seq', empty: 'any', wrap: true, autoFill: 'res' },
      piles: () => P.mk([['stock', 1], ['waste', 1], ['found', 4], ['res', 1, { fan: 'none' }], ['tab', 4]]),
      init(lv) { this.stock.n = lv >= 8 ? 3 : 1; },
      deal(st, D, deck) { let k = 0; const r = P.of(D, 'res')[0], f = P.of(D, 'found')[0]; for (let n = 0; n < 13; n++) st.p[r].push(n < 12 ? P.down(deck[k++]) : deck[k++]); st.p[f].push(deck[k]); st.fb = Arcade.cartas.R(deck[k++]); for (const i of P.of(D, 'tab')) st.p[i].push(deck[k++]); while (k < 52) st.p[P.of(D, 'stock')[0]].push(P.down(deck[k++])); },
      place(g, s, D, y0) { const c = P.cols(g, 6); s.cw = c.cw; const ch = c.cw * 1.4; D.forEach((d) => { if (d.k === 'stock') { d.x = c.x(0); d.y = y0; } if (d.k === 'waste') { d.x = c.x(1); d.y = y0; } if (d.k === 'found') { d.x = c.x(2 + d.n); d.y = y0; } if (d.k === 'res') { d.x = c.x(0); d.y = y0 + ch + 14; d.label = 'R'; } if (d.k === 'tab') { d.x = c.x(2 + d.n); d.y = y0 + ch + 14; } }); },
      status: (st, D) => Arcade.T('Reserva: ', 'Reserve: ') + st.p[P.of(D, 'res')[0]].length,
      demoSay: Arcade.T('Vacía la reserva de la izquierda', 'Empty the reserve on the left'),      felt: ["#5c1f3a","#1f0914"], back: ["#2b8a3e","#0b4a1c"], backEmoji: '🎩',
  };
  Arcade.game({
    ...P(V),
    /*THEME*/ home: 'indexsolitarios.html', tag: 'El solitario del casino', deco: ["🃏","🎩","♠️","♥️","♦️","♣️"], font: 'serif', bg: ["#5c1f3a","#1f0914"],
    music: { mode: 'lydian', bpm: 87, wave: 'sine', style: 'chill', root: 55 }, voice: { wave: 'sine', mul: 1.2, echo: 0.4 },
    /*EN*/ en: { title: 'Canfield', tag: 'The casino solitaire', help: 'The casino solitaire. The <b>foundations</b> do not start at A: they start at the rank of the first card dealt to them and go up by suit (after K comes A). The <b>reserve</b> (13 cards, on the left) is what you must empty: its top card can be played and it refills empty columns by itself. On the table, cards <b>go down in alternating colours</b>, and a K can go after a 2. Tap the stock to draw cards; you can turn it over as often as you like. From level 8 you draw three at a time. <b>Tap</b> a card and it goes to the best place, or <b>drag</b> it. 💡 gives a hint and ↩️ undoes.', tvHelp: 'D-pad to a card · OK moves it.', dict: { 'Reserva: ': 'Reserve: ', 'Toca una carta y va sola a su sitio': 'Tap a card and it goes to its place' } },
    /*TV*/ tvHelp: 'Cruceta hasta una carta · OK la mueve.',
    id: 'canfield', title: 'Canfield', emoji: '🎩', color: '#ffd43b', origin: 'Canfield / Demon',
    help: 'El solitario de los casinos. Las <b>bases</b> no empiezan en el A: empiezan en el número de la primera carta que sale en ellas, y siguen subiendo por palo (tras la K va el A). La <b>reserva</b> (13 cartas, a la izquierda) es lo que tienes que vaciar: su carta de arriba se puede jugar y rellena sola las columnas vacías. En la mesa, las cartas <b>bajan alternando colores</b>, y tras el 2 puede ir una K. Toca el mazo para sacar cartas; puedes darle la vuelta las veces que quieras. Desde el nivel 8 se sacan de tres en tres. <b>Toca</b> una carta y va sola a su mejor sitio, o <b>arrástrala</b>. 💡 te da una pista y ↩️ deshace.',
    lives: 0, levels: 0, cap: 20,
  });
})();
