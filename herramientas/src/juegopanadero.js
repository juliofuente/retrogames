// Juego del panadero|#0a3d24
// @cartas
(function () {
  const P = Arcade.paciencia;
  const V = {
    tab: {"build":"suit","move":"one","empty":"any"},
    supermove: true,
    planHint: true, demoBudget: 1500,
    piles: (lv) => P.mk([['found', 4], ['cell', 4 + (lv < 6 ? 1 : 0)], ['tab', 8]]),
    deal: (st, D, deck) => P.dealStd(st, D, deck, {"even":true}),
    place: (g, s, D, y0) => P.autoPlace(g, s, D, y0, {}),
    status: P.autoStatus,
    felt: ["#1b8a4c","#0a3d24"], back: ["#e67700","#8a4200"], backEmoji: '🧁',
  };
  Arcade.game({
    ...P(V),
    /*THEME*/ home: 'indexsolitarios.html', tag: 'El abuelo de Carta libre, del mismo palo', deco: ["🃏","🧁","♠️","♥️","♦️","♣️"], font: 'serif', bg: ["#1b8a4c","#0a3d24"],
    music: { mode: 'dorian', bpm: 89, wave: 'sine', style: 'chill', root: 58 }, voice: { wave: 'sine', mul: 1.2, echo: 0.4 },
    /*EN*/ en: { title: 'Baker\'s Game', tag: 'FreeCell\'s grandfather, same suit', help: 'The ancestor of FreeCell: four cells, everything face up, but you build down in the same suit. Build the <b>4 foundations</b> from A to K, one per suit. On the table, a card goes on another <b>one rank higher</b> of the <b>same suit</b>. Move <b>one card at a time</b>, although you can shift several in a row if you have free spaces to help. Any card can go into an empty space. You have <b>4 cells</b>, each holding one card. In the first levels you get one extra cell. <b>Tap</b> a card and it goes to the best place, or <b>drag</b> it. 💡 gives a hint and ↩️ undoes.', tvHelp: 'D-pad to a card · OK moves it.', dict: { 'Celdas libres: ': 'Free cells: ', 'Reserva: ': 'Reserve: ', 'Mazo: ': 'Stock: ', 'En la mesa: ': 'On the table: ', 'Base: ': 'Base: ' } },
    /*TV*/ tvHelp: 'Cruceta hasta una carta · OK la mueve.',
    id: 'juegopanadero', title: 'Juego del panadero', emoji: '🧁', color: '#ff6b6b', origin: 'Baker\'s Game (C. L. Baker)',
    help: 'El antecesor de Carta libre: cuatro celdas, todo a la vista, pero se baja del mismo palo. Completa las <b>4 bases</b> del A a la K, una por palo. En la mesa, una carta va sobre otra de <b>un número más</b> y del <b>mismo palo</b>. Se mueve <b>una carta cada vez</b>, aunque puedes pasar varias seguidas si tienes huecos libres para ayudarte. Cualquier carta puede ir a un hueco vacío. Tienes <b>4 celdas</b> para guardar una carta en cada una. En los primeros niveles tienes una celda más. <b>Toca</b> una carta y va sola a su mejor sitio, o <b>arrástrala</b>. 💡 te da una pista y ↩️ deshace.',
    lives: 0, levels: 0, cap: 20,
  });
})();
