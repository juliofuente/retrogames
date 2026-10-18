// Yukon doble|#5c0f2c
// @cartas
(function () {
  const P = Arcade.paciencia;
  const V = {
    decks: 2,
    tab: {"build":"alt","move":"any","empty":"K"},
    piles: (lv) => P.mk([['found', 8], ['tab', 10]]),
    deal: (st, D, deck) => P.dealStd(st, D, deck, {"ds":["UUUUU","DUUUUUU","DDUUUUUU","DDDUUUUUU","DDDDUUUUUU","DDDDDUUUUUU","DDDDDDUUUUUU","DDDDDDDUUUUUU","DDDDDDDDUUUUUU","DDDDDDDDDUUUUUU"]}),
    place: (g, s, D, y0) => P.autoPlace(g, s, D, y0, {}),
    status: P.autoStatus,
    felt: ["#c2255c","#5c0f2c"], back: ["#0c8599","#064652"], backEmoji: '🐻‍❄️',
  };
  Arcade.game({
    ...P(V),
    /*THEME*/ home: 'indexsolitarios.html', tag: 'Yukon con dos barajas', deco: ["🃏","🐻‍❄️","♠️","♥️","♦️","♣️"], font: 'serif', bg: ["#c2255c","#5c0f2c"],
    music: { mode: 'major', bpm: 78, wave: 'sine', style: 'chill', root: 58 }, voice: { wave: 'sine', mul: 1.2, echo: 0.4 },
    /*EN*/ en: { title: 'Double Yukon', tag: 'Yukon with two decks', help: 'Yukon with two decks, ten columns and eight foundations. Played with <b>two decks</b>. Build the <b>8 foundations</b> from A to K, one per suit. On the table, a card goes on another <b>one rank higher</b> in the <b>other colour</b>. You can move <b>any face-up card with everything on top of it</b>, even if it is not in order. An empty space only takes a K. <b>Tap</b> a card and it goes to the best place, or <b>drag</b> it. 💡 gives a hint and ↩️ undoes.', tvHelp: 'D-pad to a card · OK moves it.', dict: { 'Celdas libres: ': 'Free cells: ', 'Reserva: ': 'Reserve: ', 'Mazo: ': 'Stock: ', 'En la mesa: ': 'On the table: ', 'Base: ': 'Base: ' } },
    /*TV*/ tvHelp: 'Cruceta hasta una carta · OK la mueve.',
    id: 'yukondoble', title: 'Yukon doble', emoji: '🐻‍❄️', color: '#f783ac', origin: 'Double Yukon',
    help: 'El Yukon con dos barajas, diez columnas y ocho bases. Se juega con <b>dos barajas</b>. Completa las <b>8 bases</b> del A a la K, una por palo. En la mesa, una carta va sobre otra de <b>un número más</b> y de <b>color distinto</b>. Puedes mover <b>cualquier carta boca arriba con todo lo que tiene encima</b>, aunque no esté en orden. Un hueco vacío solo admite una K. <b>Toca</b> una carta y va sola a su mejor sitio, o <b>arrástrala</b>. 💡 te da una pista y ↩️ deshace.',
    lives: 0, levels: 0, cap: 20,
  });
})();
