// Simón simple|#16191c
// @cartas
(function () {
  const P = Arcade.paciencia;
  const V = {
    found: {"mode":"run"},
    tab: {"build":"any","move":"run","empty":"any"},
    planHint: true, demoBudget: 1200,
    piles: (lv) => P.mk([['found', 4], ['tab', 10]]),
    deal: (st, D, deck) => P.dealStd(st, D, deck, {"ds":["UUUUUUUU","UUUUUUUU","UUUUUUUU","UUUUUUU","UUUUUU","UUUUU","UUUU","UUU","UU","U"]}),
    place: (g, s, D, y0) => P.autoPlace(g, s, D, y0, {}),
    status: P.autoStatus,
    felt: ["#495057","#16191c"], back: ["#c92a2a","#7a1010"], backEmoji: '🙃',
  };
  Arcade.game({
    ...P(V),
    /*THEME*/ home: 'indexsolitarios.html', tag: 'La Araña sin mazo y a la vista', deco: ["🃏","🙃","♠️","♥️","♦️","♣️"], font: 'serif', bg: ["#495057","#16191c"],
    music: { mode: 'minor', bpm: 74, wave: 'sine', style: 'chill', root: 58 }, voice: { wave: 'sine', mul: 1.2, echo: 0.4 },
    /*EN*/ en: { title: 'Simple Simon', tag: 'Spider with no stock, all face up', help: 'Like a one-deck Spider with every card face up in ten columns and no stock. Make <b>complete runs from K down to A in the same suit</b>: each one you finish goes up to the foundations by itself. On the table, a card goes on another <b>one rank higher</b> of <b>any suit</b>. Only <b>same-suit runs</b> move together. Any card can go into an empty space. <b>Tap</b> a card and it goes to the best place, or <b>drag</b> it. 💡 gives a hint and ↩️ undoes.', tvHelp: 'D-pad to a card · OK moves it.', dict: { 'Celdas libres: ': 'Free cells: ', 'Reserva: ': 'Reserve: ', 'Mazo: ': 'Stock: ', 'En la mesa: ': 'On the table: ', 'Base: ': 'Base: ' } },
    /*TV*/ tvHelp: 'Cruceta hasta una carta · OK la mueve.',
    id: 'simonsimple', title: 'Simón simple', emoji: '🙃', color: '#adb5bd', origin: 'Simple Simon',
    help: 'Como una Araña de una baraja con todas las cartas a la vista en diez columnas y sin mazo. Forma <b>escaleras completas de la K al A del mismo palo</b>: cada una que termines sube sola a las bases. En la mesa, una carta va sobre otra de <b>un número más</b> de <b>cualquier palo</b>. Solo se mueven juntas las <b>escaleras del mismo palo</b>. Cualquier carta puede ir a un hueco vacío. <b>Toca</b> una carta y va sola a su mejor sitio, o <b>arrástrala</b>. 💡 te da una pista y ↩️ deshace.',
    lives: 0, levels: 0, cap: 20,
  });
})();
