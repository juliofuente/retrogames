// Acme|#3a0f47
// @cartas
(function () {
  const P = Arcade.paciencia;
  const V = {
    tab: {"build":"suit","move":"one","empty":"any","autoFill":"res"},
    stock: { to: 'waste', n: 1, redeals: 1 },
    init(lv) { this.stock.redeals = 1 + (lv < 6 ? 1 : 0); },
    piles: (lv) => P.mk([['stock', 1], ['waste', 1], ['found', 4], ['res', 1, { fan: 'none' }], ['tab', 4]]),
    deal: (st, D, deck) => P.dealStd(st, D, deck, {"ds":["U","U","U","U"],"res":13}),
    place: (g, s, D, y0) => P.autoPlace(g, s, D, y0, {}),
    status: P.autoStatus,
    felt: ["#862e9c","#3a0f47"], back: ["#212529","#000000"], backEmoji: '🏭',
  };
  Arcade.game({
    ...P(V),
    /*THEME*/ home: 'indexsolitarios.html', tag: 'El Canfield difícil', deco: ["🃏","🏭","♠️","♥️","♦️","♣️"], font: 'serif', bg: ["#862e9c","#3a0f47"],
    music: { mode: 'dorian', bpm: 75, wave: 'sine', style: 'chill', root: 55 }, voice: { wave: 'sine', mul: 1.2, echo: 0.4 },
    /*EN*/ en: { title: 'Acme', tag: 'The hard Canfield', help: 'A hard Canfield: foundations from A, build down in the same suit, one card at a time, and the stock goes round twice. Build the <b>4 foundations</b> from A to K, one per suit. On the table, a card goes on another <b>one rank higher</b> of the <b>same suit</b>. Move <b>one card at a time</b>. Empty columns refill themselves from the reserve. The <b>reserve</b> has 13 cards: its top card can be played at any time. Tap the stock to draw cards one at a time; you can turn it over once. In the first levels you get one more pass through the stock. <b>Tap</b> a card and it goes to the best place, or <b>drag</b> it. 💡 gives a hint and ↩️ undoes.', tvHelp: 'D-pad to a card · OK moves it.', dict: { 'Celdas libres: ': 'Free cells: ', 'Reserva: ': 'Reserve: ', 'Mazo: ': 'Stock: ', 'En la mesa: ': 'On the table: ', 'Base: ': 'Base: ' } },
    /*TV*/ tvHelp: 'Cruceta hasta una carta · OK la mueve.',
    id: 'acme', title: 'Acme', emoji: '🏭', color: '#b197fc', origin: 'Acme',
    help: 'Un Canfield difícil: bases desde el A, se baja del mismo palo, de una en una, y el mazo se pasa dos veces. Completa las <b>4 bases</b> del A a la K, una por palo. En la mesa, una carta va sobre otra de <b>un número más</b> y del <b>mismo palo</b>. Se mueve <b>una carta cada vez</b>. Las columnas vacías se rellenan solas con la reserva. La <b>reserva</b> tiene 13 cartas: su carta de arriba se puede jugar en cualquier momento. Toca el mazo para sacar cartas de una en una; puedes darle la vuelta una vez. En los primeros niveles puedes darle una vuelta más al mazo. <b>Toca</b> una carta y va sola a su mejor sitio, o <b>arrástrala</b>. 💡 te da una pista y ↩️ deshace.',
    lives: 0, levels: 0, cap: 20,
  });
})();
