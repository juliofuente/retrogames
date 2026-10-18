// Ocho dentro|#0b3a15
// @cartas
(function () {
  const P = Arcade.paciencia;
  const V = {
    tab: {"build":"suit","move":"one","empty":"K"},
    supermove: true,
    planHint: true, demoBudget: 1500,
    piles: (lv) => P.mk([['found', 4], ['cell', 8], ['tab', 8]]),
    deal: (st, D, deck) => P.dealStd(st, D, deck, {"even":true,"bottom":[1],"cells":8}),
    place: (g, s, D, y0) => P.autoPlace(g, s, D, y0, {}),
    status: P.autoStatus,
    felt: ["#2b8a3e","#0b3a15"], back: ["#2b8a3e","#0b4a1c"], backEmoji: '🗃️',
  };
  Arcade.game({
    ...P(V),
    /*THEME*/ home: 'indexsolitarios.html', tag: 'Ocho celdas llenas y ases escondidos', deco: ["🃏","🗃️","♠️","♥️","♦️","♣️"], font: 'serif', bg: ["#2b8a3e","#0b3a15"],
    music: { mode: 'dorian', bpm: 72, wave: 'sine', style: 'chill', root: 55 }, voice: { wave: 'sine', mul: 1.2, echo: 0.4 },
    /*EN*/ en: { title: 'Eight On', tag: 'Eight full cells and hidden aces', help: 'Like Eight Off, but all eight cells start full and the aces are at the bottom of the columns. Build the <b>4 foundations</b> from A to K, one per suit. On the table, a card goes on another <b>one rank higher</b> of the <b>same suit</b>. Move <b>one card at a time</b>, although you can shift several in a row if you have free spaces to help. An empty space only takes a K. You have <b>8 cells</b>, each holding one card (8 start full). Watch out: the aces are at the bottom of the columns. <b>Tap</b> a card and it goes to the best place, or <b>drag</b> it. 💡 gives a hint and ↩️ undoes.', tvHelp: 'D-pad to a card · OK moves it.', dict: { 'Celdas libres: ': 'Free cells: ', 'Reserva: ': 'Reserve: ', 'Mazo: ': 'Stock: ', 'En la mesa: ': 'On the table: ', 'Base: ': 'Base: ' } },
    /*TV*/ tvHelp: 'Cruceta hasta una carta · OK la mueve.',
    id: 'ochodentro', title: 'Ocho dentro', emoji: '🗃️', color: '#69db7c', origin: 'Eight On (Thomas Warfield)',
    help: 'Como Ocho celdas, pero las ocho celdas empiezan ocupadas y los ases están al fondo de las columnas. Completa las <b>4 bases</b> del A a la K, una por palo. En la mesa, una carta va sobre otra de <b>un número más</b> y del <b>mismo palo</b>. Se mueve <b>una carta cada vez</b>, aunque puedes pasar varias seguidas si tienes huecos libres para ayudarte. Un hueco vacío solo admite una K. Tienes <b>8 celdas</b> para guardar una carta en cada una (8 empiezan ocupadas). Ojo: los ases están al fondo de las columnas. <b>Toca</b> una carta y va sola a su mejor sitio, o <b>arrástrala</b>. 💡 te da una pista y ↩️ deshace.',
    lives: 0, levels: 0, cap: 20,
  });
})();
