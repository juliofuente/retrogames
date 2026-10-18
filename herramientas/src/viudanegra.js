// Viuda negra|#223a05
// @cartas
(function () {
  const P = Arcade.paciencia;
  const V = {
    decks: 2,
    found: {"mode":"run"},
    tab: {"build":"any","move":"seq","empty":"any"},
    stock: { to: 'tab' },
    planHint: true, demoBudget: 600,
    piles: (lv) => P.mk([['stock', 1], ['found', 8], ['tab', 10]]),
    deal: (st, D, deck) => P.dealStd(st, D, deck, {"ds":["DDDDDU","DDDDDU","DDDDDU","DDDDDU","DDDDU","DDDDU","DDDDU","DDDDU","DDDDU","DDDDU"]}),
    place: (g, s, D, y0) => P.autoPlace(g, s, D, y0, {}),
    status: P.autoStatus,
    felt: ["#5c940d","#223a05"], back: ["#212529","#000000"], backEmoji: '🖤',
  };
  Arcade.game({
    ...P(V),
    /*THEME*/ home: 'indexsolitarios.html', tag: 'La Araña que deja mover cualquier escalera', deco: ["🃏","🖤","♠️","♥️","♦️","♣️"], font: 'serif', bg: ["#5c940d","#223a05"],
    music: { mode: 'dorian', bpm: 81, wave: 'sine', style: 'chill', root: 61 }, voice: { wave: 'sine', mul: 1.2, echo: 0.4 },
    /*EN*/ en: { title: 'Black Widow', tag: 'Spider that lets you move any run', help: 'An easier Spider: you can move runs together even if they are not the same suit. Played with <b>two decks</b>. Make <b>complete runs from K down to A in the same suit</b>: each one you finish goes up to the foundations by itself. On the table, a card goes on another <b>one rank higher</b> of <b>any suit</b>. You can move cards together if they are already in order. Any card can go into an empty space. Tap the stock to deal one card to each column. <b>Tap</b> a card and it goes to the best place, or <b>drag</b> it. 💡 gives a hint and ↩️ undoes.', tvHelp: 'D-pad to a card · OK moves it.', dict: { 'Celdas libres: ': 'Free cells: ', 'Reserva: ': 'Reserve: ', 'Mazo: ': 'Stock: ', 'En la mesa: ': 'On the table: ', 'Base: ': 'Base: ' } },
    /*TV*/ tvHelp: 'Cruceta hasta una carta · OK la mueve.',
    id: 'viudanegra', title: 'Viuda negra', emoji: '🖤', color: '#a9e34b', origin: 'Black Widow',
    help: 'Una Araña más fácil: puedes mover juntas escaleras aunque no sean del mismo palo. Se juega con <b>dos barajas</b>. Forma <b>escaleras completas de la K al A del mismo palo</b>: cada una que termines sube sola a las bases. En la mesa, una carta va sobre otra de <b>un número más</b> de <b>cualquier palo</b>. Puedes mover juntas las cartas que ya estén en orden. Cualquier carta puede ir a un hueco vacío. Toca el mazo para repartir una carta a cada columna. <b>Toca</b> una carta y va sola a su mejor sitio, o <b>arrástrala</b>. 💡 te da una pista y ↩️ deshace.',
    lives: 0, levels: 0, cap: 20,
  });
})();
