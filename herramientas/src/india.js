// India|#1d1052
// @cartas
(function () {
  const P = Arcade.paciencia;
  const V = {
    decks: 2,
    tab: {"build":"notsuit","move":"one","empty":"any"},
    stock: { to: 'waste', n: 1, redeals: 0 },
    init(lv) { this.stock.redeals = 0 + (lv < 6 ? 1 : 0); },
    piles: (lv) => P.mk([['stock', 1], ['waste', 1], ['found', 8], ['tab', 10]]),
    deal: (st, D, deck) => P.dealStd(st, D, deck, {"ds":["DUU","DUU","DUU","DUU","DUU","DUU","DUU","DUU","DUU","DUU"]}),
    place: (g, s, D, y0) => P.autoPlace(g, s, D, y0, {}),
    status: P.autoStatus,
    felt: ["#5f3dc4","#1d1052"], back: ["#212529","#000000"], backEmoji: '🐘',
  };
  Arcade.game({
    ...P(V),
    /*THEME*/ home: 'indexsolitarios.html', tag: 'Cualquier palo menos el suyo', deco: ["🃏","🐘","♠️","♥️","♦️","♣️"], font: 'serif', bg: ["#5f3dc4","#1d1052"],
    music: { mode: 'lydian', bpm: 85, wave: 'sine', style: 'chill', root: 58 }, voice: { wave: 'sine', mul: 1.2, echo: 0.4 },
    /*EN*/ en: { title: 'Indian', tag: 'Any suit but its own', help: 'Ten columns of three cards (the bottom one face down) and you build in any suit but its own. Played with <b>two decks</b>. Build the <b>8 foundations</b> from A to K, one per suit. On the table, a card goes on another <b>one rank higher</b> of a <b>different suit</b>. Move <b>one card at a time</b>. Any card can go into an empty space. Tap the stock to draw cards one at a time; it goes round only once. In the first levels you get one more pass through the stock. <b>Tap</b> a card and it goes to the best place, or <b>drag</b> it. 💡 gives a hint and ↩️ undoes.', tvHelp: 'D-pad to a card · OK moves it.', dict: { 'Celdas libres: ': 'Free cells: ', 'Reserva: ': 'Reserve: ', 'Mazo: ': 'Stock: ', 'En la mesa: ': 'On the table: ', 'Base: ': 'Base: ' } },
    /*TV*/ tvHelp: 'Cruceta hasta una carta · OK la mueve.',
    id: 'india', title: 'India', emoji: '🐘', color: '#9775fa', origin: 'Indian',
    help: 'Diez columnas de tres cartas (la de abajo, tapada) y se baja de cualquier palo que no sea el suyo. Se juega con <b>dos barajas</b>. Completa las <b>8 bases</b> del A a la K, una por palo. En la mesa, una carta va sobre otra de <b>un número más</b> de un <b>palo distinto</b> al suyo. Se mueve <b>una carta cada vez</b>. Cualquier carta puede ir a un hueco vacío. Toca el mazo para sacar cartas de una en una; se pasa una sola vez. En los primeros niveles puedes darle una vuelta más al mazo. <b>Toca</b> una carta y va sola a su mejor sitio, o <b>arrástrala</b>. 💡 te da una pista y ↩️ deshace.',
    lives: 0, levels: 0, cap: 20,
  });
})();
