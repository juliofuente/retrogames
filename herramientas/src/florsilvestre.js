// Flor silvestre|#1d1052
// @cartas
(function () {
  const P = Arcade.paciencia;
  const V = {
    tab: {"build":"any","move":"run","empty":"any"},
    planHint: true, demoBudget: 1500,
    piles: (lv) => P.mk([['found', 4], ['res', 16], ['tab', 6]]),
    deal: (st, D, deck) => P.dealStd(st, D, deck, {"ds":["UUUUUU","UUUUUU","UUUUUU","UUUUUU","UUUUUU","UUUUUU"],"resOpen":16}),
    place: (g, s, D, y0) => P.autoPlace(g, s, D, y0, {}),
    status: P.autoStatus,
    felt: ["#5f3dc4","#1d1052"], back: ["#212529","#000000"], backEmoji: '🌼',
  };
  Arcade.game({
    ...P(V),
    /*THEME*/ home: 'indexsolitarios.html', tag: 'Jardín de flores con escaleras', deco: ["🃏","🌼","♠️","♥️","♦️","♣️"], font: 'serif', bg: ["#5f3dc4","#1d1052"],
    music: { mode: 'mixo', bpm: 71, wave: 'sine', style: 'chill', root: 58 }, voice: { wave: 'sine', mul: 1.2, echo: 0.4 },
    /*EN*/ en: { title: 'Wildflower', tag: 'Flower Garden with runs', help: 'Like Flower Garden, but you can move same-suit runs together. Build the <b>4 foundations</b> from A to K, one per suit. On the table, a card goes on another <b>one rank higher</b> of <b>any suit</b>. Only <b>same-suit runs</b> move together. Any card can go into an empty space. The 16 <b>reserve</b> cards (at the bottom) can be played whenever you like. <b>Tap</b> a card and it goes to the best place, or <b>drag</b> it. 💡 gives a hint and ↩️ undoes.', tvHelp: 'D-pad to a card · OK moves it.', dict: { 'Celdas libres: ': 'Free cells: ', 'Reserva: ': 'Reserve: ', 'Mazo: ': 'Stock: ', 'En la mesa: ': 'On the table: ', 'Base: ': 'Base: ' } },
    /*TV*/ tvHelp: 'Cruceta hasta una carta · OK la mueve.',
    id: 'florsilvestre', title: 'Flor silvestre', emoji: '🌼', color: '#9775fa', origin: 'Wildflower',
    help: 'Como el Jardín de flores, pero puedes mover juntas escaleras del mismo palo. Completa las <b>4 bases</b> del A a la K, una por palo. En la mesa, una carta va sobre otra de <b>un número más</b> de <b>cualquier palo</b>. Solo se mueven juntas las <b>escaleras del mismo palo</b>. Cualquier carta puede ir a un hueco vacío. Las 16 cartas de la <b>reserva</b> (abajo) se pueden jugar cuando quieras. <b>Toca</b> una carta y va sola a su mejor sitio, o <b>arrástrala</b>. 💡 te da una pista y ↩️ deshace.',
    lives: 0, levels: 0, cap: 20,
  });
})();
