// Cuarenta ladrones|#120d2b
// @cartas
(function () {
  const P = Arcade.paciencia;
  const V = {
      decks: 2, stock: { to: 'waste', n: 1, redeals: 2 },
      tab: { build: 'suit', move: 'one', empty: 'any' },
      piles: () => P.mk([['stock', 1], ['waste', 1], ['found', 8], ['tab', 10]]),
      init(lv) { this.stock.redeals = lv < 5 ? 2 : lv < 12 ? 1 : 0; this.tab.move = lv < 6 ? 'seq' : 'one'; },
      deal(st, D, deck) { let k = 0; for (let r = 0; r < 4; r++) for (const i of P.of(D, 'tab')) st.p[i].push(deck[k++]); while (k < 104) st.p[P.of(D, 'stock')[0]].push(P.down(deck[k++])); },
      place(g, s, D, y0) { const c = P.cols(g, 10); s.cw = c.cw; const ch = c.cw * 1.4; D.forEach((d) => { if (d.k === 'stock') { d.x = c.x(0); d.y = y0; } if (d.k === 'waste') { d.x = c.x(1); d.y = y0; } if (d.k === 'found') { d.x = c.x(2 + d.n); d.y = y0; } if (d.k === 'tab') { d.x = c.x(d.n); d.y = y0 + ch + 14; } }); },
      status: (st, D) => Arcade.T('Mazo: ', 'Stock: ') + st.p[P.of(D, 'stock')[0]].length,
      demoSay: Arcade.T('Del mismo palo, de una en una', 'Same suit, one at a time'),      felt: ["#3b2f6b","#120d2b"], back: ["#5f3dc4","#2b1580"], backEmoji: '🦹',
  };
  Arcade.game({
    ...P(V),
    /*THEME*/ home: 'indexsolitarios.html', tag: 'Dos barajas y mucha paciencia', deco: ["🃏","🦹","♠️","♥️","♦️","♣️"], font: 'serif', bg: ["#3b2f6b","#120d2b"],
    music: { mode: 'dorian', bpm: 73, wave: 'sine', style: 'chill', root: 61 }, voice: { wave: 'sine', mul: 1.2, echo: 0.4 },
    /*EN*/ en: { title: 'Forty Thieves', tag: 'Two decks and lots of patience', help: 'With <b>two decks</b>: fill the <b>eight foundations</b> from A to K by suit. On the table there are ten columns of four cards; build down <b>in the same suit</b> and move <b>one card</b> at a time. Any card can go to an empty column. Tap the stock to draw one card at a time. In the first levels you can turn the stock over twice; then once, and from level 12, never. Until level 6 you can also move whole same-suit runs. One of the hard ones: don\'t give up! <b>Tap</b> a card and it goes to the best place, or <b>drag</b> it. 💡 gives a hint and ↩️ undoes.', tvHelp: 'D-pad to a card · OK moves it.', dict: { 'Mazo: ': 'Stock: ', 'Toca una carta y va sola a su sitio': 'Tap a card and it goes to its place' } },
    /*TV*/ tvHelp: 'Cruceta hasta una carta · OK la mueve.',
    id: 'ladrones', title: 'Cuarenta ladrones', emoji: '🦹', color: '#9775fa', origin: 'Forty Thieves / Napoleon at St Helena',
    help: 'Con <b>dos barajas</b>: hay que llenar las <b>ocho bases</b> del A a la K por palo. En la mesa hay diez columnas de cuatro cartas; se baja <b>del mismo palo</b> y se mueve <b>una sola carta</b> cada vez. Cualquier carta puede ir a una columna vacía. Toca el mazo para sacar cartas de una en una. En los primeros niveles puedes darle la vuelta al mazo dos veces; luego una, y desde el 12, ninguna. Hasta el nivel 6 también puedes mover escaleras enteras del mismo palo. Es de los difíciles: ¡no te rindas! <b>Toca</b> una carta y va sola a su mejor sitio, o <b>arrástrala</b>. 💡 te da una pista y ↩️ deshace.',
    lives: 0, levels: 0, cap: 20,
  });
})();
