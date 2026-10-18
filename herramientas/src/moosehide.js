// Piel de alce|#5a0f2a
// @cartas
(function () {
  const P = Arcade.paciencia;
  const V = {
    tab: {"build":"notsuit","move":"any","empty":"K"},
    piles: (lv) => P.mk([['found', 4], ['tab', 7]]),
    deal: (st, D, deck) => P.dealStd(st, D, deck, {"ds":["U","DUUUUU","DDUUUUU","DDDUUUUU","DDDDUUUUU","DDDDDUUUUU","DDDDDDUUUUU"]}),
    place: (g, s, D, y0) => P.autoPlace(g, s, D, y0, {}),
    status: P.autoStatus,
    felt: ["#d6336c","#5a0f2a"], back: ["#5f3dc4","#2b1580"], backEmoji: '🫎',
  };
  Arcade.game({
    ...P(V),
    /*THEME*/ home: 'indexsolitarios.html', tag: 'Yukon con palos distintos', deco: ["🃏","🫎","♠️","♥️","♦️","♣️"], font: 'serif', bg: ["#d6336c","#5a0f2a"],
    music: { mode: 'mixo', bpm: 76, wave: 'sine', style: 'chill', root: 55 }, voice: { wave: 'sine', mul: 1.2, echo: 0.4 },
    /*EN*/ en: { title: 'Moosehide', tag: 'Yukon with different suits', help: 'A Yukon where a card goes on another of a different suit. Build the <b>4 foundations</b> from A to K, one per suit. On the table, a card goes on another <b>one rank higher</b> of a <b>different suit</b>. You can move <b>any face-up card with everything on top of it</b>, even if it is not in order. An empty space only takes a K. <b>Tap</b> a card and it goes to the best place, or <b>drag</b> it. 💡 gives a hint and ↩️ undoes.', tvHelp: 'D-pad to a card · OK moves it.', dict: { 'Celdas libres: ': 'Free cells: ', 'Reserva: ': 'Reserve: ', 'Mazo: ': 'Stock: ', 'En la mesa: ': 'On the table: ', 'Base: ': 'Base: ' } },
    /*TV*/ tvHelp: 'Cruceta hasta una carta · OK la mueve.',
    id: 'moosehide', title: 'Piel de alce', emoji: '🫎', color: '#faa2c1', origin: 'Moosehide',
    help: 'Un Yukon donde una carta va sobre otra de un palo distinto al suyo. Completa las <b>4 bases</b> del A a la K, una por palo. En la mesa, una carta va sobre otra de <b>un número más</b> de un <b>palo distinto</b> al suyo. Puedes mover <b>cualquier carta boca arriba con todo lo que tiene encima</b>, aunque no esté en orden. Un hueco vacío solo admite una K. <b>Toca</b> una carta y va sola a su mejor sitio, o <b>arrástrala</b>. 💡 te da una pista y ↩️ deshace.',
    lives: 0, levels: 0, cap: 20,
  });
})();
