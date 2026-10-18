// Todo en fila|#1d1052
// @cartas
(function () {
  const P = Arcade.paciencia;
  const V = {
    found: {"mode":"updown","wrap":true},
    tab: {"build":"none","move":"one","empty":"none"},
    planHint: true, demoBudget: 2500,
    won: (st, D) => P.of(D, 'tab').every((i) => !st.p[i].length), autoFinish: false,
    piles: (lv) => P.mk([['found', 1], ['tab', 13]]),
    deal: (st, D, deck) => P.dealStd(st, D, deck, {"ds":["UUUU","UUUU","UUUU","UUUU","UUUU","UUUU","UUUU","UUUU","UUUU","UUUU","UUUU","UUUU","UUUU"]}),
    place: (g, s, D, y0) => P.autoPlace(g, s, D, y0, {}),
    status: P.autoStatus,
    felt: ["#5f3dc4","#1d1052"], back: ["#1971c2","#0b3f73"], backEmoji: '🚂',
  };
  Arcade.game({
    ...P(V),
    /*THEME*/ home: 'indexsolitarios.html', tag: 'Golf sin mazo: planea cada jugada', deco: ["🃏","🚂","♠️","♥️","♦️","♣️"], font: 'serif', bg: ["#5f3dc4","#1d1052"],
    music: { mode: 'minor', bpm: 77, wave: 'sine', style: 'chill', root: 58 }, voice: { wave: 'sine', mul: 1.2, echo: 0.4 },
    /*EN*/ en: { title: 'All in a Row', tag: 'Golf with no stock: plan every move', help: 'A Golf with no stock: thirteen columns of four cards and an empty foundation that starts with whichever card you choose. Move to the <b>foundation</b> any free card that is <b>one rank higher or lower</b> than the top one, regardless of suit (A follows K). Only the top card of each pile can be played. Clear the table to win. <b>Tap</b> a card and it goes to the best place, or <b>drag</b> it. 💡 gives a hint and ↩️ undoes.', tvHelp: 'D-pad to a card · OK moves it.', dict: { 'Celdas libres: ': 'Free cells: ', 'Reserva: ': 'Reserve: ', 'Mazo: ': 'Stock: ', 'En la mesa: ': 'On the table: ', 'Base: ': 'Base: ' } },
    /*TV*/ tvHelp: 'Cruceta hasta una carta · OK la mueve.',
    id: 'todoenfila', title: 'Todo en fila', emoji: '🚂', color: '#9775fa', origin: 'All in a Row',
    help: 'Un Golf sin mazo: trece columnas de cuatro cartas y una base vacía que empieza con la carta que elijas. Lleva a la <b>base</b> cualquier carta libre que sea <b>un número más o uno menos</b> que la de arriba, sin importar el palo (tras la K va el A). Solo se juega la carta de arriba de cada montón. Gana quien deja la mesa vacía. <b>Toca</b> una carta y va sola a su mejor sitio, o <b>arrástrala</b>. 💡 te da una pista y ↩️ deshace.',
    lives: 0, levels: 0, cap: 20,
  });
})();
