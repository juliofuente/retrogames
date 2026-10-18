// Siete por cinco|#5a2000
// @cartas
(function () {
  const P = Arcade.paciencia;
  const V = {
    tab: {"build":"alt","move":"one","empty":"any"},
    supermove: true,
    planHint: true, demoBudget: 1500,
    piles: (lv) => P.mk([['found', 4], ['cell', 5 + (lv < 6 ? 1 : 0)], ['tab', 7]]),
    deal: (st, D, deck) => P.dealStd(st, D, deck, {"even":true}),
    place: (g, s, D, y0) => P.autoPlace(g, s, D, y0, {}),
    status: P.autoStatus,
    felt: ["#e8590c","#5a2000"], back: ["#862e9c","#45115a"], backEmoji: '🧩',
  };
  Arcade.game({
    ...P(V),
    /*THEME*/ home: 'indexsolitarios.html', tag: 'Una columna menos, una celda más', deco: ["🃏","🧩","♠️","♥️","♦️","♣️"], font: 'serif', bg: ["#e8590c","#5a2000"],
    music: { mode: 'minor', bpm: 91, wave: 'sine', style: 'chill', root: 61 }, voice: { wave: 'sine', mul: 1.2, echo: 0.4 },
    /*EN*/ en: { title: 'Seven by Five', tag: 'One column less, one cell more', help: 'FreeCell with seven columns and five cells. Build the <b>4 foundations</b> from A to K, one per suit. On the table, a card goes on another <b>one rank higher</b> in the <b>other colour</b>. Move <b>one card at a time</b>, although you can shift several in a row if you have free spaces to help. Any card can go into an empty space. You have <b>5 cells</b>, each holding one card. In the first levels you get one extra cell. <b>Tap</b> a card and it goes to the best place, or <b>drag</b> it. 💡 gives a hint and ↩️ undoes.', tvHelp: 'D-pad to a card · OK moves it.', dict: { 'Celdas libres: ': 'Free cells: ', 'Reserva: ': 'Reserve: ', 'Mazo: ': 'Stock: ', 'En la mesa: ': 'On the table: ', 'Base: ': 'Base: ' } },
    /*TV*/ tvHelp: 'Cruceta hasta una carta · OK la mueve.',
    id: 'sieteporcinco', title: 'Siete por cinco', emoji: '🧩', color: '#ffa94d', origin: 'Seven by Five',
    help: 'Carta libre con siete columnas y cinco celdas. Completa las <b>4 bases</b> del A a la K, una por palo. En la mesa, una carta va sobre otra de <b>un número más</b> y de <b>color distinto</b>. Se mueve <b>una carta cada vez</b>, aunque puedes pasar varias seguidas si tienes huecos libres para ayudarte. Cualquier carta puede ir a un hueco vacío. Tienes <b>5 celdas</b> para guardar una carta en cada una. En los primeros niveles tienes una celda más. <b>Toca</b> una carta y va sola a su mejor sitio, o <b>arrástrala</b>. 💡 te da una pista y ↩️ deshace.',
    lives: 0, levels: 0, cap: 20,
  });
})();
