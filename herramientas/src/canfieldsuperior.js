// Canfield superior|#0a3d24
// @cartas
(function () {
  const P = Arcade.paciencia;
  const V = {
    found: {"wrap":true},
    tab: {"build":"alt","move":"seq","empty":"any","wrap":true},
    stock: { to: 'waste', n: 3, redeals: Infinity },
    piles: (lv) => P.mk([['stock', 1], ['waste', 1], ['found', 4], ['res', 1, { fan: 'none' }], ['tab', 4]]),
    deal: (st, D, deck) => P.dealStd(st, D, deck, {"ds":["U","U","U","U"],"fbFirst":true,"res":13,"resUp":true}),
    place: (g, s, D, y0) => P.autoPlace(g, s, D, y0, {}),
    status: P.autoStatus,
    felt: ["#1b8a4c","#0a3d24"], back: ["#e67700","#8a4200"], backEmoji: '🎩',
  };
  Arcade.game({
    ...P(V),
    /*THEME*/ home: 'indexsolitarios.html', tag: 'Canfield con la reserva a la vista', deco: ["🃏","🎩","♠️","♥️","♦️","♣️"], font: 'serif', bg: ["#1b8a4c","#0a3d24"],
    music: { mode: 'lydian', bpm: 87, wave: 'sine', style: 'chill', root: 58 }, voice: { wave: 'sine', mul: 1.2, echo: 0.4 },
    /*EN*/ en: { title: 'Superior Canfield', tag: 'Canfield with the reserve face up', help: 'Canfield with the reserve face up (you see what is coming) and empty columns that do not refill by themselves. The <b>foundations</b> start at the rank of the first card dealt to them and go up by suit, wrapping after K. On the table, a card goes on another <b>one rank higher</b> in the <b>other colour</b> (and a K can go on an A). You can move cards together if they are already in order. Any card can go into an empty space. The <b>reserve</b> has 13 cards, face up: its top card can be played at any time. Tap the stock to draw cards three at a time and turn it over as often as you like. <b>Tap</b> a card and it goes to the best place, or <b>drag</b> it. 💡 gives a hint and ↩️ undoes.', tvHelp: 'D-pad to a card · OK moves it.', dict: { 'Celdas libres: ': 'Free cells: ', 'Reserva: ': 'Reserve: ', 'Mazo: ': 'Stock: ', 'En la mesa: ': 'On the table: ', 'Base: ': 'Base: ' } },
    /*TV*/ tvHelp: 'Cruceta hasta una carta · OK la mueve.',
    id: 'canfieldsuperior', title: 'Canfield superior', emoji: '🎩', color: '#ff6b6b', origin: 'Superior Canfield',
    help: 'El Canfield con la reserva boca arriba (ves lo que viene) y sin rellenar solas las columnas vacías. Las <b>bases</b> empiezan en el número de la primera carta que sale en ellas y suben por palo, dando la vuelta tras la K. En la mesa, una carta va sobre otra de <b>un número más</b> y de <b>color distinto</b> (y la K puede ir sobre el A). Puedes mover juntas las cartas que ya estén en orden. Cualquier carta puede ir a un hueco vacío. La <b>reserva</b> tiene 13 cartas a la vista: su carta de arriba se puede jugar en cualquier momento. Toca el mazo para sacar cartas de tres en tres y dale la vuelta las veces que quieras. <b>Toca</b> una carta y va sola a su mejor sitio, o <b>arrástrala</b>. 💡 te da una pista y ↩️ deshace.',
    lives: 0, levels: 0, cap: 20,
  });
})();
