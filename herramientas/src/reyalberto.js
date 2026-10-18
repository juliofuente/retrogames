// Rey Alberto|#3d0a1d
// @cartas
(function () {
  const P = Arcade.paciencia;
  const V = {
    tab: {"build":"alt","move":"one","empty":"any"},
    supermove: true,
    planHint: true, demoBudget: 1500,
    piles: (lv) => P.mk([['found', 4], ['res', 7], ['tab', 9]]),
    deal: (st, D, deck) => P.dealStd(st, D, deck, {"ds":["U","UU","UUU","UUUU","UUUUU","UUUUUU","UUUUUUU","UUUUUUUU","UUUUUUUUU"],"resOpen":7}),
    place: (g, s, D, y0) => P.autoPlace(g, s, D, y0, {}),
    status: P.autoStatus,
    felt: ["#a61e4d","#3d0a1d"], back: ["#e67700","#8a4200"], backEmoji: '🤴',
  };
  Arcade.game({
    ...P(V),
    /*THEME*/ home: 'indexsolitarios.html', tag: 'Nueve columnas y siete cartas de reserva', deco: ["🃏","🤴","♠️","♥️","♦️","♣️"], font: 'serif', bg: ["#a61e4d","#3d0a1d"],
    music: { mode: 'minor', bpm: 81, wave: 'sine', style: 'chill', root: 55 }, voice: { wave: 'sine', mul: 1.2, echo: 0.4 },
    /*EN*/ en: { title: 'King Albert', tag: 'Nine columns and seven reserve cards', help: 'Nine columns in a triangle and a reserve of seven cards, all face up. Build the <b>4 foundations</b> from A to K, one per suit. On the table, a card goes on another <b>one rank higher</b> in the <b>other colour</b>. Move <b>one card at a time</b>, although you can shift several in a row if you have free spaces to help. Any card can go into an empty space. The 7 <b>reserve</b> cards (at the bottom) can be played whenever you like. <b>Tap</b> a card and it goes to the best place, or <b>drag</b> it. 💡 gives a hint and ↩️ undoes.', tvHelp: 'D-pad to a card · OK moves it.', dict: { 'Celdas libres: ': 'Free cells: ', 'Reserva: ': 'Reserve: ', 'Mazo: ': 'Stock: ', 'En la mesa: ': 'On the table: ', 'Base: ': 'Base: ' } },
    /*TV*/ tvHelp: 'Cruceta hasta una carta · OK la mueve.',
    id: 'reyalberto', title: 'Rey Alberto', emoji: '🤴', color: '#ff8787', origin: 'King Albert / Idiot\'s Delight',
    help: 'Nueve columnas en triángulo y una reserva de siete cartas, todo a la vista. Completa las <b>4 bases</b> del A a la K, una por palo. En la mesa, una carta va sobre otra de <b>un número más</b> y de <b>color distinto</b>. Se mueve <b>una carta cada vez</b>, aunque puedes pasar varias seguidas si tienes huecos libres para ayudarte. Cualquier carta puede ir a un hueco vacío. Las 7 cartas de la <b>reserva</b> (abajo) se pueden jugar cuando quieras. <b>Toca</b> una carta y va sola a su mejor sitio, o <b>arrástrala</b>. 💡 te da una pista y ↩️ deshace.',
    lives: 0, levels: 0, cap: 20,
  });
})();
