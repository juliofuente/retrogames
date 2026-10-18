// Gargantúa|#0b3a15
// @cartas
(function () {
  const P = Arcade.paciencia;
  const V = {
    decks: 2,
    tab: {"build":"alt","move":"seq","empty":"K"},
    stock: { to: 'waste', n: 1, redeals: 1 },
    init(lv) { this.stock.redeals = 1 + (lv < 6 ? 1 : 0); },
    piles: (lv) => P.mk([['stock', 1], ['waste', 1], ['found', 8], ['tab', 9]]),
    deal: (st, D, deck) => P.dealStd(st, D, deck, {"ds":["U","DU","DDU","DDDU","DDDDU","DDDDDU","DDDDDDU","DDDDDDDU","DDDDDDDDU"]}),
    place: (g, s, D, y0) => P.autoPlace(g, s, D, y0, {}),
    status: P.autoStatus,
    felt: ["#2b8a3e","#0b3a15"], back: ["#2b8a3e","#0b4a1c"], backEmoji: '🗿',
  };
  Arcade.game({
    ...P(V),
    /*THEME*/ home: 'indexsolitarios.html', tag: 'El Klondike de dos barajas', deco: ["🃏","🗿","♠️","♥️","♦️","♣️"], font: 'serif', bg: ["#2b8a3e","#0b3a15"],
    music: { mode: 'major', bpm: 86, wave: 'sine', style: 'chill', root: 55 }, voice: { wave: 'sine', mul: 1.2, echo: 0.4 },
    /*EN*/ en: { title: 'Gargantua', tag: 'Two-deck Klondike', help: 'Klondike in big: two decks, nine columns and eight foundations. Played with <b>two decks</b>. Build the <b>8 foundations</b> from A to K, one per suit. On the table, a card goes on another <b>one rank higher</b> in the <b>other colour</b>. You can move cards together if they are already in order. An empty space only takes a K. Tap the stock to draw cards one at a time; you can turn it over once. In the first levels you get one more pass through the stock. <b>Tap</b> a card and it goes to the best place, or <b>drag</b> it. 💡 gives a hint and ↩️ undoes.', tvHelp: 'D-pad to a card · OK moves it.', dict: { 'Celdas libres: ': 'Free cells: ', 'Reserva: ': 'Reserve: ', 'Mazo: ': 'Stock: ', 'En la mesa: ': 'On the table: ', 'Base: ': 'Base: ' } },
    /*TV*/ tvHelp: 'Cruceta hasta una carta · OK la mueve.',
    id: 'gargantua', title: 'Gargantúa', emoji: '🗿', color: '#69db7c', origin: 'Gargantua / Double Klondike (Morehead y Mott-Smith)',
    help: 'El Klondike en grande: dos barajas, nueve columnas y ocho bases. Se juega con <b>dos barajas</b>. Completa las <b>8 bases</b> del A a la K, una por palo. En la mesa, una carta va sobre otra de <b>un número más</b> y de <b>color distinto</b>. Puedes mover juntas las cartas que ya estén en orden. Un hueco vacío solo admite una K. Toca el mazo para sacar cartas de una en una; puedes darle la vuelta una vez. En los primeros niveles puedes darle una vuelta más al mazo. <b>Toca</b> una carta y va sola a su mejor sitio, o <b>arrástrala</b>. 💡 te da una pista y ↩️ deshace.',
    lives: 0, levels: 0, cap: 20,
  });
})();
