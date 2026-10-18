// Ases ocupados|#3a0f47
// @cartas
(function () {
  const P = Arcade.paciencia;
  const V = {
    decks: 2,
    tab: {"build":"suit","move":"one","empty":"any"},
    stock: { to: 'waste', n: 1, redeals: 0 },
    supermove: true,
    init(lv) { this.stock.redeals = 0 + (lv < 6 ? 1 : 0); },
    piles: (lv) => P.mk([['stock', 1], ['waste', 1], ['found', 8], ['tab', 12]]),
    deal: (st, D, deck) => P.dealStd(st, D, deck, {"ds":["U","U","U","U","U","U","U","U","U","U","U","U"]}),
    place: (g, s, D, y0) => P.autoPlace(g, s, D, y0, {}),
    status: P.autoStatus,
    felt: ["#862e9c","#3a0f47"], back: ["#212529","#000000"], backEmoji: '🐝',
  };
  Arcade.game({
    ...P(V),
    /*THEME*/ home: 'indexsolitarios.html', tag: 'Doce cartas sueltas y muchos huecos', deco: ["🃏","🐝","♠️","♥️","♦️","♣️"], font: 'serif', bg: ["#862e9c","#3a0f47"],
    music: { mode: 'major', bpm: 89, wave: 'sine', style: 'chill', root: 55 }, voice: { wave: 'sine', mul: 1.2, echo: 0.4 },
    /*EN*/ en: { title: 'Busy Aces', tag: 'Twelve single cards and lots of space', help: 'Twelve columns of a single card: you soon have spaces to work with. Played with <b>two decks</b>. Build the <b>8 foundations</b> from A to K, one per suit. On the table, a card goes on another <b>one rank higher</b> of the <b>same suit</b>. Move <b>one card at a time</b>, although you can shift several in a row if you have free spaces to help. Any card can go into an empty space. Tap the stock to draw cards one at a time; it goes round only once. In the first levels you get one more pass through the stock. <b>Tap</b> a card and it goes to the best place, or <b>drag</b> it. 💡 gives a hint and ↩️ undoes.', tvHelp: 'D-pad to a card · OK moves it.', dict: { 'Celdas libres: ': 'Free cells: ', 'Reserva: ': 'Reserve: ', 'Mazo: ': 'Stock: ', 'En la mesa: ': 'On the table: ', 'Base: ': 'Base: ' } },
    /*TV*/ tvHelp: 'Cruceta hasta una carta · OK la mueve.',
    id: 'asesocupados', title: 'Ases ocupados', emoji: '🐝', color: '#b197fc', origin: 'Busy Aces',
    help: 'Doce columnas de una sola carta: enseguida tienes huecos para maniobrar. Se juega con <b>dos barajas</b>. Completa las <b>8 bases</b> del A a la K, una por palo. En la mesa, una carta va sobre otra de <b>un número más</b> y del <b>mismo palo</b>. Se mueve <b>una carta cada vez</b>, aunque puedes pasar varias seguidas si tienes huecos libres para ayudarte. Cualquier carta puede ir a un hueco vacío. Toca el mazo para sacar cartas de una en una; se pasa una sola vez. En los primeros niveles puedes darle una vuelta más al mazo. <b>Toca</b> una carta y va sola a su mejor sitio, o <b>arrástrala</b>. 💡 te da una pista y ↩️ deshace.',
    lives: 0, levels: 0, cap: 20,
  });
})();
