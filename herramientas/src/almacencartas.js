// Almacén|#5a0f2a
// @cartas
(function () {
  const P = Arcade.paciencia;
  const V = {
    found: {"base":2,"wrap":true},
    tab: {"build":"suit","move":"seq","empty":"any","wrap":true,"autoFill":"res"},
    stock: { to: 'waste', n: 1, redeals: 2 },
    init(lv) { this.stock.redeals = 2 + (lv < 6 ? 1 : 0); },
    piles: (lv) => P.mk([['stock', 1], ['waste', 1], ['found', 4], ['res', 1, { fan: 'none' }], ['tab', 4]]),
    deal: (st, D, deck) => P.dealStd(st, D, deck, {"ds":["U","U","U","U"],"twos":true,"res":13}),
    place: (g, s, D, y0) => P.autoPlace(g, s, D, y0, {}),
    status: P.autoStatus,
    felt: ["#d6336c","#5a0f2a"], back: ["#0c8599","#064652"], backEmoji: '🏚️',
  };
  Arcade.game({
    ...P(V),
    /*THEME*/ home: 'indexsolitarios.html', tag: 'Canfield con los doses de base', deco: ["🃏","🏚️","♠️","♥️","♦️","♣️"], font: 'serif', bg: ["#d6336c","#5a0f2a"],
    music: { mode: 'mixo', bpm: 80, wave: 'sine', style: 'chill', root: 55 }, voice: { wave: 'sine', mul: 1.2, echo: 0.4 },
    /*EN*/ en: { title: 'Storehouse', tag: 'Canfield with twos as bases', help: 'A relaxed Canfield: the foundations are the four twos (already in place) and go up by suit to A. The <b>foundations</b> are the four twos, already in place: build them up by suit to A (A follows K). On the table, a card goes on another <b>one rank higher</b> of the <b>same suit</b> (and a K can go on an A). You can move cards together if they are already in order. Empty columns refill themselves from the reserve. The <b>reserve</b> has 13 cards: its top card can be played at any time. Tap the stock to draw cards one at a time; you can turn it over twice. In the first levels you get one more pass through the stock. <b>Tap</b> a card and it goes to the best place, or <b>drag</b> it. 💡 gives a hint and ↩️ undoes.', tvHelp: 'D-pad to a card · OK moves it.', dict: { 'Celdas libres: ': 'Free cells: ', 'Reserva: ': 'Reserve: ', 'Mazo: ': 'Stock: ', 'En la mesa: ': 'On the table: ', 'Base: ': 'Base: ' } },
    /*TV*/ tvHelp: 'Cruceta hasta una carta · OK la mueve.',
    id: 'almacencartas', title: 'Almacén', emoji: '🏚️', color: '#faa2c1', origin: 'Storehouse',
    help: 'Un Canfield tranquilo: las bases son los cuatro doses (ya colocados) y suben por palo hasta el A. Las <b>bases</b> son los cuatro doses, ya colocados: súbelas por palo hasta el A (tras la K va el A). En la mesa, una carta va sobre otra de <b>un número más</b> y del <b>mismo palo</b> (y la K puede ir sobre el A). Puedes mover juntas las cartas que ya estén en orden. Las columnas vacías se rellenan solas con la reserva. La <b>reserva</b> tiene 13 cartas: su carta de arriba se puede jugar en cualquier momento. Toca el mazo para sacar cartas de una en una; puedes darle la vuelta 2 veces. En los primeros niveles puedes darle una vuelta más al mazo. <b>Toca</b> una carta y va sola a su mejor sitio, o <b>arrástrala</b>. 💡 te da una pista y ↩️ deshace.',
    lives: 0, levels: 0, cap: 20,
  });
})();
